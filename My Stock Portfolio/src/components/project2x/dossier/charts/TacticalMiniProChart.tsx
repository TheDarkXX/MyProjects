import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle
} from 'lightweight-charts';
import { api } from '../../../../services/api';

interface TacticalMiniProChartProps {
  symbol: string;
  currentPrice: number;
  avgCost?: number;
  ema50?: number | null;
  ema150?: number | null;
  ema200?: number | null;
  bankerFlow?: number;
  className?: string;
}

export const TacticalMiniProChart: React.FC<TacticalMiniProChartProps> = ({
  symbol,
  currentPrice,
  avgCost = 0,
  ema50,
  ema150,
  ema200,
  bankerFlow = 0,
  className = ''
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [candlesCount, setCandlesCount] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current || !symbol) return;

    let isMounted = true;
    let chart: IChartApi | null = null;

    const initChart = async () => {
      try {
        setIsLoading(true);

        // Fetch daily candles for the last 1 year (365 days)
        const candleData = await api.chart.get(symbol, 365, '1D');
        if (!isMounted || !candleData || !Array.isArray(candleData) || candleData.length === 0) {
          setIsLoading(false);
          return;
        }

        // Format and sort candles
        const formattedCandles = candleData
          .filter((c: any) => c.close != null && c.open != null && c.date && !isNaN(Number(c.close)) && !isNaN(Number(c.open)))
          .map((c: any) => ({
            time: String(c.date).split('T')[0],
            open: Number(c.open),
            high: Number(c.high || Math.max(c.open, c.close)),
            low: Number(c.low || Math.min(c.open, c.close)),
            close: Number(c.close),
            volume: Number(c.volume || 0)
          }))
          .filter((c: any) => !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close) && c.high >= c.low)
          .sort((a, b) => (a.time > b.time ? 1 : -1));

        if (!chartContainerRef.current) return;

        // Dispose previous chart if any
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const container = chartContainerRef.current;
        const width = container.clientWidth || 600;
        const height = 400;

        chart = createChart(container, {
          width,
          height,
          layout: {
            background: { type: ColorType.Solid, color: '#060A16' },
            textColor: '#FFFFFF',
            fontSize: 13,
            fontFamily: 'monospace'
          },
          grid: {
            vertLines: { color: 'rgba(30, 58, 110, 0.25)' },
            horzLines: { color: 'rgba(30, 58, 110, 0.25)' }
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: '#60A5FA', width: 1, style: LineStyle.Dashed },
            horzLine: { color: '#60A5FA', width: 1, style: LineStyle.Dashed }
          },
          timeScale: {
            borderColor: '#1E293B',
            timeVisible: true,
            secondsVisible: false
          }
        });

        chartRef.current = chart;

        // 1. Candlestick Series (Institutional Blue & Deep Red)
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#3B82F6',
          downColor: '#DC2626',
          borderVisible: true,
          borderUpColor: '#3B82F6',
          borderDownColor: '#DC2626',
          wickUpColor: '#3B82F6',
          wickDownColor: '#DC2626'
        });
        candleSeries.setData(formattedCandles);

        // 2. Cost Basis Line (if owned)
        if (avgCost > 0) {
          candleSeries.createPriceLine({
            price: avgCost,
            color: '#94A3B8',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `ต้นทุนเรา $${avgCost.toFixed(2)}`
          });
        }

        // 3. Calculate and Add EMAs (50, 150, 200)
        const calcEMA = (data: typeof formattedCandles, period: number) => {
          if (data.length < period) return [];
          const k = 2 / (period + 1);
          let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
          const result: Array<{ time: string; value: number }> = [];
          for (let i = period - 1; i < data.length; i++) {
            ema = (data[i].close * k) + (ema * (1 - k));
            result.push({ time: data[i].time, value: Number(ema.toFixed(2)) });
          }
          return result;
        };

        const ema50Data = calcEMA(formattedCandles, 50);
        const ema150Data = calcEMA(formattedCandles, 150);
        const ema200Data = calcEMA(formattedCandles, 200);

        if (ema50Data.length > 0) {
          const s50 = chart.addSeries(LineSeries, {
            color: '#60A5FA',
            lineWidth: 2,
            title: 'EMA 50'
          });
          s50.setData(ema50Data);
        }

        if (ema150Data.length > 0) {
          const s150 = chart.addSeries(LineSeries, {
            color: '#818CF8',
            lineWidth: 2,
            title: 'EMA 150'
          });
          s150.setData(ema150Data);
        }

        if (ema200Data.length > 0) {
          const s200 = chart.addSeries(LineSeries, {
            color: '#C084FC',
            lineWidth: 2,
            title: 'EMA 200'
          });
          s200.setData(ema200Data);
        }

        // 4. Volume Histogram Series at bottom
        const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#3B82F6',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeries.setData(formattedCandles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(59, 130, 246, 0.45)' : 'rgba(220, 38, 38, 0.45)'
        })));

        chart.timeScale().fitContent();
        setCandlesCount(formattedCandles.length);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[TacticalMiniProChart] Init error:', err.message);
        if (isMounted) setIsLoading(false);
      }
    };

    initChart();

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, avgCost]);

  return (
    <div className={`relative bg-[#0B1226]/95 border border-blue-900/50 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md ${className}`}>
      {/* Top Header & Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider">
            Tactical Pro Chart ({symbol})
          </h4>
          <span className="px-2 py-0.5 rounded text-[13px] font-mono font-bold bg-[#060A16] border border-blue-900/60 text-blue-300">
            1D Candle
          </span>
        </div>

        {/* Legend Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="flex items-center gap-1.5 text-blue-300 font-bold bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> EMA 50
          </span>
          <span className="flex items-center gap-1.5 text-indigo-300 font-bold bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/30">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> EMA 150
          </span>
          <span className="flex items-center gap-1.5 text-purple-300 font-bold bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> EMA 200
          </span>
          {avgCost > 0 && (
            <span className="flex items-center gap-1.5 text-slate-200 font-black bg-slate-800/80 px-2 py-0.5 rounded border border-slate-600/50">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" /> ทุน: ${avgCost.toFixed(2)}
            </span>
          )}
          {bankerFlow > 0 && (
            <span className="flex items-center gap-1 text-rose-300 font-black bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
              🔥 Banker: {bankerFlow.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative w-full h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#060A16]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-300 text-sm font-bold">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              กำลังโหลดกราฟเทคนิค {symbol}...
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full rounded-xl overflow-hidden border border-blue-950/80" />
      </div>

      {/* Bottom Status & Setup Bar (Visual Badges, Zero Fluff) */}
      <div className="mt-2.5 pt-2.5 border-t border-blue-900/40 flex flex-wrap items-center justify-between gap-2 text-[13px] text-white">
        <div className="flex items-center gap-2">
          <span className="text-slate-200 font-semibold">ราคาล่าสุด:</span>
          <span className="text-white font-black font-mono text-sm">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          {ema50 && (
            <span className={`px-2.5 py-0.5 rounded-md font-black text-[13px] ${currentPrice >= ema50 ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
              {currentPrice >= ema50 ? '⚡ เหนือ EMA 50' : '🔴 ใต้ EMA 50'}
            </span>
          )}
          {ema200 && (
            <span className={`px-2.5 py-0.5 rounded-md font-black text-[13px] ${currentPrice >= ema200 ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40' : 'bg-rose-500/30 text-rose-200 border border-rose-500/60 animate-pulse'}`}>
              {currentPrice >= ema200 ? '🛡️ เหนือ EMA 200' : '🚨 หลุด EMA 200'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
