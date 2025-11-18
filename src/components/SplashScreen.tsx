
import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
    isVisible: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        if (!isVisible) {
            const timer = setTimeout(() => setShouldRender(false), 600); // Match animation duration + buffer
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    if (!shouldRender) return null;

    const features = [
        "Live Breaking News",
        "AI-Generated Briefs",
        "Upcoming Tech Timelines",
        "Futuristic Interface"
    ];

    return (
        React.createElement("div", { className: `fixed inset-0 bg-black z-[100] flex flex-col justify-center items-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}` },
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
                            style: { animation: `fadeInUp 0.5s ease-out ${0.3 + index * 0.15}s forwards` }
                        },
                            feature
                        )
                    ))
                )
            )
        )
    );
};

export default SplashScreen;
