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

// US Market Holidays (NYSE / NASDAQ Full Closures)
const US_HOLIDAYS_MAP: Record<string, string> = {
  // 2025
  '2025-01-01': "New Year's Day",
  '2025-01-20': 'MLK Jr. Day',
  '2025-02-17': "Presidents' Day",
  '2025-04-18': 'Good Friday',
  '2025-05-26': 'Memorial Day',
  '2025-06-19': 'Juneteenth',
  '2025-07-04': 'Independence Day',
  '2025-09-01': 'Labor Day',
  '2025-11-27': 'Thanksgiving',
  '2025-12-25': 'Christmas Day',
  // 2026
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'MLK Jr. Day',
  '2026-02-16': "Presidents' Day",
  '2026-04-03': 'Good Friday',
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth',
  '2026-07-03': 'Independence Day (Observed)',
  '2026-09-07': 'Labor Day',
  '2026-11-26': 'Thanksgiving',
  '2026-12-25': 'Christmas Day',
  // 2027
  '2027-01-01': "New Year's Day",
  '2027-01-18': 'MLK Jr. Day',
  '2027-02-15': "Presidents' Day",
  '2027-03-26': 'Good Friday',
  '2027-05-31': 'Memorial Day',
  '2027-06-18': 'Juneteenth (Observed)',
  '2027-07-05': 'Independence Day (Observed)',
  '2027-09-06': 'Labor Day',
  '2027-11-25': 'Thanksgiving',
  '2027-12-24': 'Christmas (Observed)',
};

// Early close days (close at 13:00 ET / 1:00 PM)
const US_EARLY_CLOSE_MAP: Record<string, string> = {
  '2025-07-03': 'July 3rd (13:00 Close)',
  '2025-11-28': 'Black Friday (13:00 Close)',
  '2025-12-24': 'Christmas Eve (13:00 Close)',
  '2026-11-27': 'Black Friday (13:00 Close)',
  '2026-12-24': 'Christmas Eve (13:00 Close)',
  '2027-11-26': 'Black Friday (13:00 Close)',
};

export function calculateMarketStatus(): MarketStatusInfo {
  // Use official America/New_York timezone — automatically accounts for EDT (Summer) and EST (Winter)
  const nyStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyStr);
  const day = nyDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hours = nyDate.getHours();
  const minutes = nyDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const isWeekday = day >= 1 && day <= 5;

  // Format date key (YYYY-MM-DD) for holiday check
  const dateKey = nyDate.toLocaleDateString('en-CA');
  const holidayName = US_HOLIDAYS_MAP[dateKey];
  const isHoliday = Boolean(holidayName);
  const isEarlyClose = Boolean(US_EARLY_CLOSE_MAP[dateKey]);

  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM ET = 570
  const marketCloseMinutes = isEarlyClose ? 13 * 60 : 16 * 60; // 4:00 PM ET = 960 (or 1:00 PM on early close)
  const countdownStartMinutes = marketOpenMinutes - 120; // 7:30 AM ET = 450 (2 hours before open)

  const isTradingDay = isWeekday && !isHoliday;
  const isOpen = isTradingDay && timeInMinutes >= marketOpenMinutes && timeInMinutes < marketCloseMinutes;
  const isCountdown = isTradingDay && timeInMinutes >= countdownStartMinutes && timeInMinutes < marketOpenMinutes;
  const diffMinutes = isCountdown ? marketOpenMinutes - timeInMinutes : 0;
  const isUrgent = isCountdown && diffMinutes <= 30;

  // Calculate Last Close Date (recursively skips weekends and market holidays)
  const lastClose = new Date(nyDate.getTime());
  if (timeInMinutes < marketCloseMinutes || !isTradingDay) {
    lastClose.setDate(lastClose.getDate() - 1);
  }
  while (true) {
    const d = lastClose.getDay();
    const key = lastClose.toLocaleDateString('en-CA');
    if (d === 0 || d === 6 || US_HOLIDAYS_MAP[key]) {
      lastClose.setDate(lastClose.getDate() - 1);
    } else {
      break;
    }
  }

  const lastCloseDateStr = lastClose.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fullCloseStr = lastClose.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  // Calculate local Bangkok opening hour for clarity in tooltip
  const openDateNY = new Date(nyDate.getTime());
  openDateNY.setHours(9, 30, 0, 0);
  const bkkOpenStr = openDateNY.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  if (isOpen) {
    return {
      isOpen: true,
      isCountdown: false,
      isUrgent: false,
      diffMinutes: 0,
      label: 'LIVE',
      dotClass: 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]',
      textClass: 'text-emerald-400 group-hover:text-emerald-300 font-bold',
      tooltip: `US Market Open (09:30 - ${isEarlyClose ? '13:00' : '16:00'} ET) • Live Realtime Prices Active`,
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
      tooltip: `US Pre-Market Active • Regular Session Opens in ${diffText} (09:30 ET / ${bkkOpenStr} BKK) • Prices based on Prev Close (${lastCloseDateStr})`,
      lastCloseDateStr,
    };
  }

  const closedReason = isHoliday 
    ? `CLOSED · ${holidayName}` 
    : `CLOSED · ${lastCloseDateStr}`;

  return {
    isOpen: false,
    isCountdown: false,
    isUrgent: false,
    diffMinutes: 0,
    label: closedReason,
    dotClass: 'bg-slate-500',
    textClass: 'text-slate-300 group-hover:text-white font-bold',
    tooltip: isHoliday
      ? `US Market Closed for ${holidayName} • Official Prev Close: ${fullCloseStr}`
      : `Official Session Close: ${fullCloseStr} (16:00 ET) • Click to refresh prices`,
    lastCloseDateStr,
  };
}

export function useMarketStatus(): MarketStatusInfo {
  const [status, setStatus] = useState<MarketStatusInfo>(calculateMarketStatus);

  useEffect(() => {
    const update = () => setStatus(calculateMarketStatus());
    update();
    const interval = setInterval(update, 30000); // 30s precision check
    return () => clearInterval(interval);
  }, []);

  return status;
}
