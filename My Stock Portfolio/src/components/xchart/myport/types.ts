export interface PortfolioSliceItem {
  symbol: string;
  name?: string;
  category: string;
  quantity: number;
  avgCost: number;
  totalCost: number;
  lastPrice: number;
  dayChangePercent: number;
  dayReturn: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  actualWeight: number; // e.g. 35.0 (%)
  targetWeight: number; // e.g. 30.0 (%) from blueprint, or 0
  drift: number; // actualWeight - targetWeight (e.g. +5.0%)
  blueprintTargetPrice?: number | null;
  blueprintCeilingPrice?: number | null;
  blueprintNotes?: string;
  color: string;
  isCash?: boolean;
}

export const SLICE_PALETTE: string[] = [
  '#8B5CF6', // Vibrant Violet
  '#06B6D4', // Electric Cyan
  '#F59E0B', // Bright Amber
  '#EC4899', // Hot Pink
  '#10B981', // Emerald Green
  '#3B82F6', // Cobalt Blue
  '#F97316', // Bright Orange
  '#14B8A6', // Teal
  '#A855F7', // Fuchsia
  '#6366F1', // Indigo
  '#EAB308', // Gold Yellow
  '#64748B', // Slate
];

export const formatCurrencyVal = (
  val: number,
  currency: 'USD' | 'THB',
  exchangeRate: number,
  isPnl = false,
  compact = false
): string => {
  const prefix = isPnl && val > 0 ? '+' : '';
  const rate = exchangeRate || 34.5;
  if (currency === 'THB') {
    const converted = Math.round(val * rate);
    return `${prefix}฿${converted.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (compact) {
    return `${prefix}$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return `${prefix}$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatSecondaryVal = (
  val: number,
  currency: 'USD' | 'THB',
  exchangeRate: number,
  isPnl = false
): string => {
  const prefix = isPnl && val > 0 ? '+' : '';
  const rate = exchangeRate || 34.5;
  if (currency === 'THB') {
    return `${prefix}$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const thbVal = Math.round(val * rate);
  return `${prefix}฿${thbVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

export const formatPriceVal = (
  val: number,
  currency: 'USD' | 'THB',
  exchangeRate: number
): string => {
  const rate = exchangeRate || 34.5;
  if (currency === 'THB') {
    const converted = val * rate;
    return `฿${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatSecondaryPriceVal = (
  val: number,
  currency: 'USD' | 'THB',
  exchangeRate: number
): string => {
  const rate = exchangeRate || 34.5;
  if (currency === 'THB') {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const thbVal = val * rate;
  return `฿${thbVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};


