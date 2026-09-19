import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useXChartStore, WatchlistSortColumn } from '../../stores/xchartStore';
import { useHoldings } from '../../hooks/useHoldings';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';
import { useProject2xStore, RadarRow } from '../../stores/project2xStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { MyPortWatchlist } from './myport/MyPortWatchlist';
import { 
  TierBadgeIndicator, 
  TierFloatingHUD, 
  getTierVisualInfo, 
  TierVisualInfo,
  getSymbolBadgeGradient
} from './TierBadgeIndicator';
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
  Briefcase,
  GripVertical,
  ChevronsDownUp,
  ChevronsUpDown,
  Filter
} from 'lucide-react';
import clsx from 'clsx';

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
    setWatchlistSort,
    setWatchlistDetailSymbol,
    toggleWatchlistDetail,
    fetchWatchlistQuotes,
    moveSymbol,
    moveSection
  } = useXChartStore();

  const { isMobile } = useDeviceLayout();

  const { holdings = [] } = useHoldings();
  const portHoldingsCount = useMemo(() => {
    return (holdings || []).filter((h) => h && h.quantity > 0 && h.symbol !== 'CASH').length;
  }, [holdings]);

  const [dockTab, setDockTab] = useState<'watchlist' | 'myport'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('xchart_dock_tab');
      if (saved === 'watchlist' || saved === 'myport') return saved;
    }
    return 'watchlist';
  });

  const handleSetDockTab = (tab: 'watchlist' | 'myport') => {
    setDockTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xchart_dock_tab', tab);
    }
  };

  // Local UI states
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');

  // Project 2X 7-Tier Radar Integration (Hybrid 1 + 3)
  const { radar, fetchRadar, compactTiers } = useProject2xStore();
  const { activePortfolioId } = usePortfolioStore();

  useEffect(() => {
    if (activePortfolioId) {
      fetchRadar(activePortfolioId);
    }
  }, [activePortfolioId, fetchRadar]);

  const radarMap = useMemo(() => {
    const map: Record<string, any> = { ...compactTiers };
    if (radar?.rows) {
      for (const row of radar.rows) {
        map[row.symbol.toUpperCase()] = row;
      }
    }
    return map;
  }, [radar?.rows, compactTiers]);

  // Dynamic 7-Tier Cyber Action Matrix Sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('xchart_watchlist_sections_collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [secId]: !prev[secId] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('xchart_watchlist_sections_collapsed', JSON.stringify(next));
      }
      return next;
    });
  };

  const handleRemoveSymbol = (sym: string) => {
    for (const s of watchlistSections) {
      if (s.symbols.includes(sym)) {
        removeSymbolFromSection(s.id, sym);
        break;
      }
    }
  };

  const activeWatchlistSections = useMemo(() => {
    // 1. Preserved exchange section
    const exSec = watchlistSections.find(s => s.id === 'sec-exchange' || s.name === 'EXCHANGE');
    const exSymbols = exSec ? exSec.symbols : ['SCHD', 'SCHG', '^GSPC', 'QQQ', 'JEPQ', 'THB=X'];

    // 2. Preserved commodities & crypto section
    const crSec = watchlistSections.find(s => s.id === 'sec-commodities-crypto' || s.name.includes('COMMODITIES') || s.name.includes('CRYPTO'));
    const crSymbols = crSec ? crSec.symbols : ['BTC-USD', 'GC=F', 'CL=F'];

    const exSet = new Set(exSymbols.map(s => s.toUpperCase()));
    const crSet = new Set(crSymbols.map(s => s.toUpperCase()));

    // 3. Collect all other stock symbols from all sections
    const allStockSymbols = Array.from(new Set(
      watchlistSections.flatMap(s => s.symbols).filter(s => {
        const u = s.toUpperCase();
        return !exSet.has(u) && !crSet.has(u) && !u.includes('=X') && !u.includes('=F') && !u.endsWith('-USD');
      })
    ));

    const buyNow: string[] = [];
    const getReady: string[] = [];
    const runner: string[] = [];
    const danger: string[] = [];
    const watching: string[] = [];

    let dipBuyCount = 0;
    let reversalCount = 0;

    for (const sym of allStockSymbols) {
      const row = radarMap[sym.toUpperCase()];
      const info = getTierVisualInfo(row, sym);

      if (info.tierId === 'BUY_NOW') {
        buyNow.push(sym);
      } else if (info.tierId === 'GET_READY') {
        getReady.push(sym);
        if (info.subMode === 'DIP_BUY') {
          dipBuyCount++;
        } else {
          reversalCount++;
        }
      } else if (info.tierId === 'TO_THE_MOON' || info.tierId === 'RUNNER') {
        runner.push(sym);
      } else if (
        info.tierId === 'FALLING_KNIFE' || 
        info.tierId === 'SLOW_BLEED' || 
        info.tierId === 'MAYDAY_EXIT' || 
        info.tierId === 'DANGER'
      ) {
        danger.push(sym);
      } else {
        watching.push(sym);
      }
    }

    const list: Array<{
      id: string;
      name: string;
      icon: string;
      symbols: string[];
      isDynamic: boolean;
      subStats?: string;
      badgeClass?: string;
      isCollapsed: boolean;
    }> = [];

    // 1. BUY NOW (Auto-hide if 0)
    if (buyNow.length > 0) {
      list.push({
        id: 'sec-tier-buy-now',
        name: 'BUY NOW',
        icon: '🔥',
        symbols: buyNow,
        isDynamic: true,
        badgeClass: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
        isCollapsed: Boolean(collapsedSections['sec-tier-buy-now'])
      });
    }

    // 2. GET READY with 2 Sub-Modes (Auto-hide if 0)
    if (getReady.length > 0) {
      const parts: string[] = [];
      if (dipBuyCount > 0) parts.push(`🧲 Dip ${dipBuyCount}`);
      if (reversalCount > 0) parts.push(`🔄 Rev ${reversalCount}`);
      list.push({
        id: 'sec-tier-get-ready',
        name: 'GET READY',
        icon: '⏳',
        symbols: getReady,
        isDynamic: true,
        subStats: parts.join(' · '),
        badgeClass: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30',
        isCollapsed: Boolean(collapsedSections['sec-tier-get-ready'])
      });
    }

    // 3. TO THE MOON / RUNNER (Auto-hide if 0)
    if (runner.length > 0) {
      list.push({
        id: 'sec-tier-runner',
        name: 'TO THE MOON / RUNNER',
        icon: '🚀',
        symbols: runner,
        isDynamic: true,
        badgeClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
        isCollapsed: Boolean(collapsedSections['sec-tier-runner'])
      });
    }

    // 4. DANGER & BEAR ABYSS (Auto-hide if 0)
    if (danger.length > 0) {
      list.push({
        id: 'sec-tier-danger',
        name: 'DANGER & BEAR ABYSS',
        icon: '🔪',
        symbols: danger,
        isDynamic: true,
        badgeClass: 'text-red-300 bg-rose-950/40 border-red-500/30',
        isCollapsed: Boolean(collapsedSections['sec-tier-danger'])
      });
    }

    // 5. WATCHING (Auto-hide if 0)
    if (watching.length > 0) {
      list.push({
        id: 'sec-tier-watching',
        name: 'WATCHING',
        icon: '🔍',
        symbols: watching,
        isDynamic: true,
        badgeClass: 'text-slate-300 bg-slate-800/40 border-slate-700/30',
        isCollapsed: Boolean(collapsedSections['sec-tier-watching'])
      });
    }

    // 6. EXCHANGE (Preserved)
    list.push({
      id: exSec?.id || 'sec-exchange',
      name: exSec?.name || 'EXCHANGE',
      icon: '🌐',
      symbols: exSymbols,
      isDynamic: false,
      isCollapsed: Boolean(collapsedSections[exSec?.id || 'sec-exchange'])
    });

    // 7. COMMODITIES & CRYPTO (Preserved)
    list.push({
      id: crSec?.id || 'sec-commodities-crypto',
      name: crSec?.name || 'COMMODITIES & CRYPTO',
      icon: '🪙',
      symbols: crSymbols,
      isDynamic: false,
      isCollapsed: Boolean(collapsedSections[crSec?.id || 'sec-commodities-crypto'])
    });

    return list;
  }, [watchlistSections, radarMap, collapsedSections]);

  const allSectionsCollapsed = useMemo(() => {
    return activeWatchlistSections.length > 0 && activeWatchlistSections.every((s) => s.isCollapsed);
  }, [activeWatchlistSections]);

  const handleToggleAllSectionsCollapse = () => {
    const nextState = !allSectionsCollapsed;
    const nextMap: Record<string, boolean> = {};
    for (const s of activeWatchlistSections) {
      nextMap[s.id] = nextState;
    }
    setCollapsedSections(nextMap);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xchart_watchlist_sections_collapsed', JSON.stringify(nextMap));
    }
  };

  const [hoveredTier, setHoveredTier] = useState<{
    rect: DOMRect;
    info: TierVisualInfo;
    symbol: string;
  } | null>(null);

  const [selectedTierFilter, setSelectedTierFilter] = useState<string | null>(null);

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
    const clean = symbolInput.trim().toUpperCase();
    if (!clean) return;

    if (targetSectionId.includes('exchange')) {
      const exSec = watchlistSections.find(s => s.id === 'sec-exchange' || s.name === 'EXCHANGE') || watchlistSections[0];
      if (exSec) addSymbolToSection(exSec.id, clean);
    } else if (targetSectionId.includes('crypto') || targetSectionId.includes('commodities')) {
      const crSec = watchlistSections.find(s => s.id === 'sec-commodities-crypto' || s.name.includes('CRYPTO')) || watchlistSections[0];
      if (crSec) addSymbolToSection(crSec.id, clean);
    } else {
      const firstSec = watchlistSections.find(s => s.id !== 'sec-exchange' && s.id !== 'sec-commodities-crypto') || watchlistSections[0];
      if (firstSec) addSymbolToSection(firstSec.id, clean);
    }
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
    return activeWatchlistSections.reduce((acc, s) => acc + s.symbols.length, 0);
  }, [activeWatchlistSections]);

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
    if (isMobile) return null;
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
          <span>{dockTab === 'myport' ? 'My Port' : 'Watchlist'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30">
            {dockTab === 'myport' ? portHoldingsCount : totalSymbolsCount}
          </span>
        </div>

        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
      </aside>
    );
  }

  const dockContent = (
    <aside 
      className={clsx(
        "bg-[#0F111A] border-l border-[#1F2233] flex flex-col h-full select-none shrink-0 overflow-hidden font-sans relative",
        isMobile ? "w-[88vw] max-w-[360px] shadow-2xl z-50" : ""
      )}
      style={isMobile ? undefined : { width: `${dockWidth}px` }}
    >
      {/* Left Resizer Drag Bar */}
      {!isMobile && (
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
      )}
      {/* 1. Dock Top Header */}
      <div className="h-11 px-2.5 border-b border-[#1F2233] flex items-center justify-between bg-[#121520] shrink-0">
        {/* Left: Twin Pill Tab Switcher */}
        <div className="flex items-center bg-[#181D2D] p-0.5 rounded-lg border border-slate-700/60">
          {/* Tab 1: Watchlist */}
          <button
            onClick={() => handleSetDockTab('watchlist')}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer",
              dockTab === 'watchlist'
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Switch to Watchlist"
          >
            <span>Watchlist</span>
            <span className={clsx(
              "text-xs px-1.5 py-0.2 rounded-full font-bold",
              dockTab === 'watchlist' ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-300"
            )}>
              {totalSymbolsCount}
            </span>
          </button>

          {/* Tab 2: My Port */}
          <button
            onClick={() => handleSetDockTab('myport')}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer",
              dockTab === 'myport'
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
            title="Switch to My Port Holdings"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Port</span>
            {portHoldingsCount > 0 && (
              <span className={clsx(
                "text-xs px-1.5 py-0.2 rounded-full font-bold",
                dockTab === 'myport' ? "bg-white/20 text-white" : "bg-emerald-500/20 text-emerald-300"
              )}>
                {portHoldingsCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {dockTab === 'watchlist' && (
            <>
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

              {/* Toggle All Sections Collapse / Expand (ข้อ 2 & 3) */}
              <button
                onClick={handleToggleAllSectionsCollapse}
                className={clsx(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  allSectionsCollapsed 
                    ? "text-purple-400 bg-purple-500/15 hover:bg-purple-500/25" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                )}
                title={allSectionsCollapsed ? "กางทุกหมวด (Expand All Sections)" : "พับทุกหมวด (Collapse All Sections)"}
              >
                {allSectionsCollapsed ? (
                  <ChevronsUpDown className="w-4 h-4 text-purple-400" />
                ) : (
                  <ChevronsDownUp className="w-4 h-4 text-slate-300" />
                )}
              </button>
            </>
          )}

          {/* Collapse Dock Button */}
          <button
            onClick={toggleWatchlist}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer ml-1"
            title="Collapse Dock"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {dockTab === 'watchlist' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

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
              {activeWatchlistSections.map((sec) => (
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

      {/* 3.5. Streamlined Cyber Tier Quick-Filter Bar (Zero Overflow) */}
      <div className="px-2.5 py-1.5 bg-[#0D101A] border-b border-[#1F2233]/70 grid grid-cols-4 gap-1 shrink-0 select-none">
        {[
          { id: null, label: 'ALL', icon: '🌐' },
          { id: 'BUY_NOW', label: 'BUY NOW', icon: '🔥', activeClass: 'bg-red-500/25 text-orange-200 border-orange-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]' },
          { id: 'GET_READY', label: 'READY', icon: '⏳', activeClass: 'bg-yellow-500/25 text-yellow-200 border-yellow-400/80 shadow-[0_0_8px_rgba(234,179,8,0.5)]' },
          { id: 'DANGER', label: 'MAYDAY', icon: '🩸', activeClass: 'bg-rose-950 text-red-200 border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.6)]' }
        ].map(filter => {
          const isActive = selectedTierFilter === filter.id;
          return (
            <button
              key={filter.label}
              onClick={() => setSelectedTierFilter(isActive ? null : filter.id)}
              className={clsx(
                "h-6 rounded-md text-[11.5px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer whitespace-nowrap",
                isActive 
                  ? (filter.activeClass || "bg-purple-600 text-white border-purple-400 shadow-sm")
                  : "bg-white/5 border-transparent text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <span className="text-xs">{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>

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
        {activeWatchlistSections.map((section, secIdx) => {
          // Filter symbols if a tier filter is active
          const displayedSymbols = selectedTierFilter
            ? section.symbols.filter((sym) => {
                const row = radarMap[sym.toUpperCase()];
                const info = getTierVisualInfo(row, sym, sym.includes('=X'));
                if (selectedTierFilter === 'BUY_NOW') {
                  return info.tierId === 'BUY_NOW';
                }
                if (selectedTierFilter === 'GET_READY') {
                  return info.tierId === 'GET_READY';
                }
                if (selectedTierFilter === 'DANGER') {
                  return (
                    info.tierId === 'FALLING_KNIFE' || 
                    info.tierId === 'MAYDAY_EXIT' || 
                    info.tierId === 'SLOW_BLEED' || 
                    info.tierId === 'DANGER'
                  );
                }
                return true;
              })
            : section.symbols;

          // Auto-hide section if tier filter is active and has 0 matching symbols
          if (selectedTierFilter && displayedSymbols.length === 0) {
            return null;
          }

          // Visual sort of symbols for this section
          const sortedSymbols = [...displayedSymbols].sort((a, b) => {
            if (!watchlistSortColumn) return 0;
            const quoteA = watchlistPrices[a];
            const quoteB = watchlistPrices[b];

            if (watchlistSortColumn === 'symbol') {
              return watchlistSortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
            }

            if (watchlistSortColumn === 'price') {
              const priceA = quoteA?.price ?? 0;
              const priceB = quoteB?.price ?? 0;
              return watchlistSortDir === 'desc' ? (priceB - priceA) : (priceA - priceB);
            }

            if (watchlistSortColumn === 'change' || watchlistSortColumn === 'percentChange') {
              const valA = quoteA?.[watchlistSortColumn] ?? 0;
              const valB = quoteB?.[watchlistSortColumn] ?? 0;
              // desc: ติดลบเยอะสุดอยู่บนสุด (เช่น -47% ก่อน -2% ก่อน +5%)
              return watchlistSortDir === 'desc' ? (valA - valB) : (valB - valA);
            }

            return 0;
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

                  <span className="text-sm shrink-0">{section.icon}</span>

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
                    <span className="tracking-wide uppercase text-slate-200 group-hover:text-white truncate font-bold text-xs">
                      {section.name}
                    </span>
                  )}

                  <span className="text-[11px] text-slate-400 font-normal shrink-0">
                    ({displayedSymbols.length})
                  </span>

                  {section.subStats && (
                    <span className="text-[10px] text-amber-300/90 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 font-mono shrink-0 ml-1">
                      {section.subStats}
                    </span>
                  )}
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

                  {!section.isDynamic && (
                    <>
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
                    </>
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

                      const radarData = radarMap[symbol.toUpperCase()];
                      const tierInfo = getTierVisualInfo(radarData, symbol, isCurrency);

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
                          {/* Left Cyber Indicator: Solar Fire Orb for BUY NOW or Floating Neon Capsule */}
                          {tierInfo.isFireOrb ? (
                            <div
                              className={clsx(
                                'absolute left-[1px] top-1/2 -translate-y-1/2 transition-all z-10',
                                isSelected && 'ring-2 ring-purple-400 ring-offset-1 ring-offset-[#0F111A]',
                                tierInfo.spineClass
                              )}
                            />
                          ) : (
                            <div
                              className={clsx(
                                'absolute left-[2px] top-[3.5px] bottom-[3.5px] rounded-full transition-all z-10',
                                isSelected
                                  ? 'w-[5px] bg-[#D500F9] shadow-[0_0_12px_rgba(213,0,249,0.95)]'
                                  : clsx('w-[4px]', tierInfo.spineClass)
                              )}
                            />
                          )}

                          {/* Symbol Column: Dot Badge + Ticker */}
                          <div className="col-span-5 flex items-center gap-1.5 overflow-hidden pr-1">
                            {/* Grip handle on hover */}
                            <GripVertical className="w-2.5 h-2.5 text-slate-500 opacity-0 group-hover:opacity-80 transition-opacity shrink-0 -ml-1 cursor-grab" />

                            {/* Cyber Micro-Badge */}
                            <TierBadgeIndicator
                              symbol={symbol}
                              radarData={radarData}
                              isCurrency={isCurrency}
                              onHover={(rect, info) => setHoveredTier({ rect, info, symbol })}
                              onLeave={() => setHoveredTier(null)}
                            />

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
                                handleRemoveSymbol(symbol);
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
      </div>
      ) : (
        <MyPortWatchlist 
          selectedSymbol={detailSymbol} 
          onSelectSymbol={handleStockClick} 
        />
      )}

      {/* Floating Cyber HUD Tooltip (Portal/Fixed to prevent clipping) */}
      <TierFloatingHUD hovered={hoveredTier} />
    </aside>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div 
          onClick={toggleWatchlist} 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
        />
        {dockContent}
      </div>
    );
  }

  return dockContent;
};
