import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../services/api';
import { LWChart } from '../project2x/LWChart';
import { useXChartStore } from '../../stores/xchartStore';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface XChartPanelProps {
  symbol: string;
  tabId: string;
}

interface ChartApiResponse {
  symbol: string;
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

export const XChartPanel: React.FC<XChartPanelProps> = ({ symbol, tabId }) => {
  const { changeSymbolOnActiveTab } = useXChartStore();
  const [data, setData] = useState<ChartApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.chart.get(sym, 3650);
      setData(res);
    } catch (err: any) {
      console.error(`[XChartPanel] Failed to load chart data for ${sym}:`, err);
      setError(err.message || `Failed to load chart data for ${sym}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChartData(symbol);
  }, [symbol, fetchChartData]);

  if (loading && !data) {
    return (
      <div className="flex-1 w-full h-full bg-[#111418] flex flex-col items-center justify-center p-8 select-none">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#1F2233] border-t-purple-500 animate-spin" />
          <div className="absolute font-bold text-xs text-purple-400 font-heading">XC</div>
        </div>
        <div className="mt-4 text-sm font-semibold text-slate-200">กำลังโหลดข้อมูลกราฟ {symbol}...</div>
        <div className="text-xs text-slate-400 mt-1">OHLCV 10 ปี + EMA Ribbon + MCDX Indicators</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex-1 w-full h-full bg-[#111418] flex flex-col items-center justify-center p-8 select-none">
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="text-base font-bold text-white mb-1">ไม่สามารถโหลดข้อมูล {symbol} ได้</div>
        <div className="text-xs text-slate-300 max-w-md text-center mb-4">{error}</div>
        <button
          onClick={() => fetchChartData(symbol)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          ลองใหม่อีกครั้ง (Retry)
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative bg-[#111418] min-h-0">
      <LWChart
        symbol={data.symbol}
        dates={data.dates}
        opens={data.opens}
        highs={data.highs}
        lows={data.lows}
        closes={data.closes}
        volumes={data.volumes}
        ema50={data.ema50}
        ema150={data.ema150}
        ema200={data.ema200}
        bankerSeries={data.bankerSeries}
        hotMoneySeries={data.hotMoneySeries}
        retailSeries={data.retailSeries}
        bankerMaSeries={data.bankerMaSeries}
        currentPrice={data.currentPrice}
        className="w-full h-full flex-1"
        onSelectSymbol={(newSym) => changeSymbolOnActiveTab(newSym)}
      />
    </div>
  );
};
