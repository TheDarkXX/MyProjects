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
        const height = 340;

        chart = createChart(container, {
          width,
          height,
          layout: {
            background: { type: ColorType.Solid, color: '#0B0F1A' },
            textColor: '#CBD5E1',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          grid: {
            vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
            horzLines: { color: 'rgba(30, 41, 59, 0.4)' }
          },
          crosshair: {
            mode: CrosshairMode.Normal,
            vertLine: { color: '#06B6D4', width: 1, style: LineStyle.Dashed },
            horzLine: { color: '#06B6D4', width: 1, style: LineStyle.Dashed }
          },
          rightPriceScale: {
            borderColor: '#334155',
            scaleMargins: { top: 0.1, bottom: 0.25 }
          },
          timeScale: {
            borderColor: '#334155',
            timeVisible: true,
            secondsVisible: false
          }
        });

        chartRef.current = chart;

        // 1. Candlestick Series (v5 API uses addSeries)
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10B981',
          downColor: '#EF4444',
          borderVisible: false,
          wickUpColor: '#10B981',
          wickDownColor: '#EF4444'
        });
        candleSeries.setData(formattedCandles);

        // 2. Cost Basis Line (if owned)
        if (avgCost > 0) {
          candleSeries.createPriceLine({
            price: avgCost,
            color: '#F59E0B',
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
            color: '#38BDF8',
            lineWidth: 2,
            title: 'EMA 50'
          });
          s50.setData(ema50Data);
        }

        if (ema150Data.length > 0) {
          const s150 = chart.addSeries(LineSeries, {
            color: '#F59E0B',
            lineWidth: 2,
            title: 'EMA 150'
          });
          s150.setData(ema150Data);
        }

        if (ema200Data.length > 0) {
          const s200 = chart.addSeries(LineSeries, {
            color: '#A855F7',
            lineWidth: 2,
            title: 'EMA 200'
          });
          s200.setData(ema200Data);
        }

        // 4. Volume Histogram Series at bottom
        const volumeSeries = chart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });
        volumeSeries.setData(formattedCandles.map(c => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'
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
    <div className={`relative bg-[#0B0F1A] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between ${className}`}>
      {/* Top Header & Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Tactical Pro Chart ({symbol})
          </h4>
          <span className="px-2 py-0.5 rounded text-[13px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
            1D Candle
          </span>
        </div>

        {/* Legend Pills */}
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> EMA 50
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> EMA 150
          </span>
          <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> EMA 200
          </span>
          {avgCost > 0 && (
            <span className="flex items-center gap-1.5 text-yellow-300 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> ต้นทุน: ${avgCost.toFixed(2)}
            </span>
          )}
          {bankerFlow > 0 && (
            <span className="flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
              🔥 Banker Flow: {bankerFlow.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative w-full h-[340px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B0F1A]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              กำลังโหลดกราฟเทคนิค {symbol}...
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full rounded-xl overflow-hidden" />
      </div>

      {/* Bottom Status & Setup Bar */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[13px] text-slate-300">
        <div>
          ราคาล่าสุด: <span className="text-slate-100 font-bold font-mono">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="text-slate-400">
          คำแนะนำ: ย่อแตะ EMA 50/150 ไม่หลุด = <span className="text-emerald-400 font-bold">จุดซื้อเพิ่ม</span> | หลุด EMA 200 = <span className="text-rose-400 font-bold">ตัดความเสี่ยง</span>
        </div>
      </div>
    </div>
  );
};
