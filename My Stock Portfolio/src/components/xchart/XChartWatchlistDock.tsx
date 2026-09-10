import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useXChartStore, WatchlistSortColumn } from '../../stores/xchartStore';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  FolderPlus, 
  X, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown,
  Coins,
  Flame,
  Check,
  Sparkles,
  GripVertical
} from 'lucide-react';
import clsx from 'clsx';

// Deterministic gradient colors for symbol badges (TradingView style)
const BADGE_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-600 to-red-600',
  'from-cyan-600 to-blue-600',
  'from-fuchsia-600 to-purple-600'
];

function getSymbolBadgeGradient(sym: string): string {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % BADGE_GRADIENTS.length;
  return BADGE_GRADIENTS[idx];
}

export const XChartWatchlistDock: React.FC = () => {
  const {
    tabs,
    activeTabId,
    watchlistCollapsed,
    toggleWatchlist,
    changeSymbolOnActiveTab,
    addTab,
    watchlistSections,
    watchlistPrices,
    watchlistSortColumn,
    watchlistSortDir,
    watchlistDetailSymbol,
    watchlistDetailCollapsed,
    watchlistLoading,
    addSymbolToSection,
    removeSymbolFromSection,
    addSection,
    removeSection,
    renameSection,
    toggleSectionCollapse,
    setWatchlistSort,
    setWatchlistDetailSymbol,
    toggleWatchlistDetail,
    fetchWatchlistQuotes,
    resetToTVWatchlist,
    moveSymbol,
    moveSection
  } = useXChartStore();

  // Local UI states
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Resizable width state (min 240px, max 650px)
  const [dockWidth, setDockWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('xchart_watchlist_dock_width');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 240 && val <= 700) {
          return val;
        }
      }
    } catch {}
    return 330;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startDragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startDragRef.current = { startX: e.clientX, startWidth: dockWidth };

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!startDragRef.current) return;
      const deltaX = startDragRef.current.startX - moveEvt.clientX;
      const nextWidth = Math.max(240, Math.min(650, startDragRef.current.startWidth + deltaX));
      setDockWidth(nextWidth);
    };

    const handleMouseUp = (upEvt: MouseEvent) => {
      if (startDragRef.current) {
        const deltaX = startDragRef.current.startX - upEvt.clientX;
        const finalWidth = Math.max(240, Math.min(650, startDragRef.current.startWidth + deltaX));
        setDockWidth(finalWidth);
        try {
          localStorage.setItem('xchart_watchlist_dock_width', String(finalWidth));
        } catch {}
      }
      setIsResizing(false);
      startDragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag & Drop states
  const [draggedSymbol, setDraggedSymbol] = useState<{
    symbol: string;
    sectionId: string;
    index: number;
  } | null>(null);

  const [dropTargetSymbol, setDropTargetSymbol] = useState<{
    sectionId: string;
    index: number;
    isAfter: boolean;
  } | null>(null);

  const [draggedSection, setDraggedSection] = useState<{
    sectionId: string;
    index: number;
  } | null>(null);

  const [dropTargetSection, setDropTargetSection] = useState<{
    sectionId: string;
    isAfter: boolean;
  } | null>(null);

  const symbolInputRef = useRef<HTMLInputElement>(null);
  const sectionInputRef = useRef<HTMLInputElement>(null);

  // Active tab symbol
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSymbol = activeTab?.symbol || 'VRT';
  const detailSymbol = watchlistDetailSymbol || activeSymbol;
  const detailQuote = watchlistPrices[detailSymbol];

  // Fetch quotes on initial mount and set up 30-sec polling
  useEffect(() => {
    fetchWatchlistQuotes();
    const timer = setInterval(() => {
      fetchWatchlistQuotes();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchWatchlistQuotes]);

  // Focus input when inline add symbol is shown
  useEffect(() => {
    if (showAddSymbol) {
      setTimeout(() => symbolInputRef.current?.focus(), 50);
    }
  }, [showAddSymbol]);

  // Focus input when inline add section is shown
  useEffect(() => {
    if (showAddSection) {
      setTimeout(() => sectionInputRef.current?.focus(), 50);
    }
  }, [showAddSection]);

  // Handle symbol row click
  const handleStockClick = (symbol: string) => {
    const isCurrency = symbol.includes('=X');
    if (activeTab?.type === 'HEATMAP') {
      addTab({
        type: isCurrency ? 'CURRENCY' : 'STOCK',
        symbol,
        title: isCurrency && symbol === 'THB=X' ? 'USD/THB' : symbol
      });
    } else {
      changeSymbolOnActiveTab(symbol, isCurrency && symbol === 'THB=X' ? 'USD/THB' : symbol);
    }
    setWatchlistDetailSymbol(symbol);
  };

  // Add symbol submit
  const handleAddSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbolInput.trim()) return;
    const destSecId = targetSectionId || watchlistSections[0]?.id;
    if (!destSecId) return;

    addSymbolToSection(destSecId, symbolInput.trim().toUpperCase());
    setSymbolInput('');
    setShowAddSymbol(false);
  };

  // Add section submit
  const handleAddSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    addSection(newSectionName.trim().toUpperCase());
    setNewSectionName('');
    setShowAddSection(false);
  };

  // Save renamed section
  const handleSaveRenameSection = (secId: string) => {
    if (editingSectionName.trim()) {
      renameSection(secId, editingSectionName.trim().toUpperCase());
    }
    setEditingSectionId(null);
  };

  // Total count of symbols
  const totalSymbolsCount = useMemo(() => {
    return watchlistSections.reduce((acc, s) => acc + s.symbols.length, 0);
  }, [watchlistSections]);

  // Render sorting arrow helper
  const renderSortIndicator = (col: WatchlistSortColumn) => {
    if (watchlistSortColumn !== col) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return watchlistSortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-purple-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-purple-400" />
    );
  };

  // Helper to calculate slider position percentage (clamped 0 to 100)
  const calcSliderPercent = (val?: number | null, min?: number | null, max?: number | null): number => {
    if (val == null || min == null || max == null || max <= min) return 50;
    const clamped = Math.max(min, Math.min(max, val));
    return ((clamped - min) / (max - min)) * 100;
  };

  // If dock is collapsed
  if (watchlistCollapsed) {
    return (
      <aside className="w-12 bg-[#0F111A] border-l border-[#1F2233] flex flex-col items-center py-3 select-none shrink-0 justify-between">
        <button
          onClick={toggleWatchlist}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
          title="Expand Watchlist Dock"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="rotate-90 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300 whitespace-nowrap origin-center">
          <span>Watchlist</span>
          <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30">
            {totalSymbolsCount}
          </span>
        </div>

        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
      </aside>
    );
  }

  return (
    <aside 
      className="bg-[#0F111A] border-l border-[#1F2233] flex flex-col h-full select-none shrink-0 overflow-hidden font-sans relative"
      style={{ width: `${dockWidth}px` }}
    >
      {/* Left Resizer Drag Bar */}
      <div
        onMouseDown={handleResizerMouseDown}
        className={clsx(
          "absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-purple-500/60 transition-colors z-40 group",
          isResizing && "bg-purple-500"
        )}
        title="ลากขอบซ้ายเพื่อปรับความกว้าง Watchlist"
      >
        <div className="w-0.5 h-8 bg-slate-600/40 group-hover:bg-purple-300 rounded-full mx-auto absolute top-1/2 -translate-y-1/2 left-0.5 pointer-events-none" />
      </div>
      {/* 1. Dock Top Header */}
      <div className="h-11 px-3 border-b border-[#1F2233] flex items-center justify-between bg-[#121520] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white font-heading">Watchlist</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
            {totalSymbolsCount}
          </span>
          {watchlistLoading && (
            <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Add Symbol Button */}
          <button
            onClick={() => {
              setShowAddSymbol((prev) => !prev);
              setShowAddSection(false);
              setTargetSectionId(watchlistSections[0]?.id || '');
            }}
            className={clsx(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              showAddSymbol 
                ? "bg-purple-600 text-white shadow-sm" 
                : "text-slate-300 hover:text-white hover:bg-white/10"
            )}
            title="Add Symbol to Watchlist (+)"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Add Section Button */}
          <button
            onClick={() => {
              setShowAddSection((prev) => !prev);
              setShowAddSymbol(false);
            }}
            className={clsx(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              showAddSection 
                ? "bg-purple-600 text-white shadow-sm" 
                : "text-slate-300 hover:text-white hover:bg-white/10"
            )}
            title="Create New Section"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          {/* Sync / Reset TradingView 87-Stock List Button */}
          <button
            onClick={() => {
              if (window.confirm('ต้องการรีเซ็ตและนำเข้า Watchlist ทั้งหมดจาก TradingView (6 หมวด 87 หุ้น) หรือไม่?')) {
                resetToTVWatchlist();
              }
            }}
            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer border border-transparent hover:border-amber-500/30"
            title="นำเข้ารายชื่อหุ้นจาก TradingView doctorbank8989 (6 หมวด 87 หุ้น)"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchWatchlistQuotes()}
            disabled={watchlistLoading}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Quotes"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5", watchlistLoading && "animate-spin")} />
          </button>

          {/* Collapse Dock Button */}
          <button
            onClick={toggleWatchlist}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer ml-1"
            title="Collapse Watchlist"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Inline Add Symbol Bar */}
      {showAddSymbol && (
        <form 
          onSubmit={handleAddSymbolSubmit} 
          className="p-2.5 bg-[#161A26] border-b border-[#2A2E45] space-y-2 animate-in slide-in-from-top-2 duration-150 shrink-0"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span>เพิ่มหุ้นใหม่ (Add Symbol)</span>
            <button
              type="button"
              onClick={() => setShowAddSymbol(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={symbolInputRef}
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                placeholder="e.g. NVDA, PLTR, THB=X"
                className="w-full bg-[#0B1220] border border-[#2A2E45] rounded-lg pl-8 pr-2.5 py-1.5 text-[13px] text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all font-mono uppercase"
              />
            </div>

            <select
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              className="bg-[#0B1220] border border-[#2A2E45] text-xs text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-500 max-w-[110px] truncate"
            >
              {watchlistSections.map((sec) => (
                <option key={sec.id} value={sec.id} className="bg-[#111418] text-white">
                  {sec.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!symbolInput.trim()}
              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer shrink-0"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* 3. Inline Add Section Bar */}
      {showAddSection && (
        <form 
          onSubmit={handleAddSectionSubmit} 
          className="p-2.5 bg-[#161A26] border-b border-[#2A2E45] space-y-2 animate-in slide-in-from-top-2 duration-150 shrink-0"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            <span>สร้างหมวดหมู่ใหม่ (New Section)</span>
            <button
              type="button"
              onClick={() => setShowAddSection(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-1.5">
            <input
              ref={sectionInputRef}
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value.toUpperCase())}
              placeholder="e.g. HIGH GROWTH 2X, CRYPTO"
              className="flex-1 bg-[#0B1220] border border-[#2A2E45] rounded-lg px-2.5 py-1.5 text-[13px] text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all font-mono uppercase"
            />
            <button
              type="submit"
              disabled={!newSectionName.trim()}
              className="px-3 py-1.5 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] hover:opacity-90 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow transition-all cursor-pointer shrink-0"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* 4. TradingView Sortable Table Column Headers (Height: 28px) */}
      <div className="h-7 px-3 bg-[#0B0D14] border-b border-[#1F2233] grid grid-cols-12 items-center text-[11px] font-bold uppercase tracking-wider text-slate-300 shrink-0 select-none">
        <button
          onClick={() => setWatchlistSort('symbol')}
          className="col-span-5 flex items-center gap-1 text-left hover:text-white transition-colors group cursor-pointer"
        >
          <span>Symbol</span>
          {renderSortIndicator('symbol')}
        </button>

        <button
          onClick={() => setWatchlistSort('price')}
          className="col-span-3 flex items-center justify-end gap-1 text-right hover:text-white transition-colors group cursor-pointer pr-1"
        >
          <span>Last</span>
          {renderSortIndicator('price')}
        </button>

        <button
          onClick={() => setWatchlistSort('change')}
          className="col-span-2 flex items-center justify-end gap-0.5 text-right hover:text-white transition-colors group cursor-pointer"
        >
          <span>Chg</span>
          {renderSortIndicator('change')}
        </button>

        <button
          onClick={() => setWatchlistSort('percentChange')}
          className="col-span-2 flex items-center justify-end gap-0.5 text-right hover:text-white transition-colors group cursor-pointer"
        >
          <span>%</span>
          {renderSortIndicator('percentChange')}
        </button>
      </div>

      {/* 5. Scrollable Sections & High-Density Stocks List with Free-Style Drag & Drop */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 divide-y divide-[#1F2233]/40">
        {watchlistSections.map((section, secIdx) => {
          // Visual sort of symbols for this section
          const sortedSymbols = [...section.symbols].sort((a, b) => {
            if (!watchlistSortColumn) return 0;
            const quoteA = watchlistPrices[a];
            const quoteB = watchlistPrices[b];

            if (watchlistSortColumn === 'symbol') {
              return watchlistSortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
            }

            const valA = quoteA?.[watchlistSortColumn] ?? -Infinity;
            const valB = quoteB?.[watchlistSortColumn] ?? -Infinity;
            return watchlistSortDir === 'asc' ? (valA > valB ? 1 : -1) : (valB > valA ? 1 : -1);
          });

          const isEditing = editingSectionId === section.id;
          const isSecDropTarget = dropTargetSection?.sectionId === section.id;
          const isSecBeingDragged = draggedSection?.sectionId === section.id;

          return (
            <div 
              key={section.id} 
              className={clsx(
                "bg-[#0F111A] transition-colors relative",
                isSecBeingDragged && "opacity-30",
                isSecDropTarget && (dropTargetSection.isAfter ? "border-b-2 border-cyan-400" : "border-t-2 border-cyan-400")
              )}
            >
              {/* Section Header Row (Height: ~28px) */}
              <div 
                draggable={!isEditing}
                onDragStart={(e) => {
                  if (isEditing) return;
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/section', section.id);
                  setDraggedSection({ sectionId: section.id, index: secIdx });
                }}
                onDragEnd={() => {
                  setDraggedSection(null);
                  setDropTargetSection(null);
                }}
                onDragOver={(e) => {
                  if (draggedSection && draggedSection.sectionId !== section.id) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    const rect = e.currentTarget.getBoundingClientRect();
                    const isAfter = (e.clientY - rect.top) > rect.height / 2;
                    setDropTargetSection({ sectionId: section.id, isAfter });
                  } else if (draggedSymbol) {
                    // Allow dropping symbol onto section header to place at top of section
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    setDropTargetSymbol({ sectionId: section.id, index: 0, isAfter: false });
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedSection && draggedSection.sectionId !== section.id) {
                    const isAfter = dropTargetSection?.isAfter ?? false;
                    const targetIdx = isAfter ? secIdx + 1 : secIdx;
                    moveSection(draggedSection.index, targetIdx);
                    setDraggedSection(null);
                    setDropTargetSection(null);
                  } else if (draggedSymbol) {
                    moveSymbol(draggedSymbol.sectionId, section.id, draggedSymbol.index, 0);
                    setDraggedSymbol(null);
                    setDropTargetSymbol(null);
                  }
                }}
                className={clsx(
                  "h-7 px-2.5 bg-[#131724]/90 border-b border-[#1F2233]/60 flex items-center justify-between text-xs text-slate-300 hover:text-white group cursor-grab active:cursor-grabbing",
                  dropTargetSymbol?.sectionId === section.id && dropTargetSymbol.index === 0 && "bg-purple-900/30"
                )}
              >
                <div 
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="flex items-center gap-1.5 cursor-pointer flex-1 py-1 overflow-hidden select-none"
                >
                  <GripVertical className="w-3 h-3 text-slate-500 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
                  {section.isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors shrink-0" />
                  )}

                  {isEditing ? (
                    <input
                      type="text"
                      value={editingSectionName}
                      onChange={(e) => setEditingSectionName(e.target.value.toUpperCase())}
                      onBlur={() => handleSaveRenameSection(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRenameSection(section.id);
                        if (e.key === 'Escape') setEditingSectionId(null);
                      }}
                      autoFocus
                      className="bg-[#0B1220] border border-purple-500 rounded px-1.5 py-0.5 text-xs text-white uppercase font-normal focus:outline-none"
                    />
                  ) : (
                    <span className="tracking-wide uppercase text-slate-200 group-hover:text-white truncate font-medium">
                      {section.name}
                    </span>
                  )}

                  <span className="text-[11px] text-slate-400 font-normal shrink-0">
                    ({section.symbols.length})
                  </span>
                </div>

                {/* Section Hover Actions */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetSectionId(section.id);
                      setShowAddSymbol(true);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                    title="Add symbol to this section"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSectionId(section.id);
                      setEditingSectionName(section.name);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer"
                    title="Rename section"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  {watchlistSections.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`ลบหมวดหมู่ "${section.name}" พร้อมหุ้นในกลุ่มนี้?`)) {
                          removeSection(section.id);
                        }
                      }}
                      className="p-0.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                      title="Delete section"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* High-Density Stock Rows (Height: ~30px per row) */}
              {!section.isCollapsed && (
                <div 
                  onDragOver={(e) => {
                    if (draggedSymbol && sortedSymbols.length === 0) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDropTargetSymbol({ sectionId: section.id, index: 0, isAfter: false });
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedSymbol && sortedSymbols.length === 0) {
                      e.preventDefault();
                      moveSymbol(draggedSymbol.sectionId, section.id, draggedSymbol.index, 0);
                      setDraggedSymbol(null);
                      setDropTargetSymbol(null);
                    }
                  }}
                  className="divide-y divide-[#1F2233]/25"
                >
                  {sortedSymbols.length === 0 ? (
                    <div className="px-6 py-2.5 text-xs text-slate-400 italic text-center">
                      ไม่มีหุ้นในหมวดนี้ — ลากหุ้นมาวางที่นี่ได้
                    </div>
                  ) : (
                    sortedSymbols.map((symbol) => {
                      const quote = watchlistPrices[symbol];
                      const isSelected = activeSymbol === symbol;
                      const isDetailSelected = detailSymbol === symbol;
                      const isCurrency = symbol.includes('=X');
                      const originalIndex = section.symbols.indexOf(symbol);

                      const price = quote?.price ?? 0;
                      const change = quote?.change ?? 0;
                      const percentChange = quote?.percentChange ?? 0;
                      const isPositive = percentChange >= 0;
                      const isZero = percentChange === 0;

                      // Format price according to value scale
                      let formattedPrice = price.toFixed(2);
                      if (price > 1000) {
                        formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (price < 1 && price > 0) {
                        formattedPrice = price.toFixed(4);
                      }

                      const isItemBeingDragged = draggedSymbol?.symbol === symbol;
                      const isDropTarget = dropTargetSymbol?.sectionId === section.id && dropTargetSymbol.index === originalIndex;

                      return (
                        <div
                          key={symbol}
                          draggable={true}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', symbol);
                            setDraggedSymbol({ symbol, sectionId: section.id, index: originalIndex });
                            // Turn off column sort if active so user's manual order is preserved & visible
                            if (watchlistSortColumn) {
                              setWatchlistSort(watchlistSortColumn);
                            }
                          }}
                          onDragEnd={() => {
                            setDraggedSymbol(null);
                            setDropTargetSymbol(null);
                          }}
                          onDragOver={(e) => {
                            if (!draggedSymbol) return;
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            const rect = e.currentTarget.getBoundingClientRect();
                            const isAfter = (e.clientY - rect.top) > rect.height / 2;
                            setDropTargetSymbol({ sectionId: section.id, index: originalIndex, isAfter });
                          }}
                          onDrop={(e) => {
                            if (!draggedSymbol) return;
                            e.preventDefault();
                            e.stopPropagation();
                            const isAfter = dropTargetSymbol?.isAfter ?? false;
                            const destIdx = isAfter ? originalIndex + 1 : originalIndex;
                            moveSymbol(draggedSymbol.sectionId, section.id, draggedSymbol.index, destIdx);
                            setDraggedSymbol(null);
                            setDropTargetSymbol(null);
                          }}
                          onClick={() => handleStockClick(symbol)}
                          className={clsx(
                            'h-[30px] px-3 grid grid-cols-12 items-center transition-all cursor-pointer group relative select-none',
                            isSelected
                              ? 'bg-purple-950/40 text-white'
                              : isDetailSelected
                              ? 'bg-white/5 text-white'
                              : 'hover:bg-white/5 text-slate-200 hover:text-white',
                            isItemBeingDragged && 'opacity-25 bg-purple-900/20',
                            isDropTarget && (dropTargetSymbol.isAfter ? 'border-b-2 border-purple-500 shadow-[0_2px_4px_rgba(168,85,247,0.4)]' : 'border-t-2 border-purple-500 shadow-[0_-2px_4px_rgba(168,85,247,0.4)]')
                          )}
                        >
                          {/* Active Neon Left Border Indicator */}
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#823AFD] to-[#FC2D79]" />
                          )}

                          {/* Symbol Column: Dot Badge + Ticker */}
                          <div className="col-span-5 flex items-center gap-1.5 overflow-hidden pr-1">
                            {/* Grip handle on hover */}
                            <GripVertical className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-80 transition-opacity shrink-0 -ml-1 cursor-grab" />

                            {/* TradingView-style circle badge */}
                            <div
                              className={clsx(
                                'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-tr shadow-sm',
                                isCurrency ? 'from-amber-600 to-yellow-500' : getSymbolBadgeGradient(symbol)
                              )}
                            >
                              {isCurrency ? '$' : symbol.slice(0, 1)}
                            </div>

                            {/* Ticker Name (No Bold - font-normal) */}
                            <span className="text-[13px] font-normal tracking-tight truncate font-mono text-slate-100 group-hover:text-white">
                              {symbol}
                            </span>
                          </div>

                          {/* Last Price Column (No Bold - font-normal) */}
                          <div className="col-span-3 text-right font-mono text-[13px] font-normal text-slate-200 group-hover:text-white pr-1">
                            {quote ? formattedPrice : '—'}
                          </div>

                          {/* Change Column (No Bold - font-normal) */}
                          <div 
                            className={clsx(
                              "col-span-2 text-right font-mono text-[13px] font-normal truncate",
                              isZero 
                                ? "text-slate-300" 
                                : isPositive 
                                ? "text-emerald-400" 
                                : "text-rose-400"
                            )}
                          >
                            {quote ? (isPositive && change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2)) : '—'}
                          </div>

                          {/* Change % Column + Hover Delete Action (No Bold - font-normal) */}
                          <div className="col-span-2 text-right relative flex items-center justify-end">
                            <span 
                              className={clsx(
                                "font-mono text-[13px] font-normal group-hover:opacity-20 transition-opacity",
                                isZero 
                                  ? "text-slate-300" 
                                  : isPositive 
                                  ? "text-emerald-400" 
                                  : "text-rose-400"
                              )}
                            >
                              {quote ? (isPositive && percentChange > 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`) : '—'}
                            </span>

                            {/* Hover Delete Action Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSymbolFromSection(section.id, symbol);
                              }}
                              className="absolute right-0 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-all cursor-pointer"
                              title={`Remove ${symbol}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 6. TradingView Instrument Snapshot Detail Widget (Fixed Bottom) */}
      <div className="bg-[#121522] border-t border-[#1F2233] shrink-0 select-none shadow-lg">
        {/* Detail Widget Header Bar */}
        <div 
          onClick={toggleWatchlistDetail}
          className="px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Symbol Logo Badge */}
            <div 
              className={clsx(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 bg-gradient-to-tr shadow-sm",
                detailSymbol.includes('=X') ? 'from-amber-600 to-yellow-500' : getSymbolBadgeGradient(detailSymbol)
              )}
            >
              {detailSymbol.includes('=X') ? '$' : detailSymbol.slice(0, 1)}
            </div>

            <div className="truncate">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] font-bold text-white font-mono">{detailSymbol}</span>
                {detailQuote?.exchange && (
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    • {detailQuote.exchange}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 truncate max-w-[190px]">
                {detailQuote?.shortName || (detailSymbol === 'THB=X' ? 'USD / Thai Baht Forex' : detailSymbol)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWatchlistDetail();
              }}
              className="p-1 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
              title={watchlistDetailCollapsed ? "Expand Detail Snapshot" : "Minimize Detail Snapshot"}
            >
              {watchlistDetailCollapsed ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Detail Widget Body (Expanded) */}
        {!watchlistDetailCollapsed && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-[#1F2233]/60 pt-2 animate-in fade-in-50 duration-150">
            {/* Large Price Row */}
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white font-mono tracking-tight">
                  {detailQuote ? (detailQuote.price > 1000 ? detailQuote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : detailQuote.price.toFixed(2)) : '—'}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {detailSymbol.includes('=X') ? 'THB' : 'USD'}
                </span>
              </div>

              {detailQuote && (
                <div 
                  className={clsx(
                    "text-[13px] font-bold font-mono flex items-center gap-1",
                    detailQuote.percentChange >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  <span>
                    {detailQuote.change >= 0 ? `+${detailQuote.change.toFixed(2)}` : detailQuote.change.toFixed(2)}
                  </span>
                  <span>
                    ({detailQuote.percentChange >= 0 ? `+${detailQuote.percentChange.toFixed(2)}%` : `${detailQuote.percentChange.toFixed(2)}%`})
                  </span>
                </div>
              )}
            </div>

            {/* Market Status Capsule */}
            <div className="flex items-center gap-1.5 text-xs">
              <span 
                className={clsx(
                  "w-2 h-2 rounded-full",
                  detailQuote?.marketState === 'REGULAR' 
                    ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" 
                    : "bg-slate-500"
                )} 
              />
              <span className={detailQuote?.marketState === 'REGULAR' ? "text-emerald-400 font-semibold" : "text-slate-300"}>
                {detailQuote?.marketState === 'REGULAR' ? 'Market open' : 'Market closed'}
              </span>
            </div>

            {/* Day's Range Slider */}
            {detailQuote?.dayLow != null && detailQuote?.dayHigh != null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="font-mono text-slate-200">${detailQuote.dayLow.toFixed(2)}</span>
                  <span className="tracking-wider uppercase text-slate-300">DAY'S RANGE</span>
                  <span className="font-mono text-slate-200">${detailQuote.dayHigh.toFixed(2)}</span>
                </div>

                {/* Range Bar with Triangle Indicator */}
                <div className="relative w-full h-1.5 bg-[#1F2233] rounded-full overflow-visible">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full opacity-80" 
                    style={{ width: '100%' }}
                  />
                  {/* Indicator Arrow */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
                    style={{ left: `${calcSliderPercent(detailQuote.price, detailQuote.dayLow, detailQuote.dayHigh)}%` }}
                  >
                    <div className="w-2.5 h-2.5 bg-white border border-black rounded-full shadow-md" />
                  </div>
                </div>
              </div>
            )}

            {/* 52-Week Range Slider */}
            {detailQuote?.fiftyTwoWeekLow != null && detailQuote?.fiftyTwoWeekHigh != null && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="font-mono text-slate-200">${detailQuote.fiftyTwoWeekLow.toFixed(2)}</span>
                  <span className="tracking-wider uppercase text-slate-300">52WK RANGE</span>
                  <span className="font-mono text-slate-200">${detailQuote.fiftyTwoWeekHigh.toFixed(2)}</span>
                </div>

                {/* Range Bar with Triangle Indicator */}
                <div className="relative w-full h-1.5 bg-[#1F2233] rounded-full overflow-visible">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-full opacity-80" 
                    style={{ width: '100%' }}
                  />
                  {/* Indicator Arrow */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
                    style={{ left: `${calcSliderPercent(detailQuote.price, detailQuote.fiftyTwoWeekLow, detailQuote.fiftyTwoWeekHigh)}%` }}
                  >
                    <div className="w-2.5 h-2.5 bg-white border border-black rounded-full shadow-md" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
