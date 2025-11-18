import React from 'react';
import { NewsArticle } from '../types';
import useRelativeTime from '../hooks/useRelativeTime';

interface NewsCardProps {
    article: NewsArticle;
    onCardClick: () => void;
    onPlayAudio: () => void;
    isPlaying: boolean;
    isLoadingAudio: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onCardClick, onPlayAudio, isPlaying, isLoadingAudio }) => {
    // Explicit mapping for Tailwind classes to ensure they are detected and applied
    const styleMap: Record<string, {
        badge: string;
        borderHover: string;
        textHover: string;
        glow: string;
        iconColor: string;
        loadingBg: string;
    }> = {
        AI: {
            badge: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
            borderHover: 'hover:border-violet-500/50',
            textHover: 'hover:text-violet-400',
            glow: 'from-violet-500/0 via-violet-500/10 to-violet-500/0',
            iconColor: 'bg-violet-400',
            loadingBg: 'bg-violet-400',
        },
        OS: {
            badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
            borderHover: 'hover:border-emerald-500/50',
            textHover: 'hover:text-emerald-400',
            glow: 'from-emerald-500/0 via-emerald-500/10 to-emerald-500/0',
            iconColor: 'bg-emerald-400',
            loadingBg: 'bg-emerald-400',
        },
        Gadgets: {
            badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
            borderHover: 'hover:border-amber-500/50',
            textHover: 'hover:text-amber-400',
            glow: 'from-amber-500/0 via-amber-500/10 to-amber-500/0',
            iconColor: 'bg-amber-400',
            loadingBg: 'bg-amber-400',
        },
        Other: {
            badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
            borderHover: 'hover:border-cyan-500/50',
            textHover: 'hover:text-cyan-400',
            glow: 'from-cyan-500/0 via-cyan-500/10 to-cyan-500/0',
            iconColor: 'bg-cyan-400',
            loadingBg: 'bg-cyan-400',
        }
    };

    const styles = styleMap[article.category] || styleMap['Other'];
    const relativeTime = useRelativeTime(article.timestamp);
    
    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        let urlToShare = window.location.href;
        const sourceUri = article.groundingSources?.[0]?.uri;

        if (sourceUri) {
            try {
                const parsedUrl = new URL(sourceUri);
                if (['http:', 'https:'].includes(parsedUrl.protocol)) urlToShare = parsedUrl.href;
            } catch (err) { /* fallback */ }
        }
        
        const shareData = { title: article.headline, text: article.summary, url: urlToShare };

        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(`${article.headline}\n\n${urlToShare}`);
                alert('Link copied!');
            }
        } catch (err) { /* ignore */ }
    };
    
    const handleVoiceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlayAudio();
    };

    return (
        <div className={`group relative flex flex-col justify-between p-6 bg-[#0a0a0a] border border-gray-800/60 rounded-xl ${styles.borderHover} transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] overflow-hidden`}>
            {/* Glowing background effect on hover */}
            <div className={`absolute -inset-px bg-gradient-to-r ${styles.glow} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none`} />

            <div onClick={onCardClick} className="relative z-10 cursor-pointer flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-4 gap-3">
                     <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${styles.badge}`}>
                           {article.category}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 uppercase truncate max-w-[100px]">{article.source}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-600 flex-shrink-0">{relativeTime}</span>
                </div>
                
                <h2 className="text-lg md:text-xl font-bold text-gray-100 group-hover:text-white transition-colors duration-300 mb-3 leading-tight">
                    {article.headline}
                </h2>
                
                <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed mb-4">
                    {article.summary}
                </p>
            </div>
            
             <div className="relative z-10 flex justify-between items-center pt-4 border-t border-gray-800/50">
                <button
                    onClick={handleVoiceClick}
                    className={`flex items-center gap-2 text-xs font-medium text-gray-500 ${styles.textHover} transition-colors px-2 py-1 -ml-2 rounded hover:bg-gray-800/50 disabled:opacity-50`}
                    disabled={isLoadingAudio}
                >
                    {isLoadingAudio ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-gray-500 animate-ping" />
                            Processing
                        </>
                    ) : isPlaying ? (
                        <>
                             <div className={`w-2 h-2 rounded-full ${styles.iconColor} animate-pulse shadow-[0_0_8px_currentColor]`} />
                            Playing
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.93 8.464a5 5 0 000 7.072m2.828 9.9a9 9 0 000-12.728" />
                            </svg>
                            Listen
                        </>
                    )}
                </button>
                
                <button
                    onClick={handleShare}
                    className={`text-gray-500 ${styles.textHover} transition-colors p-1.5 -mr-1.5 rounded hover:bg-gray-800/50`}
                    title="Share"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NewsCard;