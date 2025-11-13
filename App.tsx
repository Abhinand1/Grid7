import React, { useState, useEffect, useRef } from 'react';
import { Article, TimelineData } from './types';
import { fetchTechNews, fetchUpcomingLaunches, fetchMoreTechNews, generateSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import { STATIC_NEWS } from './static/newsCache';
import { STATIC_LAUNCHES } from './static/launchesCache';
import Header from './components/Header';
import NewsCard from './components/NewsCard';
import NewsModal from './components/NewsModal';
import LoadingSpinner from './components/LoadingSpinner';
import UpcomingLaunchesTimeline from './components/UpcomingLaunchesTimeline';
import SplashScreen from './components/SplashScreen';
import NewsletterModal from './components/NewsletterModal';

type Category = 'news' | 'launches';
type NewsCategory = Article['category'] | 'All';

// FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
const CategoryIcons: Record<NewsCategory, React.ReactElement> = {
    All: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    AI: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
    OS: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Gadgets: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Other: <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>,
};

const getCategoryChipStyle = (category: NewsCategory, isActive: boolean) => {
    const styles = {
        All: { active: 'bg-cyan-500 text-black', inactive: 'text-cyan-400 bg-cyan-900/40 hover:bg-cyan-900/70' },
        AI: { active: 'bg-violet-500 text-white', inactive: 'text-violet-400 bg-violet-900/40 hover:bg-violet-900/70' },
        OS: { active: 'bg-emerald-500 text-white', inactive: 'text-emerald-400 bg-emerald-900/40 hover:bg-emerald-900/70' },
        Gadgets: { active: 'bg-amber-500 text-black', inactive: 'text-amber-400 bg-amber-900/40 hover:bg-amber-900/70' },
        Other: { active: 'bg-gray-500 text-white', inactive: 'text-gray-400 bg-gray-800/40 hover:bg-gray-800/70' },
    };
    return isActive ? styles[category].active : styles[category].inactive;
};

const App: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>(() => {
        try {
            const cachedNews = localStorage.getItem('grid7-news');
            return cachedNews ? JSON.parse(cachedNews) : STATIC_NEWS;
        } catch { return STATIC_NEWS; }
    });
    const [launches, setLaunches] = useState<TimelineData[]>(() => {
        try {
            const cachedLaunchesRaw = localStorage.getItem('grid7-launches');
            if (!cachedLaunchesRaw) return STATIC_LAUNCHES;
            
            const cachedData = JSON.parse(cachedLaunchesRaw);
            // New format with timestamp
            if (cachedData.timestamp && cachedData.data) return cachedData.data;
            // Old format (array)
            if (Array.isArray(cachedData)) return cachedData;

            return STATIC_LAUNCHES;
        } catch { return STATIC_LAUNCHES; }
    });
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<Category>('news');
    const [activeNewsCategory, setActiveNewsCategory] = useState<NewsCategory>('All');
    const [showSplash, setShowSplash] = useState<boolean>(true);
    const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);

    // Audio state
    const [audioLoadingArticleId, setAudioLoadingArticleId] = useState<string | null>(null);
    const [audioPlayingArticleId, setAudioPlayingArticleId] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
    const prefetchingIdsRef = useRef<Set<string>>(new Set());


    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const timer = setTimeout(() => setShowSplash(false), 2000);
        return () => {
            clearTimeout(timer);
            audioContextRef.current?.close();
        };
    }, []);

    useEffect(() => {
        const loadFreshDataInBackground = async () => {
            try {
                const newsPromise = fetchTechNews();

                const cachedLaunchesRaw = localStorage.getItem('grid7-launches');
                let launchesPromise;
                let isLaunchesFromFreshFetch = true;

                if (cachedLaunchesRaw) {
                    try {
                        const cached = JSON.parse(cachedLaunchesRaw);
                        if (cached.timestamp && cached.data) {
                            const isCacheStale = Date.now() - cached.timestamp > 24 * 60 * 60 * 1000; // 1 day TTL
                            if (!isCacheStale) {
                                launchesPromise = Promise.resolve(cached.data);
                                isLaunchesFromFreshFetch = false;
                            }
                        }
                    } catch (e) { /* Invalid JSON, will refetch */ }
                }

                if (isLaunchesFromFreshFetch) {
                    launchesPromise = fetchUpcomingLaunches();
                }

                const [fetchedArticles, fetchedLaunches] = await Promise.all([newsPromise, launchesPromise]);

                setArticles(currentArticles => {
                    const currentIds = new Set(currentArticles.map(a => a.id));
                    const newArticles = fetchedArticles.filter(a => a.id && !currentIds.has(a.id));
                    if (newArticles.length === 0) return currentArticles;
                    const combined = [...newArticles, ...currentArticles].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    localStorage.setItem('grid7-news', JSON.stringify(combined));
                    return combined;
                });
                
                if (isLaunchesFromFreshFetch && fetchedLaunches.length > 0) {
                    const isStaticData = JSON.stringify(fetchedLaunches) === JSON.stringify(STATIC_LAUNCHES);
                    // Don't cache the static fallback data if the API call fails
                    if (!isStaticData) {
                        setLaunches(fetchedLaunches);
                        localStorage.setItem('grid7-launches', JSON.stringify({
                            timestamp: Date.now(),
                            data: fetchedLaunches
                        }));
                    }
                }
            } catch (err) {
                setError('Could not update live data.');
                console.error("Failed to fetch fresh data in background:", err);
            }
        };
        loadFreshDataInBackground();
    }, []);

    const handleSelectArticle = (article: Article) => setSelectedArticle(article);
    const handleCloseModal = () => setSelectedArticle(null);

    const handleLoadMore = async () => {
        setIsFetchingMore(true);
        try {
            const existingHeadlines = articles.map(a => a.headline);
            const moreArticles = await fetchMoreTechNews(existingHeadlines);
            if (moreArticles.length > 0) {
                 const updatedArticles = [...articles, ...moreArticles].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                 setArticles(updatedArticles);
                 localStorage.setItem('grid7-news', JSON.stringify(updatedArticles));
            }
        } catch (err) {
            console.error("Failed to fetch more articles", err);
        } finally {
            setIsFetchingMore(false);
        }
    };

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            const fetchedArticles = await fetchTechNews();
            setArticles(currentArticles => {
                const currentIds = new Set(currentArticles.map(a => a.id));
                const newArticles = fetchedArticles.filter(a => a.id && !currentIds.has(a.id));
                if (newArticles.length === 0) return currentArticles; // No new articles
                const combined = [...newArticles, ...currentArticles].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                localStorage.setItem('grid7-news', JSON.stringify(combined));
                return combined;
            });
        } catch (err) {
            setError('Could not refresh news feed.');
            console.error("Failed to refresh news:", err);
        } finally {
            setIsRefreshing(false);
        }
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

    const handlePrefetchAudio = async (article: Article) => {
        if (audioCacheRef.current.has(article.id) || prefetchingIdsRef.current.has(article.id)) {
            return;
        }

        try {
            prefetchingIdsRef.current.add(article.id);
            const audioData = await generateSpeech(article.summary);
            if (audioData && audioContextRef.current) {
                const audioBuffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
                audioCacheRef.current.set(article.id, audioBuffer);
            }
        } catch (err) {
            console.error("Failed to prefetch audio:", err);
        } finally {
            prefetchingIdsRef.current.delete(article.id);
        }
    };

    const handlePlayAudio = async (article: Article) => {
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
    
    const newsCategories: NewsCategory[] = ['All', 'AI', 'OS', 'Gadgets', 'Other'];
    const filteredArticles = activeNewsCategory === 'All' 
        ? articles 
        : articles.filter(article => article.category === activeNewsCategory);

    const renderContent = () => {
        if (error && articles.length === 0) return <div className="text-center text-red-500">{error}</div>;

        if (activeCategory === 'news') {
            return (
                <>
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
                        {filteredArticles.map((article) => (
                            <NewsCard 
                                key={article.id} 
                                article={article} 
                                onCardClick={() => handleSelectArticle(article)}
                                onPlayAudio={() => handlePlayAudio(article)}
                                onPrefetchAudio={() => handlePrefetchAudio(article)}
                                isPlaying={audioPlayingArticleId === article.id}
                                isLoadingAudio={audioLoadingArticleId === article.id}
                            />
                        ))}
                    </div>
                    {filteredArticles.length > 0 && (
                        <div className="mt-8 text-center">
                            <button onClick={handleLoadMore} disabled={isFetchingMore} className="bg-gray-800 text-cyan-400 font-semibold px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {isFetchingMore ? <LoadingSpinner /> : 'Load More'}
                            </button>
                        </div>
                    )}
                </>
            );
        }

        if (activeCategory === 'launches') {
             if (launches.length === 0) {
                return (
                    <div className="flex justify-center items-center h-[60vh]">
                        <LoadingSpinner message="Forecasting future tech..." />
                    </div>
                );
            }
            return <UpcomingLaunchesTimeline data={launches} />;
        }
        return null;
    };

    return (
        <>
            <SplashScreen isVisible={showSplash} />
            <div className={`min-h-screen text-white bg-[linear-gradient(to_right,rgba(26,26,26,0.8)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,26,26,0.8)_1px,transparent_1px)] bg-[size:2rem_2rem] animated-bg ${showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}>
                <Header 
                    activeCategory={activeCategory} 
                    onCategoryChange={setActiveCategory}
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
        </>
    );
};

export default App;