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
  rebound: boolean;   // ••• READY
  breakout: boolean;  // ▲ BUY
  goldenStar: boolean;// ★ SUPER
  pullback: boolean;  // ▼ EXIT
}

export interface SignalConfig {
  visible: boolean;
  markers: SignalMarkersConfig;
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

export type PresetType = 'full' | 'clean' | 'banker' | 'triple_ema' | 'custom';

export interface IndicatorSettings {
  activePreset: PresetType;
  ema1: EMALineConfig;
  ema2: EMALineConfig;
  ema3: EMALineConfig;
  envelope: EnvelopeConfig;
  signals: SignalConfig;
  mcdx: MCDXConfig;
  volume: VolumeConfig;
}

export const DEFAULT_INDICATOR_SETTINGS: IndicatorSettings = {
  activePreset: 'full',
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
    markers: {
      rebound: true,
      breakout: true,
      goldenStar: true,
      pullback: true,
    },
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
};
