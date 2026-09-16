import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Flame, 
  Sparkles, 
  Star, 
  Briefcase, 
  ChevronRight, 
  ChevronLeft, 
  Hash, 
  Filter, 
  Layers,
  Check,
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { useXChartStore } from '../../stores/xchartStore';
import { useHoldings } from '../../hooks/useHoldings';
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
}

// Fallback Portfolios & Watchlist Definitions
const DEFAULT_MAIN_PORTFOLIO_STOCKS: StockItem[] = [
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', category: 'Security' },
  { symbol: 'HIMS', name: 'Hims & Hers Health', category: 'Healthcare' },
  { symbol: 'MELI', name: 'MercadoLibre Inc', category: 'E-Commerce' },
  { symbol: 'META', name: 'Meta Platforms', category: 'Social / AI' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', category: 'Semiconductor' },
  { symbol: 'RBRK', name: 'Rubrik Inc', category: 'AI Security' },
];

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

  // 1. Pull Watchlist from X-Chart Store directly (unified with X-Chart dock)
  const { watchlistSections } = useXChartStore();
  // 2. Pull Main Portfolio Holdings from useHoldings
  const { holdings = [] } = useHoldings();

  // Dynamic Watchlist: merge X-Chart sections + DB custom watchlist + defaults
  const mergedWatchlist = useMemo<StockItem[]>(() => {
    const list: StockItem[] = [...DEFAULT_WATCHLIST_STOCKS];
    const seen = new Set(list.map(s => s.symbol));

    // Pull from X-Chart Store sections
    (watchlistSections || []).forEach(sec => {
      (sec.symbols || []).forEach(sym => {
        if (!seen.has(sym)) {
          seen.add(sym);
          list.push({ symbol: sym, name: `${sym} (${sec.name})` });
        }
      });
    });

    // Pull from Custom Watchlist (DB)
    (customWatchlist || []).forEach(sym => {
      if (!seen.has(sym)) {
        seen.add(sym);
        list.push({ symbol: sym, name: `${sym} Watchlist` });
      }
    });

    return list;
  }, [watchlistSections, customWatchlist]);

  // Main Portfolio: Pull from active holdings or fallback
  const mainPortfolioStocks = useMemo<StockItem[]>(() => {
    const activeHoldings = (holdings || []).filter(h => h && h.quantity > 0 && h.symbol !== 'CASH');
    if (activeHoldings.length > 0) {
      const seen = new Set<string>();
      const list: StockItem[] = [];
      activeHoldings.forEach(h => {
        if (!seen.has(h.symbol)) {
          seen.add(h.symbol);
          const fallbackName = DEFAULT_MAIN_PORTFOLIO_STOCKS.find(d => d.symbol === h.symbol)?.name || h.symbol;
          list.push({ symbol: h.symbol, name: fallbackName, category: 'Holding' });
        }
      });
      // Ensure key watchlist core tickers are visible
      DEFAULT_MAIN_PORTFOLIO_STOCKS.forEach(d => {
        if (!seen.has(d.symbol)) {
          seen.add(d.symbol);
          list.push(d);
        }
      });
      return list;
    }
    return DEFAULT_MAIN_PORTFOLIO_STOCKS;
  }, [holdings]);

  // Tiger 2X Portfolio: from DEFAULT_2X_TARGET_STOCKS
  const tigerPortfolioStocks = useMemo<StockItem[]>(() => {
    return DEFAULT_2X_TARGET_STOCKS.map(t => ({
      symbol: t.symbol,
      name: t.name,
      category: t.category
    }));
  }, []);

  // Current stocks based on active tab
  const currentStockList = useMemo(() => {
    let list: StockItem[] = [];
    if (activeTab === 'main') list = mainPortfolioStocks;
    else if (activeTab === 'tiger') list = tigerPortfolioStocks;
    else list = mergedWatchlist;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.trim().toUpperCase();
    return list.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q));
  }, [activeTab, mainPortfolioStocks, tigerPortfolioStocks, mergedWatchlist, searchQuery]);

  // Check if any filter is active
  const hasActiveFilter = Boolean(selectedTicker || selectedTag);

  if (collapsed) {
    return (
      <aside className={clsx("w-12 bg-[#0D1019] border-l border-[#1F2233] flex flex-col items-center py-4 select-none shrink-0 transition-all", className)}>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Expand Ticker Navigator"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-8 flex flex-col items-center gap-4 text-slate-500">
          <Hash className="w-4 h-4 text-[#823AFD]" />
          <span className="text-[10px] font-mono [writing-mode:vertical-lr] tracking-widest text-slate-400 font-bold uppercase">
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
      "w-72 sm:w-80 bg-[#0D1019] border-l border-[#1F2233] flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.3)] select-none shrink-0 transition-all text-xs",
      className
    )}>
      {/* 1. Header with Title & Collapse */}
      <div className="p-3.5 border-b border-[#1F2233] flex items-center justify-between gap-2 bg-[#0A0C14]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#823AFD]/20 border border-[#823AFD]/40 flex items-center justify-center text-[#823AFD]">
            <Hash className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-heading tracking-tight flex items-center gap-1.5">
              Radar Navigator
            </h3>
            <p className="text-[10px] text-slate-400">กรองข่าวสารตามหุ้น & พอร์ต</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {hasActiveFilter && (
            <button
              onClick={onClearFilter}
              className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="ล้างตัวกรองเพื่อดูข่าวทั้งหมด"
            >
              <X className="w-3 h-3" /> ล้าง
            </button>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
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
              : "text-slate-400 hover:text-white hover:bg-white/5"
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
              : "text-slate-400 hover:text-white hover:bg-white/5"
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
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <span>⭐</span>
          <span className="truncate">Watchlist</span>
        </button>
      </div>

      {/* 3. Search Box */}
      <div className="p-2.5 border-b border-[#1F2233] bg-[#0A0C14]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
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
          <span className="text-[10px] text-slate-400">ซิงก์จาก X-Chart & DB</span>
          <button
            onClick={onManageWatchlist}
            className="text-[10px] text-[#823AFD] hover:text-[#A78BFA] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" /> จัดการ Watchlist
          </button>
        </div>
      )}

      {/* Active Filter Notification Ribbon */}
      {hasActiveFilter && (
        <div className="px-3 py-2 bg-[#16121D] border-b border-[#823AFD]/30 flex items-center justify-between text-[11px]">
          <span className="text-slate-300 flex items-center gap-1.5 font-medium">
            <Filter className="w-3 h-3 text-[#FC2D79]" />
            กำลังกรอง: <strong className="text-white font-mono">{selectedTicker ? `#${selectedTicker}` : `#${selectedTag}`}</strong>
          </span>
          <button
            onClick={onClearFilter}
            className="text-[10px] text-[#FC2D79] hover:underline font-bold"
          >
            ดูทั้งหมด
          </button>
        </div>
      )}

      {/* 4. Stock List Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {currentStockList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            ไม่พบหุ้นที่ตรงกับคำค้นหา
          </div>
        ) : (
          currentStockList.map((stock) => {
            const isSelected = selectedTicker === stock.symbol;
            const stat = tickerStats[stock.symbol];
            const hasTheMust = stat?.theMustUnread && stat.theMustUnread > 0;
            const unreadCount = stat?.unread || 0;
            const totalNews = stat?.total || 0;
            const gradient = getSymbolBadgeGradient(stock.symbol);

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectTicker(isSelected ? null : stock.symbol)}
                className={clsx(
                  "p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group select-none",
                  isSelected
                    ? "bg-[#1E1830] border-[#823AFD] shadow-[0_0_16px_rgba(130,58,253,0.35)] ring-1 ring-[#823AFD]"
                    : "bg-[#0F111A] border-[#1F2233] hover:border-slate-700 hover:bg-[#151824]"
                )}
              >
                {/* Left: Badge + Symbol + Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={clsx(
                    "w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center font-black text-white text-[10px] shrink-0 shadow-sm",
                    gradient
                  )}>
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={clsx(
                        "font-black text-xs font-mono tracking-tight",
                        isSelected ? "text-white" : "text-slate-200 group-hover:text-white"
                      )}>
                        {stock.symbol}
                      </span>
                      {hasTheMust ? (
                        <span className="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-400 font-bold text-[9px] border border-rose-500/30 flex items-center gap-0.5 animate-pulse">
                          <Flame className="w-2.5 h-2.5" /> THE MUST
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {stock.name}
                    </div>
                  </div>
                </div>

                {/* Right: Unread / Total News Count Badge */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {unreadCount > 0 ? (
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-[10px] font-black border",
                      hasTheMust 
                        ? "bg-rose-500 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                        : "bg-[#823AFD]/25 text-[#A78BFA] border-[#823AFD]/40"
                    )}>
                      {unreadCount}
                    </span>
                  ) : totalNews > 0 ? (
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200">
                      {totalNews}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 opacity-60">0</span>
                  )}

                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FC2D79] shadow-[0_0_6px_rgba(252,45,121,0.8)]" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Thematic Hashtag Strip (Footer) */}
      <div className="p-3 border-t border-[#1F2233] bg-[#0A0C14] space-y-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Hash className="w-3 h-3 text-[#FC2D79]" /> Thematic Hashtags:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {THEMATIC_TAGS.map(({ tag, label, color }) => {
            const isTagActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTag(isTagActive ? null : tag)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1",
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
