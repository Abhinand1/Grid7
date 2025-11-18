import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { NewsArticle, LaunchDate } from '../types';

export class CacheManager {
    getItem(key: string) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            return JSON.parse(item);
        } catch (error) {
            console.error(`[Cache] Error reading from localStorage for key "${key}":`, error);
            return null;
        }
    }

    setItem(key: string, data: unknown) {
        try {
            const item = {
                timestamp: Date.now(),
                data: data,
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (error) {
            console.error(`[Cache] Error writing to localStorage for key "${key}":`, error);
        }
    }
    
    get(key: string, ttl: number) {
        const item = this.getItem(key);
        if (!item) {
            return null;
        }

        const isStale = Date.now() - item.timestamp > ttl;
        if (isStale) {
            console.log(`[Cache] Stale data for key "${key}".`);
            localStorage.removeItem(key);
            return null;
        }
        
        return item.data;
    }

    set(key: string, data: unknown) {
        this.setItem(key, data);
    }
}
export const cache = new CacheManager();

const NEWS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const LAUNCHES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SPEECH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let isApiInCooldown = false;
let cooldownEndTime = 0;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

class ApiKeyManager {
    private keys: string[];
    private currentIndex: number;

    constructor() {
        const allKeys = new Set<string>();

        // Safely check if the variable exists before accessing or splitting
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env.GEMINI_API_KEY_POOL) {
             // @ts-ignore
            process.env.GEMINI_API_KEY_POOL.split(',').map(k => k.trim()).filter(Boolean).forEach(k => allKeys.add(k));
        }
        
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env.API_KEY) {
             // @ts-ignore
             allKeys.add(process.env.API_KEY.trim());
        }
        
        this.keys = Array.from(allKeys);
        this.currentIndex = 0;

        if (this.keys.length === 0) {
            console.warn("No API keys found in API_KEY or GEMINI_API_KEY_POOL.");
        }
    }
    
    shuffleKeys() {
        for (let i = this.keys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.keys[i], this.keys[j]] = [this.keys[j], this.keys[i]];
        }
    }

    *getKeyRotation() {
        if (this.keys.length === 0) {
            return;
        }
        this.shuffleKeys();
        const maxAttempts = this.keys.length;
        for (let i = 0; i < maxAttempts; i++) {
            const key = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
            yield key;
        }
    }
}
const apiKeyManager = new ApiKeyManager();


const withExponentialBackoff = async <T,>(
    apiCall: () => Promise<T>, 
    maxRetries = 3, 
    initialDelay = 1000
): Promise<T> => {
    let attempt = 0;
    while (true) {
        try {
            return await apiCall();
        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message.toLowerCase() : JSON.stringify(error).toLowerCase();
            
            if (errorMessage.includes('rate') || errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
                throw error;
            }

            attempt++;
            if (attempt >= maxRetries) {
                throw error;
            }

            const isRetryable = errorMessage.includes('try again') || errorMessage.includes('server') || errorMessage.includes('fetch failed');

            if (!isRetryable) {
                throw error;
            }

            const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

const parseAndCleanJson = (text: string) => {
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON from model response:", e);
        return []; 
    }
};

const processApiResponse = (response: any, articles: any[]): NewsArticle[] => {
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: { uri: string; title: string }[] = [];
    if (groundingChunks) {
        for (const chunk of groundingChunks) {
            if (chunk.web) {
                sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
            }
        }
    }
    return articles.map((article, index) => ({
        ...article,
        id: `${article.source}-${article.headline?.slice(0, 10)}-${index}`,
        groundingSources: sources,
        category: article.category || 'Other',
    }));
};

export const fetchTechNews = async (forceRefresh = false): Promise<NewsArticle[] | null> => {
    const cacheKey = 'techNews';
    if (!forceRefresh) {
        const cachedArticles = cache.get(cacheKey, NEWS_CACHE_TTL_MS) as NewsArticle[] | null;
        if (cachedArticles) return cachedArticles;
    }
    
    if (isApiInCooldown && Date.now() < cooldownEndTime) {
        return null;
    }
    isApiInCooldown = false;

    const keyIterator = apiKeyManager.getKeyRotation();
    let lastError;

    for (const apiKey of keyIterator) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await withExponentialBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    systemInstruction: "You are a professional tech journalist. Find the latest, impactful breaking news in tech and write compelling articles. Respond only with the requested JSON.",
                    tools: [{googleSearch: {}}],
                },
                contents: `Find and generate a list of 20 of the most significant breaking technology news stories from the last 24 hours. For each story, provide: a source (publication name), a compelling headline, a 1-2 sentence summary, a longer multi-paragraph full article, a timestamp in ISO 8601 format, and a category from one of the following: 'AI', 'OS', 'Gadgets', 'Other'. Return a valid JSON array of objects without markdown.`,
            }));
            const articles = parseAndCleanJson(response.text);
            const processedArticles = processApiResponse(response, articles);
            
            if (processedArticles.length > 0) {
                 cache.set(cacheKey, processedArticles);
            }
           
            return processedArticles;
        } catch (error) {
            lastError = error;
            const errorMessage = JSON.stringify(error).toLowerCase();
            if (errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
                continue;
            }
            console.error("Error fetching tech news:", error);
            return null; 
        }
    }
    console.error("All API keys are rate-limited or failed. Falling back to static news.", lastError);
    isApiInCooldown = true;
    cooldownEndTime = Date.now() + COOLDOWN_MS;
    return null;
};

export const fetchUpcomingLaunches = async (forceRefresh = false): Promise<LaunchDate[] | null> => {
    const cacheKey = 'upcomingLaunches';
    if (!forceRefresh) {
        const cachedLaunches = cache.get(cacheKey, LAUNCHES_CACHE_TTL_MS) as LaunchDate[] | null;
        if (cachedLaunches) return cachedLaunches;
    }

    if (isApiInCooldown && Date.now() < cooldownEndTime) {
        return null;
    }
    isApiInCooldown = false;

    const keyIterator = apiKeyManager.getKeyRotation();
    let lastError;

    for (const apiKey of keyIterator) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await withExponentialBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model: "gemini-2.5-flash",
                config: {
                    systemInstruction: "You are a premier tech industry analyst. Your task is to provide an accurate, up-to-date forecast of upcoming tech hardware and software launches, focusing on the latest, most credible information.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING, description: "The anticipated launch month and year, or quarter (e.g., 'Q1 2025', 'Mid-2025')." },
                                launches: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            brand: { type: Type.STRING },
                                            model: { type: Type.STRING },
                                            category: { type: Type.STRING, description: "The product category, e.g., 'Mobile', 'Laptop', 'VR/AR', 'OS', 'Other'." },
                                            description: { type: Type.STRING, description: "A brief, optional note about the launch." },
                                        },
                                        required: ["brand", "model", "category"],
                                    },
                                },
                            },
                             required: ["date", "launches"],
                        },
                    },
                },
                contents: "Provide a list of notable, unreleased tech products (including mobile phones, laptops, VR/AR headsets, and OS updates) expected to launch ONLY in the year 2025 and beyond. It is crucial that you DO NOT include any products from 2024 or earlier. The list must only contain future launches starting from January 1, 2025. List them chronologically. Group by anticipated launch date (e.g., 'Q1 2025', 'Mid-2025'). For each launch, provide the brand, model, category, and an optional description.",
            }));
            const launches = parseAndCleanJson(response.text);
            if (launches.length > 0) {
                cache.set(cacheKey, launches);
            }
            return launches;
        } catch (error) {
            lastError = error;
            const errorMessage = JSON.stringify(error).toLowerCase();
            if (errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
                continue;
            }
            console.error("Error fetching upcoming launches:", error);
            return null; 
        }
    }
    isApiInCooldown = true;
    cooldownEndTime = Date.now() + COOLDOWN_MS;
    return null; 
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    const cacheKey = `speech:${text.slice(0, 50)}`; 
    const cachedSpeech = cache.get(cacheKey, SPEECH_CACHE_TTL_MS) as string | null;
    if (cachedSpeech) return cachedSpeech;

    if (isApiInCooldown && Date.now() < cooldownEndTime) {
        return null;
    }
    isApiInCooldown = false;

    const keyIterator = apiKeyManager.getKeyRotation();

    for (const apiKey of keyIterator) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await withExponentialBackoff<GenerateContentResponse>(() => ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            }));
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
            if (base64Audio) {
                 cache.set(cacheKey, base64Audio);
            }
            return base64Audio;
        } catch (error) {
            const errorMessage = JSON.stringify(error).toLowerCase();
            if (errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
                continue;
            }
            console.error("Error generating speech:", error);
            return null;
        }
    }
    isApiInCooldown = true;
    cooldownEndTime = Date.now() + COOLDOWN_MS;
    return null;
};

export const subscribeToNewsletter = async (email: string, news: NewsArticle[]) => {
    console.log(`Subscribing ${email} to the newsletter.`);
    const topHeadlines = news.slice(0, 5).map(a => `- ${a.headline}`).join('\n');
    const emailBody = `Welcome to Grid7 Weekly!\n\nWe're thrilled to have you join our community of tech enthusiasts. You're now on the list to receive the most important technology news, delivered straight to your inbox.\n\nHere's a taste of the top stories right now:\n\n${topHeadlines}\n\nStay curious,\nThe Grid7 Team`;
    
    return { 
        success: true, 
        message: "Subscription successful! Here's a preview of your first newsletter.", 
        emailBody 
    };
};
