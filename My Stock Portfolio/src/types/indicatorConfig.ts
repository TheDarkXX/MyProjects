export type LineStyleOption = 'Solid' | 'Dotted' | 'Dashed';

export interface EMALineConfig {
  id: 'ema1' | 'ema2' | 'ema3';
  name: string;
  visible: boolean;
  period: number;
  color: string;
  lineWidth: number;
  lineStyle: LineStyleOption;
}

export interface EnvelopeConfig {
  visible: boolean;
  percent: number;
  color: string;
  lineWidth: number;
  lineStyle: LineStyleOption;
}

export interface SignalMarkersConfig {
  rebound: boolean;   // ● ● ● READY
  breakout: boolean;  // ▲ BUY
  goldenStar: boolean;// ★ SUPER
  pullback: boolean;  // ▼ EXIT
}

export interface SignalColorsConfig {
  rebound: string;   // ● ● ● READY
  breakout: string;  // ▲ BUY
  goldenStar: string;// ★ SUPER
  pullback: string;  // ▼ EXIT
}

export const DEFAULT_SIGNAL_COLORS: SignalColorsConfig = {
  rebound: '#FBBF24',
  breakout: '#FFE600',
  goldenStar: '#FFFFFF',
  pullback: '#FF1744',
};

export interface SignalConfig {
  visible: boolean;
  showText: boolean;
  size: number;
  padding: number;
  markers: SignalMarkersConfig;
  colors: SignalColorsConfig;
}

export interface MCDXConfig {
  visible: boolean;
  bankerColor: string;
  hotMoneyColor: string;
  retailColor: string;
  maPeriod: number;
  maColor: string;
  maWidth: number;
}

export interface VolumeConfig {
  visible: boolean;
}

export type MAMethod = 'RMA' | 'EMA' | 'SMA' | 'TMA';

export interface UltimateRSISignalsConfig {
  buyCross: boolean;    // arsi < 30 and crossover
  reversal: boolean;    // arsi[1] < 20 and signal[1] < 20 and arsi >= 20 and arsi < 30
  buyZone: boolean;     // barssince(cross) < 10 and arsi in [20,40] and signal in [20,40]
}

export interface UltimateRSIConfig {
  visible: boolean;
  length: number;
  smoType1: MAMethod;
  smooth: number;
  smoType2: MAMethod;
  source: 'close' | 'hl2' | 'hlc3';
  obValue: number;
  osValue: number;
  obColor: string;
  osColor: string;
  rsiColor: string;
  signalColor: string;
  autoColor: boolean;
  showArea: boolean;
  signals: UltimateRSISignalsConfig;
}

export type SubPaneIndicatorId = 'mcdx' | 'ultimateRsi';

export interface PaneLayout {
  assignments: Record<SubPaneIndicatorId, number>;
}

export const DEFAULT_PANE_LAYOUT: PaneLayout = {
  assignments: {
    mcdx: 1,
    ultimateRsi: 2,
  },
};

export interface PaneHeights {
  mcdx: number;
  ultimateRsi: number;
}

export const DEFAULT_PANE_HEIGHTS: PaneHeights = {
  mcdx: 140,
  ultimateRsi: 140,
};

export type PresetType = 'full' | 'clean' | 'banker' | 'triple_ema' | 'custom';

export interface IndicatorSettings {
  activePreset: PresetType;
  customColors: string[];
  paneLayout: PaneLayout;
  paneHeights: PaneHeights;
  showAxisLabels: boolean;
  ema1: EMALineConfig;
  ema2: EMALineConfig;
  ema3: EMALineConfig;
  envelope: EnvelopeConfig;
  signals: SignalConfig;
  mcdx: MCDXConfig;
  volume: VolumeConfig;
  ultimateRsi: UltimateRSIConfig;
}

export const DEFAULT_CUSTOM_COLORS: string[] = [
  '#00E5FF', // Neon Cyan
  '#EC4899', // Hot Pink
  '#FFD700', // Bright Gold
  '#A855F7', // Vivid Purple
  '#10B981', // Emerald Green
];

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  activePreset: 'full',
  customColors: DEFAULT_CUSTOM_COLORS,
  paneLayout: DEFAULT_PANE_LAYOUT,
  paneHeights: DEFAULT_PANE_HEIGHTS,
  showAxisLabels: false,
  ema1: {
    id: 'ema1',
    name: 'EMA 1',
    visible: true,
    period: 50,
    color: '#FFFFFF',
    lineWidth: 2,
    lineStyle: 'Solid',
  },
  ema2: {
    id: 'ema2',
    name: 'EMA 2',
    visible: true,
    period: 150,
    color: '#2962FF',
    lineWidth: 2,
    lineStyle: 'Solid',
  },
  ema3: {
    id: 'ema3',
    name: 'EMA 3',
    visible: true,
    period: 200,
    color: '#FFB300',
    lineWidth: 3,
    lineStyle: 'Solid',
  },
  envelope: {
    visible: true,
    percent: 4.0,
    color: '#C084FC',
    lineWidth: 1,
    lineStyle: 'Dashed',
  },
  signals: {
    visible: true,
    showText: true,
    size: 1.2,
    padding: 0,
    markers: {
      rebound: true,
      breakout: true,
      goldenStar: true,
      pullback: true,
    },
    colors: DEFAULT_SIGNAL_COLORS,
  },
  mcdx: {
    visible: true,
    bankerColor: '#C62828',
    hotMoneyColor: '#FFE600',
    retailColor: '#2E7D32',
    maPeriod: 9,
    maColor: '#FFFFFF',
    maWidth: 2,
  },
  volume: {
    visible: true,
  },
  ultimateRsi: {
    visible: true,
    length: 14,
    smoType1: 'RMA',
    smooth: 14,
    smoType2: 'EMA',
    source: 'close',
    obValue: 80,
    osValue: 20,
    obColor: '#089981',
    osColor: '#F23645',
    rsiColor: '#E2E8F0',
    signalColor: '#FF5D00',
    autoColor: true,
    showArea: true,
    signals: {
      buyCross: true,
      reversal: true,
      buyZone: true,
    },
  },
};
