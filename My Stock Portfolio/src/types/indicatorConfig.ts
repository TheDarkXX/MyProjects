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

export type RSIMarkerShape = 'diamond' | 'circle' | 'cross' | 'square' | 'arrowUp' | 'arrowDown';
export type RSIMarkerLocation = 'bottom' | 'onCurve';

export interface UltimateRSISignalsConfig {
  buyCross: boolean;    // arsi < 30 and crossover
  reversal: boolean;    // arsi[1] < 20 and signal[1] < 20 and arsi >= 20 and arsi < 30
  buyZone: boolean;     // barssince(cross) < 10 and arsi in [20,40] and signal in [20,40]
  buyCrossShape?: RSIMarkerShape;
  buyCrossLocation?: RSIMarkerLocation;
  buyCrossColor?: string;
  reversalShape?: RSIMarkerShape;
  reversalLocation?: RSIMarkerLocation;
  reversalColor?: string;
  buyZoneShape?: RSIMarkerShape;
  buyZoneLocation?: RSIMarkerLocation;
  buyZoneColor?: string;
}

export interface UltimateRSIConfig {
  visible: boolean;
  length: number;
  smoType1: MAMethod;
  smooth: number;
  smoType2: MAMethod;
  source: 'close' | 'hl2' | 'hlc3';
  obValue: number;
  midValue?: number;
  osValue: number;
  obColor: string;
  midColor?: string;
  osColor: string;
  rsiColor: string;
  signalColor: string;
  rsiVisible?: boolean;
  signalVisible?: boolean;
  obVisible?: boolean;
  midVisible?: boolean;
  osVisible?: boolean;
  autoColor: boolean;
  showArea: boolean;
  signals: UltimateRSISignalsConfig;
}

export interface TrendSpeedConfig {
  visible: boolean;
  maxLength: number;
  accelMultiplier: number;
  enableTable: boolean;
  lookbackPeriod: number;
  enableCandles: boolean;
  collectionPeriod: number;
  upTrendColor: string;
  dnTrendColor: string;
  upHistColor1: string;
  upHistColor2: string;
  dnHistColor1: string;
  dnHistColor2: string;
  dynamicTrendVisible: boolean;
  dynamicTrendLineWidth: number;
  trendSpeedVisible: boolean;
  plotCandleVisible: boolean;
  tableVisible: boolean;
}

export interface SMCLiteConfig {
  visible: boolean;
  // Settings
  swingLength: number;
  boxWidth: number;
  historyToKeep: number;
  // Visual Settings
  showZigzag: boolean;
  showPriceActionLabels: boolean;
  supplyColor: string;
  supplyOutlineColor: string;
  demandColor: string;
  demandOutlineColor: string;
  bosLabelColor: string;
  poiLabelColor: string;
  swingTypeColor: string;
  zigzagColor: string;
  // Display Options
  showSMA: boolean;
  showArrows: boolean;
  showLabels: boolean;
  showPriceOnly: boolean;
  labelPosition: 'Outside' | 'Inside';
  labelDistance: number;
  // SMA Settings
  smaFastLen: number;
  smaSlowLen: number;
  fastLineWidth: number;
  slowLineWidth: number;
  fastSMAColor: string;
  slowSMAColor: string;
  // Style Tab Toggles
  showFastSMA: boolean;
  showSlowSMA: boolean;
  showBuySignal: boolean;
  showSellSignal: boolean;
  showBoxes: boolean;
  showLines: boolean;
  showPaneLabels: boolean;
}

export interface AnchoredVWAPConfig {
  visible: boolean;
  source: 'close' | 'hl2' | 'hlc3' | 'ohlc4' | 'open' | 'high' | 'low';
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  showBands: boolean;
  bandMultiplier: number;
  // Style
  vwapVisible: boolean;
  vwapColor: string;
  vwapLineWidth: number;
  vwapLineStyle: LineStyleOption;
  upperBandVisible: boolean;
  upperBandColor: string;
  upperBandLineWidth: number;
  upperBandLineStyle: LineStyleOption;
  lowerBandVisible: boolean;
  lowerBandColor: string;
  lowerBandLineWidth: number;
  lowerBandLineStyle: LineStyleOption;
}

export interface SuperMoneySignalConfig {
  visible: boolean;
  // Super Money Settings
  bankerBase: number;
  bankerRsiPeriod: number;
  hotMoneyRsiBase: number;
  hotMoneyRsiPeriod: number;
  sensitivityBanker: number;
  sensitivityHotMoney: number;
  hideRsi: boolean;
  // Trigger Settings
  readyDays: number;
  buyDays: number;
  noSignalDays: number;
  // Alerts
  alertReady: boolean;
  alertBuy: boolean;
  // Style
  retailerColor: string;
  hotMoneyColor: string;
  bankerColor: string;
  superMoneyColor: string;
  bankerMaColor: string;
  showReadySignal: boolean;
  readySignalColor: string;
  readySignalShape: RSIMarkerShape;
  readySignalLocation: 'bottom' | 'belowBar';
  showBuySignal: boolean;
  buySignalColor: string;
  buySignalShape: RSIMarkerShape;
  buySignalLocation: 'belowBar';
  showNoSignal: boolean;
  noSignalColor: string;
  noSignalShape: RSIMarkerShape;
  noSignalLocation: 'belowBar';
  showPaneLabels: boolean;
  showText: boolean;
  size: number;
  padding: number;
}

export type SubPaneIndicatorId = 'mcdx' | 'ultimateRsi' | 'trendSpeed';

export interface PaneLayout {
  assignments: Record<SubPaneIndicatorId, number>;
}

export const DEFAULT_PANE_LAYOUT: PaneLayout = {
  assignments: {
    mcdx: 1,
    ultimateRsi: 2,
    trendSpeed: 3,
  },
};

export interface PaneHeights {
  mcdx: number;
  ultimateRsi: number;
  trendSpeed: number;
}

export const DEFAULT_PANE_HEIGHTS: PaneHeights = {
  mcdx: 140,
  ultimateRsi: 140,
  trendSpeed: 140,
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
  trendSpeed: TrendSpeedConfig;
  smcLite: SMCLiteConfig;
  anchoredVwap: AnchoredVWAPConfig;
  superMoneySignal: SuperMoneySignalConfig;
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
    midValue: 50,
    osValue: 20,
    obColor: '#089981',
    midColor: '#787B86',
    osColor: '#F23645',
    rsiColor: '#26A69A',
    signalColor: '#FF5D00',
    rsiVisible: true,
    signalVisible: true,
    obVisible: true,
    midVisible: true,
    osVisible: true,
    autoColor: true,
    showArea: true,
    signals: {
      buyCross: true,
      buyCrossShape: 'diamond',
      buyCrossLocation: 'bottom',
      buyCrossColor: '#FFFFFF',
      reversal: true,
      reversalShape: 'circle',
      reversalLocation: 'bottom',
      reversalColor: '#FFE600',
      buyZone: true,
      buyZoneShape: 'cross',
      buyZoneLocation: 'bottom',
      buyZoneColor: '#22c55e',
    },
  },
  trendSpeed: {
    visible: true,
    maxLength: 50,
    accelMultiplier: 0.01,
    enableTable: true,
    lookbackPeriod: 150,
    enableCandles: true,
    collectionPeriod: 100,
    upTrendColor: '#F7D02C',
    dnTrendColor: '#FFF8DB',
    upHistColor1: '#F7D02C',
    upHistColor2: '#FFE600',
    dnHistColor1: '#9E2A2B',
    dnHistColor2: '#C83337',
    dynamicTrendVisible: true,
    dynamicTrendLineWidth: 2,
    trendSpeedVisible: true,
    plotCandleVisible: true,
    tableVisible: true,
  },
  smcLite: {
    visible: true,
    swingLength: 10,
    boxWidth: 2.5,
    historyToKeep: 20,
    showZigzag: false,
    showPriceActionLabels: false,
    supplyColor: 'rgba(30, 58, 95, 0.45)',
    supplyOutlineColor: 'rgba(255, 255, 255, 0.25)',
    demandColor: 'rgba(180, 83, 9, 0.45)',
    demandOutlineColor: 'rgba(255, 255, 255, 0.25)',
    bosLabelColor: '#FFFFFF',
    poiLabelColor: '#FFFFFF',
    swingTypeColor: '#000000',
    zigzagColor: '#000000',
    showSMA: true,
    showArrows: true,
    showLabels: true,
    showPriceOnly: false,
    labelPosition: 'Outside',
    labelDistance: 1.5,
    smaFastLen: 15,
    smaSlowLen: 200,
    fastLineWidth: 1,
    slowLineWidth: 2,
    fastSMAColor: '#3B82F6',
    slowSMAColor: '#F59E0B',
    showFastSMA: false,
    showSlowSMA: true,
    showBuySignal: false,
    showSellSignal: false,
    showBoxes: true,
    showLines: true,
    showPaneLabels: false,
  },
  anchoredVwap: {
    visible: true,
    source: 'hlc3',
    startDate: '',
    startTime: '00:00',
    showBands: true,
    bandMultiplier: 0.5,
    vwapVisible: true,
    vwapColor: '#FFFFFF',
    vwapLineWidth: 3,
    vwapLineStyle: 'Solid',
    upperBandVisible: false,
    upperBandColor: '#94A3B8',
    upperBandLineWidth: 2,
    upperBandLineStyle: 'Dashed',
    lowerBandVisible: false,
    lowerBandColor: '#94A3B8',
    lowerBandLineWidth: 2,
    lowerBandLineStyle: 'Dashed',
  },
  superMoneySignal: {
    visible: true,
    bankerBase: 50,
    bankerRsiPeriod: 50,
    hotMoneyRsiBase: 30,
    hotMoneyRsiPeriod: 40,
    sensitivityBanker: 1.5,
    sensitivityHotMoney: 0.7,
    hideRsi: true,
    readyDays: 3,
    buyDays: 5,
    noSignalDays: 3,
    alertReady: true,
    alertBuy: true,
    retailerColor: '#005e07',
    hotMoneyColor: '#d8c200',
    bankerColor: '#ff0000',
    superMoneyColor: '#00E5FF',
    bankerMaColor: '#0DAABF',
    showReadySignal: true,
    readySignalColor: '#FFFFFF',
    readySignalShape: 'arrowUp',
    readySignalLocation: 'belowBar',
    showBuySignal: true,
    buySignalColor: '#FFE600',
    buySignalShape: 'arrowUp',
    buySignalLocation: 'belowBar',
    showNoSignal: false,
    noSignalColor: '#800000',
    noSignalShape: 'arrowDown',
    noSignalLocation: 'belowBar',
    showPaneLabels: true,
    showText: true,
    size: 1.2,
    padding: 0,
  },
};
