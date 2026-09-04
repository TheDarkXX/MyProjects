import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useBlueprintStore, BlueprintEntry } from '../../stores/blueprintStore';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { useHoldings } from '../../hooks/useHoldings';
import { api } from '../../services/api';
import { PRESET_TEMPLATES } from './StrategyConfigs';
import { Search, Edit2, Trash2, Sparkles, TrendingUp, Shield, Target } from 'lucide-react';

interface BlueprintEditorProps {
  portfolioId: string;
}

interface SearchItem {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
}

interface TechnicalData {
  symbol: string;
  currentPrice: number;
  currency: string;
  sma50: number | null;
  sma200: number | null;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  sector: string;
  industry?: string;
}

// Reusable Symbol Search Autocomplete Input
const SymbolSearchInput: React.FC<{
  value: string;
  onChange: (val: string, item?: SearchItem) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}> = ({ value, onChange, placeholder = 'เช่น NVDA', className = '', inputClassName = '' }) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<SearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await api.prices.search(trimmed);
        setSuggestions(results || []);
        setIsOpen((results && results.length > 0) || false);
      } catch (err) {
        console.error('Yahoo search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    setQuery(item.symbol);
    onChange(item.symbol, item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setQuery(val);
            onChange(val);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          className={inputClassName || "w-full bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white uppercase font-bold outline-none focus:border-[#823AFD]"}
        />
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 animate-spin text-xs">
            ⏳
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 w-72 bg-[#161926] border border-[#2A2E45] rounded-xl shadow-2xl p-1.5 z-50 max-h-64 overflow-y-auto">
          <div className="text-xs font-bold text-slate-300 px-2 py-1 uppercase tracking-wider flex items-center gap-1 border-b border-[#2A2E45]/50 mb-1">
            <Search className="w-3.5 h-3.5 text-[#823AFD]" /> ผลการค้นหาจาก Yahoo Finance
          </div>
          {suggestions.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left p-2 rounded-lg hover:bg-white/[0.06] transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm group-hover:text-[#823AFD] transition-colors">
                    {item.symbol}
                  </span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {item.type}
                  </span>
                  {item.exchange && (
                    <span className="text-xs text-slate-400">{item.exchange}</span>
                  )}
                </div>
                <div className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                  {item.name}
                </div>
                {item.sector && (
                  <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                    หมวด: {item.sector}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const BlueprintEditor: React.FC<BlueprintEditorProps> = ({ portfolioId }) => {
  const { blueprints, isLoading, error, fetchBlueprints, upsertBlueprint, updateBlueprint, deleteBlueprint, autoGenerate, applyTemplate } = useBlueprintStore();
  const { currency } = useUiStore();
  const { prices, fetchPrices, exchangeRate } = usePriceStore();
  const { holdings } = useHoldings();

  // Set of actively owned symbols in portfolio
  const ownedSymbols = useMemo(() => {
    return new Set(holdings.filter(h => h.quantity > 0.0001).map(h => h.symbol.toUpperCase()));
  }, [holdings]);

  // Add form state
  const [newSymbol, setNewSymbol] = useState('');
  const [newTargetPercent, setNewTargetPercent] = useState<number | ''>('');
  const [newStatus, setNewStatus] = useState<'OWNED' | 'WATCHLIST'>('WATCHLIST');
  const [newTargetPrice, setNewTargetPrice] = useState<number | ''>('');
  const [newCategory, setNewCategory] = useState('Core');
  const [techData, setTechData] = useState<TechnicalData | null>(null);
  const [techLoading, setTechLoading] = useState(false);

  // Inline edit state
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editSymbol, setEditSymbol] = useState('');
  const [editPercent, setEditPercent] = useState<number | ''>('');
  const [editStatus, setEditStatus] = useState<'OWNED' | 'WATCHLIST'>('WATCHLIST');
  const [editPrice, setEditPrice] = useState<number | ''>('');
  const [editCategory, setEditCategory] = useState('Core');
  const [editTechData, setEditTechData] = useState<TechnicalData | null>(null);

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const effectiveRate = exchangeRate > 0 ? exchangeRate : 35.0;

  const formatPrice = (usd: number | null | undefined) => {
    if (!usd || isNaN(usd)) return '-';
    const val = currency === 'THB' ? usd * effectiveRate : usd;
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  useEffect(() => {
    if (portfolioId) {
      fetchBlueprints(portfolioId);
    }
  }, [portfolioId, fetchBlueprints]);

  // Fetch prices for all blueprint symbols
  useEffect(() => {
    if (blueprints.length > 0) {
      const symbols = blueprints.map(b => b.symbol);
      fetchPrices(symbols);
    }
  }, [blueprints, fetchPrices]);

  // Auto-detect status & fetch technicals (EMA150, SMA200, SMA50) when newSymbol changes
  useEffect(() => {
    const sym = newSymbol.trim().toUpperCase();
    if (sym.length === 0) {
      setTechData(null);
      return;
    }

    // Auto-detect status based on active portfolio holdings
    if (ownedSymbols.has(sym)) {
      setNewStatus('OWNED');
    } else {
      setNewStatus('WATCHLIST');
    }

    const timer = setTimeout(async () => {
      setTechLoading(true);
      try {
        const data = await api.prices.technicals(sym);
        if (data) {
          setTechData(data);
          if (data.sector && data.sector !== 'Other') {
            setNewCategory(data.sector);
          }
        }
      } catch (err) {
        console.warn('Error fetching technicals for', sym, err);
      } finally {
        setTechLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newSymbol, ownedSymbols]);

  // Fetch technicals when editing an existing symbol
  useEffect(() => {
    if (!editingSymbol) {
      setEditTechData(null);
      return;
    }
    api.prices.technicals(editingSymbol).then(data => {
      if (data) setEditTechData(data);
    }).catch(() => {});
  }, [editingSymbol]);

  const handleAdd = async () => {
    if (!newSymbol || newTargetPercent === '') return;
    await upsertBlueprint(portfolioId, {
      symbol: newSymbol.toUpperCase(),
      target_percent: Number(newTargetPercent),
      target_price: newTargetPrice !== '' ? Number(newTargetPrice) : null,
      status: newStatus,
      category: newCategory || 'Core'
    });
    setNewSymbol('');
    setNewTargetPercent('');
    setNewTargetPrice('');
    setNewStatus('WATCHLIST');
    setNewCategory('Core');
    setTechData(null);
  };

  const handleStartEdit = (bp: BlueprintEntry) => {
    setEditingSymbol(bp.symbol);
    setEditSymbol(bp.symbol);
    setEditPercent(bp.target_percent);
    // Auto-detect status from ownedSymbols if desired
    const autoStatus = ownedSymbols.has(bp.symbol.toUpperCase()) ? 'OWNED' : bp.status;
    setEditStatus(autoStatus);
    setEditPrice(bp.target_price !== null ? bp.target_price : '');
    setEditCategory(bp.category || 'Core');
  };

  const handleCancelEdit = () => {
    setEditingSymbol(null);
  };

  const handleSaveEdit = async (oldSymbol: string) => {
    if (!editSymbol || editPercent === '') return;
    await updateBlueprint(portfolioId, oldSymbol, {
      symbol: editSymbol.toUpperCase(),
      target_percent: Number(editPercent),
      status: editStatus,
      target_price: editPrice !== '' ? Number(editPrice) : null,
      category: editCategory || 'Core',
    });
    setEditingSymbol(null);
  };

  const handleApplyTemplate = async (templateId: string) => {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId);
    if (template && window.confirm(`คุณแน่ใจหรือไม่ที่จะใช้เทมเพลต ${template.name}? ระบบจะนำเข้าเป้าหมายของหุ้นกลุ่มนี้ลงใน Blueprint`)) {
      await applyTemplate(portfolioId, template.entries);
    }
  };

  const totalPercent = blueprints.reduce((acc, curr) => acc + curr.target_percent, 0);
  const isPercentValid = Math.abs(totalPercent - 100) < 0.01;

  if (isLoading && blueprints.length === 0) return <div className="p-8 text-center text-slate-300 font-semibold">กำลังโหลด Blueprint...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Portfolio Blueprint Setup</h2>
          <p className="text-sm text-slate-300">กำหนดสัดส่วนเป้าหมายในอุดมคติ ระบบ Smart Rebalance จะใช้ข้อมูลนี้คำนวณการปรับพอร์ตอัตโนมัติ</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="bg-[#161926] border border-[#2A2E45] text-sm font-semibold rounded-xl px-4 py-2 text-white outline-none focus:border-[#823AFD]"
            onChange={(e) => handleApplyTemplate(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>เลือกเทมเพลตมาตรฐาน...</option>
            {PRESET_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              if (window.confirm('สร้าง Blueprint อัตโนมัติจากหุ้นที่มีอยู่ในพอร์ตปัจจุบัน?')) autoGenerate(portfolioId);
            }}
            className="px-4 py-2 bg-[#1A1D2D] hover:bg-[#2A2E45] text-white text-sm font-bold rounded-xl border border-[#2A2E45] transition-colors"
          >
            Auto-Generate จากพอร์ตปัจจุบัน
          </button>
        </div>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl overflow-visible shadow-lg">
        <table className="w-full text-left text-sm text-slate-200">
          <thead className="bg-[#161926] text-xs uppercase text-slate-300 border-b border-[#2A2E45]">
            <tr>
              <th className="px-5 py-4 font-bold">Symbol</th>
              <th className="px-5 py-4 font-bold text-right">ราคาตลาด (ปัจจุบัน)</th>
              <th className="px-5 py-4 font-bold text-right">Target % (คลิกแก้ได้)</th>
              <th className="px-5 py-4 font-bold text-center">Status</th>
              <th className="px-5 py-4 font-bold text-right">Target Price ({currSymbol})</th>
              <th className="px-5 py-4 font-bold">Category</th>
              <th className="px-5 py-4 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2E45]/60">
            {blueprints.map(bp => {
              const isEditingThis = editingSymbol === bp.symbol;
              const isActuallyOwned = ownedSymbols.has(bp.symbol.toUpperCase());
              const currentPriceUsd = prices[bp.symbol]?.price || holdings.find(h => h.symbol.toUpperCase() === bp.symbol.toUpperCase())?.lastPrice;
              const priceChange = prices[bp.symbol]?.percent_change;

              if (isEditingThis) {
                return (
                  <tr key={bp.symbol} className="bg-[#161926] border-2 border-[#823AFD]/50">
                    <td className="px-5 py-3">
                      <SymbolSearchInput
                        value={editSymbol}
                        onChange={(val, item) => {
                          setEditSymbol(val);
                          if (item?.sector) setEditCategory(item.sector);
                        }}
                        inputClassName="w-32 bg-[#1A1D2D] border border-[#823AFD] rounded-xl px-3 py-1.5 text-sm text-white uppercase font-black outline-none"
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="font-bold text-white text-sm">
                        {currentPriceUsd ? formatPrice(currentPriceUsd) : '-'}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={editPercent}
                          onChange={(e) => setEditPercent(Number(e.target.value))}
                          className="w-20 bg-[#1A1D2D] border border-[#10B981] rounded-xl px-2.5 py-1.5 text-sm text-white text-right font-bold outline-none"
                        />
                        <span className="text-white font-bold">%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'OWNED' | 'WATCHLIST')}
                        className="bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none"
                      >
                        <option value="WATCHLIST">Watchlist (ยังไม่มี)</option>
                        <option value="OWNED">Owned (ถืออยู่)</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          placeholder="เป้าหมาย ($)"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-28 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white text-right outline-none"
                        />
                        {/* Quick-fill Technical Levels Chips */}
                        {editTechData && (
                          <div className="flex flex-wrap items-center justify-end gap-1 mt-1 max-w-[280px]">
                            {editTechData.ema150 && (
                              <button
                                type="button"
                                onClick={() => setEditPrice(editTechData.ema150!)}
                                className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-0.5"
                                title="คลิกเพื่อใช้ EMA 150 วัน"
                              >
                                <Target className="w-3 h-3 text-purple-300" /> EMA150: {formatPrice(editTechData.ema150)}
                              </button>
                            )}
                            {editTechData.sma200 && (
                              <button
                                type="button"
                                onClick={() => setEditPrice(editTechData.sma200!)}
                                className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-0.5"
                                title="คลิกเพื่อใช้ SMA 200 วัน"
                              >
                                <Shield className="w-3 h-3 text-blue-300" /> SMA200: {formatPrice(editTechData.sma200)}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-28 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-2 py-1 text-xs text-white outline-none"
                      />
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleSaveEdit(bp.symbol)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all mr-2"
                      >
                        ✓ บันทึก
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                      >
                        ✕ ยกเลิก
                      </button>
                    </td>
                  </tr>
                );
              }

              // Distance % between Target Price and Current Price
              const targetDist = (bp.target_price && currentPriceUsd) 
                ? ((bp.target_price - currentPriceUsd) / currentPriceUsd) * 100 
                : null;

              return (
                <tr key={bp.symbol} className="hover:bg-white/[0.02] transition-colors group">
                  {/* Symbol */}
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(bp)}
                      className="flex items-center gap-2 text-left group-hover:text-[#823AFD] transition-colors"
                      title="คลิกเพื่อแก้ไขชื่อหรือเป้าหมาย"
                    >
                      <span className="font-black text-white text-base group-hover:text-[#823AFD]">{bp.symbol}</span>
                      <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </td>

                  {/* Current Market Price Column */}
                  <td className="px-5 py-4 text-right">
                    <div className="font-extrabold text-white text-sm">
                      {currentPriceUsd ? formatPrice(currentPriceUsd) : '-'}
                    </div>
                    {priceChange !== undefined && (
                      <div className={`text-xs font-bold ${priceChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                      </div>
                    )}
                  </td>

                  {/* Direct Inline Editable Target % */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        defaultValue={bp.target_percent}
                        key={`${bp.symbol}-${bp.target_percent}`}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && Math.abs(val - bp.target_percent) > 0.001) {
                            updateBlueprint(portfolioId, bp.symbol, { target_percent: val });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-20 bg-transparent hover:bg-[#1A1D2D] focus:bg-[#1A1D2D] border border-transparent hover:border-[#2A2E45] focus:border-emerald-500 rounded-xl px-2 py-1 text-right font-black text-emerald-400 text-base outline-none transition-all cursor-pointer focus:cursor-text"
                        title="คลิกแก้ Target % ได้ทันที (กด Enter หรือคลิกออกเพื่อบันทึก)"
                      />
                      <span className="text-emerald-400 font-bold text-sm">%</span>
                    </div>
                  </td>

                  {/* Auto-detected Status */}
                  <td className="px-5 py-4 text-center">
                    {isActuallyOwned ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        OWNED (มีในพอร์ต)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        WATCHLIST
                      </span>
                    )}
                  </td>

                  {/* Target Price */}
                  <td className="px-5 py-4 text-right">
                    <div className="text-white font-bold text-sm">
                      {bp.target_price ? formatPrice(bp.target_price) : '-'}
                    </div>
                    {targetDist !== null && (
                      <div className={`text-xs font-semibold ${targetDist < 0 ? 'text-purple-300' : 'text-emerald-300'}`}>
                        {targetDist > 0 ? `+${targetDist.toFixed(1)}%` : `${targetDist.toFixed(1)}%`} จากตลาด
                      </div>
                    )}
                  </td>

                  {/* Category (Auto-generated sector) */}
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                      {bp.category || 'Core'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button 
                      onClick={() => handleStartEdit(bp)}
                      className="text-[#823AFD] hover:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-[#823AFD]/10 transition-all mr-2"
                    >
                      แก้ไข
                    </button>
                    <button 
                      onClick={() => deleteBlueprint(portfolioId, bp.symbol)} 
                      className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-all"
                    >
                      ลบออก
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {/* Add New Row */}
            <tr className="bg-[#161926]/80 border-t border-[#2A2E45]">
              <td className="px-5 py-3">
                <SymbolSearchInput
                  value={newSymbol}
                  onChange={(val, item) => {
                    setNewSymbol(val);
                    if (item?.sector) setNewCategory(item.sector);
                  }}
                  placeholder="เช่น NVDA, AAPL"
                  inputClassName="w-36 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white uppercase font-bold outline-none focus:border-[#823AFD]"
                />
              </td>

              {/* Live Market Price for newly typed symbol */}
              <td className="px-5 py-3 text-right">
                <div className="font-extrabold text-white text-sm">
                  {techData?.currentPrice ? formatPrice(techData.currentPrice) : (techLoading ? '⏳...' : '-')}
                </div>
              </td>

              <td className="px-5 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <input 
                    type="number" 
                    step="0.5"
                    min="0"
                    max="100"
                    placeholder="0" 
                    value={newTargetPercent}
                    onChange={e => setNewTargetPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-20 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white text-right font-bold outline-none focus:border-[#10B981]"
                  />
                  <span className="text-white font-bold">%</span>
                </div>
              </td>

              {/* Status with auto-detection info */}
              <td className="px-5 py-3 text-center">
                <select 
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as 'OWNED' | 'WATCHLIST')}
                  className="bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-2.5 py-1.5 text-xs text-white font-bold outline-none"
                >
                  <option value="WATCHLIST">Watchlist (ยังไม่มี)</option>
                  <option value="OWNED">Owned (ถืออยู่)</option>
                </select>
              </td>

              {/* Target Price with 1-Click Technicals Quick-fill Chips */}
              <td className="px-5 py-3 text-right">
                <div className="flex flex-col items-end gap-1">
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder={`เป้าหมาย (${currSymbol})`} 
                    value={newTargetPrice}
                    onChange={e => setNewTargetPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-32 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white text-right outline-none focus:border-[#823AFD]"
                  />

                  {/* 1-Click Technical Indicator Chips: EMA 150 / SMA 200 / SMA 50 */}
                  {techData && (
                    <div className="flex flex-wrap items-center justify-end gap-1 mt-1 max-w-[280px]">
                      {techData.ema150 && (
                        <button
                          type="button"
                          onClick={() => setNewTargetPrice(techData.ema150!)}
                          className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          title="คลิกเพื่อตั้งราคาเป้าหมายที่เส้น EMA 150 วัน (แนวรับ Trend สำคัญ)"
                        >
                          <Target className="w-3 h-3 text-purple-300" />
                          <span>EMA150:</span>
                          <span>{formatPrice(techData.ema150)}</span>
                        </button>
                      )}
                      {techData.sma200 && (
                        <button
                          type="button"
                          onClick={() => setNewTargetPrice(techData.sma200!)}
                          className="px-2 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          title="คลิกเพื่อตั้งราคาเป้าหมายที่เส้น SMA 200 วัน (แนวรับกองทุนสถาบัน)"
                        >
                          <Shield className="w-3 h-3 text-blue-300" />
                          <span>SMA200:</span>
                          <span>{formatPrice(techData.sma200)}</span>
                        </button>
                      )}
                      {techData.sma50 && (
                        <button
                          type="button"
                          onClick={() => setNewTargetPrice(techData.sma50!)}
                          className="px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          title="คลิกเพื่อตั้งราคาเป้าหมายที่เส้น SMA 50 วัน"
                        >
                          <TrendingUp className="w-3 h-3 text-emerald-300" />
                          <span>SMA50:</span>
                          <span>{formatPrice(techData.sma50)}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>

              {/* Auto-detected Category Badge */}
              <td className="px-5 py-3">
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                  {newCategory || 'Core'}
                </span>
              </td>

              <td className="px-5 py-3 text-right">
                <button 
                  onClick={handleAdd} 
                  disabled={!newSymbol || newTargetPercent === ''} 
                  className="px-4 py-2 bg-[#823AFD] hover:bg-[#7220FB] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-40"
                >
                  + เพิ่มหุ้น
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isPercentValid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <div>
          <div className={`text-base font-black ${isPercentValid ? 'text-emerald-400' : 'text-amber-400'}`}>
            สัดส่วนรวมทั้งหมด: {totalPercent.toFixed(1)}%
          </div>
          {!isPercentValid && (
            <div className="text-xs text-amber-300 mt-1 font-medium">
              สัดส่วนใน Blueprint ต้องรวมกันได้ 100% เพื่อให้การคำนวณ Rebalance แม่นยำ 
              {totalPercent < 100 ? ` (ยังขาดอีก ${(100 - totalPercent).toFixed(1)}%)` : ` (เกินไป ${(totalPercent - 100).toFixed(1)}%)`}
            </div>
          )}
        </div>
        {isPercentValid && (
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/40">
            <span>✓ Blueprint สมบูรณ์ พร้อม Rebalance</span>
          </div>
        )}
      </div>
    </div>
  );
};
