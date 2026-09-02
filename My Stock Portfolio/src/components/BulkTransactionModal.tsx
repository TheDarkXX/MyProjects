import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionAsset, TransactionStockType } from '../types';
import { localInputToUTCISO } from '../lib/logging';

// --- Type Definitions ---
interface BulkRow extends Omit<Transaction, 'id' | 'portfolioId'> {
  id?: string;
  localId: string;
  currency: 'USD' | 'THB';
}

interface BulkTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactions: (Omit<Transaction, 'id'> & { id?: string })[]) => Promise<void>;
  mode: 'add' | 'edit';
  initialTransactions?: Transaction[];
  selectedPortfolioId: string;
  exchangeRate: number;
}

// --- Editable Row Sub-component ---
const EditableRow: React.FC<{
  tx: Partial<BulkRow>;
  index: number;
  onChange: (index: number, field: keyof BulkRow, value: any) => void;
  onRemove: (localId: string) => void;
}> = ({ tx, index, onChange, onRemove }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange(index, name as keyof BulkRow, value);
  };
  
  const isCashLike = tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW';
  const isDividendOrInterest = tx.type === 'DIVIDEND' || tx.type === 'INTEREST';

  const inputClasses = "block w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm disabled:bg-gray-700/50 disabled:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none";

  return (
    <div className="bg-gray-800/70 p-3 rounded-lg mb-3 grid grid-cols-12 gap-x-3 gap-y-2 items-end relative">
        <div className="col-span-12 md:col-span-2">
            <label className="text-xs text-gray-400">Date</label>
            <input type="datetime-local" name="date" value={tx.date || ''} onChange={handleChange} className={inputClasses} />
        </div>
        <div className="col-span-6 md:col-span-1">
            <label className="text-xs text-gray-400">Type</label>
            <select name="type" value={tx.type || ''} onChange={handleChange} className={inputClasses}>
                <option value="BUY">BUY</option><option value="SELL">SELL</option><option value="DIVIDEND">DIVIDEND</option><option value="INTEREST">INTEREST</option><option value="DEPOSIT">DEPOSIT</option><option value="WITHDRAW">WITHDRAW</option>
            </select>
        </div>
        <div className="col-span-6 md:col-span-1">
            <label className="text-xs text-gray-400">Symbol</label>
            <input type="text" name="symbol" value={tx.symbol || ''} onChange={handleChange} className={`${inputClasses} uppercase`} disabled={isCashLike} />
        </div>
        <div className="col-span-4 md:col-span-1">
            <label className="text-xs text-gray-400">{isCashLike ? 'Amount' : 'Quantity'}</label>
            <input type="number" name="amount" value={tx.amount ?? ''} onChange={handleChange} step="any" className={inputClasses} />
        </div>
        <div className="col-span-4 md:col-span-1">
            <label className="text-xs text-gray-400">Price</label>
            {(isCashLike || isDividendOrInterest) ? (
                <div className="h-10 flex items-center justify-start pl-2 bg-gray-700/50 text-gray-400 rounded-md text-sm" title="Price is automatically set to 1 for cash-based transactions.">
                    Auto @ 1.00
                </div>
            ) : (
                <input type="number" name="price" value={tx.price ?? ''} onChange={handleChange} step="any" className={inputClasses} />
            )}
        </div>
        <div className="col-span-4 md:col-span-1">
            <label className="text-xs text-gray-400">Fee</label>
            <input type="number" name="fee" value={tx.fee ?? ''} onChange={handleChange} step="any" className={inputClasses} />
        </div>
        <div className="col-span-4 md:col-span-1">
             <label className="text-xs text-gray-400">Currency</label>
              <div className="flex items-center bg-gray-900 border border-gray-600 p-0.5 rounded-md text-sm mt-1 h-10">
                <button type="button" onClick={() => onChange(index, 'currency', 'USD')} className={`w-full px-1 py-0.5 rounded text-xs transition-colors ${(tx.currency || 'USD') === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>USD</button>
                <button type="button" onClick={() => onChange(index, 'currency', 'THB')} className={`w-full px-1 py-0.5 rounded text-xs transition-colors ${tx.currency === 'THB' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>THB</button>
            </div>
        </div>
         <div className="col-span-4 md:col-span-1">
            <label className="text-xs text-gray-400">Asset</label>
            <select name="asset" value={tx.asset || 'Stock'} onChange={handleChange} className={inputClasses} disabled={isCashLike}>
                 {(['Stock', 'ETF', 'Crypto', 'Cash', 'Gold', 'Forex', 'Other'] as TransactionAsset[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
         <div className="col-span-4 md:col-span-2">
            <label className="text-xs text-gray-400">Note</label>
            <input type="text" name="note" value={tx.note || ''} onChange={handleChange} className={inputClasses} />
        </div>
        <button type="button" onClick={() => onRemove(tx.localId)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center hover:bg-red-500 transition-colors">&times;</button>
    </div>
  );
};

// --- Main Component ---
const BulkTransactionModal: React.FC<BulkTransactionModalProps> = ({ isOpen, onClose, onSave, mode, initialTransactions, selectedPortfolioId, exchangeRate }) => {
  const [rows, setRows] = useState<Partial<BulkRow>[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const createEmptyRow = (): Partial<BulkRow> => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return {
      localId: `new_${Date.now()}_${Math.random()}`,
      date: now.toISOString().slice(0, 16),
      type: 'BUY',
      asset: 'Stock',
      stockType: 'Compound',
      currency: 'USD',
      fee: 0,
    };
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialTransactions) {
        setRows(initialTransactions.map(tx => ({
          ...tx,
          date: new Date(tx.date).toISOString().slice(0, 16),
          localId: tx.id,
          currency: 'USD' // Default to USD display for existing txs
        })));
      } else {
        setRows([createEmptyRow(), createEmptyRow()]);
      }
    }
  }, [isOpen, mode, initialTransactions]);
  
  const handleAddRow = () => setRows(prev => [...prev, createEmptyRow()]);
  const handleRemoveRow = (localId: string) => setRows(prev => prev.filter(r => r.localId !== localId));

  const handleRowChange = (index: number, field: keyof BulkRow, value: any) => {
    setRows(prev => {
      const newRows = [...prev];
      let updatedRow = { ...newRows[index], [field]: value };

      if (field === 'type') {
        const isCashLike = value === 'DEPOSIT' || value === 'WITHDRAW';
        const isDivOrInt = value === 'DIVIDEND' || value === 'INTEREST';
        
        if (isCashLike) {
            updatedRow = { ...updatedRow, asset: 'Cash', symbol: 'CASH', price: 1, stockType: 'Cash' };
        } else if (isDivOrInt) {
            updatedRow = { ...updatedRow, price: 1, stockType: null };
            if (updatedRow.asset === 'Cash') updatedRow.asset = 'Stock';
        } else {
            if(updatedRow.symbol === 'CASH') updatedRow.symbol = '';
            if(updatedRow.asset === 'Cash') updatedRow.asset = 'Stock';
        }
      }
      newRows[index] = updatedRow;
      return newRows;
    });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    
    const transactionsToSave = rows.map(row => {
        const txCurrency = row.currency || 'USD';
        
        const inputAmount = Number(row.amount || 0);
        const inputPrice = Number(row.price || 0);
        const inputFee = Number(row.fee || 0);
        
        let finalAmount = inputAmount;
        let finalPrice = inputPrice;
        let finalFee = inputFee;
        
        const isCashLike = row.type === 'DEPOSIT' || row.type === 'WITHDRAW';
        const isDividendOrInterest = row.type === 'DIVIDEND' || row.type === 'INTEREST';

        if (txCurrency === 'THB' && exchangeRate > 0) {
            finalFee = inputFee / exchangeRate;
            
            if (isCashLike || isDividendOrInterest) {
                finalAmount = inputAmount / exchangeRate;
                finalPrice = 1;
            } else {
                finalPrice = inputPrice / exchangeRate;
            }
        }
        
        const getPayloadType = (): Transaction['type'] => {
            if (row.type === 'DEPOSIT') return 'BUY';
            if (row.type === 'WITHDRAW') return 'SELL';
            return row.type || 'BUY'; 
        };
        
        return {
            id: row.id,
            portfolioId: selectedPortfolioId,
            date: localInputToUTCISO(row.date!),
            symbol: isCashLike ? 'CASH' : row.symbol || '',
            type: getPayloadType(),
            asset: row.asset!,
            amount: finalAmount,
            price: finalPrice,
            fee: finalFee,
            stockType: row.stockType || null,
            note: row.note || undefined,
        };
    });
    
    await onSave(transactionsToSave as (Omit<Transaction, 'id'> & { id?: string })[]);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
      <div className="bg-[#111827] border border-gray-700 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col p-6 text-white animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 flex-shrink-0">{mode === 'add' ? 'Bulk Add Transactions' : 'Bulk Edit Transactions'}</h2>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {rows.map((row, index) => (
                <EditableRow key={row.localId} tx={row} index={index} onChange={handleRowChange} onRemove={handleRemoveRow} />
            ))}
        </div>

        <div className="mt-6 flex justify-between items-center flex-shrink-0">
          <button onClick={handleAddRow} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 font-semibold text-sm">Add Another Row</button>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 font-semibold">Cancel</button>
            <button onClick={handleSubmit} disabled={isSaving} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold disabled:bg-blue-800 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : `Save All ${rows.length} Transactions`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkTransactionModal;