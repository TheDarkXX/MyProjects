
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Portfolio } from '../types';
import { logAiConversation } from '../lib/logging';

const systemInstruction = `You are a world-class financial analyst bot named 'Gemini Port'. Your expertise is in stock portfolio analysis, risk assessment, and financial market trends. When a user provides their portfolio data (in JSON format), your primary goal is to deliver a detailed, insightful, and professional analysis.

**Your analysis should ALWAYS include:**
1.  **Executive Summary:** A brief, high-level overview of the portfolio's health, key strengths, and weaknesses.
2.  **Asset Allocation Breakdown:** Analyze the distribution across different asset types (Stocks, ETFs, etc.), sectors, and stock types (Compound, Winner, Small Cap). Use a markdown table for clarity.
3.  **Performance Review:** Identify the top 3 best-performing and worst-performing assets based on total return percentage. Discuss possible reasons for their performance.
4.  **Risk Assessment:** Point out potential risks, such as over-concentration in a single stock or sector, or exposure to volatile assets.
5.  **Actionable Suggestions:** Provide 2-3 clear, actionable recommendations. These could be about rebalancing, diversification, or investigating specific underperforming assets. Frame these as suggestions for the user to research further, not as direct financial advice.

**Formatting Guidelines:**
*   Use markdown extensively for clear, readable formatting.
*   Use headings ('##'), bold text ('** **'), italics ('* *'), and bulleted/numbered lists.
*   Present tabular data (like allocation or performance) in markdown tables.
*   Maintain a professional, objective, and data-driven tone.
*   Start your first response with a friendly greeting, introducing yourself as Gemini Port.
`;

interface GeminiChatPageProps {
    portfolios: Portfolio[];
}

interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

const GeminiChatPage: React.FC<GeminiChatPageProps> = ({ portfolios }) => {
    const [chatSession, setChatSession] = useState<Chat | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initChat = async () => {
            try {
                setError(null);
                setIsLoading(true);

                const apiKey = process.env.API_KEY;
                if (!apiKey) {
                    throw new Error("API Key is missing. Please check your environment variables.");
                }

                const ai = new GoogleGenAI({ apiKey });
                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: systemInstruction,
                    },
                });
                setChatSession(chat);
                
                // Start with an initial greeting from the model
                const initialUserMessage = "Introduce yourself and explain what you can do.";
                const response = await chat.sendMessageStream({ message: initialUserMessage });
                
                let fullResponse = "";
                setChatHistory([{ role: 'model', parts: [{ text: "" }] }]);

                for await (const chunk of response) {
                    fullResponse += chunk.text;
                    setChatHistory(prev => {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: fullResponse }]};
                        return newHistory;
                    });
                }
                await logAiConversation(initialUserMessage, fullResponse);
            } catch (e: any) {
                console.error("Failed to initialize chat:", e);
                setError(e.message || "Failed to initialize chat session.");
            } finally {
                setIsLoading(false);
            }
        };
        initChat();
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleSendMessage = useCallback(async (message: string) => {
        if (isLoading || !message.trim() || !chatSession) return;

        setIsLoading(true);
        setError(null);
        
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
        const updatedHistory: ChatMessage[] = [...chatHistory, userMessage, { role: 'model', parts: [{ text: '' }] }];
        setChatHistory(updatedHistory);
        setUserInput('');

        try {
            const responseStream = await chatSession.sendMessageStream({ message });
            let fullResponseText = "";

            for await (const chunk of responseStream) {
                fullResponseText += chunk.text;
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].parts[0].text = fullResponseText;
                    return newHistory;
                });
            }
            await logAiConversation(message, fullResponseText);
        } catch (e) {
            console.error("Error sending message:", e);
            const errorMessage = "Sorry, I encountered an error. Please try again.";
            setError(errorMessage);
            setChatHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1].parts[0].text = errorMessage;
                return newHistory;
            });
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, chatSession, chatHistory]);

    const handlePromptClick = (promptTemplate: string) => {
        const portfolioJson = JSON.stringify(portfolios.map(p => ({
            name: p.name,
            totalValue: p.total.currentValue,
            totalReturnPercent: p.total.totalReturnPercent,
            holdings: p.data.map(h => ({
                symbol: h.symbol,
                currentValue: h.currentValue,
                portfolioPercent: h.portfolioPercent,
                totalReturnPercent: h.totalReturnPercent,
                sector: h.sector,
                assetType: h.assetType,
                stockType: h.stockType,
            }))
        })), null, 2);

        const fullPrompt = `${promptTemplate}\n\nHere is my portfolio data:\n\`\`\`json\n${portfolioJson}\n\`\`\``;
        handleSendMessage(fullPrompt);
    };

    const predefinedPrompts = [
        "Give me a full analysis of my portfolio.",
        "Analyze my portfolio's diversification across sectors and asset types.",
        "Identify the top 3 performers and underperformers in my portfolio and suggest why.",
        "What are the biggest risks in my current portfolio allocation?",
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-[#0F172A] text-gray-200 rounded-lg shadow-inner shadow-black/30 m-4">
             <header className="p-4 border-b border-gray-700">
                <h1 className="text-xl font-bold text-white flex items-center">
                    <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text mr-3">Gemini Port</span>
                    - Financial Analyst Bot
                </h1>
            </header>

            <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto space-y-6">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-2xl p-4 rounded-xl shadow-md ${msg.role === 'user' ? 'bg-blue-600/80 text-white' : 'bg-gray-700/60'}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-table:w-full prose-th:bg-gray-800/50 prose-th:p-2 prose-td:p-2">
                                {msg.parts[0].text}
                            </ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isLoading && chatHistory.length > 0 && (
                    <div className="flex justify-start">
                        <div className="max-w-2xl p-4 rounded-xl shadow-md bg-gray-700/60">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}
                 {error && (
                    <div className="flex justify-start">
                        <div className="max-w-2xl p-4 rounded-xl shadow-md bg-red-900/50 text-red-200 border border-red-500">
                            <p><strong>Error:</strong> {error}</p>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                 <div className="flex flex-wrap gap-2 mb-3">
                    {predefinedPrompts.map(prompt => (
                         <button 
                            key={prompt}
                            onClick={() => handlePromptClick(prompt)}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(userInput); }} className="flex items-center space-x-3">
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(userInput);
                            }
                        }}
                        placeholder="Ask about your portfolio..."
                        rows={1}
                        className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !userInput.trim()} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-5 py-2 transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed">
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GeminiChatPage;
