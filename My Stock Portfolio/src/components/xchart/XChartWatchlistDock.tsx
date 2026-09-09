import React, { useState, useEffect } from 'react';
import { useXChartStore } from '../../stores/xchartStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { api } from '../../services/api';
import { 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  TrendingUp, 
  TrendingDown, 
  Coins,
  Sparkles,
  Flame,
  Clock
} from 'lucide-react';
import clsx from 'clsx';

interface WatchlistStockItem {
  symbol: string;
  name?: string;
  price: number;
  percentChange: number;
  banker?: number;
  trafficLight?: 'BUY_ZONE' | 'WAIT' | 'DANGER';
}

export const XChartWatchlistDock: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    watchlistCollapsed, 
    toggleWatchlist, 
    changeSymbolOnActiveTab,
    addTab 
  } = useXChartStore();
  const { activePortfolioId } = usePortfolioStore();

  const [stocks, setStocks] = useState<WatchlistStockItem[]>([]);
  const [usdtRate, setUsdtRate] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Identify the currently active tab's symbol
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSymbol = activeTab?.symbol || 'VRT';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // 1. Try fetching Project 2X radar if portfolioId exists
        if (activePortfolioId) {
          try {
            const radarData = await api.project2x.scan(activePortfolioId);
            if (radarData?.rows && radarData.rows.length > 0) {
              const mapped = radarData.rows.map((r: any) => ({
                symbol: r.symbol,
                name: r.symbol,
                price: r.currentPrice,
                percentChange: r.sparkline?.closes && r.sparkline.closes.length > 1
                  ? Number((((r.currentPrice - r.sparkline.closes[r.sparkline.closes.length - 2]) / r.sparkline.closes[r.sparkline.closes.length - 2]) * 100).toFixed(2))
                  : 0,
                banker: r.banker,
                trafficLight: r.traffic_light
              }));
              setStocks(mapped);
            }
          } catch (e) {
            console.warn('[XChartWatchlistDock] Radar fetch failed, falling back to market quotes:', e);
          }
        }

        // 2. Fallback / supplementary from market watchlist
        if (stocks.length === 0) {
          const res = await api.market.heatmap('watchlist');
          if (res?.items && res.items.length > 0) {
            setStocks(res.items);
          }
        }

        // 3. Fetch USD/THB rate
        try {
          const chartRes = await api.chart.get('THB=X', 10);
          if (chartRes?.currentPrice) {
            setUsdtRate(chartRes.currentPrice);
          }
        } catch {
          // ignore forex error
        }
      } catch (err) {
        console.warn('[XChartWatchlistDock] Watchlist load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activePortfolioId]);

  const handleStockClick = (symbol: string, isCurrency = false) => {
    if (activeTab?.type === 'HEATMAP') {
      addTab({
        type: isCurrency ? 'CURRENCY' : 'STOCK',
        symbol,
        title: isCurrency ? 'USD/THB' : symbol
      });
    } else {
      changeSymbolOnActiveTab(symbol, isCurrency ? 'USD/THB' : symbol);
    }
  };

  const filteredStocks = stocks.filter((s) =>
    s.symbol.toLowerCase().includes(search.toLowerCase())
  );

  // Active stock detail summary
  const activeStockItem = stocks.find((s) => s.symbol === activeSymbol);

  if (watchlistCollapsed) {
    return (
      <div className="w-12 bg-[#0F111A] border-l border-[#1F2233] flex flex-col items-center py-4 select-none shrink-0 justify-between">
        <button
          onClick={toggleWatchlist}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Expand Watchlist Dock"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="rotate-90 text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap origin-center">
          Watchlist
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
    );
  }

  return (
    <aside className="w-80 bg-[#0F111A] border-l border-[#1F2233] flex flex-col h-full select-none shrink-0">
      {/* Dock Header */}
      <div className="p-3 border-b border-[#1F2233] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white font-heading">Watchlist Dock</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
            {stocks.length}
          </span>
        </div>
        <button
          onClick={toggleWatchlist}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title="Collapse Watchlist"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-[#1F2233]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาหุ้นในลิสต์..."
            className="w-full bg-[#0B1220] border border-[#1F2233] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Macro & Currency Quick Pin */}
      <div className="px-3 py-2 bg-[#121622] border-b border-[#1F2233]">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Macro & FX (ค่าเงิน)
        </div>
        <div
          onClick={() => handleStockClick('THB=X', true)}
          className={clsx(
            'flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer',
            activeSymbol === 'THB=X'
              ? 'bg-purple-600/20 border-purple-500/50 text-white'
              : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-200'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">USD / THB</div>
              <div className="text-[11px] text-slate-400">อัตราแลกเปลี่ยนดอลลาร์</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-white">
              {usdtRate ? `฿${usdtRate.toFixed(2)}` : '฿35.80'}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold">Live Forex</div>
          </div>
        </div>
      </div>

      {/* Stock List Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#1F2233]/40">
        {filteredStocks.map((stock) => {
          const isSelected = activeSymbol === stock.symbol;
          const isPositive = stock.percentChange >= 0;

          return (
            <div
              key={stock.symbol}
              onClick={() => handleStockClick(stock.symbol)}
              className={clsx(
                'px-3.5 py-2.5 flex items-center justify-between transition-all cursor-pointer',
                isSelected
                  ? 'bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-transparent border-l-4 border-l-purple-500 text-white'
                  : 'hover:bg-white/5 text-slate-300 hover:text-white'
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* Traffic light or status dot */}
                <div
                  className={clsx(
                    'w-2 h-2 rounded-full shrink-0',
                    stock.trafficLight === 'BUY_ZONE'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : stock.trafficLight === 'DANGER'
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  )}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold font-heading text-white">{stock.symbol}</span>
                    {stock.banker !== undefined && stock.banker >= 10 && (
                      <span className="flex items-center text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1 rounded">
                        <Flame className="w-2.5 h-2.5 mr-0.5" />
                        {stock.banker.toFixed(0)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[120px]">
                    {stock.trafficLight === 'BUY_ZONE' ? 'Setup พร้อมช้อน' : 'Watchlist'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-white font-heading">
                  ${stock.price?.toFixed(2) || '0.00'}
                </div>
                <div
                  className={clsx(
                    'text-xs font-semibold flex items-center justify-end gap-0.5',
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {isPositive ? `+${stock.percentChange?.toFixed(2)}%` : `${stock.percentChange?.toFixed(2)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Quote Details Card */}
      {activeStockItem && (
        <div className="p-3 bg-[#121622] border-t border-[#1F2233] shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-heading">
              Active Focus
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Real-time
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-lg font-black text-white font-heading">
              {activeStockItem.symbol}
            </div>
            <div className="text-base font-black text-white font-heading">
              ${activeStockItem.price?.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">1D Change:</span>
            <span className={activeStockItem.percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {activeStockItem.percentChange >= 0 ? `+${activeStockItem.percentChange}%` : `${activeStockItem.percentChange}%`}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
