import { useEffect, useState, RefObject } from 'react';
import { ISeriesApi, Time } from 'lightweight-charts';
import { api } from '../../../services/api';
import { RawBarItem, isUsMarketOpen } from '../../../types/chart';

export interface UseChartLivePulseProps {
  symbol: string;
  currentPrice: number;
  displayBars: RawBarItem[];
  candleSeriesRef: RefObject<ISeriesApi<'Candlestick'> | null>;
  areaSeriesRef: RefObject<ISeriesApi<'Area'> | null>;
}

export function useChartLivePulse({
  symbol,
  currentPrice,
  displayBars,
  candleSeriesRef,
  areaSeriesRef,
}: UseChartLivePulseProps) {
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(isUsMarketOpen());
  const [livePrice, setLivePrice] = useState<number>(currentPrice);
  const [liveChangePercent, setLiveChangePercent] = useState<number>(0);

  // Sync initial livePrice with currentPrice prop
  useEffect(() => {
    setLivePrice(currentPrice);
  }, [currentPrice, symbol]);

  useEffect(() => {
    let isMounted = true;
    let timer: any = null;

    const pollLiveQuote = async () => {
      // 1. Check tab visibility
      if (document.visibilityState !== 'visible') {
        setIsLiveActive(false);
        return;
      }

      // 2. Check US market hours
      const marketOpen = isUsMarketOpen();
      setIsMarketOpen(marketOpen);

      if (!marketOpen) {
        setIsLiveActive(false);
        return;
      }

      setIsLiveActive(true);

      try {
        const res: any = await api.prices.latest([symbol]);
        const quote = res?.[symbol];

        if (quote && quote.price && isMounted) {
          const newPrice = Number(quote.price);
          setLivePrice(newPrice);
          setLiveChangePercent(quote.percent_change ?? 0);

          // Update the last candle in real-time
          if (candleSeriesRef.current && displayBars.length > 0) {
            const lastBar = displayBars[displayBars.length - 1];
            const updatedHigh = Math.max(lastBar.high, newPrice);
            const updatedLow = Math.min(lastBar.low, newPrice);

            candleSeriesRef.current.update({
              time: lastBar.time as Time,
              open: lastBar.open,
              high: updatedHigh,
              low: updatedLow,
              close: newPrice,
            });

            if (areaSeriesRef.current) {
              areaSeriesRef.current.update({
                time: lastBar.time as Time,
                value: newPrice,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[LWChart] Live pulse failed:', err);
      }
    };

    // Run pulse immediately
    pollLiveQuote();

    // Heartbeat every 30s
    timer = setInterval(pollLiveQuote, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollLiveQuote();
      } else {
        setIsLiveActive(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [symbol, displayBars, candleSeriesRef, areaSeriesRef]);

  return {
    isLiveActive,
    isMarketOpen,
    livePrice,
    liveChangePercent,
  };
}
