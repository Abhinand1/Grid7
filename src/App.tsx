import React, { useState, useEffect, useRef } from 'react';
import { NewsArticle, LaunchDate } from './types';
import { fetchTechNews, fetchUpcomingLaunches, generateSpeech, cache } from './services/geminiService';
import { STATIC_NEWS } from './static/newsCache';
import { STATIC_LAUNCHES } from './static/launchesCache';
import { decode, decodeAudioData } from './utils/audioUtils';

import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import NewsCard from './components/NewsCard';
import NewsModal from './components/NewsModal';
import UpcomingLaunchesTimeline from './components/UpcomingLaunchesTimeline';
import NewsletterModal from './components/NewsletterModal';

const App = () => {
    // Initialize state synchronously from cache to ensure instant render and no white flashes
    const [articles, setArticles] = useState<NewsArticle[]>(() => {
        try {
            const cached = cache.get('techNews', 6 * 60 * 60 * 1000);
            return (cached as NewsArticle[]) || STATIC_NEWS;
        } catch (e) {
            return STATIC_NEWS;
        }
    });
    
    const [launches, setLaunches] = useState<LaunchDate[]>(() => {
        try {
            const cached = cache.get('upcomingLaunches', 24 * 60 * 60 * 1000);
            return (cached as LaunchDate[]) || STATIC_LAUNCHES;
        } catch (e) {
            return STATIC_LAUNCHES;
        }
    });

    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [visibleArticleCount, setVisibleArticleCount] = useState(8);
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
        All: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-3 w-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" })),
        AI: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-3 w-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" })),
        OS: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-3 w-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" })),
        Gadgets: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-3 w-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" })),
        Other: React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-3 w-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" })),
    };
    
    const getCategoryChipStyle = (category: string, isActive: boolean) => {
        const base = "border transition-all duration-300";
        const styles: { [key: string]: { active: string; inactive: string } } = {
            All: { active: 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]', inactive: 'border-gray-800 text-gray-400 hover:border-cyan-500/50 hover:text-cyan-400' },
            AI: { active: 'bg-violet-500/20 border-violet-500 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.3)]', inactive: 'border-gray-800 text-gray-400 hover:border-violet-500/50 hover:text-violet-400' },
            OS: { active: 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]', inactive: 'border-gray-800 text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400' },
            Gadgets: { active: 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]', inactive: 'border-gray-800 text-gray-400 hover:border-amber-500/50 hover:text-amber-400' },
            Other: { active: 'bg-gray-500/20 border-gray-500 text-gray-300 shadow-[0_0_10px_rgba(107,114,128,0.3)]', inactive: 'border-gray-800 text-gray-400 hover:border-gray-500/50 hover:text-gray-400' },
        };
        return `${base} ${isActive ? styles[category].active : styles[category].inactive}`;
    };

    useEffect(() => {
        // Robust AudioContext initialization
        const initAudio = () => {
             const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
             if (AudioContextClass) {
                 try {
                      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
                 } catch (e) {
                      console.warn("AudioContext failed to initialize", e);
                 }
             }
        };
        initAudio();

        // Ensure splash screen always disappears
        const timer = setTimeout(() => setShowSplash(false), 1800);
        
        return () => {
            clearTimeout(timer);
            if (audioContextRef.current?.state !== 'closed') {
                 audioContextRef.current?.close().catch(() => {});
            }
        };
    }, []);

    useEffect(() => {
        const refreshData = async () => {
             try {
                 const freshNews = await fetchTechNews(false);
                 if (freshNews) {
                     setArticles(prev => {
                         // Simple check to avoid re-render if first article ID matches
                         if (freshNews[0]?.id !== prev[0]?.id) {
                             return freshNews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                         }
                         return prev;
                     });
                 }
                 
                 const freshLaunches = await fetchUpcomingLaunches(false);
                 if (freshLaunches) {
                     setLaunches(freshLaunches);
                 }
             } catch (e) {
                 console.error("Background refresh failed", e);
             }
        };
        refreshData();
    }, []);

    const handleSelectArticle = (article: NewsArticle) => setSelectedArticle(article);
    const handleCloseModal = () => setSelectedArticle(null);
    const handleLoadMore = () => setVisibleArticleCount(prev => prev + 8);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        setError(null);

        try {
            if (activeCategory === 'news') {
                const fetchedArticles = await fetchTechNews(true);
                if (fetchedArticles) {
                    setArticles(fetchedArticles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                    setVisibleArticleCount(8);
                } else {
                    throw new Error("Network");
                }
            } else {
                 const fetchedLaunches = await fetchUpcomingLaunches(true);
                 if (fetchedLaunches) setLaunches(fetchedLaunches);
            }
        } catch (e) {
             setError('Could not refresh data. Showing cached content.');
             setTimeout(() => setError(null), 3000);
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

        // Lazy init if not already available
        if (!audioContextRef.current) {
             const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
             if (AudioContextClass) {
                 audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
             }
        }
        
        if (audioContextRef.current?.state === 'suspended') {
            try {
                await audioContextRef.current.resume();
            } catch (e) {
                console.error("Failed to resume audio context", e);
            }
        }

        if (audioCacheRef.current.has(article.id)) {
            playAudioBuffer(audioCacheRef.current.get(article.id)!, article.id);
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
            console.error("Audio error", err);
        } finally {
            setAudioLoadingArticleId(null);
        }
    };

    const filteredArticles = activeNewsCategory === 'All' 
        ? articles 
        : articles.filter(article => article.category === activeNewsCategory);
    
    const articlesToShow = filteredArticles.slice(0, visibleArticleCount);

    const renderContent = () => {
        if (activeCategory === 'news') {
            return (
                <React.Fragment>
                    <div className="mb-8 flex flex-wrap justify-center md:justify-start items-center gap-3">
                        {newsCategories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveNewsCategory(category)}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-full ${
                                    getCategoryChipStyle(category, activeNewsCategory === category)
                                }`}
                            >
                                {CategoryIcons[category]}
                                <span>{category}</span>
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                        <div className="mt-12 text-center">
                            <button 
                                onClick={handleLoadMore} 
                                className="group relative inline-flex items-center justify-center px-8 py-3 text-sm font-bold text-white transition-all duration-200 bg-gray-900 border border-gray-700 rounded-full hover:bg-gray-800 hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
                            >
                                <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-md" />
                                <span className="relative">Load More Stories</span>
                            </button>
                        </div>
                    )}
                </React.Fragment>
            );
        }

        if (activeCategory === 'launches') {
            return <UpcomingLaunchesTimeline data={launches} />;
        }
        return null;
    };

    const newsCategories = ['All', 'AI', 'OS', 'Gadgets', 'Other'];

    return (
        <React.Fragment>
            <SplashScreen isVisible={showSplash} />
            <div className={`min-h-screen animated-bg ${showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-1000'}`}>
                <Header 
                    activeCategory={activeCategory} 
                    onCategoryChange={setActiveCategory}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    onNewsletterClick={() => setIsNewsletterModalOpen(true)}
                />
                <main className="p-4 md:p-8 max-w-7xl mx-auto min-h-[80vh]">
                    {error && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-900/80 backdrop-blur border border-red-500 text-white px-6 py-3 rounded-full shadow-xl z-50 animate-fadeInUp">
                            {error}
                        </div>
                    )}
                    {renderContent()}
                </main>
                <footer className="border-t border-gray-900/50 py-8 text-center text-gray-600 text-xs font-mono">
                    <p>Powered by Gemini 2.5 Flash</p>
                    <p className="mt-2">© 2025 Grid7. All systems nominal.</p>
                </footer>
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

export default App;
