
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
    // Initialize state synchronously from cache to ensure instant render (no loading spinner)
    const [articles, setArticles] = useState<NewsArticle[]>(() => {
        const cached = cache.get('techNews', 6 * 60 * 60 * 1000);
        return (cached as NewsArticle[]) || STATIC_NEWS;
    });
    
    const [launches, setLaunches] = useState<LaunchDate[]>(() => {
        const cached = cache.get('upcomingLaunches', 24 * 60 * 60 * 1000);
        return (cached as LaunchDate[]) || STATIC_LAUNCHES;
    });

    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
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
            All: { active: 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]', inactive: 'text-cyan-400 bg-cyan-900/20 hover:bg-cyan-900/40 border border-cyan-900/50' },
            AI: { active: 'bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]', inactive: 'text-violet-400 bg-violet-900/20 hover:bg-violet-900/40 border border-violet-900/50' },
            OS: { active: 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]', inactive: 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-900/50' },
            Gadgets: { active: 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]', inactive: 'text-amber-400 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-900/50' },
            Other: { active: 'bg-gray-500 text-white shadow-[0_0_15px_rgba(107,114,128,0.5)]', inactive: 'text-gray-400 bg-gray-800/20 hover:bg-gray-800/40 border border-gray-800/50' },
        };
        return isActive ? styles[category].active : styles[category].inactive;
    };

    useEffect(() => {
        // Initialize AudioContext safely
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            try {
                 audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            } catch (e) {
                 console.warn("AudioContext failed to initialize", e);
            }
        }
        
        const timer = setTimeout(() => setShowSplash(false), 1500);
        return () => {
            clearTimeout(timer);
            if (audioContextRef.current?.state !== 'closed') {
                 audioContextRef.current?.close().catch(() => {});
            }
        };
    }, []);

    // Background fetch to update stale data
    useEffect(() => {
        const refreshData = async () => {
             // Always attempt to fetch fresh news in background, but UI is already populated
             const freshNews = await fetchTechNews(false); // fetchTechNews handles cache logic internally
             if (freshNews) {
                 setArticles(prev => {
                     // Only update if different (simple length check or id check)
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
        };
        refreshData();
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
            const fetchedArticles = await fetchTechNews(true);
            if (fetchedArticles) {
                setArticles(fetchedArticles.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                setVisibleArticleCount(10);
            } else {
                setError('Network error. Showing cached data.');
                setTimeout(() => setError(null), 3000);
            }
        } else {
             const fetchedLaunches = await fetchUpcomingLaunches(true);
             if (fetchedLaunches) setLaunches(fetchedLaunches);
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

        if (!audioContextRef.current) {
             const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
             if (AudioContextClass) {
                 audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
             } else {
                 alert("Audio not supported");
                 return;
             }
        }

        // Resume context if suspended (browser policy)
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
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
        if (error) React.createElement("div", { className: "text-center text-red-400 mb-4 animate-pulse" }, error);

        if (activeCategory === 'news') {
            return (
                React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "mb-6 flex flex-wrap items-center gap-3" },
                        newsCategories.map(category => (
                            React.createElement("button", {
                                key: category,
                                onClick: () => setActiveNewsCategory(category),
                                className: `flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 transform hover:scale-105 ${
                                    getCategoryChipStyle(category, activeNewsCategory === category)
                                }`
                            },
                                CategoryIcons[category],
                                React.createElement("span", null, category)
                            )
                        ))
                    ),
                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" },
                        articlesToShow.map((article) => (
                            React.createElement(NewsCard, { 
                                key: article.id, 
                                article: article, 
                                onCardClick: () => handleSelectArticle(article),
                                onPlayAudio: () => handlePlayAudio(article),
                                isPlaying: audioPlayingArticleId === article.id,
                                isLoadingAudio: audioLoadingArticleId === article.id
                            })
                        ))
                    ),
                    visibleArticleCount < filteredArticles.length && (
                        React.createElement("div", { className: "mt-10 text-center" },
                            React.createElement("button", { 
                                onClick: handleLoadMore, 
                                className: "bg-gray-800/80 border border-gray-700 text-cyan-400 font-semibold px-8 py-3 rounded-full hover:bg-gray-700 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300" 
                            },
                                "Load More"
                            )
                        )
                    )
                )
            );
        }

        if (activeCategory === 'launches') {
            return React.createElement(UpcomingLaunchesTimeline, { data: launches });
        }
        return null;
    };

    return (
        React.createElement(React.Fragment, null,
            React.createElement(SplashScreen, { isVisible: showSplash }),
            React.createElement("div", { className: `min-h-screen text-white bg-[linear-gradient(to_right,rgba(26,26,26,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,26,26,0.5)_1px,transparent_1px)] bg-[size:3rem_3rem] animated-bg ${showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-700'}` },
                React.createElement(Header, { 
                    activeCategory: activeCategory, 
                    onCategoryChange: handleCategoryChange,
                    onRefresh: handleRefresh,
                    isRefreshing: isRefreshing,
                    onNewsletterClick: () => setIsNewsletterModalOpen(true)
                }),
                React.createElement("main", { className: "p-4 md:p-8 max-w-7xl mx-auto" },
                    error && React.createElement("div", { className: "bg-red-900/20 border border-red-500/50 text-red-200 p-3 rounded-lg mb-6 text-center" }, error),
                    renderContent()
                ),
                React.createElement(NewsModal, { article: selectedArticle, onClose: handleCloseModal }),
                React.createElement(NewsletterModal, { 
                    isOpen: isNewsletterModalOpen, 
                    onClose: () => setIsNewsletterModalOpen(false),
                    articles: articles
                })
            )
        )
    );
};

export default App;
