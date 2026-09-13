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
