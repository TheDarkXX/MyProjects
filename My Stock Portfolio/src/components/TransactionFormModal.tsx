
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, TransactionAsset, TransactionStockType } from '../types';
import { localInputToUTCISO } from '../lib/logging';
import { GoogleGenAI } from "@google/genai";

// --- Constants & AI Setup ---
const DEFAULT_FINNHUB_KEY = 'd383nj1r01qlbdj3p8q0d383nj1r01qlbdj3p8qg';
const assetClassifierModel = 'gemini-2.5-flash';

// --- Type Definitions ---
interface FinnhubSearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'portfolioId'> & { id?: string, portfolioId: string }) => Promise<void>;
  onDelete: (transactionId: string) => Promise<void>;
  transactionToEdit: Transaction | null;
  selectedPortfolioId: string;
  exchangeRate: number;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  transactionToEdit,
  selectedPortfolioId,
  exchangeRate
}) => {
  const [formData, setFormData] = useState({
    date: '',
    symbol: '',
    type: 'BUY' as Transaction['type'],
    asset: 'Stock' as TransactionAsset,
    amount: '',
    price: '',
    fee: '',
    stockType: 'Compound' as TransactionStockType | null,
    note: '',
  });
  const [currency, setCurrency] = useState<'USD' | 'THB'>('USD');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingAsset, setIsDetectingAsset] = useState(false);
  const [searchResults, setSearchResults] = useState<FinnhubSearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const isCashTransaction = formData.type === 'DEPOSIT' || formData.type === 'WITHDRAW';
  const isDividendOrInterest = formData.type === 'DIVIDEND' || formData.type === 'INTEREST';

  useEffect(() => {
    if (isCashTransaction) {
        setFormData(prev => ({
            ...prev,
            asset: 'Cash',
            symbol: 'CASH',
            price: '1',
            stockType: 'Cash',
        }));
    } else if (isDividendOrInterest) {
        setFormData(prev => ({ ...prev, price: '1', stockType: null, asset: prev.asset === 'Cash' ? 'Stock' : prev.asset }));
    }
  }, [formData.type]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrency('USD');
    if (transactionToEdit) {
      const localDate = new Date(transactionToEdit.date);
      localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
      const dateForInput = localDate.toISOString().slice(0, 16);
      
      setFormData({
        date: dateForInput,
        symbol: transactionToEdit.symbol,
        type: transactionToEdit.type,
        asset: transactionToEdit.asset,
        amount: String(transactionToEdit.amount),
        price: String(transactionToEdit.price),
        fee: String(transactionToEdit.fee || ''),
        stockType: transactionToEdit.stockType,
        note: transactionToEdit.note || '',
      });
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const dateForInput = now.toISOString().slice(0, 16);

      setFormData({
        date: dateForInput,
        symbol: '',
        type: 'BUY',
        asset: 'Stock',
        amount: '',
        price: '',
        fee: '',
        stockType: 'Compound',
        note: '',
      });
    }
  }, [transactionToEdit, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const detectAssetType = useCallback(async (symbol: string) => {
    if (!symbol) return;
    setIsDetectingAsset(true);
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) return; // Fail silently if no key, just skip detection
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `Classify the asset type for the symbol: ${symbol}`;
        const response = await ai.models.generateContent({
            model: assetClassifierModel,
            contents: prompt,
            config: {
                systemInstruction: "You are an asset classifier. Given a ticker symbol, classify it as one of the following: 'Stock', 'ETF', 'Crypto', 'Cash', 'Gold', 'Forex', 'Other'. Return only the single-word category name and nothing else.",
            }
        });
        const detectedType = response.text.trim();
        const assetTypes: TransactionAsset[] = ['Stock', 'ETF', 'Crypto', 'Cash', 'Gold', 'Forex', 'Other'];
        if (assetTypes.includes(detectedType as TransactionAsset)) {
            setFormData(prev => ({ ...prev, asset: detectedType as TransactionAsset }));
        }
    } catch (e) {
        console.error("AI asset detection failed:", e);
    } finally {
        setIsDetectingAsset(false);
    }
  }, []);

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, symbol: query }));
    
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!query) {
        setIsSearching(false);
        setSearchResults([]);
        return;
    }
    
    setIsSearching(true);
    debounceTimerRef.current = window.setTimeout(async () => {
        try {
            const apiKey = localStorage.getItem('finnhub_api_key') || DEFAULT_FINNHUB_KEY;
            const response = await fetch(`https://finnhub.io/api/v1/search?q=${query}&token=${apiKey}`);
            if (!response.ok) throw new Error('Finnhub search failed');
            const data = await response.json();
            setSearchResults(data.result || []);
        } catch (error) {
            console.error(error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, 300);
  };
  
  const handleSelectSymbol = (result: FinnhubSearchResult) => {
      setFormData(prev => ({ ...prev, symbol: result.symbol }));
      setSearchResults([]);
      detectAssetType(result.symbol);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const getPayloadType = (): Transaction['type'] => {
        return formData.type;
    };

    const inputAmount = parseFloat(formData.amount);
    const inputPrice = parseFloat(formData.price);
    const inputFee = formData.fee ? parseFloat(formData.fee) : 0;

    let finalAmount = inputAmount;
    let finalPrice = inputPrice;
    let finalFee = inputFee;
    
    // The core logic: if currency is THB, convert all monetary values to USD
    if (currency === 'THB' && exchangeRate > 0) {
        finalFee = inputFee / exchangeRate; // Fee is always a monetary value
        
        // For cash-like transactions, price is 1 (unit is USD), so we convert the amount.
        if (isCashTransaction || isDividendOrInterest) {
            finalAmount = inputAmount / exchangeRate;
            finalPrice = 1; // Price is always 1 for these types
        } else {
        // For stock/asset transactions, amount is quantity, so we convert price.
            finalPrice = inputPrice / exchangeRate;
            // finalAmount (quantity) is not converted.
        }
    }

    if (!isFinite(finalAmount) || !isFinite(finalPrice) || !isFinite(finalFee)) {
        console.error("Invalid number in form submission");
        // Optionally, add a user notification here
        return;
    }

    const transactionPayload = {
      id: transactionToEdit?.id,
      portfolioId: transactionToEdit?.portfolioId || selectedPortfolioId,
      date: localInputToUTCISO(formData.date),
      symbol: formData.symbol.toUpperCase().trim(),
      type: getPayloadType(),
      asset: formData.asset,
      amount: finalAmount,
      price: finalPrice,
      fee: finalFee,
      stockType: formData.stockType || null,
      note: formData.note || undefined,
    };
    await onSave(transactionPayload);
    onClose();
  };

  const handleDelete = async () => {
      if (transactionToEdit) {
          await onDelete(transactionToEdit.id);
          onClose();
      }
  }

  if (!isOpen) return null;

  const assetTypes: TransactionAsset[] = ['Stock', 'ETF', 'Crypto', 'Cash', 'Gold', 'Forex', 'Other'];
  const stockTypes: TransactionStockType[] = ['Compound', 'Winner', 'Small Cap', 'Cash'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity animate-fade-in" onClick={onClose}>
       <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
      <div className="bg-[#111827] border border-gray-700 rounded-lg shadow-2xl w-full max-w-lg m-4 p-6 text-white animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h2 className="text-xl font-bold mb-6">{transactionToEdit ? 'Edit Transaction' : 'Add New Transaction'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-400">Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2">
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
                <option value="DIVIDEND">DIVIDEND</option>
                <option value="INTEREST">INTEREST</option>
                <option value="DEPOSIT">DEPOSIT (Cash)</option>
                <option value="WITHDRAW">WITHDRAW (Cash)</option>
              </select>
            </div>
             <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-400">Date & Time</label>
              <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2" required />
            </div>
            <div className="relative" ref={searchRef}>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-400">Symbol</label>
              <input type="text" name="symbol" value={formData.symbol} onChange={handleSymbolChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2 disabled:bg-gray-700 disabled:text-gray-400" required autoComplete="off" disabled={isCashTransaction} />
              {searchResults.length > 0 && (
                <ul className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map(res => (
                    <li key={res.symbol} onClick={() => handleSelectSymbol(res)} className="px-3 py-2 cursor-pointer hover:bg-blue-600/50">
                      <p className="font-bold">{res.symbol}</p>
                      <p className="text-xs text-gray-400">{res.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
             <div>
              <label htmlFor="asset" className="flex items-center space-x-2 text-sm font-medium text-gray-400">
                  <span>Asset Type</span>
                  {isDetectingAsset && <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              </label>
              <select name="asset" value={formData.asset} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2 disabled:bg-gray-700" disabled={isCashTransaction}>
                {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-400">{isCashTransaction ? 'Cash Amount' : isDividendOrInterest ? 'Amount (Cash Value)' : 'Amount / Quantity'}</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} step="any" className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2" required />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-400">Price</label>
               <div className="mt-1 flex">
                <input type="number" name="price" value={formData.price} onChange={handleChange} step="any" className="block w-full bg-gray-900 border border-gray-600 rounded-l-md p-2 disabled:bg-gray-700 rounded-r-none" required disabled={isCashTransaction || isDividendOrInterest} />
                <div className="flex items-center bg-gray-800 border border-gray-700 p-0.5 rounded-r-md text-sm border-l-0">
                  <button type="button" onClick={() => setCurrency('USD')} className={`px-2 py-0.5 rounded text-xs transition-colors ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>USD</button>
                  <button type="button" onClick={() => setCurrency('THB')} className={`px-2 py-0.5 rounded text-xs transition-colors ${currency === 'THB' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>THB</button>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="fee" className="block text-sm font-medium text-gray-400">Fee (optional)</label>
              <input type="number" name="fee" value={formData.fee} onChange={handleChange} step="any" className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2" />
            </div>
            <div>
              <label htmlFor="stockType" className="block text-sm font-medium text-gray-400">Stock Type</label>
              <select name="stockType" value={formData.stockType || ''} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2 disabled:bg-gray-700" disabled={isCashTransaction || isDividendOrInterest}>
                <option value="">N/A</option>
                {stockTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="note" className="block text-sm font-medium text-gray-400">Note (optional)</label>
              <textarea name="note" value={formData.note} onChange={handleChange} rows={2} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2" />
            </div>
          </div>
          <div className="mt-8 flex justify-between items-center">
            <div>
             {transactionToEdit && (
                <button type="button" onClick={() => setIsDeleting(true)} className="px-4 py-2 rounded-md bg-red-800 hover:bg-red-700 text-red-100 font-semibold transition-colors">
                    Delete
                </button>
             )}
            </div>
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 font-semibold transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold transition-colors">Save Transaction</button>
            </div>
          </div>
        </form>
        {isDeleting && (
             <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center rounded-lg">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-center">
                    <h3 className="text-lg font-bold mb-4">Are you sure?</h3>
                    <p className="text-gray-400 mb-6">This action cannot be undone.</p>
                    <div className="flex justify-center space-x-4">
                        <button onClick={() => setIsDeleting(false)} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500">Cancel</button>
                        <button onClick={handleDelete} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500">Confirm Delete</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
export default TransactionFormModal;
