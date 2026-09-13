import { LineStyleOption } from './indicatorConfig';

export type CornerSnap = 'top-center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'custom';
export type CostLineColorMode = 'dynamic' | 'static';

export interface PositionOverlaySettings {
  enabled: boolean;               // Master On/Off switch
  showAvgCostLine: boolean;       // Show/hide average cost horizontal price line
  avgCostColorMode: CostLineColorMode; // 'dynamic' (3 shades based on P&L) | 'static' (single fixed color)
  avgCostColor: string;           // Line color for static mode (default: '#F59E0B' Amber)
  avgCostProfitColor: string;     // Profit line color (default: '#10B981' Emerald)
  avgCostBreakEvenColor: string;  // Break-even line color (default: '#F59E0B' Amber)
  avgCostLossColor: string;       // Loss line color (default: '#F43F5E' Rose)
  avgCostWidth: 1 | 2 | 3 | 4;    // Line thickness (1-4px)
  avgCostStyle: LineStyleOption;  // 'Solid' | 'Dashed' | 'Dotted'
  
  showHUD: boolean;               // Show/hide floating HUD card
  hudMode: 'expanded' | 'compact';// Full metrics card or compact mini pill
  isPinned: boolean;             // Lock HUD position to prevent dragging
  hudPosition: { x: number; y: number } | null; // Saved custom coordinates (null = default snap)
  snapCorner: CornerSnap;        // Quick corner snap
  
  showBuyMarkers: boolean;        // Show/hide BUY/SELL arrow markers on candles
  buyMarkerColor: string;         // Default: '#10B981'
  
  showBlueprintTarget: boolean;   // Show/hide Blueprint Target Price line
  targetColor: string;            // Default: '#38BDF8'
  targetWidth: 1 | 2 | 3 | 4;
  targetStyle: LineStyleOption;
}

export const DEFAULT_POSITION_OVERLAY_SETTINGS: PositionOverlaySettings = {
  enabled: true,
  showAvgCostLine: true,
  avgCostColorMode: 'dynamic',
  avgCostColor: '#F59E0B',
  avgCostProfitColor: '#F59E0B',
  avgCostBreakEvenColor: '#64748B',
  avgCostLossColor: '#F43F5E',
  avgCostWidth: 2,
  avgCostStyle: 'Dashed',
  
  showHUD: true,
  hudMode: 'expanded',
  isPinned: false,
  hudPosition: null,
  snapCorner: 'top-center',
  
  showBuyMarkers: true,
  buyMarkerColor: '#10B981',
  
  showBlueprintTarget: true,
  targetColor: '#38BDF8',
  targetWidth: 2,
  targetStyle: 'Dotted',
};

