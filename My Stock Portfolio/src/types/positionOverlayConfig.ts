import { LineStyleOption } from './indicatorConfig';

export type CornerSnap = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'custom';

export interface PositionOverlaySettings {
  enabled: boolean;               // Master On/Off switch
  showAvgCostLine: boolean;       // Show/hide average cost horizontal price line
  avgCostColor: string;           // Line color (default: '#F59E0B' Amber)
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
  avgCostColor: '#F59E0B',
  avgCostWidth: 2,
  avgCostStyle: 'Dashed',
  
  showHUD: true,
  hudMode: 'expanded',
  isPinned: true,
  hudPosition: null,
  snapCorner: 'top-right',
  
  showBuyMarkers: true,
  buyMarkerColor: '#10B981',
  
  showBlueprintTarget: true,
  targetColor: '#38BDF8',
  targetWidth: 2,
  targetStyle: 'Dotted',
};
