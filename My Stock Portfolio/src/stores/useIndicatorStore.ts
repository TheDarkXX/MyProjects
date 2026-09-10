import { create } from 'zustand';
import {
  IndicatorSettings,
  DEFAULT_INDICATOR_SETTINGS,
  EMALineConfig,
  EnvelopeConfig,
  SignalConfig,
  SignalMarkersConfig,
  SignalColorsConfig,
  MCDXConfig,
  VolumeConfig,
  PresetType,
  UltimateRSIConfig,
  UltimateRSISignalsConfig,
  TrendSpeedConfig,
  SMCLiteConfig,
  SubPaneIndicatorId,
  PaneLayout,
  DEFAULT_PANE_LAYOUT,
} from '../types/indicatorConfig';

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

function saveConfig(config: IndicatorSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}
}

interface IndicatorState {
  config: IndicatorSettings;
  addCustomColor: (color: string) => void;
  setCustomColors: (colors: string[]) => void;
  updateEMA: (id: 'ema1' | 'ema2' | 'ema3', partial: Partial<EMALineConfig>) => void;
  toggleEMA: (id: 'ema1' | 'ema2' | 'ema3') => void;
  toggleAllEMA: (visible: boolean) => void;
  updateEnvelope: (partial: Partial<EnvelopeConfig>) => void;
  toggleEnvelope: () => void;
  updateSignals: (partial: Partial<SignalConfig>) => void;
  updateSignalColor: (signalKey: keyof SignalColorsConfig, color: string) => void;
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
  assignIndicatorPane: (id: SubPaneIndicatorId, targetPane: number) => void;
  moveIndicatorUp: (id: SubPaneIndicatorId) => void;
  moveIndicatorDown: (id: SubPaneIndicatorId) => void;
  toggleAxisLabels: () => void;
  setShowAxisLabels: (show: boolean) => void;
  setPaneHeight: (id: SubPaneIndicatorId, height: number) => void;
  applyPreset: (preset: PresetType) => void;
  resetDefaults: () => void;
}

export const useIndicatorStore = create<IndicatorState>((set, get) => ({
  config: loadSavedConfig(),

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
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      [id]: { ...prev[id], ...partial },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleEMA: (id) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      [id]: { ...prev[id], visible: !prev[id].visible },
    };
    saveConfig(next);
    set({ config: next });
  },

  toggleAllEMA: (visible) => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      ema1: { ...prev.ema1, visible },
      ema2: { ...prev.ema2, visible },
      ema3: { ...prev.ema3, visible },
    };
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
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      envelope: { ...prev.envelope, visible: !prev.envelope.visible },
    };
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

  toggleSignals: () => {
    const prev = get().config;
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      signals: { ...prev.signals, visible: !prev.signals.visible },
    };
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
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      mcdx: { ...prev.mcdx, visible: !prev.mcdx.visible },
    };
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
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      volume: { ...prev.volume, visible: !prev.volume.visible },
    };
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
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      ultimateRsi: { ...prev.ultimateRsi, visible: !prev.ultimateRsi.visible },
    };
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
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      trendSpeed: { ...prev.trendSpeed, visible: !prev.trendSpeed.visible },
    };
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
    const next: IndicatorSettings = {
      ...prev,
      activePreset: 'custom',
      smcLite: { ...prev.smcLite, visible: !prev.smcLite.visible },
    };
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
}));
