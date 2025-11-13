import React from 'react';

interface SplashScreenProps {
    isVisible: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
    if (!isVisible) return null;

    const features = [
        "Live Breaking News",
        "AI-Generated Briefs",
        "Upcoming Tech Timelines",
        "Futuristic Interface"
    ];

    return (
        <div className={`fixed inset-0 bg-black z-[100] flex flex-col justify-center items-center ${isVisible ? '' : 'animate-fadeOut'}`}>
            <div className="flex flex-col items-center gap-4 animate-fadeInUp">
                <div className="flex items-end">
                    <h1 className="text-5xl md:text-6xl font-bold font-spacemono headline-gradient">
                        <span className="logo-glow">Grid7</span>
                    </h1>
                     <p className="ml-1.5 mb-1.5 text-[10px] text-gray-500 font-sans whitespace-nowrap">
                        By Abhinand
                    </p>
                </div>
                <div className="mt-4 text-center">
                    {features.map((feature, index) => (
                        <p 
                            key={index}
                            className="text-gray-400 text-sm md:text-base opacity-0"
                            style={{ animation: `fadeInUp 0.5s ease-out ${0.5 + index * 0.2}s forwards` }}
                        >
                            {feature}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;