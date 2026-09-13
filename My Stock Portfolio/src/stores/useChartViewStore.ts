import { create } from 'zustand';

export type ChartContext = 'project2x' | 'xchart';

export interface ChartVisibilityProfile {
  // Portfolio Overlays
  showHUD: boolean;
  showAvgCostLine: boolean;
  showBuyMarkers: boolean;
  showBlueprintTarget: boolean;

  // Drawings & Annotations
  showDrawings: boolean;
  showDrawingToolbar: boolean;
  showTouchBadges: boolean;

  // Main Pane Indicator Overlays
  showEMA: boolean;
  showSMC: boolean;
  showVWAP: boolean;
  showVolumeProfile: boolean;
  showSignals: boolean;
  showEnvelope: boolean;
  showTrendSpeed: boolean;

  // Sub-Pane Panels
  showSubPane: boolean;

  // UI Chrome
  showControlBar: boolean;
  showLegend: boolean;
}

export const DEFAULT_P2X_VISIBILITY: ChartVisibilityProfile = {
  // Portfolio Overlays: Show portfolio context in 2X
  showHUD: true,
  showAvgCostLine: true,
  showBuyMarkers: true,
  showBlueprintTarget: true,

  // Drawings: Clean by default in Project 2X, no left toolbar stealing space
  showDrawings: false,
  showDrawingToolbar: false,
  showTouchBadges: false,

  // Indicators: Keep Core 2X clean (EMA + MCDX only, no noise)
  showEMA: true,
  showSMC: false,
  showVWAP: false,
  showVolumeProfile: false,
  showSignals: false,
  showEnvelope: false,
  showTrendSpeed: false,

  showSubPane: true,
  showControlBar: true,
  showLegend: true,
};

export const DEFAULT_XCHART_VISIBILITY: ChartVisibilityProfile = {
  // Portfolio Overlays
  showHUD: true,
  showAvgCostLine: true,
  showBuyMarkers: true,
  showBlueprintTarget: true,

  // Drawings: Fully enabled in pro workstation mode
  showDrawings: true,
  showDrawingToolbar: true,
  showTouchBadges: true,

  // Indicators: Enabled based on indicatorConfig
  showEMA: true,
  showSMC: true,
  showVWAP: true,
  showVolumeProfile: true,
  showSignals: true,
  showEnvelope: true,
  showTrendSpeed: true,

  showSubPane: true,
  showControlBar: true,
  showLegend: true,
};

function getStorageKey(context: ChartContext): string {
  return `chart_view_${context}_v1`;
}

function loadProfile(context: ChartContext): ChartVisibilityProfile {
  const def = context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY;
  try {
    const raw = localStorage.getItem(getStorageKey(context));
    if (!raw) return def;
    return { ...def, ...JSON.parse(raw) };
  } catch (_) {
    return def;
  }
}

interface ChartViewState {
  profiles: Record<ChartContext, ChartVisibilityProfile>;
  getVisibility: (context: ChartContext, key: keyof ChartVisibilityProfile) => boolean;
  getProfile: (context: ChartContext) => ChartVisibilityProfile;
  toggleVisibility: (context: ChartContext, key: keyof ChartVisibilityProfile) => void;
  setVisibility: (context: ChartContext, key: keyof ChartVisibilityProfile, value: boolean) => void;
  updateProfile: (context: ChartContext, updates: Partial<ChartVisibilityProfile>) => void;
  resetProfile: (context: ChartContext) => void;
}

export const useChartViewStore = create<ChartViewState>((set, get) => ({
  profiles: {
    project2x: loadProfile('project2x'),
    xchart: loadProfile('xchart'),
  },

  getVisibility: (context, key) => {
    const p = get().profiles[context] || (context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);
    return p[key];
  },

  getProfile: (context) => {
    return get().profiles[context] || (context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);
  },

  toggleVisibility: (context, key) => {
    const current = get().profiles[context] || (context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);
    const updated = { ...current, [key]: !current[key] };
    try {
      localStorage.setItem(getStorageKey(context), JSON.stringify(updated));
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: updated,
      },
    });
  },

  setVisibility: (context, key, value) => {
    const current = get().profiles[context] || (context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);
    const updated = { ...current, [key]: value };
    try {
      localStorage.setItem(getStorageKey(context), JSON.stringify(updated));
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: updated,
      },
    });
  },

  updateProfile: (context, updates) => {
    const current = get().profiles[context] || (context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);
    const updated = { ...current, ...updates };
    try {
      localStorage.setItem(getStorageKey(context), JSON.stringify(updated));
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: updated,
      },
    });
  },

  resetProfile: (context) => {
    const def = context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY;
    try {
      localStorage.removeItem(getStorageKey(context));
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: def,
      },
    });
  },
}));
