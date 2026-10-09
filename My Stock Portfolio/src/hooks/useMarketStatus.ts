import { useState, useEffect } from 'react';

export interface MarketStatusInfo {
  isOpen: boolean;
  isCountdown: boolean;
  isUrgent: boolean; // <= 30 mins before open
  diffMinutes: number;
  label: string;
  dotClass: string;
  textClass: string;
  tooltip: string;
  lastCloseDateStr: string;
}

export function calculateMarketStatus(): MarketStatusInfo {
  const nyStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyStr);
  const day = nyDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hours = nyDate.getHours();
  const minutes = nyDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const isWeekday = day >= 1 && day <= 5;

  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM = 570
  const marketCloseMinutes = 16 * 60; // 4:00 PM = 960
  const countdownStartMinutes = marketOpenMinutes - 120; // 7:30 AM = 450 (2 hours before open)

  const isOpen = isWeekday && timeInMinutes >= marketOpenMinutes && timeInMinutes < marketCloseMinutes;
  const isCountdown = isWeekday && timeInMinutes >= countdownStartMinutes && timeInMinutes < marketOpenMinutes;
  const diffMinutes = isCountdown ? marketOpenMinutes - timeInMinutes : 0;
  const isUrgent = isCountdown && diffMinutes <= 30;

  // Calculate Last Close Date
  const lastClose = new Date(nyDate.getTime());
  if (day === 0) {
    // Sunday -> Friday
    lastClose.setDate(lastClose.getDate() - 2);
  } else if (day === 6) {
    // Saturday -> Friday
    lastClose.setDate(lastClose.getDate() - 1);
  } else if (day === 1) {
    // Monday
    if (timeInMinutes < marketOpenMinutes) {
      lastClose.setDate(lastClose.getDate() - 3); // Previous Friday
    }
  } else {
    // Tue - Fri
    if (timeInMinutes < marketOpenMinutes) {
      lastClose.setDate(lastClose.getDate() - 1); // Yesterday
    }
  }

  const lastCloseDateStr = lastClose.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fullCloseStr = lastClose.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (isOpen) {
    return {
      isOpen: true,
      isCountdown: false,
      isUrgent: false,
      diffMinutes: 0,
      label: 'LIVE',
      dotClass: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]',
      textClass: 'text-emerald-400 group-hover:text-emerald-300 font-bold',
      tooltip: 'US Market Open (09:30 - 16:00 ET) • Live Realtime Prices Active',
      lastCloseDateStr,
    };
  }

  if (isCountdown) {
    let diffText = '';
    if (diffMinutes >= 60) {
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      diffText = m > 0 ? `${h}h ${m}m` : `${h}h`;
    } else {
      diffText = `${diffMinutes}m`;
    }

    return {
      isOpen: false,
      isCountdown: true,
      isUrgent,
      diffMinutes,
      label: `OPENS IN ${diffText}`,
      dotClass: isUrgent 
        ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]'
        : 'bg-amber-400/90 shadow-[0_0_6px_rgba(251,191,36,0.5)]',
      textClass: isUrgent
        ? 'text-amber-400 group-hover:text-amber-300 font-bold'
        : 'text-amber-300 group-hover:text-amber-200 font-bold',
      tooltip: `US Pre-Market Active • Regular Session Opens in ${diffText} (09:30 ET / 21:30 BKK) • Prices based on Prev Close (${lastCloseDateStr})`,
      lastCloseDateStr,
    };
  }

  return {
    isOpen: false,
    isCountdown: false,
    isUrgent: false,
    diffMinutes: 0,
    label: `CLOSED · ${lastCloseDateStr}`,
    dotClass: 'bg-slate-500',
    textClass: 'text-slate-300 group-hover:text-white font-bold',
    tooltip: `Official Session Close: ${fullCloseStr} (16:00 ET) • Click to refresh prices`,
    lastCloseDateStr,
  };
}

export function useMarketStatus(): MarketStatusInfo {
  const [status, setStatus] = useState<MarketStatusInfo>(calculateMarketStatus);

  useEffect(() => {
    const update = () => setStatus(calculateMarketStatus());
    update();
    const interval = setInterval(update, 30000); // 30s checks for precision minute transitions
    return () => clearInterval(interval);
  }, []);

  return status;
}
