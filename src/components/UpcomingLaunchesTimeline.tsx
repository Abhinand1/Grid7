import React from 'react';
import { LaunchDate } from '../types';

interface UpcomingLaunchesTimelineProps {
    data: LaunchDate[];
}

const UpcomingLaunchesTimeline: React.FC<UpcomingLaunchesTimelineProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return React.createElement("div", { className: "text-center text-gray-500 py-16" }, "No upcoming launch data available.");
    }
    
    return (
        React.createElement("div", { className: "relative max-w-3xl mx-auto py-8" },
            React.createElement("div", { className: "absolute top-0 h-full w-0.5 bg-gray-800 left-1/2 -translate-x-1/2" }),
            
            data.slice().reverse().map((item, index) => {
                const isRightSide = index % 2 !== 0;

                return (
                    React.createElement("div", { key: index, className: "relative flex justify-center items-start mb-12" },
                        React.createElement("div", { className: "absolute left-1/2 -translate-x-1/2 w-6 h-6 bg-black rounded-full border-4 border-cyan-500 z-10 flex items-center justify-center" },
                           React.createElement("div", { className: "w-2 h-2 bg-cyan-500 rounded-full animate-pulse" })
                        ),

                        React.createElement("div", { className: `w-1/2 ${isRightSide ? 'pl-8' : 'pr-8'}` },
                             React.createElement("div", { className: `absolute top-3 w-[calc(50%-12px)] h-0.5 bg-gray-800 ${isRightSide ? 'left-1/2' : 'right-1/2'}` }),

                            React.createElement("div", { className: `p-4 rounded-lg bg-[#1A1A1A] border border-gray-800 shadow-lg shadow-cyan-900/10 text-left ${isRightSide ? 'ml-auto' : 'mr-auto'}` },
                                React.createElement("p", { className: "text-sm font-bold text-cyan-400 mb-2" }, item.date),
                                React.createElement("div", { className: "space-y-3" },
                                    item.launches.map((launch, launchIndex) => (
                                        React.createElement("div", { key: launchIndex },
                                            React.createElement("div", { className: "flex items-center gap-2" },
                                                React.createElement("h3", { className: "text-lg font-bold text-white leading-tight" },
                                                    launch.brand, " ", React.createElement("span", { className: "font-normal" }, launch.model)
                                                ),
                                                React.createElement("span", { className: "text-[10px] font-bold text-black bg-cyan-400 px-1.5 py-0.5 rounded-full whitespace-nowrap" },
                                                    launch.category
                                                )
                                            ),
                                            launch.description && React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, launch.description)
                                        )
                                    ))
                                )
                            )
                        ),

                         React.createElement("div", { className: `w-1/2 ${isRightSide ? 'order-first pr-8' : 'pl-8'}` })
                    )
                );
            })
        )
    );
};

export default UpcomingLaunchesTimeline;
