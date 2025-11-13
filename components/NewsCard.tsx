import React from 'react';
import { Article } from '../types';
import { useRelativeTime } from '../hooks/useRelativeTime';

interface NewsCardProps {
    article: Article;
    onCardClick: () => void;
    onPlayAudio: () => void;
    onPrefetchAudio: () => void;
    isPlaying: boolean;
    isLoadingAudio: boolean;
}

const getCategoryTagStyle = (category: Article['category']): string => {
    switch (category) {
        case 'AI': return 'bg-violet-500/10 text-violet-400 ring-1 ring-inset ring-violet-500/20';
        case 'OS': return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20';
        case 'Gadgets': return 'bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20';
        default: return 'bg-gray-500/10 text-gray-400 ring-1 ring-inset ring-gray-500/20';
    }
};

const getCategoryHoverStyle = (category: Article['category']): string => {
    switch (category) {
        case 'AI': return 'hover:border-violet-600 hover:shadow-violet-900/20';
        case 'OS': return 'hover:border-emerald-600 hover:shadow-emerald-900/20';
        case 'Gadgets': return 'hover:border-amber-600 hover:shadow-amber-900/20';
        default: return 'hover:border-gray-600 hover:shadow-gray-900/20';
    }
};

const NewsCard: React.FC<NewsCardProps> = ({ article, onCardClick, onPlayAudio, onPrefetchAudio, isPlaying, isLoadingAudio }) => {
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
        <div 
            className={`group flex flex-col justify-between p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${getCategoryHoverStyle(article.category)}`}
            onMouseEnter={onPrefetchAudio}
        >
            <div onClick={onCardClick} className="cursor-pointer">
                <div className="flex justify-between items-start mb-2 gap-2">
                     <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">{article.source}</span>
                         <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${getCategoryTagStyle(article.category)}`}>
                           {article.category}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{relativeTime}</span>
                </div>
                <h2 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors duration-300 mb-2 leading-tight">
                    {article.headline}
                </h2>
                <p className="text-sm text-gray-400 line-clamp-3">
                    {article.summary}
                </p>
            </div>
             <div className="mt-4 flex justify-between items-center">
                <button
                    onClick={handleVoiceClick}
                    className="text-gray-500 hover:text-cyan-400 transition-colors p-2 -m-2 rounded-full hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Listen to summary"
                    title="Listen to summary"
                    disabled={isLoadingAudio}
                >
                    {isLoadingAudio ? (
                        <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : isPlaying ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v4m4-4v4m4-4v4m4-4v4" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.93 8.464a5 5 0 000 7.072m2.828 9.9a9 9 0 000-12.728" />
                        </svg>
                    )}
                </button>
                <button
                    onClick={handleShare}
                    className="text-gray-500 hover:text-cyan-400 transition-colors p-2 -m-2 rounded-full hover:bg-gray-800/50"
                    aria-label="Share article"
                    title="Share article"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NewsCard;