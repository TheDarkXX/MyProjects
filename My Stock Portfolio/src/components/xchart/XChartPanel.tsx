import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { LWChart, Resolution, PortfolioOverlayConfig } from '../project2x/LWChart';
import { useXChartStore } from '../../stores/xchartStore';
import { RefreshCw, AlertCircle } from 'lucide-react';

import { getCachedCandles, setCachedCandles } from '../../utils/chartIdbCache';

interface XChartPanelProps {
  symbol: string;
  tabId: string;
  portfolioOverlay?: PortfolioOverlayConfig;
}

interface ChartApiResponse {
  symbol: string;
  resolution?: string;
  dates: string[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
  ema50: (number | null)[];
  ema150: (number | null)[];
  ema200: (number | null)[];
  bankerSeries: number[];
  hotMoneySeries: number[];
  retailSeries: number[];
  bankerMaSeries: number[];
  currentPrice: number;
  change: number;
  percentChange: number;
  lastUpdated: string;
}

export const XChartPanel: React.FC<XChartPanelProps> = ({ symbol, tabId, portfolioOverlay }) => {
  const { changeSymbolOnActiveTab, tabs, updateTab } = useXChartStore();
  const currentTab = tabs.find(t => t.id === tabId);
  const activeResolution: Resolution = (currentTab?.resolution as Resolution) || '1D';

  const [cacheByRes, setCacheByRes] = useState<Record<string, ChartApiResponse>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKey = `${symbol}_${activeResolution === '4H' ? '4H' : '1D'}`;
  const currentData = cacheByRes[fetchKey] || null;

  const fetchChartData = useCallback(async (sym: string, res: Resolution) => {
    if (!sym) return;
    const reqRes = res === '4H' ? '4H' : '1D';
    const key = `${sym}_${reqRes}`;

    // 1. If already in React state cache, return immediately
    if (cacheByRes[key]) {
      setLoading(false);
      return;
    }

    // 2. Check IndexedDB persistent local cache for instant snappy load
    try {
      const idbData = await getCachedCandles<ChartApiResponse>(sym, reqRes);
      if (idbData && idbData.closes && idbData.closes.length > 0) {
        setCacheByRes(prev => ({ ...prev, [key]: idbData }));
        setLoading(false);
        // Continue to background revalidate with fresh API data
      } else {
        setLoading(true);
      }
    } catch (e) {
      setLoading(true);
    }

    setError(null);
    try {
      const result = await api.chart.get(sym, 36500, reqRes);
      setCacheByRes(prev => ({ ...prev, [key]: result }));
      // Save to IndexedDB for next time
      setCachedCandles(sym, reqRes, result);
    } catch (err: any) {
      console.error(`[XChartPanel] Failed to load chart data for ${sym} (${reqRes}):`, err);
      if (!cacheByRes[key]) {
        setError(err.message || `Failed to load chart data for ${sym}`);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheByRes]);

  useEffect(() => {
    fetchChartData(symbol, activeResolution);
  }, [symbol, activeResolution, fetchChartData]);

  const handleResolutionChange = (newRes: Resolution) => {
    updateTab(tabId, { resolution: newRes });
  };

  if (loading && !currentData) {
    return (
      <div className="flex-1 w-full h-full bg-[#111418] flex flex-col items-center justify-center p-8 select-none">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#1F2233] border-t-purple-500 animate-spin" />
          <div className="absolute font-bold text-xs text-purple-400 font-heading">XC</div>
        </div>
        <div className="mt-4 text-sm font-semibold text-slate-200">
          กำลังโหลดข้อมูลกราฟ {symbol} ({activeResolution})...
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {activeResolution === '4H'
            ? 'OHLCV 4-Hour (2-Year Lookback) + EMA Ribbon + MCDX'
            : 'OHLCV Max Lifetime (All-Time IPO) + EMA Ribbon + MCDX Indicators'}
        </div>
      </div>
    );
  }

  if (error && !currentData) {
    return (
      <div className="flex-1 w-full h-full bg-[#111418] flex flex-col items-center justify-center p-8 select-none">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="text-base font-bold text-white mb-1">ไม่สามารถโหลดข้อมูล {symbol} ได้</div>
        <div className="text-xs text-slate-300 max-w-md text-center mb-4">{error}</div>
        <button
          onClick={() => fetchChartData(symbol, activeResolution)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          ลองใหม่อีกครั้ง (Retry)
        </button>
      </div>
    );
  }

  const handleToggleFullscreen = useCallback(() => {
    const target = document.getElementById('xchart-terminal-container');
    if (!document.fullscreenElement) {
      target?.requestFullscreen?.().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  }, []);

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative bg-[#111418] min-h-0">
      <LWChart
        symbol={currentData.symbol}
        dates={currentData.dates}
        opens={currentData.opens}
        highs={currentData.highs}
        lows={currentData.lows}
        closes={currentData.closes}
        volumes={currentData.volumes}
        ema50={currentData.ema50}
        ema150={currentData.ema150}
        ema200={currentData.ema200}
        bankerSeries={currentData.bankerSeries}
        hotMoneySeries={currentData.hotMoneySeries}
        retailSeries={currentData.retailSeries}
        bankerMaSeries={currentData.bankerMaSeries}
        currentPrice={currentData.currentPrice}
        resolution={activeResolution}
        onResolutionChange={handleResolutionChange}
        className="w-full h-full flex-1"
        onSelectSymbol={(newSym) => changeSymbolOnActiveTab(newSym)}
        portfolioOverlay={portfolioOverlay}
        onToggleFullscreen={handleToggleFullscreen}
      />
    </div>
  );
};
