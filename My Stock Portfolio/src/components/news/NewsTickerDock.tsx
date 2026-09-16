import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  X, 
  Flame, 
  Star, 
  Briefcase, 
  Target,
  ChevronRight, 
  ChevronDown, 
  ChevronLeft, 
  ChevronsDownUp,
  ChevronsUpDown,
  Hash, 
  Filter, 
  Check,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import clsx from 'clsx';
import { useXChartStore } from '../../stores/xchartStore';
import { usePriceStore } from '../../stores/priceStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { DEFAULT_2X_TARGET_STOCKS } from '../xchart/myport/MyPortWatchlist';

// Deterministic gradient colors for symbol badges (TradingView / X-Chart style)
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

interface StockItem {
  symbol: string;
  name: string;
  category?: string;
  targetPercent?: number;
}

// 🏢 Doctorbank Growth Definitions
const DEFAULT_MAIN_HOLDINGS: StockItem[] = [
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', category: 'Security' },
  { symbol: 'HIMS', name: 'Hims & Hers Health', category: 'Healthcare' },
  { symbol: 'MELI', name: 'MercadoLibre Inc', category: 'E-Commerce' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', category: 'Semiconductor' },
  { symbol: 'RBRK', name: 'Rubrik Inc', category: 'AI Security' },
];

const DEFAULT_MAIN_TARGETS: StockItem[] = [
  { symbol: 'META', name: 'Meta Platforms', category: 'Social / AI' },
];

// 🐯 Tiger 2X Definitions (2 Holdings + 12 Project 2X Targets)
const DEFAULT_TIGER_HOLDINGS: StockItem[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp', category: 'Core' },
  { symbol: 'SCHG', name: 'Schwab US Large-Cap Growth', category: 'ETF' },
];

const DEFAULT_TIGER_TARGETS: StockItem[] = DEFAULT_2X_TARGET_STOCKS
  .filter(t => t.symbol !== 'NVDA') // NVDA is already in holdings
  .map(t => ({
    symbol: t.symbol,
    name: t.name,
    category: t.category,
    targetPercent: t.target_percent
  }));

const DEFAULT_WATCHLIST_STOCKS: StockItem[] = [
  { symbol: 'AVGO', name: 'Broadcom Inc' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor' },
  { symbol: 'AMD', name: 'Advanced Micro Devices' },
  { symbol: 'PANW', name: 'Palo Alto Networks' },
  { symbol: 'NET', name: 'Cloudflare Inc' },
  { symbol: 'LRCX', name: 'Lam Research' },
  { symbol: 'ALAB', name: 'Astera Labs' },
  { symbol: 'ON', name: 'ON Semiconductor' },
  { symbol: 'TSLA', name: 'Tesla Inc' },
  { symbol: 'AAPL', name: 'Apple Inc' },
  { symbol: 'MSFT', name: 'Microsoft Corp' },
  { symbol: 'PLTR', name: 'Palantir Technologies' },
];

const THEMATIC_TAGS = [
  { tag: 'MACRO', label: 'Macro & Fed', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { tag: 'CATALYST', label: 'Catalyst & Moves', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { tag: 'MARKET_SUMMARY', label: 'Market Summary', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { tag: 'AI', label: 'AI Ecosystem', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { tag: 'SECURITY', label: 'Cyber Security', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
];

interface TickerStat {
  total: number;
  unread: number;
  theMustUnread?: number;
}

interface NewsTickerDockProps {
  selectedTicker: string | null;
  selectedTag: string | null;
  tickerStats: Record<string, TickerStat>;
  customWatchlist?: string[];
  onSelectTicker: (ticker: string | null) => void;
  onSelectTag: (tag: string | null) => void;
  onClearFilter: () => void;
  onManageWatchlist?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

type SortColumn = 'symbol' | 'price' | 'change' | 'percentChange';
type SortDir = 'asc' | 'desc';

interface DockSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  stocks: StockItem[];
  badge?: string;
  isCollapsed?: boolean;
}

export const NewsTickerDock: React.FC<NewsTickerDockProps> = ({
  selectedTicker,
  selectedTag,
  tickerStats,
  customWatchlist = [],
  onSelectTicker,
  onSelectTag,
  onClearFilter,
  onManageWatchlist,
  collapsed = false,
  onToggleCollapse,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'tiger' | 'watchlist'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<SortColumn>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  
  // Local collapse dictionary for portfolio sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('news_ticker_dock_sections_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 1. Pull Watchlist from X-Chart Store directly (with collapse functions)
  const { 
    watchlistSections, 
    watchlistPrices, 
    fetchWatchlistQuotes,
    toggleSectionCollapse,
    toggleAllSectionsCollapse
  } = useXChartStore();

  // 2. Pull Live Prices from usePriceStore
  const { prices, fetchPrices } = usePriceStore();
  // 3. Transactions & Portfolios to resolve actual dynamic holdings
  const { transactions } = useTransactionStore();
  const { portfolios } = usePortfolioStore();

  // Persist local collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('news_ticker_dock_sections_collapsed', JSON.stringify(collapsedSections));
    } catch {}
  }, [collapsedSections]);

  // Helper to dynamically detect holdings for a specific portfolio from transactions
  const getDynamicHoldings = (portKeyword: string, fallback: StockItem[]): StockItem[] => {
    const port = portfolios.find(p => p.name.toLowerCase().includes(portKeyword.toLowerCase()));
    if (!port || !transactions || transactions.length === 0) return fallback;

    const holds: Record<string, number> = {};
    transactions
      .filter(t => t && t.portfolio_id === port.id && t.symbol && t.symbol !== 'CASH' && (!t.status || t.status.toUpperCase() === 'CONFIRMED'))
      .forEach(t => {
        if (!holds[t.symbol]) holds[t.symbol] = 0;
        if (t.type === 'BUY') holds[t.symbol] += (t.amount || 0);
        else if (t.type === 'SELL') holds[t.symbol] -= (t.amount || 0);
      });

    const activeSymbols = Object.keys(holds).filter(s => holds[s] > 0.0001);
    if (activeSymbols.length === 0) return fallback;

    return activeSymbols.map(sym => {
      const fb = fallback.find(f => f.symbol === sym);
      return {
        symbol: sym,
        name: fb?.name || sym,
        category: fb?.category || 'Holding'
      };
    });
  };

  // 🏢 Main Port Sections: Holdings vs Target
  const mainSections = useMemo<DockSection[]>(() => {
    const dynamicHoldings = getDynamicHoldings('Doctorbank', DEFAULT_MAIN_HOLDINGS);
    return [
      {
        id: 'main-holdings',
        title: 'Holdings (ถือครอง)',
        icon: <Briefcase className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
        stocks: dynamicHoldings,
        badge: `${dynamicHoldings.length} Positions`,
        isCollapsed: Boolean(collapsedSections['main-holdings'])
      },
      {
        id: 'main-target',
        title: 'Target (เป้าหมาย)',
        icon: <Target className="w-3.5 h-3.5 text-indigo-400 shrink-0" />,
        stocks: DEFAULT_MAIN_TARGETS,
        badge: `${DEFAULT_MAIN_TARGETS.length} Target`,
        isCollapsed: Boolean(collapsedSections['main-target'])
      }
    ];
  }, [transactions, portfolios, collapsedSections]);

  // 🐯 Tiger 2X Sections: Holdings (2 หุ้น) vs Target (Project 2X)
  const tigerSections = useMemo<DockSection[]>(() => {
    const dynamicTigerHoldings = getDynamicHoldings('Tiger', DEFAULT_TIGER_HOLDINGS);
    const holdingSyms = new Set(dynamicTigerHoldings.map(h => h.symbol));
    const remainingTargets = DEFAULT_2X_TARGET_STOCKS
      .filter(t => !holdingSyms.has(t.symbol))
      .map(t => ({
        symbol: t.symbol,
        name: t.name,
        category: t.category,
        targetPercent: t.target_percent
      }));

    return [
      {
        id: 'tiger-holdings',
        title: 'Holdings (ถือครอง)',
        icon: <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        stocks: dynamicTigerHoldings,
        badge: `${dynamicTigerHoldings.length} Positions`,
        isCollapsed: Boolean(collapsedSections['tiger-holdings'])
      },
      {
        id: 'tiger-target',
        title: 'Target · Project 2X',
        icon: <Target className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
        stocks: remainingTargets,
        badge: `${remainingTargets.length} Targets`,
        isCollapsed: Boolean(collapsedSections['tiger-target'])
      }
    ];
  }, [transactions, portfolios, collapsedSections]);

  // ⭐ Watchlist Sections: Pulled from X-Chart Store sections + Custom Watchlist
  const watchlistSectionsList = useMemo<DockSection[]>(() => {
    if (watchlistSections && watchlistSections.length > 0) {
      return watchlistSections.map(sec => ({
        id: `wl-${sec.id}`,
        title: sec.name,
        icon: <Star className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
        stocks: (sec.symbols || []).map(sym => ({
          symbol: sym,
          name: sym,
          category: 'Watchlist'
        })),
        badge: `${sec.symbols.length}`,
        isCollapsed: Boolean(sec.isCollapsed)
      }));
    }

    // Fallback if no sections in store
    const list: StockItem[] = [...DEFAULT_WATCHLIST_STOCKS];
    const seen = new Set(list.map(s => s.symbol));
    (customWatchlist || []).forEach(sym => {
      if (!seen.has(sym)) {
        seen.add(sym);
        list.push({ symbol: sym, name: `${sym} Watchlist`, category: 'Watchlist' });
      }
    });

    return [
      {
        id: 'wl-default',
        title: 'Watchlist ทั้งหมด',
        icon: <Star className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
        stocks: list,
        badge: `${list.length}`,
        isCollapsed: Boolean(collapsedSections['wl-default'])
      }
    ];
  }, [watchlistSections, customWatchlist, collapsedSections]);

  // Active raw sections based on current tab
  const activeRawSections = useMemo(() => {
    if (activeTab === 'main') return mainSections;
    if (activeTab === 'tiger') return tigerSections;
    return watchlistSectionsList;
  }, [activeTab, mainSections, tigerSections, watchlistSectionsList]);

  // Calculate if all sections in the active tab are collapsed (Exact X-Chart logic)
  const isAllSectionsCollapsed = useMemo(() => {
    if (activeTab === 'watchlist') {
      if (watchlistSections && watchlistSections.length > 0) {
        return watchlistSections.every(s => s.isCollapsed);
      }
      return Boolean(collapsedSections['wl-default']);
    }
    const currentSections = activeTab === 'main' ? mainSections : tigerSections;
    return currentSections.length > 0 && currentSections.every(s => Boolean(s.isCollapsed));
  }, [activeTab, watchlistSections, mainSections, tigerSections, collapsedSections]);

  // Toggle individual section collapse (Exact X-Chart synchronization)
  const handleToggleSection = (sectionId: string) => {
    if (activeTab === 'watchlist' && sectionId.startsWith('wl-') && typeof toggleSectionCollapse === 'function') {
      const originalSecId = sectionId.replace('wl-', '');
      toggleSectionCollapse(originalSecId);
    }
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Toggle all sections collapse / expand (Exact X-Chart synchronization)
  const handleToggleAllSections = () => {
    if (activeTab === 'watchlist' && typeof toggleAllSectionsCollapse === 'function') {
      toggleAllSectionsCollapse();
      return;
    }

    const currentSections = activeTab === 'main' ? mainSections : tigerSections;
    const nextState = !isAllSectionsCollapsed;
    setCollapsedSections(prev => {
      const updated = { ...prev };
      currentSections.forEach(s => {
        updated[s.id] = nextState;
      });
      return updated;
    });
  };

  // Apply search query and sorting within each section
  const processedSections = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();

    return activeRawSections.map(sec => {
      // 1. Filter by search query
      let filtered = sec.stocks;
      if (q) {
        filtered = filtered.filter(s => s.symbol.includes(q) || s.name.toUpperCase().includes(q));
      }

      // 2. Sort stocks
      const sorted = [...filtered].sort((a, b) => {
        const quoteA = watchlistPrices[a.symbol] || prices[a.symbol];
        const quoteB = watchlistPrices[b.symbol] || prices[b.symbol];

        if (sortCol === 'symbol') {
          return sortDir === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        }
        if (sortCol === 'price') {
          const priceA = quoteA?.price ?? 0;
          const priceB = quoteB?.price ?? 0;
          return sortDir === 'desc' ? (priceB - priceA) : (priceA - priceB);
        }
        if (sortCol === 'change') {
          const changeA = quoteA?.change ?? 0;
          const changeB = quoteB?.change ?? 0;
          return sortDir === 'desc' ? (changeB - changeA) : (changeA - changeB);
        }
        if (sortCol === 'percentChange') {
          const pctA = (quoteA as any)?.percentChange ?? (quoteA as any)?.percent_change ?? 0;
          const pctB = (quoteB as any)?.percentChange ?? (quoteB as any)?.percent_change ?? 0;
          return sortDir === 'desc' ? (pctB - pctA) : (pctA - pctB);
        }
        return 0;
      });

      return {
        ...sec,
        stocks: sorted
      };
    });
  }, [activeRawSections, searchQuery, sortCol, sortDir, watchlistPrices, prices]);

  // Auto-fetch missing prices
  useEffect(() => {
    if (typeof fetchWatchlistQuotes === 'function') {
      fetchWatchlistQuotes();
    }
    const allSymbols = activeRawSections.flatMap(s => s.stocks.map(st => st.symbol));
    const symsToFetch = allSymbols.filter(s => !watchlistPrices[s] && !prices[s]);
    if (symsToFetch.length > 0 && typeof fetchPrices === 'function') {
      fetchPrices(symsToFetch);
    }
  }, [activeRawSections, fetchWatchlistQuotes, fetchPrices, watchlistPrices, prices]);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(col === 'symbol' ? 'asc' : 'desc');
    }
  };

  const renderSortIndicator = (col: SortColumn) => {
    if (sortCol !== col) {
      return <ArrowUpDown className="w-2.5 h-2.5 text-slate-500 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-2.5 h-2.5 text-purple-400" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 text-purple-400" />
    );
  };

  // Check if any filter is active
  const hasActiveFilter = Boolean(selectedTicker || selectedTag);

  if (collapsed) {
    return (
      <aside className={clsx("w-12 bg-[#0D1019] border-l border-[#1F2233] flex flex-col items-center py-4 select-none shrink-0 transition-all", className)}>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Expand Ticker Navigator"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-8 flex flex-col items-center gap-4 text-slate-400">
          <Hash className="w-4 h-4 text-[#823AFD]" />
          <span className="text-[11px] font-mono [writing-mode:vertical-lr] tracking-widest text-slate-300 font-bold uppercase">
            Radar Tickers
          </span>
          {hasActiveFilter && (
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#823AFD] to-[#FC2D79] animate-pulse" />
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className={clsx(
      "w-80 sm:w-[330px] bg-[#0D1019] border-l border-[#1F2233] flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.3)] select-none shrink-0 transition-all text-xs",
      className
    )}>
      {/* 1. Header with Title, Collapse All Sections Button, and Dock Collapse Button */}
      <div className="p-3 border-b border-[#1F2233] flex items-center justify-between gap-2 bg-[#0A0C14]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#823AFD]/20 border border-[#823AFD]/40 flex items-center justify-center text-[#823AFD]">
            <Hash className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-heading tracking-tight flex items-center gap-1.5">
              Ticker Navigator
            </h3>
            <p className="text-[11px] text-slate-400">กรองข่าวสารตามหุ้น & พอร์ต</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {hasActiveFilter && (
            <button
              onClick={onClearFilter}
              className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="ล้างตัวกรองเพื่อดูข่าวทั้งหมด"
            >
              <X className="w-3 h-3" /> ล้าง
            </button>
          )}

          {/* Toggle All Sections Collapse / Expand (Exact X-Chart Duplication) */}
          <button
            onClick={handleToggleAllSections}
            className={clsx(
              "p-1.5 rounded-lg transition-all cursor-pointer",
              isAllSectionsCollapsed 
                ? "text-purple-400 bg-purple-500/20 border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.3)]" 
                : "text-slate-300 hover:text-white hover:bg-white/10"
            )}
            title={isAllSectionsCollapsed ? "กางทุกหมวด (Expand All Sections)" : "พับทุกหมวด (Collapse All Sections)"}
          >
            {isAllSectionsCollapsed ? (
              <ChevronsUpDown className="w-4 h-4 text-purple-400" />
            ) : (
              <ChevronsDownUp className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Collapse Dock"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. 3 Tabs Strip (X-Chart Style) */}
      <div className="grid grid-cols-3 p-1.5 bg-[#090B10] border-b border-[#1F2233] gap-1">
        <button
          onClick={() => setActiveTab('main')}
          className={clsx(
            "py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer",
            activeTab === 'main'
              ? "bg-[#823AFD] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          )}
        >
          <span>🏢</span>
          <span className="truncate">พอร์ตหลัก</span>
        </button>

        <button
          onClick={() => setActiveTab('tiger')}
          className={clsx(
            "py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer",
            activeTab === 'tiger'
              ? "bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          )}
        >
          <span>🐯</span>
          <span className="truncate">พอร์ตลูก</span>
        </button>

        <button
          onClick={() => setActiveTab('watchlist')}
          className={clsx(
            "py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer",
            activeTab === 'watchlist'
              ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
              : "text-slate-300 hover:text-white hover:bg-white/5"
          )}
        >
          <span>⭐</span>
          <span className="truncate">Watchlist</span>
        </button>
      </div>

      {/* 3. Search Box */}
      <div className="p-2 border-b border-[#1F2233] bg-[#0A0C14]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาหุ้น (เช่น NVDA)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0F111A] border border-[#1F2233] focus:border-[#823AFD] text-xs text-white pl-8 pr-7 py-1.5 rounded-xl outline-none placeholder:text-slate-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Watchlist Manage link */}
      {activeTab === 'watchlist' && onManageWatchlist && (
        <div className="px-3 py-1.5 bg-[#0A0C14] border-b border-[#1F2233] flex items-center justify-between">
          <span className="text-[11px] text-slate-300">ซิงก์จาก X-Chart & DB</span>
          <button
            onClick={onManageWatchlist}
            className="text-[11px] text-[#A78BFA] hover:text-white font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> จัดการ Watchlist
          </button>
        </div>
      )}

      {/* Active Filter Notification Ribbon */}
      {hasActiveFilter && (
        <div className="px-3 py-2 bg-[#16121D] border-b border-[#823AFD]/30 flex items-center justify-between text-[11px]">
          <span className="text-slate-200 flex items-center gap-1.5 font-medium">
            <Filter className="w-3 h-3 text-[#FC2D79]" />
            กำลังกรอง: <strong className="text-white font-mono">{selectedTicker ? `#${selectedTicker}` : `#${selectedTag}`}</strong>
          </span>
          <button
            onClick={onClearFilter}
            className="text-[11px] text-[#FC2D79] hover:underline font-bold"
          >
            ดูทั้งหมด
          </button>
        </div>
      )}

      {/* 4. High-Density X-Chart Style Column Headers (Height: 28px) */}
      <div className="h-7 px-3 bg-[#0B0D14] border-b border-[#1F2233] grid grid-cols-12 items-center text-[11px] font-bold uppercase tracking-wider text-slate-300 shrink-0 select-none">
        <button
          onClick={() => handleSort('symbol')}
          className="col-span-5 flex items-center gap-1 text-left hover:text-white transition-colors group cursor-pointer"
        >
          <span>Symbol</span>
          {renderSortIndicator('symbol')}
        </button>

        <button
          onClick={() => handleSort('price')}
          className="col-span-3 flex items-center justify-end gap-1 text-right hover:text-white transition-colors group cursor-pointer pr-1"
        >
          <span>Last</span>
          {renderSortIndicator('price')}
        </button>

        <button
          onClick={() => handleSort('change')}
          className="col-span-2 flex items-center justify-end gap-0.5 text-right hover:text-white transition-colors group cursor-pointer"
        >
          <span>Chg</span>
          {renderSortIndicator('change')}
        </button>

        <button
          onClick={() => handleSort('percentChange')}
          className="col-span-2 flex items-center justify-end gap-0.5 text-right hover:text-white transition-colors group cursor-pointer"
        >
          <span>%</span>
          {renderSortIndicator('percentChange')}
        </button>
      </div>

      {/* 5. High-Density Stream with Collapsible Holdings & Target Sections (100% X-Chart Duplication) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 divide-y divide-[#1F2233]/40">
        {processedSections.map((section) => {
          const isCollapsed = Boolean(section.isCollapsed);

          return (
            <div key={section.id} className="bg-[#0F111A]">
              {/* Collapsible Section Header Bar (Height: 28px — Interactive) */}
              <div 
                onClick={() => handleToggleSection(section.id)}
                className="h-7 px-2.5 bg-[#131724]/95 border-b border-[#1F2233]/60 flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer select-none transition-colors group"
                title={isCollapsed ? `คลิกเพื่อกางหมวด ${section.title}` : `คลิกเพื่อพับหมวด ${section.title}`}
              >
                <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors shrink-0" />
                  )}
                  {section.icon}
                  <span className="tracking-wide uppercase text-slate-200 group-hover:text-white font-semibold text-[12px] truncate">
                    {section.title}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal shrink-0">
                    ({section.stocks.length})
                  </span>
                </div>

                {section.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold border leading-none bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shrink-0">
                    {section.badge}
                  </span>
                )}
              </div>

              {/* Stock Rows in this section (Hidden when collapsed) */}
              {!isCollapsed && (
                <div className="divide-y divide-[#1F2233]/25 animate-in fade-in duration-150">
                  {section.stocks.length === 0 ? (
                    <div className="px-6 py-2.5 text-xs text-slate-400 italic text-center">
                      ไม่มีหุ้นในกลุ่มนี้
                    </div>
                  ) : (
                    section.stocks.map((stock) => {
                      const isSelected = selectedTicker === stock.symbol;
                      const stat = tickerStats[stock.symbol];
                      const hasTheMust = stat?.theMustUnread && stat.theMustUnread > 0;
                      const unreadCount = stat?.unread || 0;
                      const totalNews = stat?.total || 0;

                      const quote = watchlistPrices[stock.symbol] || prices[stock.symbol];
                      const price = quote?.price ?? 0;
                      const change = quote?.change ?? 0;
                      const percentChange = (quote as any)?.percentChange ?? (quote as any)?.percent_change ?? 0;
                      const isPositive = percentChange > 0;
                      const isZero = percentChange === 0 || !quote;

                      // Format price
                      let formattedPrice = price > 0 ? price.toFixed(2) : '—';
                      if (price >= 1000) {
                        formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (price < 1 && price > 0) {
                        formattedPrice = price.toFixed(4);
                      }

                      return (
                        <div
                          key={stock.symbol}
                          onClick={() => onSelectTicker(isSelected ? null : stock.symbol)}
                          className={clsx(
                            "h-[32px] px-3 grid grid-cols-12 items-center transition-all cursor-pointer group relative select-none",
                            isSelected
                              ? "bg-purple-950/40 text-white"
                              : "hover:bg-white/5 text-slate-200 hover:text-white"
                          )}
                        >
                          {/* Active Neon Left Indicator */}
                          {isSelected && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#823AFD] to-[#FC2D79]" />
                          )}

                          {/* Symbol Column: Dot Badge + Ticker + News Count / The Must Flame */}
                          <div className="col-span-5 flex items-center gap-1.5 overflow-hidden pr-1">
                            <div
                              className={clsx(
                                "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-tr shadow-sm",
                                getSymbolBadgeGradient(stock.symbol)
                              )}
                            >
                              {stock.symbol.slice(0, 1)}
                            </div>

                            <span className={clsx(
                              "text-[13px] font-normal tracking-tight truncate font-mono",
                              isSelected ? "text-white font-bold" : "text-slate-100 group-hover:text-white"
                            )}>
                              {stock.symbol}
                            </span>

                            {/* News Indicators */}
                            {hasTheMust ? (
                              <span className="px-1 py-0.2 rounded bg-rose-500/25 text-rose-300 font-black text-[9px] border border-rose-500/40 flex items-center gap-0.5 animate-pulse shrink-0">
                                <Flame className="w-2.5 h-2.5 text-rose-400" />
                              </span>
                            ) : unreadCount > 0 ? (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#823AFD]/30 text-[#C4B5FD] font-mono font-bold text-[9px] shrink-0 border border-[#823AFD]/40">
                                {unreadCount}
                              </span>
                            ) : totalNews > 0 ? (
                              <span className="text-[9px] font-mono text-slate-400 opacity-60 shrink-0">
                                {totalNews}
                              </span>
                            ) : null}
                          </div>

                          {/* Last Price Column */}
                          <div className="col-span-3 text-right font-mono text-[13px] font-normal text-slate-200 group-hover:text-white pr-1 truncate">
                            {price > 0 ? formattedPrice : '—'}
                          </div>

                          {/* Change Column */}
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
                            {price > 0 ? (isPositive && change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2)) : '—'}
                          </div>

                          {/* Change % Column */}
                          <div className="col-span-2 text-right font-mono text-[13px] font-normal truncate">
                            <span 
                              className={clsx(
                                isZero 
                                  ? "text-slate-300" 
                                  : isPositive 
                                  ? "text-emerald-400" 
                                  : "text-rose-400"
                              )}
                            >
                              {price > 0 ? (isPositive && percentChange > 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`) : '—'}
                            </span>
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

      {/* 6. Thematic Hashtag Strip (Footer) */}
      <div className="p-2.5 border-t border-[#1F2233] bg-[#0A0C14] space-y-1.5">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
          <Hash className="w-3 h-3 text-[#FC2D79]" /> Thematic Hashtags:
        </div>
        <div className="flex flex-wrap gap-1">
          {THEMATIC_TAGS.map(({ tag, label, color }) => {
            const isTagActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTag(isTagActive ? null : tag)}
                className={clsx(
                  "px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1",
                  isTagActive
                    ? "bg-[#823AFD] text-white border-white/20 shadow-[0_0_12px_rgba(130,58,253,0.5)]"
                    : clsx(color, "hover:brightness-125")
                )}
              >
                <span>#{tag}</span>
                {isTagActive && <Check className="w-2.5 h-2.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
