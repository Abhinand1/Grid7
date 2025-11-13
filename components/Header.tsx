import React from 'react';

type Category = 'news' | 'launches';

interface HeaderProps {
    activeCategory: Category;
    onCategoryChange: (category: Category) => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    onNewsletterClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeCategory, onCategoryChange, onRefresh, isRefreshing, onNewsletterClick }) => {
    const getButtonClass = (category: Category) => {
        const baseClass = "px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300";
        if (activeCategory === category) {
            return `${baseClass} bg-cyan-500 text-black`;
        }
        return `${baseClass} bg-gray-800/50 text-gray-300 hover:bg-gray-700`;
    };

    return (
        <header className="py-4 px-4 md:px-8 sticky top-0 z-20 bg-black/50 backdrop-blur-sm border-b border-gray-900">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="relative flex items-end overflow-hidden p-4 -m-4">
                    <div className="header-texture"></div>
                    <h1 className="relative z-10 text-3xl font-bold font-spacemono headline-gradient">
                        <span className="logo-glow">Grid7</span>
                    </h1>
                    <p className="relative z-10 ml-1.5 mb-1 text-[8px] text-gray-500 font-sans whitespace-nowrap">
                        By Abhinand
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2 p-1 bg-gray-900 rounded-full">
                        <button onClick={() => onCategoryChange('news')} className={getButtonClass('news')}>
                            News
                        </button>
                        <button onClick={() => onCategoryChange('launches')} className={getButtonClass('launches')}>
                            Upcoming Launches
                        </button>
                    </div>
                     <button 
                        onClick={onRefresh} 
                        disabled={isRefreshing}
                        className="p-2.5 bg-gray-900 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Refresh News Feed"
                        title="Refresh News Feed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                    <button 
                        onClick={onNewsletterClick}
                        className="p-2.5 bg-gray-900 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition-all duration-300"
                        aria-label="Subscribe to newsletter"
                        title="Subscribe to newsletter"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;