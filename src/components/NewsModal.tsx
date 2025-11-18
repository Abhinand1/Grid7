import React, { useEffect } from 'react';
import { NewsArticle } from '../types';
import useRelativeTime from '../hooks/useRelativeTime';

interface NewsModalProps {
    article: NewsArticle | null;
    onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ article, onClose }) => {
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
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!article) {
        return null;
    }

    const handleShare = async () => {
        let urlToShare = window.location.href; // Default to a known valid URL
        const sourceUri = article.groundingSources?.[0]?.uri;

        if (sourceUri) {
            try {
                const parsedUrl = new URL(sourceUri);
                if (['http:', 'https:'].includes(parsedUrl.protocol)) {
                    urlToShare = parsedUrl.href;
                } else {
                     console.warn(`Unsupported protocol for sharing: "${parsedUrl.protocol}". Falling back to the main app URL.`);
                }
            } catch (err) {
                console.warn(`Invalid source URL provided for sharing: "${sourceUri}". Falling back to the main app URL.`);
            }
        }
        
        const shareData = {
            title: article.headline,
            text: article.summary,
            url: urlToShare,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${article.headline}\n\n${urlToShare}`);
                alert('Article link copied to clipboard!');
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                 // Silently ignore user cancellation of the share dialog.
            } else {
                console.error('Error sharing:', err);
                alert('Could not share article.');
            }
        }
    };

    const sourceLink = article.groundingSources?.[0]?.uri;

    return (
        React.createElement("div", { 
            className: "fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4",
            onClick: onClose
        },
            React.createElement("div", { 
                className: `bg-[#111] border border-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col ${getCategoryShadowStyle(article.category)}`,
                onClick: (e) => e.stopPropagation()
            },
                React.createElement("div", { className: "p-6 md:p-8 flex-shrink-0" },
                    React.createElement("div", { className: "flex justify-between items-start mb-4" },
                        React.createElement("div", { className: "flex-1" },
                             React.createElement("div", { className: "flex items-center flex-wrap gap-x-3 gap-y-1 mb-2" },
                                React.createElement("span", { className: "text-sm font-semibold text-cyan-400 uppercase tracking-wider" }, article.source),
                                React.createElement("span", { className: `text-xs font-bold px-2 py-1 rounded-full ${getCategoryTagStyle(article.category)}` },
                                    article.category
                                ),
                                React.createElement("span", { className: "text-xs text-gray-500" }, relativeTime)
                            ),
                            React.createElement("h1", { className: "text-2xl md:text-3xl font-bold text-white" },
                                article.headline
                            )
                        ),
                        React.createElement("button", { onClick: onClose, className: "text-gray-500 hover:text-white transition-colors ml-4" },
                            React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-7 w-7", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
                            )
                        )
                    )
                ),
                
                React.createElement("div", { className: "overflow-y-auto px-6 md:px-8" },
                    React.createElement("div", { className: "space-y-4 text-gray-300" },
                        React.createElement("p", { className: "font-semibold text-gray-200" }, article.summary),
                        React.createElement("p", { className: "whitespace-pre-wrap" }, article.fullArticle)
                    ),

                    article.groundingSources && article.groundingSources.length > 0 && (
                        React.createElement("div", { className: "mt-6 pt-4 border-t border-gray-800" },
                            React.createElement("h3", { className: "text-sm font-semibold text-gray-400 mb-3" }, "Sources:"),
                            React.createElement("ul", { className: "space-y-2" },
                                article.groundingSources.map((source, index) => (
                                    React.createElement("li", { key: index },
                                        React.createElement("a", { 
                                            href: source.uri, 
                                            target: "_blank", 
                                            rel: "noopener noreferrer",
                                            className: "text-cyan-500 hover:text-cyan-400 text-xs transition-colors line-clamp-1",
                                            title: source.title
                                        },
                                            source.title || source.uri
                                        )
                                    )
                                ))
                            )
                        )
                    )
                ),

                React.createElement("div", { className: "mt-6 p-6 md:p-8 border-t border-gray-800 flex-shrink-0 flex items-center justify-end gap-4" },
                    sourceLink && (
                         React.createElement("a", { 
                            href: sourceLink, 
                            target: "_blank", 
                            rel: "noopener noreferrer",
                            className: "bg-gray-800 text-cyan-400 font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                        },
                            "Read Full Article"
                        )
                    ),
                    React.createElement("button", { 
                        onClick: handleShare,
                        className: "bg-cyan-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-cyan-500 transition-colors flex items-center gap-2"
                    },
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" })
                        ),
                        "Share"
                    )
                )
            )
        )
    );
};

export default NewsModal;
