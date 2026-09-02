import React from 'react';
import { useTransactionStore } from '../../stores/transactionStore';
import { ArrowDownRight, ArrowUpRight, Search, Plus } from 'lucide-react';
import clsx from 'clsx';

export const TransactionTable = () => {
  const { transactions } = useTransactionStore();
  
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-[#111418] p-6 rounded-3xl border border-[#2A2E45]">
        <div className="relative group w-72">
          <Search className="w-5 h-5 text-[#9898C8] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#FC2D79] transition-colors" />
          <input 
            type="text" 
            placeholder="Search symbol or type..." 
            className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl pl-12 pr-4 py-3 text-white placeholder-[#9898C8] focus:outline-none focus:border-[#FC2D79] focus:ring-1 focus:ring-[#FC2D79] transition-all"
          />
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_16px_rgba(252,45,121,0.3)] hover:opacity-90 transition-opacity">
          <Plus className="w-5 h-5" />
          Add Transaction
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1A1D2D] border-b border-[#2A2E45]">
                <th className="py-5 px-6 text-[#9898C8] font-medium text-sm w-32">Date</th>
                <th className="py-5 px-6 text-[#9898C8] font-medium text-sm">Asset</th>
                <th className="py-5 px-6 text-[#9898C8] font-medium text-sm">Type</th>
                <th className="py-5 px-6 text-[#9898C8] font-medium text-sm text-right">Price</th>
                <th className="py-5 px-6 text-[#9898C8] font-medium text-sm text-right">Amount</th>
                <th className="py-5 px-6 text-[#9898C8] font-medium text-sm text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E45]">
              {transactions.map((tx) => {
                const isPositive = tx.type === 'SELL' || tx.type === 'WITHDRAW';
                const dateStr = new Date(tx.date).toLocaleDateString();
                const total = tx.amount * (tx.price || 1);
                const displaySymbol = tx.symbol || tx.type.slice(0, 3);

                return (
                  <tr key={tx.id} className="hover:bg-[#1A1D2D]/50 transition-colors group">
                    <td className="py-4 px-6 text-[#9898C8] text-sm">{dateStr}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0F111A] border border-[#2A2E45] flex items-center justify-center">
                          <span className="text-white font-bold text-xs">{displaySymbol}</span>
                        </div>
                        <span className="text-white font-bold">{displaySymbol}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={clsx(
                        "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                        tx.type === 'BUY' ? "bg-[#823AFD]/10 text-[#823AFD]" : 
                        tx.type === 'SELL' ? "bg-[#FC2D79]/10 text-[#FC2D79]" :
                        "bg-[#FD5514]/10 text-[#FD5514]"
                      )}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right text-white tabular-nums">${(tx.price || 0).toFixed(2)}</td>
                    <td className="py-4 px-6 text-right text-white tabular-nums">{tx.amount}</td>
                    <td className="py-4 px-6 text-right text-white font-bold tabular-nums">
                      ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
