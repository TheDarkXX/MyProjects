import { Time, UTCTimestamp, LineStyle } from 'lightweight-charts';
import { LineStyleOption } from './indicatorConfig';

export const TV_FONT_FAMILY = "'Trebuchet MS', 'Segoe UI Symbol', 'Segoe UI Emoji', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export type TimeFrame = '7D' | '1M' | '3M' | '6M' | '10M' | '1Y' | '5Y' | 'ALL';
export type ChartStyle = 'CANDLE' | 'HEIKIN_ASHI' | 'AREA';
export type Resolution = '4H' | '1D' | '1W';

export interface WatchlistStock {
  symbol: string;
  currentPrice: number;
  percent_change?: number;
  banker?: number;
  traffic_light?: 'BUY_ZONE' | 'WAIT' | 'DANGER';
}

export interface PortfolioOverlayConfig {
  avgCost?: number;
  totalQuantity?: number;
  unrealizedPnLPercent?: number;
  transactions?: Array<{
    date: string;
    type: 'BUY' | 'SELL';
    price: number;
    amount: number;
  }>;
  blueprint?: {
    targetPrice?: number;
    ceilingPrice?: number;
  };
}

export interface RawBarItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  banker: number;
  hotMoney: number;
  retail: number;
  bankerMa: number;
}

export const getChartLineStyle = (opt: LineStyleOption): LineStyle => {
  switch (opt) {
    case 'Dashed': return LineStyle.Dashed;
    case 'Dotted': return LineStyle.Dotted;
    case 'Solid':
    default: return LineStyle.Solid;
  }
};

export const formatBarTime = (t: string): Time => {
  if (t && t.includes('T')) {
    return Math.floor(new Date(t).getTime() / 1000) as UTCTimestamp;
  }
  return t as Time;
};

// US market hours check: Mon-Fri, 9:30 AM to 4:00 PM US Eastern Time (UTC-4 / EDT or UTC-5 / EST)
export const isUsMarketOpen = (): boolean => {
  try {
    const now = new Date();
    const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const nyDate = new Date(nyTimeStr);
    const day = nyDate.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const hours = nyDate.getHours();
    const minutes = nyDate.getMinutes();
    const totalMins = hours * 60 + minutes;
    // 9:30 AM = 570 mins, 4:00 PM = 960 mins
    return totalMins >= 570 && totalMins <= 960;
  } catch (e) {
    return false;
  }
};

export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}
