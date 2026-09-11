export type LineStyleOption = 'Solid' | 'Dashed' | 'Dotted';

export interface HorizontalLineDrawing {
  id: string;
  price: number;
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: LineStyleOption;
  text: string;
  showPriceLabel: boolean;
  locked: boolean;
  visible: boolean;
  visibleOn: 'all' | '1D' | '1W' | '4H';
  alertEnabled?: boolean;
  touchCount?: number;
  isAuto?: boolean;
  createdAt: number;
}

export type DrawingTool = 'cursor' | 'horizontalLine' | 'trendLine';

export interface TrendLineDrawing {
  id: string;
  startPrice: number;
  startTime: string | number;
  endPrice: number;
  endTime: string | number;
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: LineStyleOption;
  extendRight?: boolean;
  locked?: boolean;
  visible?: boolean;
  visibleOn?: 'all' | '1D' | '1W' | '4H';
  createdAt: number;
}

export interface AutoSRLevel {
  price: number;
  strength: number;
  type: 'support' | 'resistance';
}

export interface DrawingSettings {
  // Auto S/R settings
  resistanceColor: string;
  resistanceWidth: 1 | 2 | 3 | 4;
  resistanceStyle: LineStyleOption;
  supportColor: string;
  supportWidth: 1 | 2 | 3 | 4;
  supportStyle: LineStyleOption;
  // Default line settings
  defaultLineColor: string;
  defaultLineWidth: 1 | 2 | 3 | 4;
  defaultLineStyle: LineStyleOption;
  // In-Canvas Label Size: 1 (Micro -4), 2 (Compact -3), 3 (Small -2), 4 (Normal -1)
  labelSizeLevel: 1 | 2 | 3 | 4;
}

export const DEFAULT_DRAWING_SETTINGS: DrawingSettings = {
  resistanceColor: '#EF5350',
  resistanceWidth: 1,
  resistanceStyle: 'Dashed',
  supportColor: '#26A69A',
  supportWidth: 1,
  supportStyle: 'Dashed',
  defaultLineColor: '#26A69A',
  defaultLineWidth: 1,
  defaultLineStyle: 'Solid',
  labelSizeLevel: 1, // Default to Level 1 (Micro / 4 levels smaller)
};

export const DEFAULT_LINE_DRAWING: Omit<HorizontalLineDrawing, 'id' | 'price' | 'createdAt'> = {
  color: '#26A69A',
  lineWidth: 1,
  lineStyle: 'Solid',
  text: '',
  showPriceLabel: true,
  locked: false,
  visible: true,
  visibleOn: 'all',
  alertEnabled: false,
};

export const DEFAULT_TRENDLINE_DRAWING: Omit<TrendLineDrawing, 'id' | 'startPrice' | 'startTime' | 'endPrice' | 'endTime' | 'createdAt'> = {
  color: '#2962FF',
  lineWidth: 2,
  lineStyle: 'Solid',
  extendRight: false,
  locked: false,
  visible: true,
  visibleOn: 'all',
};
