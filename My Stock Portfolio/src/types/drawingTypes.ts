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
  createdAt: number;
}

export type DrawingTool = 'cursor' | 'horizontalLine';

export interface AutoSRLevel {
  price: number;
  strength: number;
  type: 'support' | 'resistance';
}

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
