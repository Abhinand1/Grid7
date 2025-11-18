import React, { useState, useEffect } from 'react';
import { NewsArticle } from '../types';
import { subscribeToNewsletter } from '../services/geminiService';

interface NewsletterModalProps {
    isOpen: boolean;
    onClose: () => void;
    articles: NewsArticle[];
}

const NewsletterModal: React.FC<NewsletterModalProps> = ({ isOpen, onClose, articles }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    const [emailBody, setEmailBody] = useState<string | undefined>(undefined);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);
    
    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setEmail('');
            setMessage('');
            setEmailBody(undefined);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || status === 'loading') return;

        setStatus('loading');
        setMessage('');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatus('error');
            setMessage('Please enter a valid email address.');
            return;
        }

        const result = await subscribeToNewsletter(email, articles);

        if (result.success) {
            setStatus('success');
            setMessage(result.message);
            setEmailBody(result.emailBody);
        } else {
            setStatus('error');
            setMessage(result.message);
            setEmailBody(undefined);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        React.createElement("div", { 
            className: "fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4",
            onClick: onClose
        },
            React.createElement("div", { 
                className: "bg-[#111] border border-gray-800 rounded-lg shadow-2xl max-w-md w-full p-8",
                onClick: (e) => e.stopPropagation()
            },
                React.createElement("div", { className: "flex justify-between items-start mb-4" },
                    React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("div", { className: "p-2 bg-gray-800 rounded-full" },
                           React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6 text-cyan-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2 },
                                React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" })
                           )
                        ),
                        React.createElement("div", null,
                            React.createElement("h2", { className: "text-xl font-bold text-white" }, "Subscribe to Grid7 Weekly"),
                            React.createElement("p", { className: "text-sm text-gray-400" }, "Get the biggest tech stories delivered to your inbox.")
                        )
                    ),
                    React.createElement("button", { onClick: onClose, className: "text-gray-500 hover:text-white transition-colors ml-4 p-1 -mt-2 -mr-2" },
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
                        )
                    )
                ),

                status !== 'success' ? (
                     React.createElement("form", { onSubmit: handleSubmit, className: "mt-6 space-y-4" },
                        React.createElement("div", null,
                            React.createElement("label", { htmlFor: "email-address", className: "sr-only" }, "Email address"),
                            React.createElement("input", {
                                id: "email-address",
                                name: "email",
                                type: "email",
                                autoComplete: "email",
                                required: true,
                                value: email,
                                onChange: (e) => setEmail(e.target.value),
                                className: "appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-900 text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm",
                                placeholder: "Enter your email"
                            })
                        ),
                         status === 'error' && React.createElement("p", { className: "text-sm text-red-400" }, message),
                        React.createElement("div", null,
                            React.createElement("button", {
                                type: "submit",
                                disabled: status === 'loading',
                                className: "group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-wait"
                            },
                                status === 'loading' ? 'Subscribing...' : 'Subscribe'
                            )
                        )
                    )
                ) : (
                    React.createElement("div", { className: "mt-6 text-left" },
                        React.createElement("h3", { className: "text-lg font-semibold text-emerald-400 text-center" }, "All Set!"),
                        React.createElement("p", { className: "text-gray-300 mt-2 text-center mb-6" }, message),
                        
                        emailBody && (
                             React.createElement("div", { className: "bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-sm" },
                                React.createElement("p", { className: "text-gray-500" }, "To: ", React.createElement("span", { className: "text-gray-300" }, email)),
                                React.createElement("p", { className: "text-gray-500 mb-3" }, "Subject: ", React.createElement("span", { className: "text-gray-300" }, "Welcome to Grid7 Weekly!")),
                                React.createElement("div", { className: "border-t border-gray-700 pt-3" },
                                    React.createElement("p", { className: "text-gray-300 whitespace-pre-wrap" }, emailBody)
                                )
                            )
                        ),

                        React.createElement("button", {
                            onClick: onClose,
                            className: "mt-6 w-full bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                        },
                            "Close"
                        )
                    )
                )
            )
        )
    );
};

export default NewsletterModal;
