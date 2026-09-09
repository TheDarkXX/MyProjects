import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useXChartStore } from '../../stores/xchartStore';
import { 
  LayoutGrid, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

interface HeatmapItem {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  percentChange: number;
  marketCap: number;
}

interface HeatmapResponse {
  scope: string;
  cached: boolean;
  cacheAgeSeconds: number;
  lastUpdated: string;
  items: HeatmapItem[];
}

export const MarketHeatmap: React.FC = () => {
  const { addTab } = useXChartStore();
  const [scope, setScope] = useState<'top50' | 'watchlist'>('top50');
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  const fetchHeatmap = async (targetScope: 'top50' | 'watchlist') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.market.heatmap(targetScope);
      setData(res);
    } catch (err: any) {
      console.error('[MarketHeatmap] Failed to fetch heatmap:', err);
      setError(err.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap(scope);
  }, [scope]);

  // Group items by sector
  const sectors = useMemo(() => {
    if (!data?.items) return [];
    const set = new Set<string>();
    data.items.forEach((item) => set.add(item.sector || 'Other'));
    return Array.from(set).sort();
  }, [data?.items]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (selectedSector === 'ALL') return data.items;
    return data.items.filter((item) => item.sector === selectedSector);
  }, [data?.items, selectedSector]);

  const groupedBySector = useMemo(() => {
    const map = new Map<string, HeatmapItem[]>();
    filteredItems.forEach((item) => {
      const sec = item.sector || 'Other';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(item);
    });
    return map;
  }, [filteredItems]);

  // Overall market breath stats
  const stats = useMemo(() => {
    if (!data?.items || data.items.length === 0) return { advance: 0, decline: 0, flat: 0, avgChg: 0 };
    let advance = 0;
    let decline = 0;
    let flat = 0;
    let sum = 0;
    data.items.forEach((i) => {
      sum += i.percentChange;
      if (i.percentChange > 0.05) advance++;
      else if (i.percentChange < -0.05) decline++;
      else flat++;
    });
    return {
      advance,
      decline,
      flat,
      avgChg: Number((sum / data.items.length).toFixed(2))
    };
  }, [data?.items]);

  const getTileBg = (pct: number) => {
    if (pct >= 3.0) return 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-400/40 text-white';
    if (pct >= 1.5) return 'bg-emerald-700/80 hover:bg-emerald-600 border-emerald-500/30 text-white';
    if (pct > 0.1) return 'bg-emerald-900/60 hover:bg-emerald-800 border-emerald-600/20 text-slate-100';
    if (pct <= -3.0) return 'bg-rose-700/90 hover:bg-rose-600 border-rose-400/40 text-white';
    if (pct <= -1.5) return 'bg-rose-800/80 hover:bg-rose-700 border-rose-500/30 text-white';
    if (pct < -0.1) return 'bg-rose-950/70 hover:bg-rose-900 border-rose-600/20 text-slate-100';
    return 'bg-[#1E222D] hover:bg-[#2A2E45] border-[#2A2E45] text-slate-200';
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0B1220] overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="bg-[#0F111A] border-b border-[#1F2233] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white font-heading">Market Heatmap</h2>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white/10 text-slate-200 border border-white/5">
                {scope === 'top50' ? 'S&P 500 Mega-Cap Top 50' : 'Project 2X Watchlist'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              คลิกหุ้นใดก็ได้เพื่อเปิดแท็บดูกราฟแบบเต็มจอทันที
            </p>
          </div>
        </div>

        {/* Filter and Stats Bar */}
        <div className="flex items-center gap-3">
          {/* Market Breadth Pills */}
          <div className="hidden md:flex items-center gap-2 bg-[#111418] px-3 py-1.5 rounded-xl border border-[#1F2233] text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" /> {stats.advance}
            </span>
            <span className="text-slate-500">|</span>
            <span className="flex items-center gap-1 text-rose-400">
              <TrendingDown className="w-3.5 h-3.5" /> {stats.decline}
            </span>
            <span className="text-slate-500">|</span>
            <span className={stats.avgChg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              Avg: {stats.avgChg >= 0 ? `+${stats.avgChg}%` : `${stats.avgChg}%`}
            </span>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center bg-[#111418] p-1 rounded-xl border border-[#1F2233]">
            <button
              onClick={() => setScope('top50')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                scope === 'top50'
                  ? 'bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              S&P Top 50
            </button>
            <button
              onClick={() => setScope('watchlist')}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                scope === 'watchlist'
                  ? 'bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              )}
            >
              Watchlist
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchHeatmap(scope)}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Quotes"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Sector Filter Chips */}
      <div className="bg-[#0D1017] border-b border-[#1F2233] px-6 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
        <button
          onClick={() => setSelectedSector('ALL')}
          className={clsx(
            'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
            selectedSector === 'ALL'
              ? 'bg-white/15 text-white border border-white/20'
              : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          ทั้งหมด ({data?.items?.length || 0})
        </button>
        {sectors.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSector(sec)}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
              selectedSector === sec
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'
            )}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Main Heatmap Grid Area */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {loading && !data && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-sm font-semibold text-slate-300">กำลังสแกนและจัดกลุ่มราคาตลาดแบบ Bulk...</span>
          </div>
        )}

        {error && !data && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <span className="text-rose-400 text-sm font-bold mb-2">โหลด Heatmap ล้มเหลว</span>
            <span className="text-xs text-slate-400 mb-4">{error}</span>
            <button
              onClick={() => fetchHeatmap(scope)}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {Array.from(groupedBySector.entries()).map(([sectorName, items]) => (
              <div key={sectorName} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-heading">
                      {sectorName}
                    </h3>
                    <span className="text-xs text-slate-500 font-semibold">({items.length} หุ้น)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {items.map((item) => {
                    const isPositive = item.percentChange >= 0;
                    return (
                      <div
                        key={item.symbol}
                        onClick={() => addTab({ type: 'STOCK', symbol: item.symbol, title: item.symbol })}
                        className={clsx(
                          'p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-150 cursor-pointer shadow-sm hover:scale-[1.02] hover:shadow-lg relative overflow-hidden group',
                          getTileBg(item.percentChange)
                        )}
                        title={`เปิดดูกราฟ ${item.symbol} (${item.name})`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-base font-black tracking-tight font-heading leading-tight">
                              {item.symbol}
                            </div>
                            <div className="text-xs text-slate-200/90 truncate max-w-[110px] mt-0.5">
                              {item.name}
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="mt-3 flex items-baseline justify-between">
                          <div className="text-sm font-bold">${item.price.toFixed(2)}</div>
                          <div className="text-xs font-black tracking-wide">
                            {isPositive ? `+${item.percentChange.toFixed(2)}%` : `${item.percentChange.toFixed(2)}%`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
