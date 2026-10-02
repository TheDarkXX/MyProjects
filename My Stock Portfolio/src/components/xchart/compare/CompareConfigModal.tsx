import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
  TrendingUp,
  CircleDot,
  Check,
  Layers,
  Loader2,
} from 'lucide-react';
import {
  useXChartStore,
  CompareTabConfig,
  CompareLineStyleConfig,
  CompareRefSeries,
  DEFAULT_COMPARE_PRESETS,
  COMPARE_BUNDLES,
} from '../../../stores/xchartStore';
import { api } from '../../../services/api';
import clsx from 'clsx';

interface CompareConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tabId: string;
  targetSymbol: string;
  initialSection?: 'target' | 'refs' | 'display';
}

const PRESET_COLORS = [
  '#F59E0B', // Amber
  '#38BDF8', // Sky Blue
  '#4285F4', // Google Blue
  '#22C55E', // Nvidia Green
  '#EAB308', // Gold
  '#F97316', // Orange / BTC
  '#3B82F6', // Blue / SPY
  '#A855F7', // Purple / QQQ
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#FFFFFF', // White
];

interface SearchItem {
  symbol: string;
  shortname?: string;
  name?: string;
  exchange?: string;
  exchDisp?: string;
}

export const CompareConfigModal: React.FC<CompareConfigModalProps> = ({
  isOpen,
  onClose,
  tabId,
  targetSymbol,
  initialSection = 'refs',
}) => {
  const {
    tabs,
    updateCompareConfig,
    updateCompareTargetStyle,
    addCompareRef,
    removeCompareRef,
    toggleCompareRefVisible,
    updateCompareRefStyle,
    applyCompareBundle,
  } = useXChartStore();

  const currentTab = tabs.find((t) => t.id === tabId);
  const compareConfig = currentTab?.compareConfig;
  const targetStyle = compareConfig?.targetStyle || {
    color: '#F59E0B',
    lineWidth: 3,
    lineStyle: 'SOLID',
    opacity: 1.0,
    pointMarkersVisible: true,
    pointMarkersRadius: 4,
  };
  const refs = compareConfig?.refs || [];

  const showBaselineZero = compareConfig?.showBaselineZero !== false;
  const baselineStyle = compareConfig?.baselineStyle || 'DASHED';
  const baselineColor = compareConfig?.baselineColor || 'rgba(255, 255, 255, 0.45)';
  const showPointMarkers = compareConfig?.showPointMarkers !== false;
  const pointMarkersRadius = compareConfig?.pointMarkersRadius || 4;
  const applyMarkersToRefs = compareConfig?.applyMarkersToRefs || false;

  const [activeTab, setActiveTab] = useState<'target' | 'refs' | 'display'>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialSection);
  }, [initialSection, isOpen]);

  // Yahoo search with debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.prices.search(q);
        setSearchResults(res || []);
        setShowSearchDropdown(true);
      } catch (e) {
        console.warn('Search error:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Auto assign color not yet heavily used
  const getNextColor = () => {
    const usedColors = new Set([targetStyle.color, ...refs.map((r) => r.color)]);
    return PRESET_COLORS.find((c) => !usedColors.has(c)) || PRESET_COLORS[refs.length % PRESET_COLORS.length];
  };

  const handleAddRefFromSymbol = (symbol: string, name?: string, color?: string) => {
    const cleanSym = symbol.trim().toUpperCase();
    if (!cleanSym) return;

    // Check if duplicate of target or existing ref
    if (cleanSym === targetSymbol.toUpperCase()) {
      alert(`ไม่สามารถเพิ่ม ${cleanSym} เป็น Ref ได้เนื่องจากเป็น Target อยู่แล้ว`);
      return;
    }
    if (refs.some((r) => r.symbol.toUpperCase() === cleanSym)) {
      alert(`${cleanSym} มีอยู่ในรายการเปรียบเทียบแล้ว`);
      return;
    }

    addCompareRef(tabId, {
      symbol: cleanSym,
      name: name || cleanSym,
      color: color || getNextColor(),
      lineWidth: 2,
      lineStyle: 'SOLID',
      opacity: 0.85,
      visible: true,
    });

    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0E1322] border border-[#2A2E45] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2438] bg-[#13192B]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                Compare Settings & Reference Manager
              </h2>
              <p className="text-xs text-slate-300">
                เปรียบเทียบผลตอบแทนสัมพัทธ์ (Normalized 0% Scale) พร้อม Benchmarks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-[#1F2438] bg-[#0B0F1D] px-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('refs')}
            className={clsx(
              'px-4 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0',
              activeTab === 'refs'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-300 hover:text-white'
            )}
          >
            <span>📊 Reference Tickers ({refs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('target')}
            className={clsx(
              'px-4 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0',
              activeTab === 'target'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-300 hover:text-white'
            )}
          >
            <span>🎯 Target Stock ({targetSymbol})</span>
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={clsx(
              'px-4 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0',
              activeTab === 'display'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-300 hover:text-white'
            )}
          >
            <span>⚙️ Display & Base 0</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {activeTab === 'refs' && (
            /* Reference Stocks Manager */
            <div className="space-y-6">
              {/* 0. 1-Click Bundles Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Quick Bundles (ชุดสำเร็จรูป 1-Click)
                  </label>
                  <span className="text-[11px] text-slate-400">แทนที่รายการเปรียบเทียบทั้งชุด</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMPARE_BUNDLES.map((bundle) => (
                    <button
                      key={bundle.id}
                      onClick={() => applyCompareBundle(tabId, bundle.id)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/5 hover:border-cyan-500/35 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer group text-left"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span>{bundle.icon}</span>
                        <span className="group-hover:text-cyan-300 truncate">{bundle.name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Quick Presets (Requested: SCHG, Google, Nvidia, Gold, BTC, SPY, QQQ) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Quick Presets (1-Click Add)
                  </label>
                  <span className="text-[11px] text-slate-400">กดเพื่อเพิ่มลงกราฟทันที</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COMPARE_PRESETS.map((preset) => {
                    const isAdded = refs.some((r) => r.symbol.toUpperCase() === preset.symbol.toUpperCase());
                    const isTarget = targetSymbol.toUpperCase() === preset.symbol.toUpperCase();
                    return (
                      <button
                        key={preset.symbol}
                        onClick={() => handleAddRefFromSymbol(preset.symbol, preset.name, preset.color)}
                        disabled={isAdded || isTarget}
                        className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                          isAdded || isTarget
                            ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-cyan-500/20 border-white/10 hover:border-cyan-500/40 text-slate-200 hover:text-white'
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span>{preset.symbol}</span>
                        {isTarget ? (
                          <span className="text-[11px] text-amber-400 font-mono">(Target)</span>
                        ) : isAdded ? (
                          <span className="text-[11px] text-emerald-400">✓ Added</span>
                        ) : (
                          <Plus className="w-3 h-3 text-cyan-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Yahoo Finance Search Input */}
              <div ref={searchContainerRef} className="space-y-2 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  ค้นหาหุ้นหรือสินทรัพย์อื่น (Yahoo Finance Search)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                    placeholder="พิมพ์ Ticker หรือชื่อหุ้น เช่น TSLA, TSM, PLTR, GC=F..."
                    className="w-full bg-[#131828] border border-[#2A2E45] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                  {searchLoading && (
                    <Loader2 className="w-4 h-4 text-cyan-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showSearchDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#131828] border border-[#2A2E45] rounded-xl shadow-2xl overflow-hidden z-30 max-h-56 overflow-y-auto divide-y divide-[#1F2438]">
                    {searchResults.map((item) => (
                      <div
                        key={item.symbol}
                        onClick={() => handleAddRefFromSymbol(item.symbol, item.shortname || item.name)}
                        className="px-4 py-2.5 hover:bg-cyan-500/10 cursor-pointer flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-cyan-400 text-sm">
                            {item.symbol}
                          </span>
                          <span className="text-xs text-slate-300 truncate max-w-[280px]">
                            {item.shortname || item.name || '—'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {item.exchDisp || item.exchange || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Configured References List with Inline Controls */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    รายการ Reference เส้นปัจจุบัน ({refs.length})
                  </label>
                  <span className="text-xs text-slate-400">กดที่เส้นเพื่อปรับแต่งสีและความหนา</span>
                </div>

                {refs.length === 0 ? (
                  <div className="p-8 rounded-xl bg-white/5 border border-dashed border-[#2A2E45] text-center text-sm text-slate-400">
                    ยังไม่มี Reference Line ที่เพิ่มไว้ — เลือกจาก Quick Presets ด้านบนได้เลย
                  </div>
                ) : (
                  <div className="space-y-2">
                    {refs.map((ref) => {
                      const isSelected = selectedRefId === ref.id;
                      return (
                        <div
                          key={ref.id}
                          className="bg-[#13192B] border border-[#242A42] rounded-xl overflow-hidden transition-all"
                        >
                          <div
                            onClick={() => setSelectedRefId(isSelected ? null : ref.id)}
                            className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-3">
                              {/* Eye Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompareRefVisible(tabId, ref.id);
                                }}
                                className={clsx(
                                  'p-1 rounded transition-colors',
                                  ref.visible
                                    ? 'text-cyan-400 hover:text-white'
                                    : 'text-slate-500 hover:text-slate-300'
                                )}
                                title={ref.visible ? 'Hide line' : 'Show line'}
                              >
                                {ref.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>

                              {/* Color Swatch */}
                              <span
                                className="w-3.5 h-3.5 rounded-full shadow-sm"
                                style={{
                                  backgroundColor: ref.color,
                                  opacity: ref.visible ? ref.opacity : 0.3,
                                }}
                              />

                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={clsx(
                                      'font-bold text-sm tracking-wide',
                                      ref.visible ? 'text-white' : 'text-slate-500 line-through'
                                    )}
                                  >
                                    {ref.symbol}
                                  </span>
                                  {ref.name && (
                                    <span className="text-xs text-slate-300">({ref.name})</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {ref.lineWidth}px · {ref.lineStyle} · {Math.round(ref.opacity * 100)}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-cyan-400 font-medium">
                                {isSelected ? 'ซ่อนการตั้งค่า ▴' : 'ปรับสไตล์ ▾'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCompareRef(tabId, ref.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Remove reference line"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Style Editor */}
                          {isSelected && (
                            <div className="px-4 py-3 bg-[#0B0F1D] border-t border-[#1F2438] space-y-4">
                              {/* Color Palette */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-300">เลือกสีเส้น</label>
                                <div className="flex flex-wrap gap-2 items-center">
                                  {PRESET_COLORS.map((c) => (
                                    <button
                                      key={c}
                                      onClick={() => updateCompareRefStyle(tabId, ref.id, { color: c })}
                                      className={clsx(
                                        'w-6 h-6 rounded-full transition-all cursor-pointer border',
                                        ref.color === c
                                          ? 'ring-2 ring-white scale-110 border-white'
                                          : 'border-transparent hover:scale-105'
                                      )}
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                  <input
                                    type="color"
                                    value={ref.color}
                                    onChange={(e) =>
                                      updateCompareRefStyle(tabId, ref.id, { color: e.target.value })
                                    }
                                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                                    title="Custom Hex Color"
                                  />
                                </div>
                              </div>

                              {/* Width & Style */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-300">
                                    ความหนา (Stroke Width)
                                  </label>
                                  <div className="flex gap-1.5">
                                    {[1, 2, 3, 4].map((w) => (
                                      <button
                                        key={w}
                                        onClick={() =>
                                          updateCompareRefStyle(tabId, ref.id, {
                                            lineWidth: w as 1 | 2 | 3 | 4,
                                          })
                                        }
                                        className={clsx(
                                          'flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                                          ref.lineWidth === w
                                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                                            : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                                        )}
                                      >
                                        {w}px
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold text-slate-300">รูปแบบเส้น (Style)</label>
                                  <div className="flex gap-1.5">
                                    {(['SOLID', 'DASHED', 'DOTTED'] as const).map((st) => (
                                      <button
                                        key={st}
                                        onClick={() => updateCompareRefStyle(tabId, ref.id, { lineStyle: st })}
                                        className={clsx(
                                          'flex-1 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                                          ref.lineStyle === st
                                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                                            : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                                        )}
                                      >
                                        {st === 'SOLID' ? 'Solid' : st === 'DASHED' ? 'Dashed' : 'Dotted'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Opacity */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-slate-300">
                                  <span>ความโปร่งแสง (Opacity)</span>
                                  <span className="font-mono">{Math.round(ref.opacity * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0.2"
                                  max="1"
                                  step="0.05"
                                  value={ref.opacity}
                                  onChange={(e) =>
                                    updateCompareRefStyle(tabId, ref.id, { opacity: parseFloat(e.target.value) })
                                  }
                                  className="w-full accent-cyan-400 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'target' && (
            /* Target Stock Customizer */
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Active Target Symbol
                  </div>
                  <div className="text-lg font-extrabold text-white">{targetSymbol}</div>
                  <div className="text-xs text-slate-300">
                    เส้นเป้าหมายหลักของการเปรียบเทียบ (เปลี่ยนได้จากคลิกแถวใน Watchlist)
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-400/60" />
              </div>

              {/* Target Color Palette */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  สีเส้นเป้าหมาย (Target Color)
                </label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateCompareTargetStyle(tabId, { color: c })}
                      className={clsx(
                        'w-8 h-8 rounded-full transition-all cursor-pointer border',
                        targetStyle.color === c
                          ? 'ring-2 ring-white scale-110 border-white shadow-lg'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={targetStyle.color}
                    onChange={(e) => updateCompareTargetStyle(tabId, { color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    title="Custom Color"
                  />
                </div>
              </div>

              {/* Target Width & Style */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    ความหนาเส้น (Target Width)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        onClick={() =>
                          updateCompareTargetStyle(tabId, { lineWidth: w as 1 | 2 | 3 | 4 })
                        }
                        className={clsx(
                          'flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer',
                          targetStyle.lineWidth === w
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                        )}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    รูปแบบเส้น (Target Style)
                  </label>
                  <div className="flex gap-2">
                    {(['SOLID', 'DASHED', 'DOTTED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => updateCompareTargetStyle(tabId, { lineStyle: st })}
                        className={clsx(
                          'flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer',
                          targetStyle.lineStyle === st
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                        )}
                      >
                        {st === 'SOLID' ? 'Solid' : st === 'DASHED' ? 'Dashed' : 'Dotted'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Opacity */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="font-bold uppercase tracking-wider">ความโปร่งแสง (Opacity)</span>
                  <span className="font-mono">{Math.round(targetStyle.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={targetStyle.opacity}
                  onChange={(e) =>
                    updateCompareTargetStyle(tabId, { opacity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Target Point Markers */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                    จุดไข่ปลาบนเส้น Target (Point Markers)
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={targetStyle.pointMarkersVisible !== false}
                      onChange={(e) =>
                        updateCompareTargetStyle(tabId, { pointMarkersVisible: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-300 font-medium">ขนาดจุด:</span>
                  {[2, 3, 4, 5, 6].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateCompareTargetStyle(tabId, { pointMarkersRadius: r })}
                      className={clsx(
                        'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                        (targetStyle.pointMarkersRadius || 4) === r
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                      )}
                    >
                      {r}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            /* Display & Base 0 Settings Tab */
            <div className="space-y-6">
              {/* 1. Base Line 0 (0.00% Anchor) */}
              <div className="p-4 rounded-xl bg-[#141A2D] border border-[#242C48] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="text-sm font-bold text-white">เส้น Base Line 0 (0.00% Baseline)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBaselineZero}
                      onChange={(e) => updateCompareConfig(tabId, { showBaselineZero: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                <p className="text-xs text-slate-300">
                  เส้นแนวนอนอ้างอิงจุดสมดุลผลตอบแทน 0.00% พร้อมตรึงป้ายกำกับบนแกนราคาขวาสุด ช่วยให้อ่านจุดที่ชนะหรือแพ้ตลาดได้ทันที
                </p>

                {showBaselineZero && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1F253C]">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">สไตล์เส้น Base 0</label>
                      <div className="flex gap-1.5">
                        {(['DASHED', 'SOLID', 'DOTTED'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => updateCompareConfig(tabId, { baselineStyle: st })}
                            className={clsx(
                              'flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer',
                              baselineStyle === st
                                ? 'bg-cyan-500/20 border-cyan-400 text-white'
                                : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                            )}
                          >
                            {st === 'DASHED' ? 'Dashed' : st === 'SOLID' ? 'Solid' : 'Dotted'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">สีเส้น Base 0</label>
                      <div className="flex gap-2 items-center flex-wrap">
                        {[
                          { label: 'White', color: 'rgba(255, 255, 255, 0.55)' },
                          { label: 'Slate', color: '#94A3B8' },
                          { label: 'Amber', color: '#F59E0B' },
                          { label: 'Cyan', color: '#06B6D4' },
                        ].map((c) => (
                          <button
                            key={c.label}
                            onClick={() => updateCompareConfig(tabId, { baselineColor: c.color })}
                            className={clsx(
                              'px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1.5',
                              baselineColor === c.color
                                ? 'bg-white/10 border-white text-white'
                                : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                            )}
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Point Markers on Data Points (จุดไข่ปลา) */}
              <div className="p-4 rounded-xl bg-[#141A2D] border border-[#242C48] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">จุดไข่ปลาบนเส้นกราฟ (Point Markers)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPointMarkers}
                      onChange={(e) => updateCompareConfig(tabId, { showPointMarkers: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <p className="text-xs text-slate-300">
                  แสดงจุดไข่ปลาทรงกลมที่พิกัดราคาของแต่ละแท่งเทียน ช่วยให้เห็นจุดเลี้ยว (Inflection Points) และการเคลื่อนที่แบบเม็ดร้อยเรียงเหมือน TradingView
                </p>

                {showPointMarkers && (
                  <div className="space-y-4 pt-2 border-t border-[#1F253C]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">เปิดจุดไข่ปลาให้เส้นอ้างอิงทั้งหมด (All Refs)</div>
                        <div className="text-[11px] text-slate-400">ถ้าปิด จะแสดงเฉพาะเส้น Target เพื่อให้เส้นเป้าหมายเด่นกว่า</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyMarkersToRefs}
                          onChange={(e) => updateCompareConfig(tabId, { applyMarkersToRefs: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="font-semibold">ขนาดรัศมีของจุด (Point Marker Radius)</span>
                        <span className="font-mono text-cyan-300 font-bold">{pointMarkersRadius}px</span>
                      </div>
                      <div className="flex gap-2">
                        {[2, 3, 4, 5, 6].map((r) => (
                          <button
                            key={r}
                            onClick={() => updateCompareConfig(tabId, { pointMarkersRadius: r })}
                            className={clsx(
                              'flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                              pointMarkersRadius === r
                                ? 'bg-amber-500/20 border-amber-400 text-white'
                                : 'bg-white/5 border-transparent text-slate-300 hover:text-white'
                            )}
                          >
                            <span className="rounded-full bg-amber-400 inline-block" style={{ width: `${r * 2}px`, height: `${r * 2}px` }} />
                            <span>{r}px</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. 1-Click Comparison Bundles */}
              <div className="p-4 rounded-xl bg-[#141A2D] border border-[#242C48] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">ชุดเปรียบเทียบด่วน 1-Click (Comparison Bundles)</span>
                </div>
                <p className="text-xs text-slate-300">
                  สลับชุดหุ้นอ้างอิงทั้งชุดในคลิกเดียว เหมาะสำหรับสแกนเทียบกับกลุ่มยักษ์ใหญ่ Mag 7 หรือ ดัชนี Macro
                </p>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {COMPARE_BUNDLES.map((bundle) => (
                    <button
                      key={bundle.id}
                      onClick={() => applyCompareBundle(tabId, bundle.id)}
                      className="p-3 rounded-xl bg-white/5 hover:bg-cyan-500/15 border border-white/5 hover:border-cyan-500/35 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                          <span>{bundle.icon}</span>
                          <span>{bundle.name}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">({bundle.tickers.length} ตัว)</span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">{bundle.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1F2438] bg-[#13192B]">
          <span className="text-xs text-slate-400">
            การตั้งค่าทั้งหมดจะถูกบันทึกและซิงก์ขึ้น Cloud ทันที
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
          >
            เสร็จสิ้น (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
