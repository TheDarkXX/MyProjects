import { create } from 'zustand';
import {
  IndicatorSettings,
  DEFAULT_INDICATOR_SETTINGS,
  EMALineConfig,
  LiveBadgeConfig,
  TargetConsensusConfig,
  EnvelopeConfig,
  SignalConfig,
  SignalMarkersConfig,
  SignalColorsConfig,
  SignalShapesConfig,
  SignalShapeType,
  MCDXConfig,
  VolumeConfig,
  PresetType,
  UltimateRSIConfig,
  UltimateRSISignalsConfig,
  TrendSpeedConfig,
  SMCLiteConfig,
  AnchoredVWAPConfig,
  SuperMoneySignalConfig,
  VolumeProfileConfig,
  SubPaneIndicatorId,
  PaneLayout,
  DEFAULT_PANE_LAYOUT,
} from '../types/indicatorConfig';
import { pushSettingDebounced, registerSyncHandler } from '../services/settingsSync';
import { useCanvasHistoryStore } from './canvasHistoryStore';

const STORAGE_KEY = 'xchart_indicators_v1';

function loadSavedConfig(): IndicatorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INDICATOR_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_INDICATOR_SETTINGS,
      ...parsed,
      customColors: Array.isArray(parsed.customColors) && parsed.customColors.length > 0
        ? parsed.customColors.slice(0, 5)
        : DEFAULT_INDICATOR_SETTINGS.customColors,
      paneLayout: {
        assignments: {
          ...DEFAULT_PANE_LAYOUT.assignments,
          ...(parsed.paneLayout?.assignments || {}),
        },
      },
      ema1: { ...DEFAULT_INDICATOR_SETTINGS.ema1, ...(parsed.ema1 || {}) },
      ema2: { ...DEFAULT_INDICATOR_SETTINGS.ema2, ...(parsed.ema2 || {}) },
      ema3: { ...DEFAULT_INDICATOR_SETTINGS.ema3, ...(parsed.ema3 || {}) },
      ema4: { ...DEFAULT_INDICATOR_SETTINGS.ema4, ...(parsed.ema4 || {}) },
      ema5: { ...DEFAULT_INDICATOR_SETTINGS.ema5, ...(parsed.ema5 || {}) },
      liveBadge: { ...DEFAULT_INDICATOR_SETTINGS.liveBadge, ...(parsed.liveBadge || {}) },
      targetConsensus: { ...DEFAULT_INDICATOR_SETTINGS.targetConsensus!, ...(parsed.targetConsensus || {}) },
      envelope: { ...DEFAULT_INDICATOR_SETTINGS.envelope, ...(parsed.envelope || {}) },
      signals: {
        ...DEFAULT_INDICATOR_SETTINGS.signals,
        ...(parsed.signals || {}),
        showText: parsed.signals?.showText !== undefined ? parsed.signals.showText : DEFAULT_INDICATOR_SETTINGS.signals.showText,
        size: typeof parsed.signals?.size === 'number' ? parsed.signals.size : DEFAULT_INDICATOR_SETTINGS.signals.size,
        padding: typeof parsed.signals?.padding === 'number' ? parsed.signals.padding : DEFAULT_INDICATOR_SETTINGS.signals.padding,
        markers: {
          ...DEFAULT_INDICATOR_SETTINGS.signals.markers,
          ...(parsed.signals?.markers || {}),
        },
        colors: {
          ...DEFAULT_INDICATOR_SETTINGS.signals.colors,
          ...(parsed.signals?.colors || {}),
        },
        shapes: {
          ...DEFAULT_INDICATOR_SETTINGS.signals.shapes,
          ...(parsed.signals?.shapes || {}),
        },
      },
      mcdx: { ...DEFAULT_INDICATOR_SETTINGS.mcdx, ...(parsed.mcdx || {}) },
      volume: { ...DEFAULT_INDICATOR_SETTINGS.volume, ...(parsed.volume || {}) },
      ultimateRsi: {
        ...DEFAULT_INDICATOR_SETTINGS.ultimateRsi,
        ...(parsed.ultimateRsi || {}),
        signals: {
          ...DEFAULT_INDICATOR_SETTINGS.ultimateRsi.signals,
          ...(parsed.ultimateRsi?.signals || {}),
        },
      },
      trendSpeed: {
        ...DEFAULT_INDICATOR_SETTINGS.trendSpeed,
        ...(parsed.trendSpeed || {}),
      },
      smcLite: {
        ...DEFAULT_INDICATOR_SETTINGS.smcLite,
        ...(parsed.smcLite || {}),
      },
      anchoredVwap: {
        ...DEFAULT_INDICATOR_SETTINGS.anchoredVwap,
        ...(parsed.anchoredVwap || {}),
      },
      superMoneySignal: {
        ...DEFAULT_INDICATOR_SETTINGS.superMoneySignal,
        ...(parsed.superMoneySignal || {}),
      },
      volumeProfile: {
        ...DEFAULT_INDICATOR_SETTINGS.volumeProfile!,
        ...(parsed.volumeProfile || {}),
      },
      showAxisLabels: typeof parsed.showAxisLabels === 'boolean' ? parsed.showAxisLabels : DEFAULT_INDICATOR_SETTINGS.showAxisLabels,
      paneHeights: {
        mcdx: typeof parsed.paneHeights?.mcdx === 'number' && parsed.paneHeights.mcdx >= 80
          ? parsed.paneHeights.mcdx
          : DEFAULT_INDICATOR_SETTINGS.paneHeights.mcdx,
        ultimateRsi: typeof parsed.paneHeights?.ultimateRsi === 'number' && parsed.paneHeights.ultimateRsi >= 80
          ? parsed.paneHeights.ultimateRsi
          : DEFAULT_INDICATOR_SETTINGS.paneHeights.ultimateRsi,
        trendSpeed: typeof parsed.paneHeights?.trendSpeed === 'number' && parsed.paneHeights.trendSpeed >= 80
          ? parsed.paneHeights.trendSpeed
          : DEFAULT_INDICATOR_SETTINGS.paneHeights.trendSpeed,
      },
    };
  } catch (e) {
    return DEFAULT_INDICATOR_SETTINGS;
  }
}

let tabSyncListener: ((tabId: string, config: IndicatorSettings) => void) | null = null;

export function registerTabIndicatorSync(fn: (tabId: string, config: IndicatorSettings) => void) {
  tabSyncListener = fn;
}

function saveConfig(config: IndicatorSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    pushSettingDebounced(STORAGE_KEY, config);
  } catch (e) {}

  if (tabSyncListener) {
    try {
      const currentTabId = useIndicatorStore.getState?.()?.activeTabId;
      if (currentTabId) {
        tabSyncListener(currentTabId, config);
      }
    } catch (e) {}
  }
}

function pushIndicatorToggleHistory(
  description: string,
  forwardDelta: Partial<IndicatorSettings>,
  inverseDelta: Partial<IndicatorSettings>
) {
  if (!useCanvasHistoryStore.getState().isRestoring) {
    useCanvasHistoryStore.getState().pushCommand({
      type: 'TOGGLE_INDICATOR',
      symbol: 'GLOBAL',
      description,
      iconType: 'indicator',
      forwardData: { configDelta: forwardDelta },
      inverseData: { configDelta: inverseDelta },
    });
  }
}

interface IndicatorState {
  config: IndicatorSettings;
  activeTabId: string;
  loadTabConfig: (tabId: string, tabConfig?: IndicatorSettings) => void;
  applyCloudConfig: (cloudConfig: Partial<IndicatorSettings>) => void;
  addCustomColor: (color: string) => void;
  setCustomColors: (colors: string[]) => void;
  updateEMA: (id: 'ema1' | 'ema2' | 'ema3' | 'ema4' | 'ema5', partial: Partial<EMALineConfig>) => void;
  toggleEMA: (id: 'ema1' | 'ema2' | 'ema3' | 'ema4' | 'ema5') => void;
  toggleAllEMA: (visible: boolean) => void;
  updateLiveBadge: (partial: Partial<LiveBadgeConfig>) => void;
  toggleLiveBadge: () => void;
  updateTargetConsensus: (partial: Partial<TargetConsensusConfig>) => void;
  toggleTargetConsensus: (visible?: boolean) => void;
  updateEnvelope: (partial: Partial<EnvelopeConfig>) => void;
  toggleEnvelope: () => void;
  updateSignals: (partial: Partial<SignalConfig>) => void;
  updateSignalColor: (signalKey: keyof SignalColorsConfig, color: string) => void;
  updateSignalShape: (signalKey: keyof SignalShapesConfig, shape: SignalShapeType) => void;
  toggleSignals: () => void;
  toggleSignalMarker: (markerKey: keyof SignalMarkersConfig) => void;
  updateMCDX: (partial: Partial<MCDXConfig>) => void;
  toggleMCDX: () => void;
  updateVolume: (partial: Partial<VolumeConfig>) => void;
  toggleVolume: () => void;
  updateUltimateRSI: (partial: Partial<UltimateRSIConfig>) => void;
  toggleUltimateRSI: () => void;
  toggleUltimateRSISignal: (signalKey: keyof UltimateRSISignalsConfig) => void;
  updateUltimateRSISignals: (partial: Partial<UltimateRSISignalsConfig>) => void;
  updateTrendSpeed: (partial: Partial<TrendSpeedConfig>) => void;
  toggleTrendSpeed: () => void;
  updateSMCLite: (partial: Partial<SMCLiteConfig>) => void;
  toggleSMCLite: () => void;
  updateAnchoredVWAP: (partial: Partial<AnchoredVWAPConfig>) => void;
  toggleAnchoredVWAP: () => void;
  updateSuperMoneySignal: (partial: Partial<SuperMoneySignalConfig>) => void;
  toggleSuperMoneySignal: () => void;
  updateVolumeProfile: (partial: Partial<VolumeProfileConfig>) => void;
  toggleVolumeProfile: () => void;
  assignIndicatorPane: (id: SubPaneIndicatorId, targetPane: number) => void;
  moveIndicatorUp: (id: SubPaneIndicatorId) => void;
  moveIndicatorDown: (id: SubPaneIndicatorId) => void;
  toggleAxisLabels: () => void;
  setShowAxisLabels: (show: boolean) => void;
  setPaneHeight: (id: SubPaneIndicatorId, height: number) => void;
  applyPreset: (preset: PresetType) => void;
  resetDefaults: () => void;
  restoreIndicatorPartial: (configDelta: Partial<IndicatorSettings>) => void;
}

export const useIndicatorStore = create<IndicatorState>((set, get) => ({
  config: loadSavedConfig(),
  activeTabId: 'tab-main',

  loadTabConfig: (tabId: string, tabConfig?: IndicatorSettings) => {
    const targetConfig = tabConfig || loadSavedConfig();
    set({ config: targetConfig, activeTabId: tabId });
  },

  addCustomColor: (color: string) => {
    if (!color) return;
    const prev = get().config;
    const normalized = color.toUpperCase();
    const existing = prev.customColors || [];
    const filtered = existing.filter(c => c.toUpperCase() !== normalized);
    const nextColors = [normalized, ...filtered].slice(0, 5);
    const next: IndicatorSettings = {
      ...prev,
      customColors: nextColors,
    };
    saveConfig(next);
    set({ config: next });
  },

  setCustomColors: (colors: string[]) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      customColors: colors.slice(0, 5),
    };
    saveConfig(next);
    set({ config: next });
  },

  updateEMA: (id, partial) => {
    const prev = get().config;
    const cur = prev[id] || DEFAULT_INDICATOR_SETTINGS[id];
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      [id]: { ...cur, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleEMA: (id) => {
    const prev = get().config;
    const cur = prev[id] || DEFAULT_INDICATOR_SETTINGS[id];
    const nextVisible = !cur.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      [id]: { ...cur, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} ${id.toUpperCase()}`, { [id]: next[id] }, { [id]: cur });
    saveConfig(next);
    set({ config: next });
  },

  toggleAllEMA: (visible) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      ema1: { ...(prev.ema1 || DEFAULT_INDICATOR_SETTINGS.ema1), visible },
      ema2: { ...(prev.ema2 || DEFAULT_INDICATOR_SETTINGS.ema2), visible },
      ema3: { ...(prev.ema3 || DEFAULT_INDICATOR_SETTINGS.ema3), visible },
      ema4: { ...(prev.ema4 || DEFAULT_INDICATOR_SETTINGS.ema4), visible },
      ema5: { ...(prev.ema5 || DEFAULT_INDICATOR_SETTINGS.ema5), visible },
    };
    pushIndicatorToggleHistory(
      `${visible ? 'Show' : 'Hide'} All EMAs`,
      { ema1: next.ema1, ema2: next.ema2, ema3: next.ema3, ema4: next.ema4, ema5: next.ema5 },
      { ema1: prev.ema1, ema2: prev.ema2, ema3: prev.ema3, ema4: prev.ema4, ema5: prev.ema5 }
    );
    saveConfig(next);
    set({ config: next });
  },

  updateLiveBadge: (partial) => {
    const prev = get().config;
    const cur = prev.liveBadge || DEFAULT_INDICATOR_SETTINGS.liveBadge!;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      liveBadge: { ...cur, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleLiveBadge: () => {
    const prev = get().config;
    const cur = prev.liveBadge || DEFAULT_INDICATOR_SETTINGS.liveBadge!;
    const nextVisible = !cur.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      liveBadge: { ...cur, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Live EMA Badge`, { liveBadge: next.liveBadge }, { liveBadge: cur });
    saveConfig(next);
    set({ config: next });
  },

  updateTargetConsensus: (partial) => {
    const prev = get().config;
    const cur = prev.targetConsensus || DEFAULT_INDICATOR_SETTINGS.targetConsensus!;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      targetConsensus: { ...cur, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleTargetConsensus: (visible) => {
    const prev = get().config;
    const cur = prev.targetConsensus || DEFAULT_INDICATOR_SETTINGS.targetConsensus!;
    const nextVisible = visible !== undefined ? visible : !cur.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      targetConsensus: { ...cur, visible: nextVisible },
    };
    pushIndicatorToggleHistory(
      `${nextVisible ? 'Show' : 'Hide'} Target Consensus`,
      { targetConsensus: next.targetConsensus },
      { targetConsensus: cur }
    );
    saveConfig(next);
    set({ config: next });
  },

  updateEnvelope: (partial) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      envelope: { ...prev.envelope, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleEnvelope: () => {
    const prev = get().config;
    const nextVisible = !prev.envelope.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      envelope: { ...prev.envelope, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Envelope`, { envelope: next.envelope }, { envelope: prev.envelope });
    saveConfig(next);
    set({ config: next });
  },

  updateSignals: (partial) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      signals: { ...prev.signals, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  updateSignalColor: (signalKey, color) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      signals: {
        ...prev.signals,
        colors: {
          ...prev.signals.colors,
          [signalKey]: color,
        },
      },
    };
    saveConfig(next);
    set({ config: next });
  },

  updateSignalShape: (signalKey, shape) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      signals: {
        ...prev.signals,
        shapes: {
          ...prev.signals.shapes,
          [signalKey]: shape,
        },
      },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleSignals: () => {
    const prev = get().config;
    const nextVisible = !prev.signals.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      signals: { ...prev.signals, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Signals`, { signals: next.signals }, { signals: prev.signals });
    saveConfig(next);
    set({ config: next });
  },

  toggleSignalMarker: (markerKey) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      signals: {
        ...prev.signals,
        markers: {
          ...prev.signals.markers,
          [markerKey]: !prev.signals.markers[markerKey],
        },
      },
    };
    saveConfig(next);
    set({ config: next });
  },

  updateMCDX: (partial) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      mcdx: { ...prev.mcdx, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleMCDX: () => {
    const prev = get().config;
    const nextVisible = !prev.mcdx.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      mcdx: { ...prev.mcdx, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} MCDX`, { mcdx: next.mcdx }, { mcdx: prev.mcdx });
    saveConfig(next);
    set({ config: next });
  },

  updateVolume: (partial) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      volume: { ...prev.volume, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleVolume: () => {
    const prev = get().config;
    const nextVisible = !prev.volume.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      volume: { ...prev.volume, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Volume`, { volume: next.volume }, { volume: prev.volume });
    saveConfig(next);
    set({ config: next });
  },

  updateUltimateRSI: (partial) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      ultimateRsi: { ...prev.ultimateRsi, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleUltimateRSI: () => {
    const prev = get().config;
    const nextVisible = !prev.ultimateRsi.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      ultimateRsi: { ...prev.ultimateRsi, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Ultimate RSI`, { ultimateRsi: next.ultimateRsi }, { ultimateRsi: prev.ultimateRsi });
    saveConfig(next);
    set({ config: next });
  },

  toggleUltimateRSISignal: (signalKey) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      ultimateRsi: {
        ...prev.ultimateRsi,
        signals: {
          ...prev.ultimateRsi.signals,
          [signalKey]: !prev.ultimateRsi.signals[signalKey],
        },
      },
    };
    saveConfig(next);
    set({ config: next });
  },

  updateUltimateRSISignals: (partial) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      ultimateRsi: {
        ...prev.ultimateRsi,
        signals: {
          ...prev.ultimateRsi.signals,
          ...partial,
        },
      },
    };
    saveConfig(next);
    set({ config: next });
  },

  updateTrendSpeed: (partial) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      trendSpeed: { ...prev.trendSpeed, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleTrendSpeed: () => {
    const prev = get().config;
    const nextVisible = !prev.trendSpeed.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      trendSpeed: { ...prev.trendSpeed, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Trend Speed`, { trendSpeed: next.trendSpeed }, { trendSpeed: prev.trendSpeed });
    saveConfig(next);
    set({ config: next });
  },

  updateSMCLite: (partial: Partial<SMCLiteConfig>) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      smcLite: { ...prev.smcLite, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleSMCLite: () => {
    const prev = get().config;
    const nextVisible = !prev.smcLite.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      smcLite: { ...prev.smcLite, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} SMC Lite`, { smcLite: next.smcLite }, { smcLite: prev.smcLite });
    saveConfig(next);
    set({ config: next });
  },

  updateAnchoredVWAP: (partial: Partial<AnchoredVWAPConfig>) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      anchoredVwap: { ...prev.anchoredVwap, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleAnchoredVWAP: () => {
    const prev = get().config;
    const nextVisible = !prev.anchoredVwap.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      anchoredVwap: { ...prev.anchoredVwap, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Anchored VWAP`, { anchoredVwap: next.anchoredVwap }, { anchoredVwap: prev.anchoredVwap });
    saveConfig(next);
    set({ config: next });
  },

  updateSuperMoneySignal: (partial: Partial<SuperMoneySignalConfig>) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      superMoneySignal: { ...prev.superMoneySignal, ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleSuperMoneySignal: () => {
    const prev = get().config;
    const nextVisible = !prev.superMoneySignal.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      superMoneySignal: { ...prev.superMoneySignal, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Super Money Signal`, { superMoneySignal: next.superMoneySignal }, { superMoneySignal: prev.superMoneySignal });
    saveConfig(next);
    set({ config: next });
  },

  updateVolumeProfile: (partial: Partial<VolumeProfileConfig>) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      volumeProfile: { ...(prev.volumeProfile || DEFAULT_INDICATOR_SETTINGS.volumeProfile!), ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleVolumeProfile: () => {
    const prev = get().config;
    const currentVP = prev.volumeProfile || DEFAULT_INDICATOR_SETTINGS.volumeProfile!;
    const nextVisible = !currentVP.visible;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      volumeProfile: { ...currentVP, visible: nextVisible },
    };
    pushIndicatorToggleHistory(`${nextVisible ? 'Show' : 'Hide'} Volume Profile`, { volumeProfile: next.volumeProfile }, { volumeProfile: prev.volumeProfile });
    saveConfig(next);
    set({ config: next });
  },

  assignIndicatorPane: (id: SubPaneIndicatorId, targetPane: number) => {
    const prev = get().config;
    const currentAssignments = { ...prev.paneLayout.assignments };
    const currentPane = currentAssignments[id];
    if (currentPane === targetPane) return;

    // Auto-swap: find if another indicator occupies targetPane
    const occupant = (Object.keys(currentAssignments) as SubPaneIndicatorId[]).find(
      k => k !== id && currentAssignments[k] === targetPane
    );

    if (occupant) {
      currentAssignments[occupant] = currentPane;
    }
    currentAssignments[id] = targetPane;

    const next: IndicatorSettings = {
      ...prev,
      paneLayout: {
        assignments: currentAssignments,
      },
    };
    saveConfig(next);
    set({ config: next });
  },

  moveIndicatorUp: (id: SubPaneIndicatorId) => {
    const prev = get().config;
    const currentPane = prev.paneLayout.assignments[id] ?? 1;
    // Pane 1 is at the top of sub-panes. Moving UP means targetPane = currentPane - 1
    if (currentPane <= 1) return;
    get().assignIndicatorPane(id, currentPane - 1);
  },

  moveIndicatorDown: (id: SubPaneIndicatorId) => {
    const prev = get().config;
    const currentAssignments = prev.paneLayout.assignments;
    const currentPane = currentAssignments[id] ?? 1;
    const maxPane = Math.max(2, ...Object.values(currentAssignments));
    // Pane 2 is lower. Moving DOWN means targetPane = currentPane + 1
    if (currentPane >= maxPane) return;
    get().assignIndicatorPane(id, currentPane + 1);
  },

  applyPreset: (preset) => {
    const current = get().config;
    let next: IndicatorSettings;

    switch (preset) {
      case 'full':
        next = {
          ...DEFAULT_INDICATOR_SETTINGS,
          customColors: current.customColors || DEFAULT_INDICATOR_SETTINGS.customColors,
          signals: {
            ...DEFAULT_INDICATOR_SETTINGS.signals,
            showText: current.signals.showText,
            size: current.signals.size,
            padding: current.signals.padding,
          },
          activePreset: 'full',
        };
        break;

      case 'clean':
        next = {
          ...current,
          activePreset: 'clean',
          ema1: { ...current.ema1, visible: false },
          ema2: { ...current.ema2, visible: false },
          ema3: { ...current.ema3, visible: true },
          envelope: { ...current.envelope, visible: false },
          signals: { ...current.signals, visible: false },
          mcdx: { ...current.mcdx, visible: false },
          volume: { ...current.volume, visible: false },
        };
        break;

      case 'banker':
        next = {
          ...current,
          activePreset: 'banker',
          ema1: { ...current.ema1, visible: false },
          ema2: { ...current.ema2, visible: false },
          ema3: { ...current.ema3, visible: false },
          envelope: { ...current.envelope, visible: false },
          signals: { ...current.signals, visible: true },
          mcdx: { ...current.mcdx, visible: true },
          volume: { ...current.volume, visible: true },
        };
        break;

      case 'triple_ema':
        next = {
          ...current,
          activePreset: 'triple_ema',
          ema1: { ...current.ema1, visible: true },
          ema2: { ...current.ema2, visible: true },
          ema3: { ...current.ema3, visible: true },
          envelope: { ...current.envelope, visible: false },
          signals: { ...current.signals, visible: false },
          mcdx: { ...current.mcdx, visible: false },
          volume: { ...current.volume, visible: true },
        };
        break;

      default:
        return;
    }

    saveConfig(next);
    set({ config: next });
  },

  toggleAxisLabels: () => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      showAxisLabels: !prev.showAxisLabels,
    };
    saveConfig(next);
    set({ config: next });
  },

  setShowAxisLabels: (show: boolean) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      showAxisLabels: show,
    };
    saveConfig(next);
    set({ config: next });
  },

  setPaneHeight: (id: SubPaneIndicatorId, height: number) => {
    const prev = get().config;
    // Enforce floor >= 80px so collapsed state (28px) never overwrites normal height
    const cleanHeight = Math.max(80, Math.min(800, Math.round(height)));
    const next: IndicatorSettings = {
      ...prev,
      paneHeights: {
        ...prev.paneHeights,
        [id]: cleanHeight,
      },
    };
    saveConfig(next);
    set({ config: next });
  },

  resetDefaults: () => {
    saveConfig(DEFAULT_INDICATOR_SETTINGS);
    set({ config: DEFAULT_INDICATOR_SETTINGS });
  },

  applyCloudConfig: (cloudConfig: Partial<IndicatorSettings>) => {
    if (!cloudConfig || typeof cloudConfig !== 'object') return;
    try {
      const merged: IndicatorSettings = {
        ...DEFAULT_INDICATOR_SETTINGS,
        ...cloudConfig,
        customColors: Array.isArray(cloudConfig.customColors) && cloudConfig.customColors.length > 0
          ? cloudConfig.customColors.slice(0, 5)
          : (cloudConfig.customColors || DEFAULT_INDICATOR_SETTINGS.customColors),
        paneLayout: {
          assignments: {
            ...DEFAULT_PANE_LAYOUT.assignments,
            ...(cloudConfig.paneLayout?.assignments || {}),
          },
        },
        ema1: { ...DEFAULT_INDICATOR_SETTINGS.ema1, ...(cloudConfig.ema1 || {}) },
        ema2: { ...DEFAULT_INDICATOR_SETTINGS.ema2, ...(cloudConfig.ema2 || {}) },
        ema3: { ...DEFAULT_INDICATOR_SETTINGS.ema3, ...(cloudConfig.ema3 || {}) },
        envelope: { ...DEFAULT_INDICATOR_SETTINGS.envelope, ...(cloudConfig.envelope || {}) },
        signals: {
          ...DEFAULT_INDICATOR_SETTINGS.signals,
          ...(cloudConfig.signals || {}),
          markers: {
            ...DEFAULT_INDICATOR_SETTINGS.signals.markers,
            ...(cloudConfig.signals?.markers || {}),
          },
          colors: {
            ...DEFAULT_INDICATOR_SETTINGS.signals.colors,
            ...(cloudConfig.signals?.colors || {}),
          },
        },
        mcdx: { ...DEFAULT_INDICATOR_SETTINGS.mcdx, ...(cloudConfig.mcdx || {}) },
        volume: { ...DEFAULT_INDICATOR_SETTINGS.volume, ...(cloudConfig.volume || {}) },
        ultimateRsi: {
          ...DEFAULT_INDICATOR_SETTINGS.ultimateRsi,
          ...(cloudConfig.ultimateRsi || {}),
          signals: {
            ...DEFAULT_INDICATOR_SETTINGS.ultimateRsi.signals,
            ...(cloudConfig.ultimateRsi?.signals || {}),
          },
        },
        trendSpeed: {
          ...DEFAULT_INDICATOR_SETTINGS.trendSpeed,
          ...(cloudConfig.trendSpeed || {}),
        },
        smcLite: {
          ...DEFAULT_INDICATOR_SETTINGS.smcLite,
          ...(cloudConfig.smcLite || {}),
        },
        anchoredVwap: {
          ...DEFAULT_INDICATOR_SETTINGS.anchoredVwap,
          ...(cloudConfig.anchoredVwap || {}),
        },
        superMoneySignal: {
          ...DEFAULT_INDICATOR_SETTINGS.superMoneySignal,
          ...(cloudConfig.superMoneySignal || {}),
        },
        volumeProfile: {
          ...DEFAULT_INDICATOR_SETTINGS.volumeProfile!,
          ...(cloudConfig.volumeProfile || {}),
        },
        paneHeights: {
          ...DEFAULT_INDICATOR_SETTINGS.paneHeights,
          ...(cloudConfig.paneHeights || {}),
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      set({ config: merged });
    } catch (e) {
      console.warn('[useIndicatorStore] Failed to apply cloud config:', e);
    }
  },

  restoreIndicatorPartial: (configDelta: Partial<IndicatorSettings>) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      ...configDelta,
    };
    saveConfig(next);
    set({ config: next });
  },
}));

registerSyncHandler(STORAGE_KEY, (cloudValue) => {
  useIndicatorStore.getState().applyCloudConfig(cloudValue);
});
