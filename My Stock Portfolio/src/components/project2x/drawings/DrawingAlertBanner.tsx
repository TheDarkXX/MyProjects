import React, { useState, useEffect } from 'react';
import { Bell, TrendingUp, TrendingDown, X } from 'lucide-react';
import { PriceAlertEventDetail } from '../../../utils/drawingAlerts';

export const DrawingAlertBanner: React.FC = () => {
  const [activeAlert, setActiveAlert] = useState<PriceAlertEventDetail | null>(null);

  useEffect(() => {
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent<PriceAlertEventDetail>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
      }
    };

    window.addEventListener('chart-price-alert', handleAlert);
    return () => window.removeEventListener('chart-price-alert', handleAlert);
  }, []);

  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const isUp = activeAlert.direction === 'up';

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-[#1E222D]/95 border border-slate-600/80 rounded-xl shadow-2xl backdrop-blur-md select-none animate-in fade-in slide-in-from-top-3 duration-200">
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-full ${
          isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        }`}
      >
        {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-[13px] flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            PRICE ALERT TRIGGERED
          </span>
          {activeAlert.symbol && (
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-200 text-[13px] font-mono rounded">
              {activeAlert.symbol}
            </span>
          )}
        </div>
        <span className="text-slate-200 text-[13px]">
          Price crossed <strong>{activeAlert.text}</strong> ({activeAlert.price.toFixed(2)} THB){' '}
          <span className={isUp ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {isUp ? '↗ Breakout' : '↘ Breakdown'}
          </span>
        </span>
      </div>

      <button
        onClick={() => setActiveAlert(null)}
        className="ml-2 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
