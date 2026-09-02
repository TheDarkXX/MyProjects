import React, { useState } from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { X, Upload } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const BulkTransactionModal: React.FC<Props> = ({ onClose }) => {
  const { activePortfolioId } = usePortfolioStore();
  const { bulkCreateTransaction } = useTransactionStore();
  const [csvText, setCsvText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleProcess = async () => {
    if (!csvText.trim()) {
      setError('Please enter CSV data');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const lines = csvText.trim().split('\n');
      const transactions = [];

      // Skip header if exists (detect if first line contains "date" or "type")
      let startIndex = 0;
      if (lines[0].toLowerCase().includes('date') || lines[0].toLowerCase().includes('type')) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // CSV format: Date, Type, Symbol, Asset, Amount, Price, Fee
        // Support comma or tab separated
        const parts = line.split(/[,\t]/).map(s => s.trim());
        
        if (parts.length >= 3) {
          transactions.push({
            portfolio_id: activePortfolioId,
            date: parts[0] || new Date().toISOString().split('T')[0],
            type: (parts[1]?.toUpperCase() || 'BUY') as any,
            symbol: parts[2]?.toUpperCase() || '',
            asset: parts[3] || 'Stock',
            amount: parseFloat(parts[4] || '0'),
            price: parseFloat(parts[5] || '0'),
            fee: parseFloat(parts[6] || '0'),
            status: 'CONFIRMED'
          });
        }
      }

      if (transactions.length === 0) {
        throw new Error('No valid transactions found in input');
      }

      await bulkCreateTransaction(transactions);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process bulk data');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl w-full max-w-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-[#2A2E45]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#823AFD]" />
            Bulk Add Transactions
          </h2>
          <button onClick={onClose} className="text-[#9898C8] hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4 text-sm text-[#9898C8]">
            <p>Paste your CSV or Excel data here. Expected columns (Comma or Tab separated):</p>
            <div className="bg-[#1A1D2D] p-3 rounded-xl mt-2 font-mono text-xs text-white">
              Date, Type, Symbol, Asset, Amount, Price, Fee<br/>
              2024-01-15, BUY, AAPL, Stock, 10, 185.50, 0<br/>
              2024-01-16, SELL, MSFT, Stock, 5, 390.00, 0
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FD5514]/10 border border-[#FD5514]/30 text-[#FD5514] text-sm">
              {error}
            </div>
          )}

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full h-64 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl p-4 text-white font-mono text-sm focus:outline-none focus:border-[#823AFD] custom-scrollbar"
            placeholder="Paste data here..."
          />
        </div>

        <div className="p-6 border-t border-[#2A2E45] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-6 py-3 rounded-xl text-white font-medium hover:bg-[#2A2E45] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white font-bold shadow-[0_4px_16px_rgba(130,58,253,0.3)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Import Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
