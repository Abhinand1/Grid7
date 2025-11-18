
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
    const getCategoryTagStyle = (category: string) => {
        switch (category) {
            case 'AI': return 'bg-violet-500/10 text-violet-400 border border-violet-500/30';
            case 'OS': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
            case 'Gadgets': return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
            default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
        }
    };

    const getCategoryHoverStyle = (category: string) => {
        switch (category) {
            case 'AI': return 'group-hover:border-violet-500/50 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]';
            case 'OS': return 'group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]';
            case 'Gadgets': return 'group-hover:border-amber-500/50 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]';
            default: return 'group-hover:border-cyan-500/50 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]';
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
                alert('Link copied!');
            }
        } catch (err) {
             // ignore
        }
    };
    
    const handleVoiceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlayAudio();
    };

    return (
        React.createElement("div", { 
            className: `group relative flex flex-col justify-between p-5 bg-[#121212]/80 backdrop-blur-sm border border-gray-800 rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden ${getCategoryHoverStyle(article.category)}`
        },
            React.createElement("div", { className: "absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" }),
            
            React.createElement("div", { onClick: onCardClick, className: "cursor-pointer z-10" },
                React.createElement("div", { className: "flex justify-between items-start mb-3 gap-2" },
                     React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                         React.createElement("span", { className: `inline-block text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap uppercase tracking-wider ${getCategoryTagStyle(article.category)}` },
                           article.category
                        ),
                        React.createElement("span", { className: "text-[10px] font-semibold text-gray-500 uppercase tracking-widest" }, article.source),
                    ),
                    React.createElement("span", { className: "text-[10px] text-gray-500 flex-shrink-0" }, relativeTime)
                ),
                React.createElement("h2", { className: "text-lg font-bold text-gray-100 group-hover:text-white transition-colors duration-300 mb-2 leading-snug" },
                    article.headline
                ),
                React.createElement("p", { className: "text-sm text-gray-400 line-clamp-3 leading-relaxed" },
                    article.summary
                )
            ),
             React.createElement("div", { className: "mt-4 flex justify-between items-center z-10 border-t border-gray-800 pt-3" },
                React.createElement("button", {
                    onClick: handleVoiceClick,
                    className: "flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-cyan-400 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-gray-800/50 disabled:opacity-50",
                    disabled: isLoadingAudio
                },
                    isLoadingAudio ? (
                        React.createElement(React.Fragment, null,
                            React.createElement("svg", { className: "h-3.5 w-3.5 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" },
                                React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
                                React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
                            ),
                            "Loading..."
                        )
                    ) : isPlaying ? (
                        React.createElement(React.Fragment, null,
                             React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-3.5 w-3.5 text-cyan-400 animate-pulse", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                                React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 10v4m4-4v4m4-4v4m4-4v4" })
                            ),
                            "Playing"
                        )
                    ) : (
                        React.createElement(React.Fragment, null,
                            React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-3.5 w-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                                React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.93 8.464a5 5 0 000 7.072m2.828 9.9a9 9 0 000-12.728" })
                            ),
                            "Listen"
                        )
                    )
                ),
                React.createElement("button", {
                    onClick: handleShare,
                    className: "text-gray-500 hover:text-cyan-400 transition-colors p-1.5 -mr-1.5 rounded-lg hover:bg-gray-800/50",
                },
                    React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                        React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" })
                    )
                )
            )
        )
    );
};

export default NewsCard;
