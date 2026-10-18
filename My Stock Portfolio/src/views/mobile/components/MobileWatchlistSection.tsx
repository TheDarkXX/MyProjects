import React, { useState, useEffect, useMemo } from 'react';
import { useHoldings, Holding } from '../../../hooks/useHoldings';
import { usePriceStore } from '../../../stores/priceStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { useUiStore } from '../../../stores/uiStore';
import { useXChartStore } from '../../../stores/xchartStore';
import { useProject2xStore } from '../../../stores/project2xStore';
import { 
  TierBadgeIndicator, 
  getTierVisualInfo 
} from '../../../components/xchart/TierBadgeIndicator';
import { 
  Briefcase, 
  Target, 
  BarChart3, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  ArrowUpDown, 
  CandlestickChart, 
  RefreshCw, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import clsx from 'clsx';

// 1. Target Stock Definition (Project 2X Target List - 13 Stocks)
export interface TargetStockItem {
  symbol: string;
  name: string;
  target_percent: number;
  category: 'Core' | 'Moonshot';
}

export const TARGET_STOCKS: TargetStockItem[] = [
  // Core Commanders (83%)
  { symbol: 'NVDA', name: 'NVIDIA Corp', target_percent: 15.0, category: 'Core' },
  { symbol: 'TSM', name: 'Taiwan Semi (TSMC)', target_percent: 10.0, category: 'Core' },
  { symbol: 'AVGO', name: 'Broadcom Inc', target_percent: 10.0, category: 'Core' },
  { symbol: 'VRT', name: 'Vertiv Holdings', target_percent: 10.0, category: 'Core' },
  { symbol: 'MELI', name: 'MercadoLibre Inc', target_percent: 10.0, category: 'Core' },
  { symbol: 'APH', name: 'Amphenol Corp', target_percent: 10.0, category: 'Core' },
  { symbol: 'KLAC', name: 'KLA Corporation', target_percent: 7.0, category: 'Core' },
  { symbol: 'ANET', name: 'Arista Networks', target_percent: 7.0, category: 'Core' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', target_percent: 4.0, category: 'Core' },
  // Moonshot Strikes (11%)
  { symbol: 'STRL', name: 'Sterling Infrastructure', target_percent: 3.0, category: 'Moonshot' },
  { symbol: 'ALAB', name: 'Astera Labs Inc', target_percent: 3.0, category: 'Moonshot' },
  { symbol: 'PLTR', name: 'Palantir Technologies', target_percent: 3.0, category: 'Moonshot' },
  { symbol: 'RKLB', name: 'Rocket Lab USA', target_percent: 2.0, category: 'Moonshot' },
];

// 2. Index Stock Definition (Key Global Benchmarks)
export interface IndexItem {
  symbol: string;
  name: string;
  flag: string;
  sub: string;
}

export const INDEX_ITEMS: IndexItem[] = [
  { symbol: 'SPY', name: 'S&P 500 ETF', flag: '🇺🇸', sub: 'US 500 Benchmark' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', flag: '💻', sub: 'Tech 100 Benchmark' },
  { symbol: 'SCHG', name: 'US Large Growth', flag: '🚀', sub: 'Schwab Growth' },
  { symbol: 'SMH', name: 'Semiconductor ETF', flag: '⚡', sub: 'VanEck Semicon' },
  { symbol: 'GLD', name: 'SPDR Gold Trust', flag: '🪙', sub: 'Gold Bullion' },
  { symbol: 'BTC-USD', name: 'Bitcoin', flag: '₿', sub: 'Crypto Flagship' },
  { symbol: 'TLT', name: '20+ Yr Treasury Bond', flag: '🏛️', sub: 'US Long Bond' },
];

export const TIER_SORT_ASC_RANKS: Record<string, number> = {
  BUY_NOW: 1,
  GET_READY: 2,
  SLOW_BLEED: 3,
  FALLING_KNIFE: 4,
  MAYDAY_EXIT: 5,
  RUNNER: 6,
  TO_THE_MOON: 7,
};

type SortMode = 'DEFAULT' | 'PERC_DESC' | 'PERC_ASC' | 'TIER' | 'SYMBOL';

interface MobileWatchlistSectionProps {
  onSelectSymbol: (symbol: string) => void;
}

export const MobileWatchlistSection: React.FC<MobileWatchlistSectionProps> = ({
  onSelectSymbol,
}) => {
  // Global Stores
  const { holdings, loading: holdingsLoading, cashBalance, totalNetWorth, totalPnl, totalPnlPercent } = useHoldings();
  const { prices, fetchPrices } = usePriceStore();
  const { watchlistPrices, fetchWatchlistQuotes, watchlistLoading, changeSymbolOnActiveTab } = useXChartStore();
  const { radar, fetchRadar, compactTiers } = useProject2xStore();
  const { activePortfolioId } = usePortfolioStore();
  const { setActiveTab } = useUiStore();

  // Local Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('DEFAULT');

  // Accordion Sections Collapse State
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mobile_watchlist_3sec_collapsed');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { myport: false, targets: false, indices: false };
  });

  const toggleSection = (key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mobile_watchlist_3sec_collapsed', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  // Radar Map Lookup
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

  // Eager Quote Fetching on Mount & Portfolio Change
  useEffect(() => {
    fetchRadar(activePortfolioId || 'default');
    const targetSymbols = TARGET_STOCKS.map((t) => t.symbol);
    const indexSymbols = INDEX_ITEMS.map((i) => i.symbol);
    const heldSymbols = holdings.map((h) => h.symbol);
    const allNeeded = Array.from(new Set([...targetSymbols, ...indexSymbols, ...heldSymbols])).filter(Boolean);

    if (allNeeded.length > 0) {
      fetchPrices(allNeeded);
      fetchWatchlistQuotes(allNeeded);
    }
  }, [activePortfolioId, holdings.length, fetchRadar, fetchPrices, fetchWatchlistQuotes]);

  // Fast Quote Retriever
  const getQuote = (sym: string) => {
    const wp = watchlistPrices[sym];
    const pp = prices[sym];
    const price = wp?.price ?? pp?.price ?? 0;
    const change = wp?.change ?? pp?.change ?? 0;
    const percentChange = wp?.percentChange ?? pp?.percent_change ?? 0;
    return { price, change, percentChange };
  };

  // Held Symbols Set for instant cross-referencing
  const holdingsMap = useMemo(() => {
    const map = new Map<string, Holding>();
    holdings.forEach((h) => {
      if (h.symbol) map.set(h.symbol.toUpperCase(), h);
    });
    return map;
  }, [holdings]);

  // Search filter helper
  const matchesSearch = (symbol: string, name?: string) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toUpperCase();
    return symbol.toUpperCase().includes(q) || (name && name.toUpperCase().includes(q));
  };

  // Section 1: My Port Holdings Filtered & Sorted
  const filteredHoldings = useMemo(() => {
    let list = holdings.filter((h) => matchesSearch(h.symbol));

    if (sortMode === 'PERC_DESC') {
      list = [...list].sort((a, b) => {
        const pA = getQuote(a.symbol).percentChange || a.dayChangePercent;
        const pB = getQuote(b.symbol).percentChange || b.dayChangePercent;
        return pB - pA;
      });
    } else if (sortMode === 'PERC_ASC') {
      list = [...list].sort((a, b) => {
        const pA = getQuote(a.symbol).percentChange || a.dayChangePercent;
        const pB = getQuote(b.symbol).percentChange || b.dayChangePercent;
        return pA - pB;
      });
    } else if (sortMode === 'TIER') {
      list = [...list].sort((a, b) => {
        const tierA = radarMap[a.symbol.toUpperCase()]?.tier_code || 'ZZZ';
        const tierB = radarMap[b.symbol.toUpperCase()]?.tier_code || 'ZZZ';
        return (TIER_SORT_ASC_RANKS[tierA] || 99) - (TIER_SORT_ASC_RANKS[tierB] || 99);
      });
    } else if (sortMode === 'SYMBOL') {
      list = [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else {
      // Default: sort by portfolio weight
      list = [...list].sort((a, b) => b.weightPercent - a.weightPercent);
    }

    return list;
  }, [holdings, searchQuery, sortMode, watchlistPrices, prices, radarMap]);

  // Section 2: Target Stocks Filtered & Sorted
  const filteredTargets = useMemo(() => {
    let list = TARGET_STOCKS.filter((t) => matchesSearch(t.symbol, t.name));

    if (sortMode === 'PERC_DESC') {
      list = [...list].sort((a, b) => getQuote(b.symbol).percentChange - getQuote(a.symbol).percentChange);
    } else if (sortMode === 'PERC_ASC') {
      list = [...list].sort((a, b) => getQuote(a.symbol).percentChange - getQuote(b.symbol).percentChange);
    } else if (sortMode === 'TIER') {
      list = [...list].sort((a, b) => {
        const tierA = radarMap[a.symbol.toUpperCase()]?.tier_code || 'ZZZ';
        const tierB = radarMap[b.symbol.toUpperCase()]?.tier_code || 'ZZZ';
        return (TIER_SORT_ASC_RANKS[tierA] || 99) - (TIER_SORT_ASC_RANKS[tierB] || 99);
      });
    } else if (sortMode === 'SYMBOL') {
      list = [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return list;
  }, [searchQuery, sortMode, watchlistPrices, prices, radarMap]);

  // Section 3: Index Stocks Filtered & Sorted
  const filteredIndices = useMemo(() => {
    let list = INDEX_ITEMS.filter((i) => matchesSearch(i.symbol, i.name));

    if (sortMode === 'PERC_DESC') {
      list = [...list].sort((a, b) => getQuote(b.symbol).percentChange - getQuote(a.symbol).percentChange);
    } else if (sortMode === 'PERC_ASC') {
      list = [...list].sort((a, b) => getQuote(a.symbol).percentChange - getQuote(b.symbol).percentChange);
    } else if (sortMode === 'SYMBOL') {
      list = [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    return list;
  }, [searchQuery, sortMode, watchlistPrices, prices]);

  const handleOpenChart = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    changeSymbolOnActiveTab(symbol);
    setActiveTab('xchart');
  };

  const handleManualRefresh = () => {
    fetchRadar(activePortfolioId || 'default');
    const targetSymbols = TARGET_STOCKS.map((t) => t.symbol);
    const indexSymbols = INDEX_ITEMS.map((i) => i.symbol);
    const heldSymbols = holdings.map((h) => h.symbol);
    const allNeeded = Array.from(new Set([...targetSymbols, ...indexSymbols, ...heldSymbols])).filter(Boolean);
    fetchPrices(allNeeded);
    fetchWatchlistQuotes(allNeeded);
  };

  return (
    <div className="space-y-4 select-none pb-6">
      {/* 1. Header Toolbar: Fast Search + Sort Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา Ticker หรือชื่อหุ้น..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 bg-[#0F1420] border border-white/[0.08] focus:border-[#823AFD] rounded-xl text-sm text-slate-200 placeholder-slate-400 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 px-1 py-0.5 rounded"
            >
              เคลียร์
            </button>
          )}
        </div>

        {/* Sort Selector Button */}
        <div className="relative">
          <button
            onClick={() => {
              const modes: SortMode[] = ['DEFAULT', 'PERC_DESC', 'PERC_ASC', 'TIER', 'SYMBOL'];
              const curIdx = modes.indexOf(sortMode);
              const nextMode = modes[(curIdx + 1) % modes.length];
              setSortMode(nextMode);
            }}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold tracking-tight transition-all active:scale-95 cursor-pointer shadow-sm",
              sortMode !== 'DEFAULT'
                ? "bg-[#823AFD]/20 border-[#823AFD]/50 text-white"
                : "bg-[#0F1420] border-white/[0.08] text-slate-300 hover:text-white"
            )}
            title="สลับโหมดจัดเรียง"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {sortMode === 'DEFAULT' && 'จัดเรียง'}
              {sortMode === 'PERC_DESC' && '🚀 เขียวสุด'}
              {sortMode === 'PERC_ASC' && '🔻 แดงสุด'}
              {sortMode === 'TIER' && '🎯 Tier Radar'}
              {sortMode === 'SYMBOL' && '🔤 A-Z'}
            </span>
          </button>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          className="p-2.5 bg-[#0F1420] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
          title="รีเฟรชข้อมูลราคา"
        >
          <RefreshCw className={clsx("w-4 h-4", (watchlistLoading || holdingsLoading) && "animate-spin text-[#823AFD]")} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MY PORT (หุ้นที่เราถือจริงในพอร์ต) */}
      {/* ========================================================================= */}
      <div className="bg-[#0B0F17]/95 border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden">
        {/* Section Accordion Header */}
        <button
          onClick={() => toggleSection('myport')}
          className="w-full px-4 py-3.5 flex items-center justify-between bg-[#111726]/60 hover:bg-[#111726]/90 transition-all border-b border-white/[0.06] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-white tracking-wide">My Port</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {holdings.length} ตัว
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Port P&L Pill */}
            {totalPnl !== 0 && (
              <span className={clsx(
                "text-xs font-bold px-2 py-0.5 rounded-md",
                totalPnl >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              )}>
                {totalPnl >= 0 ? '+' : ''}{totalPnlPercent.toFixed(1)}%
              </span>
            )}
            <div className="text-slate-400 transition-transform duration-200">
              {collapsed.myport ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* Section Body */}
        {!collapsed.myport && (
          <div className="divide-y divide-white/[0.04]">
            {filteredHoldings.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {holdings.length === 0 ? (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-300">ยังไม่มีหุ้นในพอร์ตปัจจุบัน</p>
                    <p className="text-xs text-slate-400">เมื่อมีรายการซื้อขาย ระบบจะดึงมาแสดงที่นี่อัตโนมัติ</p>
                  </div>
                ) : (
                  <p>ไม่พบหุ้นที่ตรงกับคำค้นหา "{searchQuery}"</p>
                )}
              </div>
            ) : (
              filteredHoldings.map((h) => {
                const quote = getQuote(h.symbol);
                const currentPrice = quote.price > 0 ? quote.price : (h.lastPrice || h.avgCost);
                const dayChange = quote.price > 0 ? quote.percentChange : h.dayChangePercent;
                const radarItem = radarMap[h.symbol.toUpperCase()];
                const tierCode = radarItem?.tier_code || radarItem?.tier;
                const isPositiveDay = dayChange >= 0;
                const isPositiveTotal = h.totalReturnPercent >= 0;

                return (
                  <div
                    key={h.symbol}
                    onClick={() => onSelectSymbol(h.symbol)}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-all cursor-pointer group"
                  >
                    {/* Left: Ticker + Weight + Tier + Holding details */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-white tracking-tight font-mono">{h.symbol}</span>
                          {tierCode && (
                            <TierBadgeIndicator tier={tierCode} size="xs" showLabel={true} />
                          )}
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 font-medium font-mono">
                            {h.weightPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                          <span>{h.quantity.toLocaleString('en-US', { maximumFractionDigits: 3 })} หุ้น</span>
                          <span>•</span>
                          <span>ทุน ${h.avgCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Price + Day Change + Total Return */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-100 font-mono tracking-tight">
                          ${currentPrice.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          {/* Day % pill */}
                          <span className={clsx(
                            "inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded font-mono",
                            isPositiveDay ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                          )}>
                            {isPositiveDay ? '+' : ''}{dayChange.toFixed(2)}%
                          </span>
                        </div>
                        {/* Total Return subtext */}
                        <div className={clsx(
                          "text-xs font-medium mt-0.5 font-mono",
                          isPositiveTotal ? "text-emerald-400/80" : "text-rose-400/80"
                        )}>
                          P&L {isPositiveTotal ? '+' : ''}{h.totalReturnPercent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Pinned Cash Summary Footer in My Port */}
            {cashBalance > 0 && !collapsed.myport && (
              <div className="px-4 py-2.5 bg-[#0D121F]/80 flex items-center justify-between text-xs border-t border-white/[0.04]">
                <div className="flex items-center gap-2 text-slate-400 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>เงินสดพร้อมลงทุน (Cash Balance)</span>
                </div>
                <div className="font-bold text-slate-200">
                  ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: หุ้นเป้าหมาย 13 ขุนพล (PROJECT 2X TARGET LIST) */}
      {/* ========================================================================= */}
      <div className="bg-[#0B0F17]/95 border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden">
        {/* Section Accordion Header */}
        <button
          onClick={() => toggleSection('targets')}
          className="w-full px-4 py-3.5 flex items-center justify-between bg-[#111726]/60 hover:bg-[#111726]/90 transition-all border-b border-white/[0.06] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Target className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-white tracking-wide">หุ้นเป้าหมาย 13 ขุนพล</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {TARGET_STOCKS.length} ตัว
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Project 2X Radar</span>
            <div className="text-slate-400 transition-transform duration-200">
              {collapsed.targets ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* Section Body */}
        {!collapsed.targets && (
          <div className="divide-y divide-white/[0.04]">
            {filteredTargets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                ไม่พบหุ้นเป้าหมายที่ตรงกับคำค้นหา "{searchQuery}"
              </div>
            ) : (
              filteredTargets.map((item) => {
                const quote = getQuote(item.symbol);
                const radarItem = radarMap[item.symbol.toUpperCase()];
                const tierCode = radarItem?.tier_code || radarItem?.tier;
                const heldInfo = holdingsMap.get(item.symbol.toUpperCase());
                const isPositiveDay = quote.percentChange >= 0;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => onSelectSymbol(item.symbol)}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-all cursor-pointer group"
                  >
                    {/* Left: Ticker + Tier Badge + In-Port Indicator */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base font-bold text-white tracking-tight font-mono">{item.symbol}</span>
                      {tierCode && (
                        <TierBadgeIndicator tier={tierCode} size="xs" showLabel={true} />
                      )}
                      {heldInfo && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold font-mono">
                          {heldInfo.weightPercent.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* Right: Price + Day Change */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-slate-100 tracking-tight">
                          {quote.price > 0 ? `$${quote.price.toFixed(2)}` : '--'}
                        </span>
                      </div>
                      <span className={clsx(
                        "inline-flex items-center text-xs font-bold px-2 py-1 rounded-md min-w-[64px] justify-center font-mono",
                        isPositiveDay ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                      )}>
                        {quote.percentChange !== 0 ? (
                          <>
                            {isPositiveDay ? '+' : ''}{quote.percentChange.toFixed(2)}%
                          </>
                        ) : (
                          '0.00%'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: INDEX & MARKET BENCHMARKS */}
      {/* ========================================================================= */}
      <div className="bg-[#0B0F17]/95 border border-white/[0.08] rounded-2xl shadow-xl overflow-hidden">
        {/* Section Accordion Header */}
        <button
          onClick={() => toggleSection('indices')}
          className="w-full px-4 py-3.5 flex items-center justify-between bg-[#111726]/60 hover:bg-[#111726]/90 transition-all border-b border-white/[0.06] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-white tracking-wide">Index & Benchmarks</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {INDEX_ITEMS.length} ดัชนี
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Global Market</span>
            <div className="text-slate-400 transition-transform duration-200">
              {collapsed.indices ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* Section Body */}
        {!collapsed.indices && (
          <div className="divide-y divide-white/[0.04]">
            {filteredIndices.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                ไม่พบดัชนีที่ตรงกับคำค้นหา "{searchQuery}"
              </div>
            ) : (
              filteredIndices.map((idx) => {
                const quote = getQuote(idx.symbol);
                const isPositiveDay = quote.percentChange >= 0;

                return (
                  <div
                    key={idx.symbol}
                    onClick={() => onSelectSymbol(idx.symbol)}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.03] active:bg-white/[0.06] transition-all cursor-pointer group"
                  >
                    {/* Left: Flag/Emoji + Symbol */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none shrink-0">{idx.flag}</span>
                      <span className="text-base font-bold text-white tracking-tight font-mono">{idx.symbol}</span>
                    </div>

                    {/* Right: Price + Day Change */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-sm font-bold text-slate-100 tracking-tight">
                          {quote.price > 0 ? (
                            idx.symbol === 'BTC-USD'
                              ? `$${quote.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                              : `$${quote.price.toFixed(2)}`
                          ) : (
                            '--'
                          )}
                        </span>
                      </div>
                      <span className={clsx(
                        "inline-flex items-center text-xs font-bold px-2 py-1 rounded-md min-w-[64px] justify-center font-mono",
                        isPositiveDay ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                      )}>
                        {quote.percentChange !== 0 ? (
                          <>
                            {isPositiveDay ? '+' : ''}{quote.percentChange.toFixed(2)}%
                          </>
                        ) : (
                          '0.00%'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
