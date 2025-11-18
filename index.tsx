// --- React and Google GenAI Imports ---
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

// --- Types (from src/types.ts) ---
interface NewsArticle {
  id: string;
  source: string;
  headline: string;
  summary: string;
  fullArticle: string;
  timestamp: string;
  category: 'AI' | 'OS' | 'Gadgets' | 'Other';
  groundingSources?: { uri: string; title: string }[];
}

interface Launch {
    brand: string;
    model: string;
    category: string;
    description?: string;
}

interface LaunchDate {
    date: string;
    launches: Launch[];
}

// --- Audio Utilities (from src/utils/audioUtils.ts) ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Static Data (from src/static/newsCache.ts) ---
const STATIC_NEWS: NewsArticle[] = [
    {
        id: "static-1",
        source: "FutureTech Now",
        headline: "Project Chimera: The Dawn of Neural-Fabric Computing",
        summary: "A new architecture that mimics the human brain's neural pathways, promising processing speeds previously thought impossible.",
        fullArticle: "In a landmark announcement, startup 'Ethereal Machines' has unveiled 'Project Chimera,' a revolutionary computing architecture. Unlike traditional silicon-based processors, Chimera utilizes a synthetic neural fabric that allows for parallel processing on an unprecedented scale, potentially accelerating AI training and complex simulations by orders of magnitude.",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        category: "AI",
    },
    {
        id: "static-2",
        source: "The Quantum Daily",
        headline: "Stable Qubits Achieved at Room Temperature, a Major Leap for Quantum Computing",
        summary: "Researchers have successfully maintained a stable quantum state for over a minute without cryogenic cooling.",
        fullArticle: "A breakthrough paper published in 'Nature Physics' details a new method for stabilizing qubits using electromagnetic fields at ambient temperatures. This discovery removes one of the biggest and most expensive hurdles for practical quantum computing, paving the way for smaller, more accessible quantum machines.",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        category: "Gadgets",
    },
    {
        id: "static-3",
        source: "BioInnovate",
        headline: "CRISPR-GeneOS Delivers First Successful In-Vivo Cellular Repair",
        summary: "A new delivery system for CRISPR technology has successfully repaired damaged cells directly within a living organism.",
        fullArticle: "Scientists at the BioSynth Institute have developed 'GeneOS,' a viral vector delivery system that can target specific cells in the body and perform precise genetic edits. The first successful trials in lab mice have shown remarkable results in reversing genetic disorders, opening a new frontier in personalized medicine.",
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        category: "Other",
    },
    {
        id: "static-os-1",
        source: "Kernel Corner",
        headline: "Helios OS Achieves POSIX Compliance, Eyes Mainstream Adoption",
        summary: "The independently developed Helios microkernel operating system has now achieved full POSIX compliance, a major milestone for compatibility.",
        fullArticle: "The Helios OS project, known for its focus on security and modularity, announced today that its latest version is now fully POSIX compliant. This allows a vast library of existing Unix and Linux software to be compiled and run on Helios with little to no modification, opening the door for the OS to move from a niche hobbyist project to a potential choice for servers and embedded systems.",
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        category: "OS",
    },
    {
        id: "static-4",
        source: "AR/VR Weekly",
        headline: "LightField Displays Are Here: 'Mimesis' Glasses Offer True Holographic Vision",
        summary: "A new player in the AR space has debuted glasses that project true 3D light fields, eliminating screen-door effect and eye strain.",
        fullArticle: "'Mimesis Optics' has come out of stealth with a pair of augmented reality glasses that don't use traditional waveguides or screens. Instead, they project a light field directly onto the user's retina, creating objects that are indistinguishable from reality and can be focused on naturally, just like real-world objects.",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        category: "Gadgets",
    },
     {
        id: "static-5",
        source: "Energy X",
        headline: "Solid-State Hydrogen Fuel Cell Hits 90% Efficiency",
        summary: "A breakthrough in material science has led to a new type of hydrogen fuel cell that is safer, cheaper, and more efficient.",
        fullArticle: "A research consortium has developed a new solid-state electrolyte that dramatically improves the efficiency and safety of hydrogen fuel cells. This innovation could be the key to unlocking hydrogen as a viable, mainstream clean energy source for transportation and grid storage, as it eliminates the need for high-pressure, flammable hydrogen gas storage.",
        timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        category: "Other",
    },
    {
        id: "static-6",
        source: "Space Explorer",
        headline: "AI Discovers Potentially Habitable Exoplanet System in Old Kepler Data",
        summary: "A specialized AI trained on planetary transit data has identified a previously missed system of three 'super-Earths' in the habitable zone.",
        fullArticle: "By applying a new deep learning model to archived data from the Kepler Space Telescope, astronomers have uncovered the Kepler-186f system's previously unknown siblings. The AI model was able to detect faint transit signals that were previously dismissed as noise, revealing a system with three rocky planets that could potentially harbor liquid water.",
        timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        category: "AI",
    },
     {
        id: "static-7",
        source: "Robotics Today",
        headline: "Swarm Robotics Construct First Autonomous Habitat on Test Site",
        summary: "A fleet of 50 autonomous robots has successfully 3D-printed and assembled a habitable structure with zero human intervention.",
        fullArticle: "The 'Archinaut' project demonstrated a significant milestone in construction robotics. A swarm of specialized robots, coordinated by a central AI, autonomously excavated materials, 3D-printed structural components, and assembled a 400-square-foot dome in under 72 hours. This technology has major implications for disaster relief and off-world construction.",
        timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        category: "AI",
    },
    {
        id: "static-8",
        source: "Digital Trends",
        headline: "The 'Ethical AI' Bill Passes Unanimously, Mandating Transparency Audits",
        summary: "A new piece of legislation requires all companies deploying high-impact AI models to undergo regular third-party audits for bias and transparency.",
        fullArticle: "In a rare show of bipartisan unity, lawmakers passed the 'AI Accountability Act'. The law mandates that AI systems used in critical sectors like finance, hiring, and law enforcement must be auditable and their decision-making processes explainable. Companies found non-compliant face significant fines, marking a new era of AI regulation.",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        category: "AI",
    }
];

// --- Static Data (from src/static/launchesCache.ts) ---
const STATIC_LAUNCHES: LaunchDate[] = [
    {
        date: "Late 2025",
        launches: [
            { brand: "Apple", model: "iPhone 17 Series", category: "Mobile", description: "Expected to feature under-display Face ID technology and a significant camera upgrade." },
            { brand: "Microsoft", model: "Windows 12", category: "OS", description: "Rumored to be a major overhaul with deep AI integration and a new UI." },
            { brand: "Samsung", model: "Galaxy Z Fold 7 & Z Flip 7", category: "Mobile", description: "Further refinements to the foldable display and hinge are expected." },
        ],
    },
    {
        date: "Mid 2025",
        launches: [
            { brand: "Google", model: "Pixel 10 & 10 Pro", category: "Mobile", description: "Will likely debut with the next-generation Tensor G5 chip and advanced AI features." },
            { brand: "Apple", model: "MacBook Pro (M5)", category: "Laptop", description: "Expected to bring the next generation of Apple Silicon with significant performance gains." },
            { brand: "Nothing", model: "Phone (3)", category: "Mobile", description: "Anticipated to continue the transparent design language with upgraded internals." },
        ],
    },
    {
        date: "Early 2025",
        launches: [
            { brand: "Samsung", model: "Galaxy S25 Series", category: "Mobile", description: "Expected to feature the new Snapdragon 8 Gen 4 chipset and improved AI capabilities." },
            { brand: "OnePlus", model: "OnePlus 15", category: "Mobile", description: "Rumored to have a redesigned camera module and a periscope zoom lens." },
            { brand: "Meta", model: "Quest 4", category: "VR/AR", description: "Rumors suggest a lighter design with higher resolution displays and better passthrough." },
        ],
    },
];

// --- Custom Hooks (from src/hooks/useRelativeTime.ts) ---
const useRelativeTime = (isoDate: string) => {
    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };

    const formatRelativeTime = (date: Date) => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

      if (seconds < 30) return 'Just now';

      for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            const plural = interval > 1 ? 's' : '';
            if (unit === 'hour') return `${interval}h ago`;
            if (unit === 'minute') return `${interval}m ago`;
            if (unit === 'second') return `${interval}s ago`;
            return `${interval} ${unit}${plural} ago`;
        }
      }
      return 'Just now';
    };

    const date = new Date(isoDate);
    const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(date));

    useEffect(() => {
        setRelativeTime(formatRelativeTime(date)); // Set initial value
        const intervalId = setInterval(() => {
            setRelativeTime(formatRelativeTime(date));
        }, 60000); // Update every minute

        return () => clearInterval(intervalId);
    }, [isoDate]);

    return relativeTime;
};

// --- Gemini Service (from src/services/geminiService.ts) ---
class CacheManager {
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
            console.log(`[Cache] Miss for key "${key}".`);
            return null;
        }

        const isStale = Date.now() - item.timestamp > ttl;
        if (isStale) {
            console.log(`[Cache] Stale data for key "${key}". Ignoring.`);
            localStorage.removeItem(key);
            return null;
        }
        
        console.log(`[Cache] Hit for key "${key}". Returning cached data.`);
        return item.data;
    }

    set(key: string, data: unknown) {
        console.log(`[Cache] Setting data for key "${key}".`);
        this.setItem(key, data);
    }
}
const cache = new CacheManager();

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
        const keyPool = process.env.GEMINI_API_KEY_POOL;
        const singleKey = process.env.API_KEY;
        const allKeys = new Set<string>();

        if (keyPool) {
            keyPool.split(',').map(k => k.trim()).filter(Boolean).forEach(k => allKeys.add(k));
        }
        if (singleKey) {
             allKeys.add(singleKey.trim());
        }
        
        this.keys = Array.from(allKeys);
        this.currentIndex = 0;

        if (this.keys.length === 0) {
            console.warn("No API keys found in API_KEY or GEMINI_API_KEY_POOL.");
        } else {
            this.shuffleKeys();
            console.log(`Initialized with ${this.keys.length} API key(s).`);
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
        const maxAttempts = this.keys.length;
        for (let i = 0; i < maxAttempts; i++) {
            const key = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
            yield key;
        }
    }
}
const apiKeyManager = new ApiKeyManager();

// Fix: Added trailing comma to generic parameter <T,> to avoid TSX parsing error
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
                console.error("API call failed after maximum retries for non-rate-limit error.", error);
                throw error;
            }

            const isRetryable = errorMessage.includes('try again') || errorMessage.includes('server');

            if (!isRetryable) {
                console.error("Encountered a non-retryable API error.", error);
                throw error;
            }

            const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
            console.warn(`API call failed with retryable error (attempt ${attempt}/${maxRetries}). Retrying in ${Math.round(delay / 1000)}s...`);
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
        console.log("Original text from model:", text);
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

const fetchTechNews = async (forceRefresh = false): Promise<NewsArticle[] | null> => {
    const cacheKey = 'techNews';
    if (!forceRefresh) {
        const cachedArticles = cache.get(cacheKey, NEWS_CACHE_TTL_MS) as NewsArticle[] | null;
        if (cachedArticles) return cachedArticles;
        return null; // Return null if not forcing and cache misses
    }
    
    if (isApiInCooldown && Date.now() < cooldownEndTime) {
        const timeLeft = Math.ceil((cooldownEndTime - Date.now()) / 1000 / 60);
        console.warn(`API is in cooldown due to rate limits. Try again in ~${timeLeft} minutes.`);
        return null;
    }
    isApiInCooldown = false; // Reset if cooldown period has passed

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
                console.warn(`API key rate-limited. Trying next key.`);
                continue;
            }
            console.error("Error fetching tech news:", error);
            return null; // Return null on non-rotation errors
        }
    }
    console.error("All API keys are rate-limited. Falling back to static news.", lastError);
    isApiInCooldown = true;
    cooldownEndTime = Date.now() + COOLDOWN_MS;
    console.log(`API cooldown activated for 5 minutes.`);
    return null; // Return null when all keys are exhausted
};

const fetchUpcomingLaunches = async (forceRefresh = false): Promise<LaunchDate[] | null> => {
    const cacheKey = 'upcomingLaunches';
    if (!forceRefresh) {
        const cachedLaunches = cache.get(cacheKey, LAUNCHES_CACHE_TTL_MS) as LaunchDate[] | null;
        if (cachedLaunches) return cachedLaunches;
        return null; // Return null if not forcing and cache misses
    }

    if (isApiInCooldown && Date.now() < cooldownEndTime) {
        const timeLeft = Math.ceil((cooldownEndTime - Date.now()) / 1000 / 60);
        console.warn(`API is in cooldown due to rate limits. Try again in ~${timeLeft} minutes.`);
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
                console.warn(`API key rate-limited. Trying next key.`);
                continue;
            }
            console.error("Error fetching upcoming launches:", error);
            return null; // Return null on non-rotation errors
        }
    }
    console.error("All API keys are rate-limited. Falling back to static launch data.", lastError);
    isApiInCooldown = true;
    cooldownEndTime = Date.now() + COOLDOWN_MS;
    console.log(`API cooldown activated for 5 minutes.`);
    return null; // Return null when all keys are exhausted
};

const generateSpeech = async (text: string): Promise<string | null> => {
    const cacheKey = `speech:${text}`;
    const cachedSpeech = cache.get(cacheKey, SPEECH_CACHE_TTL_MS) as string | null;
    if (cachedSpeech) return cachedSpeech;

    if (isApiInCooldown && Date.now() < cooldownEndTime) {
        const timeLeft = Math.ceil((cooldownEndTime - Date.now()) / 1000 / 60);
        console.warn(`API is in cooldown due to rate limits. Try again in ~${timeLeft} minutes.`);
        return null;
    }
    isApiInCooldown = false;

    const keyIterator = apiKeyManager.getKeyRotation();
    let lastError;

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
            lastError = error;
            const errorMessage = JSON.stringify(error).toLowerCase();
            if (errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
                console.warn(`API key rate-limited. Trying next key.`);
                continue;
            }
            console.error("Error generating speech:", error);
            return null;
        }
    }
    console.error("All API keys are rate-limited. Could not generate speech.", lastError);
    isApiInCooldown = true;
    cooldownEndTime = Date.now() + COOLDOWN_MS;
    console.log(`API cooldown activated for 5 minutes.`);
    return null;
};

const subscribeToNewsletter = async (email: string, news: NewsArticle[]) => {
    console.log(`Subscribing ${email} to the newsletter.`);

    const topHeadlines = news.slice(0, 5).map(a => `- ${a.headline}`).join('\n');

    const emailBody = `Welcome to Grid7 Weekly!

We're thrilled to have you join our community of tech enthusiasts. You're now on the list to receive the most important technology news, delivered straight to your inbox.

Here's a taste of the top stories right now:

${topHeadlines}

Stay curious,
The Grid7 Team`;
    
    console.log("---- SIMULATED EMAIL TO " + email + " ----\n" + emailBody + "\n------------------------------------------");

    return { 
        success: true, 
        message: "Subscription successful! Here's a preview of your first newsletter.", 
        emailBody 
    };
};

// --- Components ---
const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  return (
    React.createElement("div", { className: "flex flex-col justify-center items-center h-full gap-4" },
      React.createElement("div", { className: "relative w-16 h-16" },
        React.createElement("div", { className: "absolute inset-0 border-4 border-gray-800 rounded-full" }),
        React.createElement("div", { className: "absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" })
      ),
      message && React.createElement("p", { className: "text-cyan-400 font-semibold animate-pulse" }, message)
    )
  );
};

interface SplashScreenProps {
    isVisible: boolean;
}
const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    const features = [
        "Live Breaking News",
        "AI-Generated Briefs",
        "Upcoming Tech Timelines",
        "Futuristic Interface"
    ];

    return (
        React.createElement("div", { className: `fixed inset-0 bg-black z-[100] flex flex-col justify-center items-center ${isVisible ? '' : 'animate-fadeOut'}` },
            React.createElement("div", { className: "flex flex-col items-center gap-4 animate-fadeInUp" },
                React.createElement("div", { className: "flex items-end" },
                    React.createElement("h1", { className: "text-5xl md:text-6xl font-bold font-spacemono headline-gradient" },
                        React.createElement("span", { className: "logo-glow" }, "Grid7")
                    ),
                     React.createElement("p", { className: "ml-1.5 mb-1.5 text-[10px] text-gray-500 font-sans whitespace-nowrap" },
                        "By Abhinand"
                    )
                ),
                React.createElement("div", { className: "mt-4 text-center" },
                    features.map((feature, index) => (
                        React.createElement("p", { 
                            key: index,
                            className: "text-gray-400 text-sm md:text-base opacity-0",
                            style: { animation: `fadeInUp 0.5s ease-out ${0.5 + index * 0.2}s forwards` }
                        },
                            feature
                        )
                    ))
                )
            )
        )
    );
};

interface HeaderProps {
    activeCategory: string;
    onCategoryChange: (category: 'news' | 'launches') => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    onNewsletterClick: () => void;
}
const Header: React.FC<HeaderProps> = ({ activeCategory, onCategoryChange, onRefresh, isRefreshing, onNewsletterClick }) => {
    const getButtonClass = (category: string) => {
        const baseClass = "px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300";
        if (activeCategory === category) {
            return `${baseClass} bg-cyan-500 text-black`;
        }
        return `${baseClass} bg-gray-800/50 text-gray-300 hover:bg-gray-700`;
    };

    return (
        React.createElement("header", { className: "py-4 px-4 md:px-8 sticky top-0 z-20 bg-black/50 backdrop-blur-sm border-b border-gray-900" },
            React.createElement("div", { className: "flex flex-col sm:flex-row justify-between items-center gap-4" },
                 React.createElement("div", { className: "relative flex items-end overflow-hidden p-4 -m-4" },
                    React.createElement("div", { className: "header-texture" }),
                    React.createElement("h1", { className: "relative z-10 text-3xl font-bold font-spacemono headline-gradient" },
                        React.createElement("span", { className: "logo-glow" }, "Grid7")
                    ),
                    React.createElement("p", { className: "relative z-10 ml-1.5 mb-1 text-[8px] text-gray-500 font-sans whitespace-nowrap" },
                        "By Abhinand"
                    )
                ),
                React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("div", { className: "flex items-center space-x-2 p-1 bg-gray-900 rounded-full" },
                        React.createElement("button", { onClick: () => onCategoryChange('news'), className: getButtonClass('news') },
                            "News"
                        ),
                        React.createElement("button", { onClick: () => onCategoryChange('launches'), className: getButtonClass('launches') },
                            "Upcoming Launches"
                        )
                    ),
                     React.createElement("button", { 
                        onClick: onRefresh, 
                        disabled: isRefreshing,
                        className: "p-2.5 bg-gray-900 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
                        "aria-label": "Refresh News Feed",
                        title: "Refresh News Feed"
                    },
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: `h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                           React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.182m0-4.991v4.99" })
                        )
                    ),
                    React.createElement("button", { 
                        onClick: onNewsletterClick,
                        className: "p-2.5 bg-gray-900 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition-all duration-300",
                        "aria-label": "Subscribe to newsletter",
                        title: "Subscribe to newsletter"
                    },
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" })
                        )
                    )
                )
            )
        )
    );
};

interface NewsCardProps {
    article: NewsArticle;
    onCardClick: () => void;
    onPlayAudio: () => void;
    isPlaying: boolean;
    isLoadingAudio: boolean;
}
const NewsCard: React.FC<NewsCardProps> = ({ article, onCardClick, onPlayAudio, isPlaying, isLoadingAudio }) => {
    const getCategoryTagStyle = (category: string) => {
        switch (category) {
            case 'AI': return 'bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20';
            case 'OS': return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20';
            case 'Gadgets': return 'bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20';
            default: return 'bg-gray-500/10 text-gray-400 ring-1 ring-inset ring-gray-500/20';
        }
    };

    const getCategoryHoverStyle = (category: string) => {
        switch (category) {
            case 'AI': return 'hover:border-violet-600 hover:shadow-violet-900/20';
            case 'OS': return 'hover:border-emerald-600 hover:shadow-emerald-900/20';
            case 'Gadgets': return 'hover:border-amber-600 hover:shadow-amber-900/20';
            default: return 'hover:border-gray-600 hover:shadow-gray-900/20';
        }
    };

    const relativeTime = useRelativeTime(article.timestamp);
    
    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        let urlToShare = window.location.href;
        const sourceUri = article.groundingSources?.[0]?.uri;

        if (sourceUri) {
            try {
                const parsedUrl = new URL(sourceUri);
                if (['http:', 'https:'].includes(parsedUrl.protocol)) urlToShare = parsedUrl.href;
            } catch (err) { /* fallback to default */ }
        }
        
        const shareData = { title: article.headline, text: article.summary, url: urlToShare };

        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(`${article.headline}\n\n${urlToShare}`);
                alert('Article link copied to clipboard!');
            }
        } catch (err) {
            if (!(err instanceof Error && err.name === 'AbortError')) console.error('Error sharing:', err);
        }
    };
    
    const handleVoiceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlayAudio();
    };

    return (
        React.createElement("div", { 
            className: `group flex flex-col justify-between p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${getCategoryHoverStyle(article.category)}`
        },
            React.createElement("div", { onClick: onCardClick, className: "cursor-pointer" },
                React.createElement("div", { className: "flex justify-between items-start mb-2 gap-2" },
                     React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                        React.createElement("span", { className: "text-xs font-semibold text-cyan-400 uppercase tracking-wider" }, article.source),
                         React.createElement("span", { className: `inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${getCategoryTagStyle(article.category)}` },
                           article.category
                        )
                    ),
                    React.createElement("span", { className: "text-xs text-gray-500 flex-shrink-0" }, relativeTime)
                ),
                React.createElement("h2", { className: "text-lg font-bold text-gray-100 group-hover:text-white transition-colors duration-300 mb-2 leading-tight" },
                    article.headline
                ),
                React.createElement("p", { className: "text-sm text-gray-400 line-clamp-3" },
                    article.summary
                )
            ),
             React.createElement("div", { className: "mt-4 flex justify-between items-center" },
                React.createElement("button", {
                    onClick: handleVoiceClick,
                    className: "text-gray-500 hover:text-cyan-400 transition-colors p-2 -m-2 rounded-full hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-wait",
                    "aria-label": "Listen to summary",
                    title: "Listen to summary",
                    disabled: isLoadingAudio
                },
                    isLoadingAudio ? (
                        React.createElement("svg", { className: "h-5 w-5 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" },
                            React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                            React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
                        )
                    ) : isPlaying ? (
                         React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5 text-cyan-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 10v4m4-4v4m4-4v4m4-4v4" })
                        )
                    ) : (
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.93 8.464a5 5 0 000 7.072m2.828 9.9a9 9 0 000-12.728" })
                        )
                    )
                ),
                React.createElement("button", {
                    onClick: handleShare,
                    className: "text-gray-500 hover:text-cyan-400 transition-colors p-2 -m-2 rounded-full hover:bg-gray-800/50",
                    "aria-label": "Share article",
                    title: "Share article"
                },
                    React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" })
                    )
                )
            )
        )
    );
};

interface NewsModalProps {
    article: NewsArticle | null;
    onClose: () => void;
}
const NewsModal: React.FC<NewsModalProps> = ({ article, onClose }) => {
    // (Same component code as src/components/NewsModal.tsx but inlined)
    // Converting to JSX to fix the React.createElement(React.Fragment... issue reported in NewsModal.tsx which is copy-pasted here)
    const getCategoryTagStyle = (category: string) => {
        switch (category) {
            case 'AI': return 'bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20';
            case 'OS': return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20';
            case 'Gadgets': return 'bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20';
            default: return 'bg-gray-500/10 text-gray-400 ring-1 ring-inset ring-gray-500/20';
        }
    };
    const getCategoryShadowStyle = (category: string) => {
        switch (category) {
            case 'AI': return 'shadow-violet-900/20';
            case 'OS': return 'shadow-emerald-900/20';
            case 'Gadgets': return 'shadow-amber-900/20';
            default: return 'shadow-gray-900/20';
        }
    };
    
    const relativeTime = useRelativeTime(article?.timestamp || new Date().toISOString());
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);
    if (!article) return null;

    const handleShare = async () => {
        let urlToShare = window.location.href;
        const sourceUri = article.groundingSources?.[0]?.uri;
        if (sourceUri) {
            try {
                const parsedUrl = new URL(sourceUri);
                if (['http:', 'https:'].includes(parsedUrl.protocol)) urlToShare = parsedUrl.href;
            } catch (err) { }
        }
        const shareData = { title: article.headline, text: article.summary, url: urlToShare };
        try {
            if (navigator.share) await navigator.share(shareData);
            else { await navigator.clipboard.writeText(`${article.headline}\n\n${urlToShare}`); alert('Article link copied to clipboard!'); }
        } catch (err) { }
    };
    const sourceLink = article.groundingSources?.[0]?.uri;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className={`bg-[#111] border border-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col ${getCategoryShadowStyle(article.category)}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 md:p-8 flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                             <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                                <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{article.source}</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${getCategoryTagStyle(article.category)}`}>
                                    {article.category}
                                </span>
                                <span className="text-xs text-gray-500">{relativeTime}</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">{article.headline}</h1>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="overflow-y-auto px-6 md:px-8">
                    <div className="space-y-4 text-gray-300"><p className="font-semibold text-gray-200">{article.summary}</p><p className="whitespace-pre-wrap">{article.fullArticle}</p></div>
                    {article.groundingSources && article.groundingSources.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-800">
                            <h3 className="text-sm font-semibold text-gray-400 mb-3">Sources:</h3>
                            <ul className="space-y-2">{article.groundingSources.map((source, index) => (<li key={index}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-400 text-xs transition-colors line-clamp-1" title={source.title}>{source.title || source.uri}</a></li>))}</ul>
                        </div>
                    )}
                </div>
                <div className="mt-6 p-6 md:p-8 border-t border-gray-800 flex-shrink-0 flex items-center justify-end gap-4">
                    {sourceLink && (<a href={sourceLink} target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-cyan-400 font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">Read Full Article</a>)}
                    <button onClick={handleShare} className="bg-cyan-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-cyan-500 transition-colors flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                        Share
                    </button>
                </div>
            </div>
        </div>
    );
};

interface UpcomingLaunchesTimelineProps {
    data: LaunchDate[];
}
const UpcomingLaunchesTimeline: React.FC<UpcomingLaunchesTimelineProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return React.createElement("div", { className: "text-center text-gray-500 py-16" }, "No upcoming launch data available.");
    }
    
    return (
        React.createElement("div", { className: "relative max-w-3xl mx-auto py-8" },
            React.createElement("div", { className: "absolute top-0 h-full w-0.5 bg-gray-800 left-1/2 -translate-x-1/2" }),
            
            data.slice().reverse().map((item, index) => {
                const isRightSide = index % 2 !== 0;

                return (
                    React.createElement("div", { key: index, className: "relative flex justify-center items-start mb-12" },
                        React.createElement("div", { className: "absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-black rounded-full border-4 border-cyan-500 z-10 flex items-center justify-center" },
                           React.createElement("div", { className: "w-2 h-2 bg-cyan-500 rounded-full animate-pulse" })
                        ),

                        React.createElement("div", { className: `w-1/2 ${isRightSide ? 'pl-8' : 'pr-8'}` },
                             React.createElement("div", { className: `absolute top-3 w-[calc(50%-12px)] h-0.5 bg-gray-800 ${isRightSide ? 'left-1/2' : 'right-1/2'}` }),

                            React.createElement("div", { className: `p-4 rounded-lg bg-[#1A1A1A] border border-gray-800 shadow-lg shadow-cyan-900/10 text-left ${isRightSide ? 'ml-auto' : 'mr-auto'}` },
                                React.createElement("p", { className: "text-sm font-bold text-cyan-400 mb-2" }, item.date),
                                React.createElement("div", { className: "space-y-3" },
                                    item.launches.map((launch, launchIndex) => (
                                        React.createElement("div", { key: launchIndex },
                                            React.createElement("div", { className: "flex items-center gap-2" },
                                                React.createElement("h3", { className: "text-lg font-bold text-white leading-tight" },
                                                    launch.brand, " ", React.createElement("span", { className: "font-normal" }, launch.model)
                                                ),
                                                React.createElement("span", { className: "text-[10px] font-bold text-black bg-cyan-400 px-1.5 py-0.5 rounded-full whitespace-nowrap" },
                                                    launch.category
                                                )
                                            ),
                                            launch.description && React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, launch.description)
                                        )
                                    ))
                                )
                            )
                        ),

                         React.createElement("div", { className: `w-1/2 ${isRightSide ? 'order-first pr-8' : 'pl-8'}` })
                    )
                );
            })
        )
    );
};

interface NewsletterModalProps {
    isOpen: boolean;
    onClose: () => void;
    articles: NewsArticle[];
}
const NewsletterModal: React.FC<NewsletterModalProps> = ({ isOpen, onClose, articles }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const [emailBody, setEmailBody] = useState<string | undefined>(undefined);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);
    
    useEffect(() => {
        if (isOpen) { setStatus('idle'); setEmail(''); setMessage(''); setEmailBody(undefined); }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || status === 'loading') return;
        setStatus('loading'); setMessage('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { setStatus('error'); setMessage('Please enter a valid email address.'); return; }
        const result = await subscribeToNewsletter(email, articles);
        if (result.success) { setStatus('success'); setMessage(result.message); setEmailBody(result.emailBody); } 
        else { setStatus('error'); setMessage(result.message); setEmailBody(undefined); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-[#111] border border-gray-800 rounded-lg shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-800 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                        <div><h2 className="text-xl font-bold text-white">Subscribe to Grid7 Weekly</h2><p className="text-sm text-gray-400">Get the biggest tech stories delivered to your inbox.</p></div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors ml-4 p-1 -mt-2 -mr-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                {status !== 'success' ? (
                     <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div><label htmlFor="email-address" className="sr-only">Email address</label><input id="email-address" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-900 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" placeholder="Enter your email" /></div>
                         {status === 'error' && <p className="text-sm text-red-400">{message}</p>}
                        <div><button type="submit" disabled={status === 'loading'} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-wait">{status === 'loading' ? 'Subscribing...' : 'Subscribe'}</button></div>
                    </form>
                ) : (
                    <div className="mt-6 text-left">
                        <h3 className="text-lg font-semibold text-emerald-400 text-center">All Set!</h3>
                        <p className="text-gray-300 mt-2 text-center mb-6">{message}</p>
                        {emailBody && (<div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-sm"><p className="text-gray-500">To: <span className="text-gray-300">{email}</span></p><p className="text-gray-500 mb-3">Subject: <span className="text-gray-300">Welcome to Grid7 Weekly!</span></p><div className="border-t border-gray-700 pt-3"><p className="text-gray-300 whitespace-pre-wrap">{emailBody}</p></div></div>)}
                        <button onClick={onClose} className="mt-6 w-full bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main App Component (from src/App.tsx) ---
const App = () => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [launches, setLaunches] = useState<LaunchDate[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [visibleArticleCount, setVisibleArticleCount] = useState(10);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<'news' | 'launches'>('news');
    const [activeNewsCategory, setActiveNewsCategory] = useState('All');
    const [showSplash, setShowSplash] = useState(true);
    const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
    
    const [audioLoadingArticleId, setAudioLoadingArticleId] = useState<string | null>(null);
    const [audioPlayingArticleId, setAudioPlayingArticleId] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioCacheRef = useRef(new Map<string, AudioBuffer>());

    const CategoryIcons: { [key: string]: React.ReactElement } = {
        All: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" })),
        AI: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" })),
        OS: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" })),
        Gadgets: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" })),
        Other: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" })),
    };
    
    const getCategoryChipStyle = (category: string, isActive: boolean) => {
        const styles: { [key: string]: { active: string; inactive: string } } = {
            All: { active: 'bg-cyan-500 text-black', inactive: 'text-cyan-400 bg-cyan-900/40 hover:bg-cyan-900/70' },
            AI: { active: 'bg-violet-500 text-white', inactive: 'text-violet-400 bg-violet-900/40 hover:bg-violet-900/70' },
            OS: { active: 'bg-emerald-500 text-white', inactive: 'text-emerald-400 bg-emerald-900/40 hover:bg-emerald-900/70' },
            Gadgets: { active: 'bg-amber-500 text-black', inactive: 'text-amber-400 bg-amber-900/40 hover:bg-amber-900/70' },
            Other: { active: 'bg-gray-500 text-white', inactive: 'text-gray-400 bg-gray-800/40 hover:bg-gray-800/70' },
        };
        return isActive ? styles[category].active : styles[category].inactive;
    };


    useEffect(() => {
        // Fix: Cast to AudioContext to satisfy type checker
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }) as AudioContext;
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => {
            clearTimeout(timer);
            audioContextRef.current?.close();
        };
    }, []);

    useEffect(() => {
        const loadInitialDataFromCache = async () => {
            setIsInitialLoading(true);
            
            const cachedArticles = await fetchTechNews();
            if (cachedArticles && cachedArticles.length > 0) {
                setArticles(cachedArticles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            } else {
                setArticles(STATIC_NEWS);
            }

            const cachedLaunches = await fetchUpcomingLaunches();
            if (cachedLaunches && cachedLaunches.length > 0) {
                setLaunches(cachedLaunches);
            } else {
                setLaunches(STATIC_LAUNCHES);
            }

            setIsInitialLoading(false);
        };
        loadInitialDataFromCache();
    }, []);

    const handleSelectArticle = (article: NewsArticle) => setSelectedArticle(article);
    const handleCloseModal = () => setSelectedArticle(null);

    const handleLoadMore = () => {
        setVisibleArticleCount(prevCount => prevCount + 10);
    };

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        setError(null);

        if (activeCategory === 'news') {
            try {
                const fetchedArticles = await fetchTechNews(true);
                if (fetchedArticles) {
                    setArticles(fetchedArticles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                    setVisibleArticleCount(10);
                } else {
                     setError('Could not refresh news feed. API might be temporarily unavailable.');
                }
            } catch (err) {
                setError('Could not refresh news feed.');
                console.error("Failed to refresh news:", err);
            }
        } else if (activeCategory === 'launches') {
             try {
                const fetchedLaunches = await fetchUpcomingLaunches(true);
                if(fetchedLaunches) {
                    setLaunches(fetchedLaunches);
                } else {
                    setError('Could not refresh upcoming launches. API might be temporarily unavailable.');
                }
            } catch (err) {
                setError('Could not refresh upcoming launches.');
                console.error("Failed to refresh launches:", err);
            }
        }
        
        setIsRefreshing(false);
    };

    const playAudioBuffer = (buffer: AudioBuffer, articleId: string) => {
        if (!audioContextRef.current) return;
        
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.onended = null;
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        audioSourceRef.current = source;

        source.onended = () => {
            if (audioSourceRef.current === source) {
                 setAudioPlayingArticleId(null);
                 audioSourceRef.current = null;
            }
        };

        setAudioPlayingArticleId(articleId);
    };

    const handlePlayAudio = async (article: NewsArticle) => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
            if (audioPlayingArticleId === article.id) {
                setAudioPlayingArticleId(null);
                return;
            }
        }
        
        setAudioPlayingArticleId(null);

        if (audioCacheRef.current.has(article.id)) {
            const cachedBuffer = audioCacheRef.current.get(article.id)!;
            playAudioBuffer(cachedBuffer, article.id);
            return;
        }

        setAudioLoadingArticleId(article.id);
        try {
            const audioData = await generateSpeech(article.summary);
            if (audioData && audioContextRef.current) {
                const audioBuffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
                audioCacheRef.current.set(article.id, audioBuffer);
                playAudioBuffer(audioBuffer, article.id);
            }
        } catch (err) {
            console.error("Failed to play audio:", err);
        } finally {
            setAudioLoadingArticleId(null);
        }
    };

    const handleCategoryChange = (category: 'news' | 'launches') => {
        setActiveCategory(category);
    };
    
    const newsCategories = ['All', 'AI', 'OS', 'Gadgets', 'Other'];
    const filteredArticles = activeNewsCategory === 'All' 
        ? articles 
        : articles.filter(article => article.category === activeNewsCategory);
    
    const articlesToShow = filteredArticles.slice(0, visibleArticleCount);


    const renderContent = () => {
        if (isInitialLoading) {
            return (
                React.createElement("div", { className: "flex justify-center items-center h-[60vh]" },
                    React.createElement(LoadingSpinner, { message: "Loading from cache..." })
                )
            );
        }

        if (error) return React.createElement("div", { className: "text-center text-red-500" }, error);

        if (activeCategory === 'news') {
            return (
                <React.Fragment>
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        {newsCategories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveNewsCategory(category)}
                                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 transform hover:scale-105 ${
                                    getCategoryChipStyle(category, activeNewsCategory === category)
                                }`}
                            >
                                {CategoryIcons[category]}
                                <span>{category}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {articlesToShow.map((article) => (
                            <NewsCard 
                                key={article.id} 
                                article={article} 
                                onCardClick={() => handleSelectArticle(article)}
                                onPlayAudio={() => handlePlayAudio(article)}
                                isPlaying={audioPlayingArticleId === article.id}
                                isLoadingAudio={audioLoadingArticleId === article.id}
                            />
                        ))}
                    </div>
                    {visibleArticleCount < filteredArticles.length && (
                        <div className="mt-8 text-center">
                            <button onClick={handleLoadMore} className="bg-gray-800 text-cyan-400 font-semibold px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                                Load More
                            </button>
                        </div>
                    )}
                </React.Fragment>
            );
        }

        if (activeCategory === 'launches') {
            return React.createElement(UpcomingLaunchesTimeline, { data: launches });
        }
        return null;
    };

    return (
        <React.Fragment>
            <SplashScreen isVisible={showSplash} />
            <div className={`min-h-screen text-white bg-[linear-gradient(to_right,rgba(26,26,26,0.8)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,26,26,0.8)_1px,transparent_1px)] bg-[size:2rem_2rem] animated-bg ${showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}>
                <Header 
                    activeCategory={activeCategory} 
                    onCategoryChange={handleCategoryChange}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    onNewsletterClick={() => setIsNewsletterModalOpen(true)}
                />
                <main className="p-4 md:p-8">
                    {renderContent()}
                </main>
                <NewsModal article={selectedArticle} onClose={handleCloseModal} />
                <NewsletterModal 
                    isOpen={isNewsletterModalOpen} 
                    onClose={() => setIsNewsletterModalOpen(false)}
                    articles={articles}
                />
            </div>
        </React.Fragment>
    );
};

// --- Render Logic (from src/main.tsx) ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);