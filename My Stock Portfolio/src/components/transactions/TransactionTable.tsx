import React, { useState, useMemo } from 'react';
import { useTransactionStore, Transaction } from '../../stores/transactionStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { Search, Plus, Trash2, Edit2, Upload } from 'lucide-react';
import { TransactionFormModal } from './TransactionFormModal';
import { BulkTransactionModal } from './BulkTransactionModal';
import clsx from 'clsx';

export const TransactionTable = () => {
  const { transactions, fetchTransactions, deleteTransaction, bulkDeleteTransaction } = useTransactionStore();
  const { activePortfolioId } = usePortfolioStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  React.useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
  }, [activePortfolioId, fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => 
      tx.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.asset?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transactions, searchTerm]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) {
      await bulkDeleteTransaction(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Transactions</h2>
          <p className="text-[#9898C8] mt-2">Manage your trading history and bulk operations.</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex justify-between items-center bg-[#111418] p-6 rounded-3xl border border-[#2A2E45] flex-wrap gap-4">
        <div className="relative group w-full md:w-72">
          <Search className="w-5 h-5 text-[#9898C8] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#FC2D79] transition-colors" />
          <input 
            type="text" 
            placeholder="Search symbol, type or asset..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl pl-12 pr-4 py-3 text-white placeholder-[#9898C8] focus:outline-none focus:border-[#FC2D79] focus:ring-1 focus:ring-[#FC2D79] transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-[#FD5514]/10 text-[#FD5514] border border-[#FD5514]/30 px-4 py-3 rounded-xl font-medium hover:bg-[#FD5514]/20 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Delete ({selectedIds.size})
            </button>
          )}
          
          <button 
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-2 bg-[#1A1D2D] text-white border border-[#2A2E45] px-4 py-3 rounded-xl font-medium hover:border-[#823AFD] transition-colors"
          >
            <Upload className="w-5 h-5 text-[#823AFD]" />
            Bulk Add
          </button>
          
          <button 
            onClick={() => { setEditingTx(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_16px_rgba(252,45,121,0.3)] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1A1D2D] border-b border-[#2A2E45]">
                <th className="py-5 px-6 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-[#2A2E45] bg-[#0F111A] text-[#823AFD] focus:ring-[#823AFD]"
                    checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="py-5 px-4 text-[#9898C8] font-medium text-sm w-32">Date</th>
                <th className="py-5 px-4 text-[#9898C8] font-medium text-sm">Asset</th>
                <th className="py-5 px-4 text-[#9898C8] font-medium text-sm">Type</th>
                <th className="py-5 px-4 text-[#9898C8] font-medium text-sm text-right">Price</th>
                <th className="py-5 px-4 text-[#9898C8] font-medium text-sm text-right">Amount</th>
                <th className="py-5 px-4 text-[#9898C8] font-medium text-sm text-right">Total</th>
                <th className="py-5 px-6 text-[#9898C8] font-medium text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E45]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#9898C8]">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const dateStr = new Date(tx.date).toLocaleDateString();
                  const total = tx.amount * (tx.price || 1) + (tx.fee || 0);
                  const displaySymbol = tx.symbol || tx.type.slice(0, 3);
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr 
                      key={tx.id} 
                      className={clsx(
                        "hover:bg-[#1A1D2D]/50 transition-colors group",
                        isSelected && "bg-[#1A1D2D]"
                      )}
                    >
                      <td className="py-4 px-6">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[#2A2E45] bg-[#0F111A] text-[#823AFD] focus:ring-[#823AFD]"
                          checked={isSelected}
                          onChange={() => handleSelectOne(tx.id)}
                        />
                      </td>
                      <td className="py-4 px-4 text-[#9898C8] text-sm">{dateStr}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0F111A] border border-[#2A2E45] flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-xs">{displaySymbol}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{displaySymbol}</span>
                            <span className="text-[#9898C8] text-xs">{tx.asset}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={clsx(
                          "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                          tx.type === 'BUY' || tx.type === 'DEPOSIT' ? "bg-[#823AFD]/10 text-[#823AFD]" : 
                          tx.type === 'SELL' || tx.type === 'WITHDRAW' ? "bg-[#FC2D79]/10 text-[#FC2D79]" :
                          "bg-[#00C49F]/10 text-[#00C49F]"
                        )}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-white tabular-nums">${(tx.price || 0).toFixed(2)}</td>
                      <td className="py-4 px-4 text-right text-white tabular-nums">{tx.amount}</td>
                      <td className="py-4 px-4 text-right text-white font-bold tabular-nums">
                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingTx(tx); setIsFormOpen(true); }}
                            className="p-2 rounded-lg bg-[#1A1D2D] text-[#9898C8] hover:text-[#823AFD] hover:bg-[#823AFD]/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { if(confirm('Delete?')) deleteTransaction(tx.id); }}
                            className="p-2 rounded-lg bg-[#1A1D2D] text-[#9898C8] hover:text-[#FC2D79] hover:bg-[#FC2D79]/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <TransactionFormModal 
          transaction={editingTx} 
          onClose={() => { setIsFormOpen(false); setEditingTx(null); }} 
        />
      )}

      {isBulkOpen && (
        <BulkTransactionModal onClose={() => setIsBulkOpen(false)} />
      )}
    </div>
  );
};
