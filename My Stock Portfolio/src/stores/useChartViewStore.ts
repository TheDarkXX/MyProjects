import { create } from 'zustand';
import { pushSettingDebounced, registerSyncHandler } from '../services/settingsSync';

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
    const storageKey = getStorageKey(context);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: updated,
      },
    });
    pushSettingDebounced(storageKey, updated);
  },

  setVisibility: (context, key, value) => {
    const current = get().profiles[context] || (context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);
    const updated = { ...current, [key]: value };
    const storageKey = getStorageKey(context);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: updated,
      },
    });
    pushSettingDebounced(storageKey, updated);
  },

  updateProfile: (context, updates) => {
    const current = get().profiles[context] || (context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);
    const updated = { ...current, ...updates };
    const storageKey = getStorageKey(context);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: updated,
      },
    });
    pushSettingDebounced(storageKey, updated);
  },

  resetProfile: (context) => {
    const def = context === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY;
    const storageKey = getStorageKey(context);
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
    set({
      profiles: {
        ...get().profiles,
        [context]: def,
      },
    });
    pushSettingDebounced(storageKey, def);
  },
}));

// Cross-Device Cloud Sync Handlers
registerSyncHandler('chart_view_project2x_v1', (cloudVal) => {
  if (!cloudVal || typeof cloudVal !== 'object') return;
  const merged = { ...DEFAULT_P2X_VISIBILITY, ...cloudVal };
  try {
    localStorage.setItem('chart_view_project2x_v1', JSON.stringify(merged));
  } catch (_) {}
  useChartViewStore.setState((state) => ({
    profiles: {
      ...state.profiles,
      project2x: merged,
    },
  }));
});

registerSyncHandler('chart_view_xchart_v1', (cloudVal) => {
  if (!cloudVal || typeof cloudVal !== 'object') return;
  const merged = { ...DEFAULT_XCHART_VISIBILITY, ...cloudVal };
  try {
    localStorage.setItem('chart_view_xchart_v1', JSON.stringify(merged));
  } catch (_) {}
  useChartViewStore.setState((state) => ({
    profiles: {
      ...state.profiles,
      xchart: merged,
    },
  }));
});
