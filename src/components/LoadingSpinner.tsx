import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    React.createElement("div", { className: "flex flex-col justify-center items-center h-full gap-4" },
      React.createElement("div", { className: "relative w-16 h-16" },
        React.createElement("div", { className: "absolute inset-0 border-4 border-gray-800 rounded-full" }),
        React.createElement("div", { className: "absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" })
      ),
      message && React.createElement("p", { className: "text-cyan-400 font-semibold animate-pulse" }, message)
    )
  );
};

export default LoadingSpinner;
