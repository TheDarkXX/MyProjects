
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionAsset, TransactionStockType } from '../types';
import { localInputToUTCISO } from '../lib/logging';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- AI Setup ---
const model = 'gemini-2.5-flash';

// --- Type Definitions ---
interface ParsedTransaction {
  type: Transaction['type'] | null;
  symbol: string | null;
  asset_type: TransactionAsset | null;
  stock_type: TransactionStockType | null;
  amount: number | null;
  price: number | null;
  fee: number | null;
  date: string | null;
  note: string | null;
  currency: 'USD' | 'THB' | null;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface AIAgentTabProps {
  selectedPortfolioId: string;
  onSaveTransaction: (tx: Omit<Transaction, 'id'> & { id?: string }, options?: { silent?: boolean }) => Promise<string | undefined>;
  onEditInFormRequest: (txData: Partial<Omit<Transaction, 'id' | 'portfolioId'>>) => void;
  transactions: Transaction[];
  exchangeRate: number;
}

// --- Editable Row Sub-component ---
const EditableTransactionRow: React.FC<{
  transaction: Partial<ParsedTransaction>;
  index: number;
  onChange: (index: number, field: keyof ParsedTransaction, value: any) => void;
  isFirstOfSymbol: boolean;
}> = ({ transaction, index, onChange, isFirstOfSymbol }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | null = value;
    if (e.target.type === 'number') {
      processedValue = value === '' ? null : parseFloat(value);
      if (isNaN(processedValue as number)) processedValue = null;
    }
    onChange(index, name as keyof ParsedTransaction, processedValue);
  };

  const isCashLike = transaction.type === 'DEPOSIT' || transaction.type === 'WITHDRAW';
  const isDividendOrInterest = transaction.type === 'DIVIDEND' || transaction.type === 'INTEREST';

  const inputBaseClasses = "block bg-gray-900 border border-gray-600 rounded-md p-2 text-sm disabled:bg-gray-700 disabled:text-opacity-50 focus:ring-2 focus:ring-blue-500 focus:outline-none";
  const labelBaseClasses = "text-xs text-gray-400 block mb-1";

  return (
    <div className="bg-gray-800/70 p-3 rounded-lg mb-3">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        <div className="flex-grow min-w-[150px] sm:flex-grow-0">
          <label className={labelBaseClasses}>Date</label>
          <input type="date" name="date" value={transaction.date || ''} onChange={handleChange} className={`${inputBaseClasses} w-full`} />
        </div>

        <div className="border-l border-gray-600 h-10 self-center mx-1 hidden xl:block"></div>

        <div className="flex-none">
          <label className={labelBaseClasses}>Type</label>
          <select name="type" value={transaction.type || ''} onChange={handleChange} className={`${inputBaseClasses} w-32`}>
            <option value="" disabled>Select...</option>
            <option value="BUY">BUY</option> <option value="SELL">SELL</option> <option value="DIVIDEND">DIVIDEND</option> <option value="INTEREST">INTEREST</option> <option value="DEPOSIT">DEPOSIT</option> <option value="WITHDRAW">WITHDRAW</option>
          </select>
        </div>
        <div className="flex-grow min-w-[100px]">
          <label className={labelBaseClasses}>Symbol</label>
          <input type="text" name="symbol" value={transaction.symbol || ''} onChange={handleChange} disabled={isCashLike} className={`${inputBaseClasses} w-full uppercase`} />
        </div>

        <div className="border-l border-gray-600 h-10 self-center mx-1 hidden xl:block"></div>

        <div className="flex-none">
          <label className={labelBaseClasses}>Amount</label>
          <input type="number" name="amount" value={transaction.amount ?? ''} onChange={handleChange} step="any" className={`${inputBaseClasses} w-24`} />
        </div>
        <div className="flex-none">
          <label className={labelBaseClasses}>Price</label>
          <input type="number" name="price" value={transaction.price ?? ''} onChange={handleChange} step="any" disabled={isCashLike || isDividendOrInterest} className={`${inputBaseClasses} w-24`} />
        </div>
        <div className="flex-none">
          <label className={labelBaseClasses}>Fee</label>
          <input type="number" name="fee" value={transaction.fee ?? ''} onChange={handleChange} step="any" className={`${inputBaseClasses} w-20`} />
        </div>
        <div className="flex-none">
          <label className={labelBaseClasses}>Currency</label>
          <div className="flex items-center bg-gray-900 border border-gray-600 p-0.5 rounded-md text-sm mt-1 h-10">
            <button type="button" onClick={() => onChange(index, 'currency', 'USD')} className={`px-2 py-0.5 rounded text-xs transition-colors ${ (transaction.currency || 'USD') === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>USD</button>
            <button type="button" onClick={() => onChange(index, 'currency', 'THB')} className={`px-2 py-0.5 rounded text-xs transition-colors ${transaction.currency === 'THB' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>THB</button>
          </div>
        </div>
        
        <div className="border-l border-gray-600 h-10 self-center mx-1 hidden xl:block"></div>

        <div className="flex-none">
          <label className={labelBaseClasses}>Asset Type</label>
          <select name="asset_type" value={transaction.asset_type || ''} onChange={handleChange} disabled={isCashLike} className={`${inputBaseClasses} w-28`}>
            {(['Stock', 'ETF', 'Crypto', 'Cash', 'Gold', 'Forex', 'Other'] as TransactionAsset[]).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {transaction.asset_type === 'Stock' && !isCashLike && (
          <div className="flex-none">
            <label className={labelBaseClasses}>Stock Type</label>
            <select name="stock_type" value={transaction.stock_type || ''} onChange={handleChange} className={`${inputBaseClasses} w-32`} disabled={!isFirstOfSymbol}>
              <option value="">N/A</option>
              {(['Compound', 'Winner', 'Small Cap', 'Cash'] as TransactionStockType[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>
       <div className="mt-2">
        <label className={labelBaseClasses}>Note</label>
        <input type="text" name="note" value={transaction.note || ''} onChange={handleChange} className={`${inputBaseClasses} w-full`} placeholder="Add a note..."/>
      </div>
    </div>
  );
};


// --- Main Component ---
const AIAgentTab: React.FC<AIAgentTabProps> = ({ selectedPortfolioId, onSaveTransaction, onEditInFormRequest, transactions, exchangeRate }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [parsedTransactions, setParsedTransactions] = useState<Partial<ParsedTransaction>[]>([]);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const confirmationRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if(isConfirmed && confirmationRef.current) {
            setTimeout(() => {
                confirmationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
        }
    }, [isConfirmed]);

    const resetState = () => {
        setMessages([{ role: 'model', content: "สวัสดีครับ ผมคือ AI Agent สำหรับเพิ่ม Transaction พิมพ์คำสั่งของคุณได้เลยครับ เช่น 'ซื้อ IREN 25 หุ้น ที่ $62.46' หรือ 'ฝากเงิน 500'" }]);
        setUserInput('');
        setIsLoading(false);
        setParsedTransactions([]);
        setIsConfirmed(false);
    };

    useEffect(resetState, [selectedPortfolioId]);

    const callGeminiAPI = useCallback(async (history: ChatMessage[]) => {
        setIsLoading(true);
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) {
                setMessages(prev => [...prev, { role: 'model', content: 'ไม่พบ API Key กรุณาตั้งค่า API Key ใน Environment Variables ก่อนใช้งานครับ' }]);
                setIsLoading(false);
                return;
            }
            
            const ai = new GoogleGenAI({ apiKey });

            const systemInstruction = `You are an AI Agent that converts Thai/English natural language into a list of valid JSON transaction objects. Your goal is to find ALL transactions in the user's text and return a JSON array of transaction objects.
- Parse multiple distinct actions, including multiple purchases of the same stock at different prices (e.g., "2 ไม้" or "2 lots").
- For each object in the array, fill it according to the provided schema. If a required field is missing for a specific transaction, set its value to null for that object.
- Today's UTC date is ${new Date().toISOString().split('T')[0]}.
- Default 'fee' to 0 if not mentioned.
- For DEPOSIT/WITHDRAW, symbol must be 'CASH', price must be 1, and asset_type must be 'Cash'.
- For DIVIDEND/INTEREST, price must be 1.
- Parse transaction currency if specified (e.g., 'บาท', 'THB', '$', 'USD'). Default to USD.
- Parse any additional context as a 'note'.
- Do not make up any values. Stick to the provided text.
- Auto-detect asset_type: 'Cash' for cash movements, 'ETF' for known ETFs, 'Crypto' for coins, otherwise default to 'Stock'.
- Auto-detect stock_type (only for asset_type='Stock'): 'Small Cap' for small-cap mentions, otherwise default to 'Winner'.
- Never ask follow-up questions. Your entire response MUST be a single JSON array of transaction objects, even if it's an empty array.`;

            const transactionSchema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ["BUY", "SELL", "DEPOSIT", "WITHDRAW", "DIVIDEND", "INTEREST"], nullable: true },
                        symbol: { type: Type.STRING, nullable: true },
                        amount: { type: Type.NUMBER, nullable: true },
                        price: { type: Type.NUMBER, nullable: true },
                        date: { type: Type.STRING, description: "YYYY-MM-DD format. Infer from words like 'วันนี้' (today) or 'เมื่อวาน' (yesterday). Default to today if not specified.", nullable: true },
                        fee: { type: Type.NUMBER, description: "Default to 0.", nullable: true },
                        asset_type: { type: Type.STRING, enum: ["Stock", "ETF", "Crypto", "Cash"], nullable: true },
                        stock_type: { type: Type.STRING, enum: ["Compound", "Winner", "Small Cap", "Cash"], nullable: true },
                        note: { type: Type.STRING, description: "Any extra notes or context about the transaction.", nullable: true },
                        currency: { type: Type.STRING, enum: ["USD", "THB"], description: "The currency of the price. Default to USD.", nullable: true },
                    },
                }
            };
            
            const contents = history.map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }));

            const response = await ai.models.generateContent({
                model: model,
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: transactionSchema,
                },
            });
            
            const jsonString = response.text;
            let results: Partial<ParsedTransaction>[] = JSON.parse(jsonString);

            // Fill in defaults and auto-detect stock_type from existing transactions
            results = results.map(parsedTx => {
                let detectedStockType: TransactionStockType | null = parsedTx.stock_type || null;

                if (parsedTx.symbol) {
                    const existingTxs = transactions
                        .filter(t => t.portfolioId === selectedPortfolioId && t.symbol === parsedTx.symbol && t.stockType)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    
                    if (existingTxs.length > 0) {
                        detectedStockType = existingTxs[0].stockType;
                    }
                }

                return {
                    ...parsedTx,
                    fee: parsedTx.fee ?? 0,
                    date: parsedTx.date ?? new Date().toISOString().split('T')[0],
                    stock_type: detectedStockType,
                    currency: parsedTx.currency ?? 'USD',
                };
            });


            if (results && results.length > 0) {
                setParsedTransactions(results);
                const summary = `ผมเจอ ${results.length} รายการครับ กรุณาตรวจสอบและแก้ไขข้อมูลด้านล่างให้ถูกต้องก่อนยืนยัน`;
                setMessages(prev => [...prev, { role: 'model', content: summary }]);
                setIsConfirmed(true);
            } else {
                setMessages(prev => [...prev, { role: 'model', content: 'ขออภัยครับ ผมไม่เจอรายการธุรกรรมที่ชัดเจนในข้อความของคุณ' }]);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล' }]);
        } finally {
            setIsLoading(false);
        }
    }, [transactions, selectedPortfolioId]);
    
    const handleTransactionChange = useCallback((index: number, field: keyof ParsedTransaction, value: any) => {
        setParsedTransactions(prev => {
            const newTxs = [...prev];
            const updatedTx = { ...newTxs[index], [field]: value };
            
            if (field === 'type') {
                const isCashLike = value === 'DEPOSIT' || value === 'WITHDRAW';
                const isDivOrInt = value === 'DIVIDEND' || value === 'INTEREST';
                if (isCashLike) {
                    updatedTx.asset_type = 'Cash';
                    updatedTx.symbol = 'CASH';
                    updatedTx.price = 1;
                    updatedTx.stock_type = 'Cash';
                }
                if (isDivOrInt) {
                    updatedTx.price = 1;
                }
            }
            if (field === 'asset_type' && value !== 'Stock') {
                updatedTx.stock_type = null;
            }

            newTxs[index] = updatedTx;

            if (field === 'stock_type' && updatedTx.symbol) {
                const firstIndex = newTxs.findIndex(t => t.symbol === updatedTx.symbol);
                if (index === firstIndex) {
                    for (let i = firstIndex + 1; i < newTxs.length; i++) {
                        if (newTxs[i].symbol === updatedTx.symbol) {
                            newTxs[i] = { ...newTxs[i], stock_type: value };
                        }
                    }
                }
            }

            return newTxs;
        });
    }, []);

    const validateTransactions = (txs: Partial<ParsedTransaction>[]): boolean => {
        return txs.every(tx => {
            if (!tx.type || !tx.date) return false;
            if (['BUY', 'SELL'].includes(tx.type) && tx.asset_type !== 'Cash') {
                if (!tx.symbol || (tx.amount ?? 0) <= 0 || (tx.price ?? 0) < 0) return false;
            }
            if (['DEPOSIT', 'WITHDRAW', 'DIVIDEND', 'INTEREST'].includes(tx.type)) {
                if ((tx.amount ?? 0) <= 0) return false;
            }
            return true;
        });
    };

    const areTransactionsValid = useMemo(() => validateTransactions(parsedTransactions), [parsedTransactions]);

    const handleSendMessage = () => {
        if (!userInput.trim() || isLoading) return;
        const newHistory = [...messages, { role: 'user' as const, content: userInput }];
        setMessages(newHistory);
        setUserInput('');
        callGeminiAPI(newHistory);
    };

    const handleConfirm = async () => {
        if (!areTransactionsValid) return;
        setIsLoading(true);
    
        const transactionsToSave = parsedTransactions.map(tx => {
            const getPayloadType = (): Transaction['type'] => {
                if (tx.type === 'DEPOSIT') return 'BUY';
                if (tx.type === 'WITHDRAW') return 'SELL';
                return tx.type || 'BUY';
            };
    
            const isCashLike = tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW';
            const isDivOrInt = tx.type === 'DIVIDEND' || tx.type === 'INTEREST';
    
            const inputAmount = tx.amount || 0;
            const inputPrice = tx.price || 0;
            const inputFee = tx.fee || 0;
            const txCurrency = tx.currency || 'USD';
    
            let finalAmount = inputAmount;
            let finalPrice = inputPrice;
            let finalFee = inputFee;
    
            if (txCurrency === 'THB' && exchangeRate > 0) {
                finalFee = inputFee / exchangeRate;
                if (isCashLike || isDivOrInt) {
                    finalAmount = inputAmount / exchangeRate;
                    finalPrice = 1;
                } else {
                    finalPrice = inputPrice / exchangeRate;
                }
            }
            
            return {
                portfolioId: selectedPortfolioId,
                date: localInputToUTCISO(tx.date || new Date().toISOString()),
                symbol: (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW') ? 'CASH' : tx.symbol || '',
                type: getPayloadType(),
                asset: tx.asset_type || 'Stock',
                amount: finalAmount,
                price: finalPrice,
                fee: finalFee,
                stockType: tx.stock_type || null,
                note: tx.note || undefined,
            };
        });
    
        try {
            const savePromises = transactionsToSave.map(tx => onSaveTransaction(tx, { silent: true }));
            const results = await Promise.all(savePromises);
            const portfolioName = results.find(name => !!name);
            
            const txCount = transactionsToSave.length;
            const txWord = txCount === 1 ? 'transaction' : 'transactions';
    
            window.dispatchEvent(new CustomEvent('batchNotification', { 
                detail: { message: `${txCount} ${txWord} added to ${portfolioName || 'portfolio'}.`, type: 'success' } 
            }));
            window.dispatchEvent(new CustomEvent('triggerAutoBackup', { detail: { summary: `AI bulk added ${transactionsToSave.length} transactions to ${portfolioName}.` } }));
            
            resetState();
        } catch(error) {
             window.dispatchEvent(new CustomEvent('batchNotification', { detail: { message: 'An error occurred while saving transactions.', type: 'error' } }));
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-[#111827] rounded-lg shadow-2xl p-4">
             <style>{`.custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
            @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
            
            <div className="flex flex-col" style={{ height: '45vh' }}>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl px-4 py-2 rounded-xl shadow ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700'}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-invert prose-sm max-w-none prose-p:my-1">
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isLoading && messages.length > 0 && messages[messages.length -1].role === 'user' && (
                        <div className="flex justify-start"> <div className="max-w-2xl px-4 py-2 rounded-xl shadow bg-gray-700"> <div className="flex items-center space-x-2"> <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div> <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div> <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div> </div> </div> </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-700">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Type one or more transactions here..."
                            className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                            disabled={isLoading || isConfirmed}
                        />
                        <button type="submit" disabled={isLoading || !userInput.trim() || isConfirmed} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-5 py-2 transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed">
                            Send
                        </button>
                    </form>
                </div>
            </div>

            {isConfirmed && (
                <div ref={confirmationRef} className="mt-6 pt-6 border-t border-gray-700 animate-fade-in-up">
                    <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {(() => {
                            const seenSymbols = new Set<string>();
                            return parsedTransactions.map((tx, index) => {
                                let isFirstOfSymbol = true;
                                if (tx.symbol) {
                                    if (seenSymbols.has(tx.symbol)) {
                                        isFirstOfSymbol = false;
                                    } else {
                                        seenSymbols.add(tx.symbol);
                                    }
                                }
                                return <EditableTransactionRow key={index} index={index} transaction={tx} onChange={handleTransactionChange} isFirstOfSymbol={isFirstOfSymbol} />;
                            });
                        })()}
                    </div>
                    <div className="flex justify-end space-x-3 mt-4">
                        <button onClick={resetState} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 font-semibold">Cancel</button>
                        <button onClick={handleConfirm} disabled={isLoading || !areTransactionsValid} className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 font-semibold disabled:bg-green-800 disabled:cursor-not-allowed">
                          {isLoading ? 'Saving...' : `✅ Confirm & Add ${parsedTransactions.length} Transactions`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAgentTab;
