export type HeatmapScope = 'sp100' | 'sp500' | 'nasdaq100' | 'portfolio' | 'watchlist';

export type SizeMetric = 'marketCap' | 'equal' | 'portfolioValue';

export type ColorMetric = 'perf_1d' | 'perf_total';

export type GroupBy = 'sector' | 'none';

export interface HeatmapItem {
  symbol: string;
  name: string;
  sector: string;
  domain?: string;
  price: number;
  change: number;
  percentChange: number;
  marketCap: number;
  // Extra fields for portfolio mode
  portfolioValue?: number;
  portfolioWeight?: number;
  totalReturnPercent?: number;
  totalReturn?: number;
  quantity?: number;
  avgCost?: number;
}

export interface HeatmapResponse {
  scope: string;
  cached: boolean;
  cacheAgeSeconds: number;
  lastUpdated: string;
  marketState?: 'REGULAR' | 'PRE' | 'POST' | 'CLOSED';
  items: HeatmapItem[];
}

export type TileSizeTier = 'XL' | 'L' | 'M' | 'S' | 'XS';

export interface TreemapLeafNode {
  data: HeatmapItem;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
  tier: TileSizeTier;
  color: string;
}

export interface TreemapSectorNode {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
  leaves: TreemapLeafNode[];
}

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  item: HeatmapItem | null;
  isPortfolio: boolean;
}
