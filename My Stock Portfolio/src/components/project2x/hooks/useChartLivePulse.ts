import { useEffect, useState, RefObject } from 'react';
import { ISeriesApi, Time } from 'lightweight-charts';
import { api } from '../../../services/api';
import { RawBarItem, isUsMarketOpen } from '../../../types/chart';
import { usePriceStore } from '../../../stores/priceStore';

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
  const isCryptoOrForex = symbol.includes('-USD') || symbol.includes('=X') || symbol.includes('/');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(isCryptoOrForex || isUsMarketOpen());
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

      // 2. Check market status
      const marketOpen = isCryptoOrForex || isUsMarketOpen();
      setIsMarketOpen(marketOpen);

      setIsLiveActive(true);

      try {
        const symKey = symbol.trim().toUpperCase();
        const res: any = await api.prices.quoteBatch([symKey]);
        const quote = res?.[symKey];

        if (quote && quote.price != null && isMounted) {
          const newPrice = Number(quote.price);
          setLivePrice(newPrice);
          setLiveChangePercent(quote.percentChange ?? quote.percent_change ?? 0);

          // Update usePriceStore in real-time for Watchlist/HUD sync
          usePriceStore.setState((state) => ({
            prices: {
              ...state.prices,
              [symKey]: {
                price: newPrice,
                change: quote.change ?? 0,
                percent_change: quote.percentChange ?? quote.percent_change ?? 0,
              },
            },
            lastUpdated: new Date(),
          }));

          // Update or Append today's live candle in real-time
          if (candleSeriesRef.current && displayBars.length > 0) {
            const lastBar = displayBars[displayBars.length - 1];
            // Format NY market date (YYYY-MM-DD)
            const nyMarketDate = quote.marketDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            const lastBarTimeStr = String(lastBar.time);

            if (lastBarTimeStr === nyMarketDate) {
              // Today's candle already exists in displayBars -> Update in-place
              const updatedHigh = Math.max(lastBar.high, quote.dayHigh ?? newPrice, newPrice);
              const updatedLow = Math.min(lastBar.low, quote.dayLow ?? newPrice, newPrice);

              candleSeriesRef.current.update({
                time: nyMarketDate as Time,
                open: lastBar.open,
                high: updatedHigh,
                low: updatedLow,
                close: newPrice,
              });

              if (areaSeriesRef.current) {
                areaSeriesRef.current.update({
                  time: nyMarketDate as Time,
                  value: newPrice,
                });
              }
            } else if (nyMarketDate > lastBarTimeStr) {
              // Today's candle is not yet in displayBars -> Append today's live bar!
              const candleOpen = quote.open != null ? Number(quote.open) : newPrice;
              const updatedHigh = Math.max(quote.dayHigh ?? newPrice, newPrice, candleOpen);
              const updatedLow = Math.min(quote.dayLow ?? newPrice, newPrice, candleOpen);

              candleSeriesRef.current.update({
                time: nyMarketDate as Time,
                open: candleOpen,
                high: updatedHigh,
                low: updatedLow,
                close: newPrice,
              });

              if (areaSeriesRef.current) {
                areaSeriesRef.current.update({
                  time: nyMarketDate as Time,
                  value: newPrice,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[LWChart] Live pulse failed:', err);
      }
    };

    // Run pulse immediately
    pollLiveQuote();

    // Fast heartbeat (12s) when market is open or crypto/forex, 60s when closed
    const pollInterval = (isCryptoOrForex || isUsMarketOpen()) ? 12000 : 60000;
    timer = setInterval(pollLiveQuote, pollInterval);

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
  }, [symbol, displayBars, candleSeriesRef, areaSeriesRef, isCryptoOrForex]);

  return {
    isLiveActive,
    isMarketOpen,
    livePrice,
    liveChangePercent,
  };
}
