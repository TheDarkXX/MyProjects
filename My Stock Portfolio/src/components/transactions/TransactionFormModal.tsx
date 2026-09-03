import React, { useState, useEffect } from 'react';
import { Transaction, useTransactionStore } from '../../stores/transactionStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { X } from 'lucide-react';

interface Props {
  transaction?: Transaction | null;
  onClose: () => void;
}

export const TransactionFormModal: React.FC<Props> = ({ transaction, onClose }) => {
  const { activePortfolioId } = usePortfolioStore();
  const { addTransaction, updateTransaction } = useTransactionStore();

  const [formData, setFormData] = useState<Partial<Transaction>>({
    portfolio_id: activePortfolioId || '',
    date: new Date().toISOString().split('T')[0],
    type: 'BUY',
    symbol: '',
    asset: 'Stock',
    amount: 0,
    price: 0,
    fee: 0,
    status: 'CONFIRMED'
  });

  useEffect(() => {
    if (transaction) {
      setFormData(transaction);
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (transaction?.id) {
        await updateTransaction(transaction.id, formData);
      } else {
        await addTransaction(formData);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save transaction');
    }
  };

  const isCashFlow = ['DIVIDEND', 'INTEREST', 'DEPOSIT', 'WITHDRAW', 'FEE'].includes(formData.type || '');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl w-full max-w-lg shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-[#2A2E45]">
          <h2 className="text-xl font-bold text-white">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button onClick={onClose} className="text-[#9898C8] hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#9898C8] mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  const isNewCashFlow = ['DIVIDEND', 'INTEREST', 'DEPOSIT', 'WITHDRAW', 'FEE'].includes(newType);
                  setFormData({ 
                    ...formData, 
                    type: newType,
                    price: isNewCashFlow ? 1 : formData.price
                  });
                }}
                className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAW">Withdraw</option>
                <option value="DIVIDEND">Dividend</option>
                <option value="INTEREST">Interest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9898C8] mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#9898C8] mb-1">Symbol / Label</label>
              <input
                type="text"
                required
                value={formData.symbol || ''}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD] uppercase"
                placeholder={isCashFlow ? "e.g. CASH or AAPL" : "e.g. AAPL"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9898C8] mb-1">Asset Class</label>
              <input
                type="text"
                value={formData.asset || ''}
                onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
                placeholder="e.g. Stock, ETF, Cash"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#9898C8] mb-1">
                Sector <span className="text-xs text-[#823AFD] font-normal">(Auto-fetches)</span>
              </label>
              <input
                type="text"
                value={formData.sector || ''}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
                placeholder="Leave blank for auto-detect"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9898C8] mb-1">Strategy (Role)</label>
              <select
                value={formData.stock_type || 'Core Compounder'}
                onChange={(e) => setFormData({ ...formData, stock_type: e.target.value })}
                className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
              >
                <option value="Core Compounder">🌟 Core Compounder</option>
                <option value="Hyper Growth">🚀 Hyper Growth</option>
                <option value="Dividend Growth">📈 Dividend Growth</option>
                <option value="High Yield">💰 High Yield / Income</option>
                <option value="Index / ETF">🏛️ Index / ETF</option>
                <option value="Defensive / Value">🛡️ Defensive / Value</option>
                <option value="Small Cap">🎯 Small Cap</option>
                <option value="Cash">💵 Cash / Money Market</option>
              </select>
            </div>
          </div>

          {isCashFlow ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#9898C8] mb-1">Total Value ($)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    amount: parseFloat(e.target.value),
                    price: 1 // Force price to 1 for cash flows
                  })}
                  className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9898C8] mb-1">Fee</label>
                <input
                  type="number"
                  step="any"
                  value={formData.fee || 0}
                  onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) })}
                  className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#9898C8] mb-1">Quantity</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9898C8] mb-1">Price</label>
                <input
                  type="number"
                  step="any"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9898C8] mb-1">Fee</label>
                <input
                  type="number"
                  step="any"
                  value={formData.fee || 0}
                  onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) })}
                  className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#823AFD]"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-white font-medium hover:bg-[#2A2E45] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white font-bold shadow-[0_4px_16px_rgba(130,58,253,0.3)] hover:opacity-90 transition-opacity"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
