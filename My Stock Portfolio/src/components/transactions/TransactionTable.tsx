import React, { useState, useMemo } from 'react';
import { useTransactionStore, Transaction } from '../../stores/transactionStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { Search, Plus, Trash2, Edit2, Upload, Filter, X } from 'lucide-react';
import { TransactionFormModal } from './TransactionFormModal';
import { BulkTransactionModal } from './BulkTransactionModal';
import clsx from 'clsx';

export const resolveSector = (tx: Transaction): string => {
  if (tx.sector) return tx.sector;
  const sym = (tx.symbol || '').toUpperCase();
  if (sym === 'NVDA') return 'Technology';
  if (sym === 'SCHG') return 'Large Cap Growth';
  if (sym === 'SPY') return 'Blend / S&P 500';
  if (sym === 'GLD') return 'Precious Metals';
  if (sym === 'BTC-USD' || sym === 'BTC') return 'Cryptocurrency';
  if (sym === 'CASH' || tx.type === 'DEPOSIT' || tx.type === 'INTEREST') return 'Cash / Currency';
  return tx.asset || 'General';
};

export const resolveStockType = (tx: Transaction): string => {
  if (tx.stock_type) {
    return tx.stock_type === 'Speculative' ? 'Small Cap' : tx.stock_type;
  }
  const sym = (tx.symbol || '').toUpperCase();
  if (sym === 'NVDA' || sym === 'PLTR' || sym === 'RKLB' || sym === 'CRWD' || sym === 'HIMS' || sym === 'MELI' || sym === 'RBRK' || sym === 'CRWV') return 'Hyper Growth';
  if (sym === 'COST' || sym === 'AMZN' || sym === 'META' || sym === 'MSFT' || sym === 'GOOGL' || sym === 'AAPL' || sym === 'ISRG' || sym === 'V' || sym === 'MA') return 'Core Compounder';
  if (sym === 'SCHG' || sym === 'SPY' || sym === 'VOO' || sym === 'QQQ' || sym === 'IVV') return 'Index / ETF';
  if (sym === 'SCHD' || sym === 'VICI' || sym === 'O' || sym === 'JEPI') return 'High Yield';
  if (sym === 'AVGO' || sym === 'TXRH' || sym === 'SPGI') return 'Dividend Growth';
  if (sym === 'ASTS') return 'Small Cap';
  if (sym === 'GLD') return 'Defensive / Value';
  if (sym === 'BTC-USD' || sym === 'BTC') return 'Small Cap';
  if (sym === 'CASH' || tx.type === 'DEPOSIT' || tx.type === 'INTEREST') return 'Cash';
  return 'Core Compounder';
};

export const getStrategyBadgeStyle = (strategy: string): string => {
  const norm = strategy === 'Speculative' ? 'Small Cap' : strategy;
  switch (norm) {
    case 'Hyper Growth':
      // จัดจ้าน แดงลึก (Bold Crimson Red)
      return 'bg-[#dc2626] text-white shadow-[0_2px_8px_rgba(220,38,38,0.45)]';
    case 'Core Compounder':
      // เขียวทึบเข้ม (Deep Emerald Green)
      return 'bg-[#15803d] text-white shadow-[0_2px_8px_rgba(21,128,61,0.45)]';
    case 'Small Cap':
      // เหลืองทองลึก (Deep Amber / Golden Yellow)
      return 'bg-[#b45309] text-white shadow-[0_2px_8px_rgba(180,83,9,0.45)]';
    case 'Dividend Growth':
      // ฟ้าอมเขียวเทอร์ควอยซ์สด (Vivid Teal / Sea Cyan)
      return 'bg-[#0d9488] text-white shadow-[0_2px_8px_rgba(13,148,136,0.45)]';
    case 'High Yield':
      // ม่วงบานเย็น / มาเจนต้าจัดจ้าน (Vivid Magenta / Fuchsia)
      return 'bg-[#c026d3] text-white shadow-[0_2px_8px_rgba(192,38,211,0.45)]';
    case 'Index / ETF':
      // น้ำเงินโคบอลต์เข้มแท้ (Deep Cobalt / Royal Blue)
      return 'bg-[#1d4ed8] text-white shadow-[0_2px_8px_rgba(29,78,216,0.45)]';
    case 'Defensive / Value':
      // เทาสเลทลึก (Deep Slate Blue)
      return 'bg-[#475569] text-white shadow-[0_2px_8px_rgba(71,85,105,0.45)]';
    case 'Cash':
      // ดำชาโคลลึก (Deep Dark Zinc)
      return 'bg-[#27272a] text-white shadow-[0_2px_8px_rgba(39,39,42,0.45)]';
    default:
      return 'bg-[#374151] text-white shadow-[0_2px_8px_rgba(55,65,81,0.45)]';
  }
};

export const TransactionTable = () => {
  const { transactions, fetchTransactions, deleteTransaction, bulkDeleteTransaction } = useTransactionStore();
  const { activePortfolioId } = usePortfolioStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedAsset, setSelectedAsset] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedStockType, setSelectedStockType] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  React.useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
  }, [activePortfolioId, fetchTransactions]);

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const types = new Set<string>();
    const assets = new Set<string>();
    const sectors = new Set<string>();
    const stockTypes = new Set<string>();

    transactions.forEach(tx => {
      if (tx.type) types.add(tx.type);
      if (tx.asset) assets.add(tx.asset);
      const s = resolveSector(tx);
      if (s) sectors.add(s);
      const st = resolveStockType(tx);
      if (st) stockTypes.add(st);
    });

    return {
      types: Array.from(types).sort(),
      assets: Array.from(assets).sort(),
      sectors: Array.from(sectors).sort(),
      stockTypes: Array.from(stockTypes).sort()
    };
  }, [transactions]);

  const hasActiveFilters = searchTerm !== '' || selectedType !== 'ALL' || selectedAsset !== 'ALL' || selectedSector !== 'ALL' || selectedStockType !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedAsset('ALL');
    setSelectedSector('ALL');
    setSelectedStockType('ALL');
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Text search
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        tx.symbol?.toLowerCase().includes(q) || 
        tx.type.toLowerCase().includes(q) ||
        tx.asset?.toLowerCase().includes(q) ||
        resolveSector(tx).toLowerCase().includes(q) ||
        resolveStockType(tx).toLowerCase().includes(q) ||
        tx.note?.toLowerCase().includes(q)
      );

      if (!matchesSearch) return false;

      // 2. Type filter
      if (selectedType !== 'ALL' && tx.type !== selectedType) return false;

      // 3. Asset Class filter
      if (selectedAsset !== 'ALL' && tx.asset !== selectedAsset) return false;

      // 4. Sector filter
      if (selectedSector !== 'ALL' && resolveSector(tx) !== selectedSector) return false;

      // 5. Stock Type / Strategy filter
      if (selectedStockType !== 'ALL' && resolveStockType(tx) !== selectedStockType) return false;

      return true;
    });
  }, [transactions, searchTerm, selectedType, selectedAsset, selectedSector, selectedStockType]);

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
          <p className="text-[#9898C8] mt-2">Manage trading records, asset allocation, and granular filters.</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] text-[#9898C8]">
            Showing <strong className="text-white">{filteredTransactions.length}</strong> of {transactions.length}
          </span>
        </div>
      </div>

      {/* Header Actions & Search */}
      <div className="bg-[#111418] p-6 rounded-3xl border border-[#2A2E45] space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="relative group w-full md:w-80">
            <Search className="w-5 h-5 text-[#9898C8] absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#FC2D79] transition-colors" />
            <input 
              type="text" 
              placeholder="Search symbol, sector, note..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl pl-12 pr-4 py-3 text-white placeholder-[#9898C8] focus:outline-none focus:border-[#FC2D79] focus:ring-1 focus:ring-[#FC2D79] transition-all text-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-[#FD5514]/10 text-[#FD5514] border border-[#FD5514]/30 px-4 py-3 rounded-xl font-medium hover:bg-[#FD5514]/20 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedIds.size})
              </button>
            )}
            
            <button 
              onClick={() => setIsBulkOpen(true)}
              className="flex items-center gap-2 bg-[#1A1D2D] text-white border border-[#2A2E45] px-4 py-3 rounded-xl font-medium hover:border-[#823AFD] transition-colors text-sm"
            >
              <Upload className="w-4 h-4 text-[#823AFD]" />
              Bulk Add
            </button>
            
            <button 
              onClick={() => { setEditingTx(null); setIsFormOpen(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_16px_rgba(252,45,121,0.3)] hover:opacity-90 transition-opacity text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[#2A2E45]/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#9898C8] mr-1">
            <Filter className="w-3.5 h-3.5 text-[#823AFD]" />
            <span>Filters:</span>
          </div>

          {/* Trade Type Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[#9898C8]">Type:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-[#1A1D2D] border border-[#2A2E45] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#823AFD]"
            >
              <option value="ALL">All Types</option>
              {filterOptions.types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Asset Class Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[#9898C8]">Asset Class:</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="bg-[#1A1D2D] border border-[#2A2E45] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#823AFD]"
            >
              <option value="ALL">All Assets</option>
              {filterOptions.assets.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[#9898C8]">Sector:</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-[#1A1D2D] border border-[#2A2E45] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#823AFD]"
            >
              <option value="ALL">All Sectors</option>
              {filterOptions.sectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Stock Strategy / Type Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[#9898C8]">Strategy:</label>
            <select
              value={selectedStockType}
              onChange={(e) => setSelectedStockType(e.target.value)}
              className="bg-[#1A1D2D] border border-[#2A2E45] text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#823AFD]"
            >
              <option value="ALL">All Strategies</option>
              {filterOptions.stockTypes.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-[#FC2D79] hover:text-[#FD5514] bg-[#FC2D79]/10 px-2.5 py-1.5 rounded-lg border border-[#FC2D79]/20 transition-colors ml-auto"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1A1D2D] border-b border-[#2A2E45]">
                <th className="py-5 px-4 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-[#2A2E45] bg-[#0F111A] text-[#823AFD] focus:ring-[#823AFD]"
                    checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider w-28">Date</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider">Symbol</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider">Type</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider">Asset Class</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider">Sector</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider">Strategy</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider text-right">Price</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider text-right">Amount (4 Dec)</th>
                <th className="py-5 px-3 text-[#9898C8] font-medium text-xs uppercase tracking-wider text-right">Total ($)</th>
                <th className="py-5 px-4 text-[#9898C8] font-medium text-xs uppercase tracking-wider text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E45]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#9898C8]">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const dateStr = new Date(tx.date).toLocaleDateString();
                  const total = tx.amount * (tx.price || 1) + (tx.fee || 0);
                  const displaySymbol = tx.symbol || tx.type.slice(0, 3);
                  const isSelected = selectedIds.has(tx.id);
                  const sector = resolveSector(tx);
                  const stockType = resolveStockType(tx);

                  return (
                    <tr 
                      key={tx.id} 
                      className={clsx(
                        "hover:bg-[#1A1D2D]/50 transition-colors group",
                        isSelected && "bg-[#1A1D2D]"
                      )}
                    >
                      <td className="py-3.5 px-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-[#2A2E45] bg-[#0F111A] text-[#823AFD] focus:ring-[#823AFD]"
                          checked={isSelected}
                          onChange={() => handleSelectOne(tx.id)}
                        />
                      </td>
                      <td className="py-3.5 px-3 text-[#9898C8] text-xs font-mono">{dateStr}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0F111A] border border-[#2A2E45] flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-[10px]">{displaySymbol.slice(0, 4)}</span>
                          </div>
                          <span className="text-white font-bold text-sm tracking-wide">{displaySymbol}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border",
                          tx.type === 'BUY' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          tx.type === 'DEPOSIT' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          tx.type === 'DIVIDEND' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          tx.type === 'INTEREST' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                          tx.type === 'SELL' || tx.type === 'WITHDRAW' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-[#1A1D2D] border border-[#2A2E45] text-[#9898C8]">
                          {tx.asset || 'Stock'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-xs text-gray-300 font-medium">
                          {sector}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={clsx(
                          "px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide inline-block whitespace-nowrap text-center transition-transform hover:scale-105",
                          getStrategyBadgeStyle(stockType)
                        )}>
                          {stockType}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-white font-mono text-xs">${(tx.price || 0).toFixed(2)}</td>
                      <td className="py-3.5 px-3 text-right text-white font-mono text-xs font-semibold">
                        {typeof tx.amount === 'number' ? Number(tx.amount).toFixed(4) : tx.amount}
                      </td>
                      <td className="py-3.5 px-3 text-right text-white font-bold font-mono text-xs">
                        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingTx(tx); setIsFormOpen(true); }}
                            className="p-1.5 rounded-lg bg-[#1A1D2D] text-[#9898C8] hover:text-[#823AFD] hover:bg-[#823AFD]/10 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => { if(confirm('Delete?')) deleteTransaction(tx.id); }}
                            className="p-1.5 rounded-lg bg-[#1A1D2D] text-[#9898C8] hover:text-[#FC2D79] hover:bg-[#FC2D79]/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
