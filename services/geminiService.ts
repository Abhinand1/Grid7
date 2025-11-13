import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Article, TimelineData } from '../types';
import { STATIC_LAUNCHES } from "../static/launchesCache";
import { STATIC_NEWS } from "../static/newsCache";

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

const processApiResponse = (response: any, articles: any[]): Article[] => {
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: { uri: string; title: string }[] = [];
    if (groundingChunks) {
        for (const chunk of groundingChunks) {
            if (chunk.web) {
                sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
            }
        }
    }
    return articles.map((article: Partial<Article>, index: number) => ({
        ...article,
        id: `${article.source}-${article.headline?.slice(0, 10)}-${index}`,
        groundingSources: sources,
        category: article.category || 'Other',
    })) as Article[];
};

export const fetchTechNews = async (): Promise<Article[]> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not set. Using mock news data.");
        return Promise.resolve(STATIC_NEWS);
    }
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: "You are a professional tech journalist. Find the latest, impactful breaking news in tech and write compelling articles. Respond only with the requested JSON.",
                tools: [{googleSearch: {}}],
            },
            contents: `Find and generate a list of 10 of the most significant breaking technology news stories from the last 24 hours. For each story, provide: a source (publication name), a compelling headline, a 1-2 sentence summary, a longer multi-paragraph full article, a timestamp in ISO 8601 format, and a category from one of the following: 'AI', 'OS', 'Gadgets', 'Other'. Return a valid JSON array of objects without markdown.`,
        });
        const articles = parseAndCleanJson(response.text);
        return processApiResponse(response, articles);
    } catch (error) {
        console.error("Error fetching tech news:", error);
        return STATIC_NEWS;
    }
};

export const fetchMoreTechNews = async (existingHeadlines: string[]): Promise<Article[]> => {
     if (!process.env.API_KEY) return [];
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: "You are a professional tech journalist. Find recent, impactful tech news and write compelling articles. Exclude any topics from the provided list. Respond only with the requested JSON.",
                tools: [{googleSearch: {}}],
            },
            contents: `Find and generate a list of 5 more significant technology news stories.
IMPORTANT: Do NOT include stories with the following headlines: ${JSON.stringify(existingHeadlines)}.
For each new story, provide: a source, a headline, a summary, a full article, a timestamp (ISO 8601), and a category from one of the following: 'AI', 'OS', 'Gadgets', 'Other'.
Return a valid JSON array of objects without markdown.`,
        });
        const articles = parseAndCleanJson(response.text);
        return processApiResponse(response, articles);
    } catch (error) {
        console.error("Error fetching more tech news:", error);
        return [];
    }
};

export const fetchUpcomingLaunches = async (): Promise<TimelineData[]> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not set. Using mock launch data.");
        return Promise.resolve(STATIC_LAUNCHES);
    }
     try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
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
        });
        return parseAndCleanJson(response.text);
    } catch (error) {
        console.error("Error fetching upcoming launches:", error);
        return STATIC_LAUNCHES;
    }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
    if (!process.env.API_KEY) {
        console.warn("API_KEY not set. Cannot generate speech.");
        return null;
    }
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A clear, professional female voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};

export const subscribeToNewsletter = async (email: string, news: Article[]): Promise<{ success: boolean, message: string, emailBody?: string }> => {
    // 1. In a real app, this would save the email to a database.
    console.log(`Subscribing ${email} to the newsletter.`);

    if (!process.env.API_KEY) {
        console.warn("API_KEY not set. Cannot generate newsletter sample.");
        return { success: false, message: "Subscription service is currently unavailable." };
    }

    // 2. Generate the sample newsletter content using the latest news.
    try {
        const headlines = news.slice(0, 5).map(a => `- ${a.headline}`).join('\n');
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are the editor for the Grid7 tech newsletter. Write a friendly confirmation email for a new subscriber. Welcome them and provide a brief summary of today's top 5 tech stories as a sample. Here are the headlines:\n\n${headlines}\n\nKeep it concise and engaging. The email should be in plain text. Sign off as 'The Grid7 Team'.`
        });

        const emailBody = response.text;

        // 3. In a real app, you'd use a service like SendGrid to send the email.
        console.log("---- SIMULATED EMAIL TO " + email + " ----");
        console.log("Subject: Welcome to Grid7 Weekly!");
        console.log(emailBody);
        console.log("------------------------------------------");

        return { success: true, message: "Subscription successful! Here's a preview of the confirmation email.", emailBody };

    } catch (error) {
        console.error("Error in newsletter subscription process:", error);
        // Fallback for user, even if AI call fails
        return { success: true, message: `Subscription successful for ${email}! You're on the list.` };
    }
};