import React, { useState, useEffect, useMemo } from 'react';
import { useXChartStore, WatchlistSortColumn, WatchlistSortDir } from '../../../stores/xchartStore';
import { useProject2xStore, RadarRow } from '../../../stores/project2xStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { useUiStore } from '../../../stores/uiStore';
import { 
  TierBadgeIndicator, 
  getTierVisualInfo,
  TierVisualInfo 
} from '../../../components/xchart/TierBadgeIndicator';
import { 
  ChevronRight, 
  ChevronDown, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown,
  CandlestickChart,
  RefreshCw,
  Search,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

export const TIER_SORT_ASC_RANKS: Record<string, number> = {
  BUY_NOW: 1,
  GET_READY: 2,
  SLOW_BLEED: 3,
  FALLING_KNIFE: 4,
  MAYDAY_EXIT: 5,
  RUNNER: 6,
  TO_THE_MOON: 7,
};

interface MobileWatchlistSectionProps {
  onSelectSymbol: (symbol: string) => void;
}

export const MobileWatchlistSection: React.FC<MobileWatchlistSectionProps> = ({
  onSelectSymbol,
}) => {
  const {
    watchlistSections,
    watchlistPrices,
    watchlistSortColumn,
    watchlistSortDir,
    setWatchlistSort,
    fetchWatchlistQuotes,
    watchlistLoading,
    changeSymbolOnActiveTab,
  } = useXChartStore();

  const { radar, fetchRadar, compactTiers } = useProject2xStore();
  const { activePortfolioId } = usePortfolioStore();
  const { setActiveTab } = useUiStore();

  // Quick Tier Filter for Watchlist tab
  const [selectedTierFilter, setSelectedTierFilter] = useState<string | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Initial data loading
  useEffect(() => {
    fetchRadar(activePortfolioId || 'default');
    fetchWatchlistQuotes();
  }, [activePortfolioId, fetchRadar, fetchWatchlistQuotes]);

  // Radar map
  const radarMap = useMemo(() => {
    const map: Record<string, any> = { ...compactTiers };
    if (radar?.rows) {
      for (const row of radar.rows) {
        if (row && row.symbol) {
          map[row.symbol.toUpperCase()] = row;
        }
      }
    }
    return map;
  }, [radar?.rows, compactTiers]);

  // Section collapse state (persisted)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mobile_watchlist_sections_collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  const isSectionCollapsed = (secId: string): boolean => {
    if (secId in collapsedSections) {
      return Boolean(collapsedSections[secId]);
    }
    // Default expanded: BUY NOW and GET READY. Others collapsed by default to save mobile space
    return secId !== 'sec-tier-buy-now' && secId !== 'sec-tier-get-ready';
  };

  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections(prev => {
      const current = isSectionCollapsed(secId);
      const next = { ...prev, [secId]: !current };
      if (typeof window !== 'undefined') {
        localStorage.setItem('mobile_watchlist_sections_collapsed', JSON.stringify(next));
      }
      return next;
    });
  };

  // Build PC-style Dynamic Watchlist Sections
  const activeWatchlistSections = useMemo(() => {
    // 1. Preserved exchange / index section
    const exSec = (watchlistSections || []).find(s => s.id === 'sec-exchange' || s.name === 'EXCHANGE');
    const defaultExSymbols = ['SPY', 'QQQ', 'SCHG', '^GSPC', 'THB=X'];
    const exSymbols = (exSec && exSec.symbols.length > 0) ? exSec.symbols : defaultExSymbols;

    // 2. Preserved commodities & crypto section
    const crSec = (watchlistSections || []).find(s => s.id === 'sec-commodities-crypto' || s.name.includes('COMMODITIES') || s.name.includes('CRYPTO'));
    const defaultCrSymbols = ['BTC-USD', 'GC=F', 'GLD', 'CL=F'];
    const crSymbols = (crSec && crSec.symbols.length > 0) ? crSec.symbols : defaultCrSymbols;

    const exSet = new Set((exSymbols || []).filter(Boolean).map(s => s.toUpperCase()));
    const crSet = new Set((crSymbols || []).filter(Boolean).map(s => s.toUpperCase()));

    // 3. Collect all stock symbols from all sections
    const allStockSymbols = Array.from(new Set(
      watchlistSections.flatMap(s => s.symbols || []).filter(s => {
        if (!s) return false;
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
      if (!sym) continue;
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
      subStats?: string;
      badgeClass?: string;
      isCollapsed: boolean;
    }> = [];

    const buyNowSec = buyNow.length > 0 ? {
      id: 'sec-tier-buy-now',
      name: 'BUY NOW',
      icon: '🔥',
      symbols: buyNow,
      badgeClass: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
      isCollapsed: isSectionCollapsed('sec-tier-buy-now')
    } : null;

    let readySec = null;
    if (getReady.length > 0) {
      const parts: string[] = [];
      if (dipBuyCount > 0) parts.push(`🧲 Dip ${dipBuyCount}`);
      if (reversalCount > 0) parts.push(`⏳ Break ${reversalCount}`);
      readySec = {
        id: 'sec-tier-get-ready',
        name: 'GET READY',
        icon: '⏳',
        symbols: getReady,
        subStats: parts.join(' · '),
        badgeClass: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30',
        isCollapsed: isSectionCollapsed('sec-tier-get-ready')
      };
    }

    const runnerSec = runner.length > 0 ? {
      id: 'sec-tier-runner',
      name: 'TO THE MOON / RUNNER',
      icon: '🚀',
      symbols: runner,
      badgeClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
      isCollapsed: isSectionCollapsed('sec-tier-runner')
    } : null;

    const dangerSec = danger.length > 0 ? {
      id: 'sec-tier-danger',
      name: 'DANGER & BEAR ABYSS',
      icon: '🔪',
      symbols: danger,
      badgeClass: 'text-red-300 bg-rose-950/40 border-red-500/30',
      isCollapsed: isSectionCollapsed('sec-tier-danger')
    } : null;

    const watchingSec = watching.length > 0 ? {
      id: 'sec-tier-watching',
      name: 'WATCHING',
      icon: '🔍',
      symbols: watching,
      badgeClass: 'text-slate-300 bg-slate-800/40 border-slate-700/30',
      isCollapsed: isSectionCollapsed('sec-tier-watching')
    } : null;

    // Dynamic sections ordering
    const dynamicSections = watchlistSortColumn === 'tier'
      ? (watchlistSortDir === 'desc'
          ? [runnerSec, dangerSec, readySec, buyNowSec, watchingSec]
          : [buyNowSec, readySec, dangerSec, runnerSec, watchingSec])
      : [buyNowSec, readySec, runnerSec, dangerSec, watchingSec];

    for (const sec of dynamicSections) {
      if (sec) list.push(sec);
    }

    // 6. EXCHANGE / INDEX
    if (exSymbols && exSymbols.length > 0) {
      list.push({
        id: 'sec-exchange',
        name: 'INDEX & BENCHMARKS',
        icon: '🌐',
        symbols: exSymbols,
        badgeClass: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
        isCollapsed: isSectionCollapsed('sec-exchange')
      });
    }

    // 7. COMMODITIES & CRYPTO
    if (crSymbols && crSymbols.length > 0) {
      list.push({
        id: 'sec-commodities-crypto',
        name: 'COMMODITIES & CRYPTO',
        icon: '🪙',
        symbols: crSymbols,
        badgeClass: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
        isCollapsed: isSectionCollapsed('sec-commodities-crypto')
      });
    }

    // 8. Other custom sections if any
    for (const sec of watchlistSections) {
      if (
        sec.id !== 'sec-stocks' && 
        sec.id !== 'sec-strong-growth' && 
        sec.id !== 'sec-small-cap' && 
        sec.id !== 'sec-waiting' && 
        sec.id !== 'sec-exchange' && 
        sec.id !== 'sec-commodities-crypto' &&
        sec.symbols.length > 0
      ) {
        list.push({
          id: sec.id,
          name: sec.name,
          icon: '📁',
          symbols: sec.symbols,
          badgeClass: 'text-purple-300 bg-purple-500/15 border-purple-500/30',
          isCollapsed: isSectionCollapsed(sec.id)
        });
      }
    }

    return list;
  }, [watchlistSections, radarMap, collapsedSections, watchlistSortColumn, watchlistSortDir]);



  // Sort indicator helper
  const renderSortIndicator = (col: WatchlistSortColumn) => {
    if (watchlistSortColumn !== col) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-40 shrink-0" />;
    }
    return watchlistSortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-cyan-400 shrink-0 animate-in fade-in" />
    ) : (
      <ArrowDown className="w-3 h-3 text-cyan-400 shrink-0 animate-in fade-in" />
    );
  };

  // Stock Row Click: Opens drawer
  const handleStockClick = (symbol: string) => {
    onSelectSymbol(symbol);
  };

  // Jump directly to XChart tab with symbol selected
  const handleJumpToChart = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    const isCurrency = symbol.includes('=X');
    changeSymbolOnActiveTab(symbol, isCurrency && symbol === 'THB=X' ? 'USD/THB' : symbol);
    setActiveTab('xchart');
  };

  // Filter symbols based on search and tier filter
  const filterSymbols = (symbols: string[]) => {
    let result = symbols;
    if (selectedTierFilter) {
      result = result.filter(sym => {
        if (!sym) return false;
        const row = radarMap[sym.toUpperCase()];
        const info = getTierVisualInfo(row, sym, sym.includes('=X'));
        if (selectedTierFilter === 'BUY_NOW') return info.tierId === 'BUY_NOW';
        if (selectedTierFilter === 'GET_READY') return info.tierId === 'GET_READY';
        if (selectedTierFilter === 'DANGER') {
          return (
            info.tierId === 'FALLING_KNIFE' || 
            info.tierId === 'MAYDAY_EXIT' || 
            info.tierId === 'SLOW_BLEED' || 
            info.tierId === 'DANGER'
          );
        }
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().trim();
      result = result.filter(s => s.toUpperCase().includes(q));
    }

    return result;
  };

  // Sort symbols within a section
  const sortSymbols = (symbols: string[]) => {
    return [...symbols].sort((a, b) => {
      if (!watchlistSortColumn) return 0;
      const quoteA = watchlistPrices[a];
      const quoteB = watchlistPrices[b];

      if (watchlistSortColumn === 'tier') {
        const rowA = a ? radarMap[a.toUpperCase()] : null;
        const rowB = b ? radarMap[b.toUpperCase()] : null;
        const infoA = getTierVisualInfo(rowA, a || '', (a || '').includes('=X'));
        const infoB = getTierVisualInfo(rowB, b || '', (b || '').includes('=X'));

        const rankA = TIER_SORT_ASC_RANKS[infoA.tierId] ?? 999;
        const rankB = TIER_SORT_ASC_RANKS[infoB.tierId] ?? 999;

        if (rankA !== rankB) {
          return watchlistSortDir === 'asc' ? (rankA - rankB) : (rankB - rankA);
        }
        return a.localeCompare(b);
      }

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
        return watchlistSortDir === 'desc' ? (valA - valB) : (valB - valA);
      }

      return 0;
    });
  };

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col select-none">
      
      {/* 1. Watchlist Header */}
      <div className="p-3 sm:p-4 border-b border-[#2A2E45] bg-[#0E121E] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-sm sm:text-base font-heading flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#823AFD]" />
            Watchlist
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.08] text-slate-300 font-mono font-bold">
            {activeWatchlistSections.reduce((acc, s) => acc + s.symbols.length, 0)} Assets
          </span>
        </div>

        {/* Refresh Quotes Button */}
        <button
          onClick={() => fetchWatchlistQuotes()}
          disabled={watchlistLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer shrink-0 disabled:opacity-50 text-xs font-bold font-heading"
          title="Refresh Quotes"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5 text-slate-300", watchlistLoading && "animate-spin text-cyan-400")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Streamlined Quick Tier Filter Bar */}
      <div className="px-3 py-2 bg-[#090C14] border-b border-[#1F2233] grid grid-cols-4 gap-1.5 shrink-0 select-none">
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
                "h-7 rounded-xl text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer whitespace-nowrap",
                isActive 
                  ? (filter.activeClass || "bg-purple-600 text-white border-purple-400 shadow-sm")
                  : "bg-white/5 border-transparent text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Bar for Fast Filtering */}
      <div className="px-3 py-2 bg-[#0B0E17] border-b border-[#1F2233] flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            placeholder={activeTabMode === 'watchlist' ? "Search symbol in watchlist..." : "Search portfolio holding..."}
            className="w-full bg-[#07090E] border border-[#2A2E45] rounded-xl pl-8 pr-2.5 py-1.5 text-[13px] text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all font-mono uppercase"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/5 cursor-pointer font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* 4. TradingView Style Sortable Table Column Headers (Height: 30px) */}
      <div className="h-8 px-3 bg-[#080A10] border-b border-[#1F2233] grid grid-cols-12 items-center text-[12px] font-bold uppercase tracking-wider text-slate-300 shrink-0 select-none">
        <div className="col-span-5 flex items-center gap-1 text-left overflow-hidden">
          <button
            onClick={() => setWatchlistSort('tier')}
            className={clsx(
              "flex items-center gap-0.5 transition-colors cursor-pointer shrink-0",
              watchlistSortColumn === 'tier' ? "text-cyan-400 font-extrabold" : "text-slate-300 hover:text-white"
            )}
            title="Sort by Tier"
          >
            <span>Tier</span>
            {renderSortIndicator('tier')}
          </button>
          <span className="text-slate-600 font-normal">/</span>
          <button
            onClick={() => setWatchlistSort('symbol')}
            className={clsx(
              "flex items-center gap-0.5 transition-colors cursor-pointer truncate",
              watchlistSortColumn === 'symbol' ? "text-cyan-400 font-extrabold" : "text-slate-300 hover:text-white"
            )}
            title="Sort by Symbol"
          >
            <span>Symbol</span>
            {renderSortIndicator('symbol')}
          </button>
        </div>

        <button
          onClick={() => setWatchlistSort('price')}
          className="col-span-3 flex items-center justify-end gap-1 text-right hover:text-white transition-colors cursor-pointer pr-1"
        >
          <span>Last</span>
          {renderSortIndicator('price')}
        </button>

        <button
          onClick={() => setWatchlistSort('change')}
          className="col-span-2 flex items-center justify-end gap-0.5 text-right hover:text-white transition-colors cursor-pointer"
        >
          <span>Chg</span>
          {renderSortIndicator('change')}
        </button>

        <button
          onClick={() => setWatchlistSort('percentChange')}
          className="col-span-2 flex items-center justify-end gap-0.5 text-right hover:text-white transition-colors cursor-pointer"
        >
          <span>%</span>
          {renderSortIndicator('percentChange')}
        </button>
      </div>

      {/* 5. Main Content: Sections & High-Density Rows */}
      <div className="divide-y divide-[#1F2233]/40">
        
        {activeWatchlistSections.map((section) => {
          const matchingSymbols = filterSymbols(section.symbols);
          if (matchingSymbols.length === 0 && (selectedTierFilter || searchQuery)) {
            return null;
          }

          const sortedSyms = sortSymbols(matchingSymbols);

          return (
            <div key={section.id} className="bg-[#0F111A]">
              {/* Section Accordion Header (Height: ~32px) */}
              <div
                onClick={() => toggleSectionCollapse(section.id)}
                className="h-8 px-3 bg-[#131724]/90 border-b border-[#1F2233]/60 flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer select-none transition-colors group"
              >
                <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
                  {section.isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                  )}
                  <span className="text-xs">{section.icon}</span>
                  <span className="tracking-wide uppercase text-slate-200 group-hover:text-white font-bold text-[13px] truncate">
                    {section.name}
                  </span>
                  <span className={clsx(
                    "text-xs px-2 py-0.5 rounded-full font-mono font-bold shrink-0",
                    section.badgeClass || "text-slate-300 bg-white/10"
                  )}>
                    {matchingSymbols.length}
                  </span>
                </div>

                {section.subStats && (
                  <span className="text-xs text-yellow-300/80 font-mono shrink-0 ml-1">
                    {section.subStats}
                  </span>
                )}
              </div>

              {/* High-Density Symbol Rows */}
              {!section.isCollapsed && (
                <div className="divide-y divide-[#1F2233]/25">
                  {sortedSyms.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                      ไม่มีหุ้นในหมวดนี้
                    </div>
                  ) : (
                    sortedSyms.map((symbol) => {
                      const quote = watchlistPrices[symbol];
                      const isCurrency = symbol.includes('=X');
                      const radarData = symbol ? radarMap[symbol.toUpperCase()] : null;
                      const tierInfo = getTierVisualInfo(radarData, symbol, isCurrency);

                      const price = quote?.price ?? 0;
                      const change = quote?.change ?? 0;
                      const percentChange = quote?.percentChange ?? 0;
                      const isPositive = percentChange >= 0;
                      const isZero = percentChange === 0;

                      // Price formatting
                      let formattedPrice = price.toFixed(2);
                      if (price > 1000) {
                        formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      } else if (price < 1 && price > 0) {
                        formattedPrice = price.toFixed(4);
                      }

                      return (
                        <div
                          key={symbol}
                          onClick={() => handleStockClick(symbol)}
                          className="h-[34px] px-3 grid grid-cols-12 items-center hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer group relative select-none"
                        >
                          {/* Left Cyber Indicator */}
                          {tierInfo.isFireOrb ? (
                            <div
                              className={clsx(
                                'absolute left-[1px] top-1/2 -translate-y-1/2 transition-all z-10',
                                tierInfo.spineClass
                              )}
                            />
                          ) : (
                            <div
                              className={clsx(
                                'absolute left-[2px] top-[4px] bottom-[4px] rounded-full transition-all z-10 w-[4px]',
                                tierInfo.spineClass
                              )}
                            />
                          )}

                          {/* Col 1: Symbol & Dot */}
                          <div className="col-span-5 flex items-center gap-1.5 overflow-hidden pr-1">
                            <TierBadgeIndicator
                              symbol={symbol}
                              radarData={radarData}
                              isCurrency={isCurrency}
                            />
                            <span className="text-[13px] font-normal tracking-tight truncate font-mono text-slate-100 group-hover:text-white">
                              {symbol}
                            </span>
                          </div>

                          {/* Col 2: Last Price */}
                          <div className="col-span-3 text-right font-mono text-[13px] font-normal text-slate-200 group-hover:text-white pr-1">
                            {quote ? formattedPrice : '—'}
                          </div>

                          {/* Col 3: Change ($) */}
                          <div
                            className={clsx(
                              "col-span-2 text-right font-mono text-[13px] font-normal truncate",
                              isZero ? "text-slate-300" : isPositive ? "text-emerald-400" : "text-rose-400"
                            )}
                          >
                            {quote ? (isPositive && change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2)) : '—'}
                          </div>

                          {/* Col 4: Change (%) & Jump Icon */}
                          <div className="col-span-2 text-right relative flex items-center justify-end">
                            <span
                              className={clsx(
                                "font-mono text-[13px] font-normal transition-opacity",
                                isZero ? "text-slate-300" : isPositive ? "text-emerald-400" : "text-rose-400"
                              )}
                            >
                              {quote ? (isPositive && percentChange > 0 ? `+${percentChange.toFixed(2)}%` : `${percentChange.toFixed(2)}%`) : '—'}
                            </span>

                            {/* Quick Chart Launch Button */}
                            <button
                              onClick={(e) => handleJumpToChart(e, symbol)}
                              className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 text-cyan-400 hover:text-white hover:bg-cyan-500/20 rounded transition-all"
                              title="Open in X-Chart"
                            >
                              <CandlestickChart className="w-3.5 h-3.5" />
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
    </div>
  );
};
