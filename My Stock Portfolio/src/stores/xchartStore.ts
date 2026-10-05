import { create } from 'zustand';
import { api } from '../services/api';
import { SYNC_KEYS, pushSettingDebounced, registerSyncHandler } from '../services/settingsSync';
import { IndicatorSettings, DEFAULT_INDICATOR_SETTINGS } from '../types/indicatorConfig';
import { useIndicatorStore, registerTabIndicatorSync } from './useIndicatorStore';

export type XChartTabType = 'STOCK' | 'CURRENCY' | 'HEATMAP' | 'MYPORT' | 'COMPARE';

export type TimeFrame = '7D' | '1M' | '3M' | '6M' | '10M' | '1Y' | 'ALL';
export type ChartStyle = 'CANDLE' | 'HEIKIN_ASHI' | 'AREA';
export type Resolution = '1D' | '1W' | '4H';

export type CompareTimeFrame = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'MAX';

export interface CompareLineStyleConfig {
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: 'SOLID' | 'DASHED' | 'DOTTED';
  opacity: number;
  pointMarkersVisible?: boolean;
  pointMarkersRadius?: number;
}

export interface CompareRefSeries extends CompareLineStyleConfig {
  id: string;
  symbol: string;
  name?: string;
  visible: boolean;
}

export interface CompareTabConfig {
  timeframe: CompareTimeFrame;
  targetStyle: CompareLineStyleConfig;
  refs: CompareRefSeries[];
  showBaselineZero?: boolean;
  baselineStyle?: 'SOLID' | 'DASHED' | 'DOTTED';
  baselineColor?: string;
  showPointMarkers?: boolean;
  pointMarkersRadius?: number;
  applyMarkersToRefs?: boolean;
}

export interface XChartTabChartSettings {
  timeframe: TimeFrame;
  chartStyle: ChartStyle;
  resolution: Resolution;
  indicatorSettings?: IndicatorSettings;
}

export interface XChartTab {
  id: string;
  type: XChartTabType;
  symbol: string;
  title: string;
  timeframe?: TimeFrame;
  chartStyle?: ChartStyle;
  resolution?: Resolution;
  showEnvelope?: boolean;
  showSignals?: boolean;
  settings?: XChartTabChartSettings;
  compareConfig?: CompareTabConfig;
}

export type MyPortSortColumn = 'symbol' | 'price' | 'change' | 'percentChange' | 'tier';
export type MyPortSortDir = 'asc' | 'desc';

export interface MyPortWatchlistPreferences {
  sortColumn: MyPortSortColumn;
  sortDir: MyPortSortDir;
  holdingsCollapsed: boolean;
  targetCollapsed: boolean;
  indexCollapsed?: boolean;
}

export interface WatchlistSection {
  id: string;
  name: string;
  isCollapsed?: boolean;
  symbols: string[];
}

export interface WatchlistQuote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  shortName: string;
  exchange: string;
  marketState: string;
}

export type WatchlistSortColumn = 'symbol' | 'price' | 'change' | 'percentChange' | 'tier' | null;
export type WatchlistSortDir = 'asc' | 'desc';

export const DEFAULT_MYPORT_PREFERENCES: MyPortWatchlistPreferences = {
  sortColumn: 'percentChange',
  sortDir: 'desc', // 'desc' = ติดลบเยอะสุดอยู่บนสุด as default
  holdingsCollapsed: false,
  targetCollapsed: false,
  indexCollapsed: false,
};

const MYPORT_PREFERENCES_KEY = SYNC_KEYS.MYPORT_PREFERENCES;

export function createDefaultTabSettings(type: XChartTabType, symbol: string): XChartTabChartSettings {
  const isCurrency = type === 'CURRENCY' || symbol.includes('=X');
  return {
    timeframe: isCurrency ? '1Y' : '10M',
    chartStyle: 'CANDLE',
    resolution: '1D',
    indicatorSettings: {
      ...DEFAULT_INDICATOR_SETTINGS,
      ema1: { ...DEFAULT_INDICATOR_SETTINGS.ema1, visible: true },
      ema2: { ...DEFAULT_INDICATOR_SETTINGS.ema2, visible: true },
      ema3: { ...DEFAULT_INDICATOR_SETTINGS.ema3, visible: true },
      signals: {
        ...DEFAULT_INDICATOR_SETTINGS.signals,
        visible: isCurrency ? false : true,
      },
      mcdx: {
        ...DEFAULT_INDICATOR_SETTINGS.mcdx,
        visible: isCurrency ? false : true,
      },
    },
  };
}

export const DEFAULT_COMPARE_TARGET_STYLE: CompareLineStyleConfig = {
  color: '#F59E0B',
  lineWidth: 3,
  lineStyle: 'SOLID',
  opacity: 1.0,
  pointMarkersVisible: true,
  pointMarkersRadius: 4,
};

export const DEFAULT_COMPARE_PRESETS = [
  { symbol: 'SCHG', name: 'Schwab Growth ETF', color: '#38BDF8' },
  { symbol: 'GOOGL', name: 'Alphabet / Google', color: '#4285F4' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', color: '#22C55E' },
  { symbol: 'GLD', name: 'Gold Trust (GLD)', color: '#EAB308' },
  { symbol: 'BTC-USD', name: 'Bitcoin (BTC)', color: '#F97316' },
  { symbol: 'SPY', name: 'S&P 500 ETF', color: '#3B82F6' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', color: '#A855F7' },
];

export interface CompareBundleItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  tickers: { symbol: string; name: string; color: string }[];
}

export const COMPARE_BUNDLES: CompareBundleItem[] = [
  {
    id: 'mag7',
    name: 'Mag 7 Titans',
    icon: '👑',
    description: 'Nvidia, Microsoft, Apple, Amazon, Google, Meta, Tesla',
    tickers: [
      { symbol: 'NVDA', name: 'NVIDIA Corp', color: '#22C55E' },
      { symbol: 'MSFT', name: 'Microsoft Corp', color: '#00A4EF' },
      { symbol: 'AAPL', name: 'Apple Inc', color: '#CBD5E1' },
      { symbol: 'AMZN', name: 'Amazon.com', color: '#FF9900' },
      { symbol: 'GOOGL', name: 'Alphabet Google', color: '#4285F4' },
      { symbol: 'META', name: 'Meta Platforms', color: '#0668E1' },
      { symbol: 'TSLA', name: 'Tesla Inc', color: '#E82127' },
    ],
  },
  {
    id: 'macro',
    name: 'Macro Indices',
    icon: '🏛️',
    description: 'S&P 500, Nasdaq 100, Dow Jones, Russell 2000, Schwab Growth',
    tickers: [
      { symbol: 'SPY', name: 'S&P 500 ETF', color: '#3B82F6' },
      { symbol: 'QQQ', name: 'Nasdaq 100 ETF', color: '#A855F7' },
      { symbol: 'DIA', name: 'Dow Jones ETF', color: '#38BDF8' },
      { symbol: 'IWM', name: 'Russell 2000 ETF', color: '#F59E0B' },
      { symbol: 'SCHG', name: 'Schwab Growth ETF', color: '#06B6D4' },
    ],
  },
  {
    id: 'assets',
    name: 'Asset Classes',
    icon: '🌍',
    description: 'Gold, Bitcoin, 20Y Treasury, Oil Fund',
    tickers: [
      { symbol: 'GLD', name: 'Gold Trust (GLD)', color: '#EAB308' },
      { symbol: 'BTC-USD', name: 'Bitcoin (BTC)', color: '#F97316' },
      { symbol: 'TLT', name: '20Y Treasury Bond', color: '#06B6D4' },
      { symbol: 'USO', name: 'United States Oil', color: '#84CC16' },
    ],
  },
  {
    id: 'semis',
    name: 'Semi Titans',
    icon: '🔬',
    description: 'Nvidia, TSMC, ASML, Broadcom, AMD',
    tickers: [
      { symbol: 'NVDA', name: 'NVIDIA Corp', color: '#22C55E' },
      { symbol: 'TSM', name: 'TSMC ADR', color: '#38BDF8' },
      { symbol: 'ASML', name: 'ASML Holding', color: '#A855F7' },
      { symbol: 'AVGO', name: 'Broadcom Inc', color: '#EC4899' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', color: '#EF4444' },
    ],
  },
];

export function createDefaultCompareConfig(symbol: string): CompareTabConfig {
  const cleanTarget = (symbol || 'NVDA').trim().toUpperCase();
  // Filter out target symbol so it does not duplicate as a reference
  const candidatePresets = DEFAULT_COMPARE_PRESETS.filter((p) => p.symbol !== cleanTarget);
  // Default refs requested by user: SCHG, GOOGL, NVDA, GLD, BTC-USD (or SPY/QQQ if target matches one)
  const selectedPresets = candidatePresets.slice(0, 5);

  const refs: CompareRefSeries[] = selectedPresets.map((p, idx) => ({
    id: `ref-${p.symbol.toLowerCase()}-${Date.now()}-${idx}`,
    symbol: p.symbol,
    name: p.name,
    color: p.color,
    lineWidth: 2,
    lineStyle: 'SOLID',
    opacity: 0.85,
    visible: true,
    pointMarkersVisible: false,
    pointMarkersRadius: 3,
  }));

  return {
    timeframe: '1Y',
    targetStyle: { ...DEFAULT_COMPARE_TARGET_STYLE },
    refs,
    showBaselineZero: true,
    baselineStyle: 'DASHED',
    baselineColor: 'rgba(255, 255, 255, 0.45)',
    showPointMarkers: true,
    pointMarkersRadius: 4,
    applyMarkersToRefs: false,
  };
}

export function ensureTabSettings(tab: XChartTab): XChartTab {
  if (tab.type === 'HEATMAP' || tab.type === 'COMPARE') return tab;
  const def = createDefaultTabSettings(tab.type, tab.symbol);
  return {
    ...tab,
    timeframe: tab.timeframe || def.timeframe,
    chartStyle: tab.chartStyle || def.chartStyle,
    resolution: tab.resolution || def.resolution,
    settings: {
      timeframe: tab.settings?.timeframe || tab.timeframe || def.timeframe,
      chartStyle: tab.settings?.chartStyle || tab.chartStyle || def.chartStyle,
      resolution: tab.settings?.resolution || tab.resolution || def.resolution,
      indicatorSettings: tab.settings?.indicatorSettings || def.indicatorSettings,
    },
  };
}

interface XChartState {
  tabs: XChartTab[];
  activeTabId: string;
  watchlistCollapsed: boolean;

  // MyPort Watchlist preferences (Synced to Cloud)
  myportPreferences: MyPortWatchlistPreferences;
  setMyPortSort: (column: MyPortSortColumn) => void;
  toggleMyPortHoldingsCollapse: () => void;
  toggleMyPortTargetCollapse: () => void;
  toggleMyPortIndexCollapse: () => void;
  applyCloudMyPortPreferences: (prefs: Partial<MyPortWatchlistPreferences>) => void;

  // Per-Tab Chart Settings
  updateTabChartSettings: (tabId: string, settings: Partial<XChartTabChartSettings>) => void;

  // Watchlist state
  watchlistSections: WatchlistSection[];
  watchlistPrices: Record<string, WatchlistQuote>;
  watchlistSortColumn: WatchlistSortColumn;
  watchlistSortDir: WatchlistSortDir;
  watchlistDetailSymbol: string | null;
  watchlistDetailCollapsed: boolean;
  watchlistLoading: boolean;

  setActiveTabId: (id: string) => void;
  addTab: (tab: { type: XChartTabType; symbol: string; title?: string }) => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<XChartTab>) => void;
  changeSymbolOnActiveTab: (symbol: string, title?: string) => void;
  toggleWatchlist: () => void;

  // Watchlist actions
  addSymbolToSection: (sectionId: string, symbol: string) => void;
  removeSymbolFromSection: (sectionId: string, symbol: string) => void;
  addSection: (name: string) => void;
  removeSection: (sectionId: string) => void;
  renameSection: (sectionId: string, newName: string) => void;
  toggleSectionCollapse: (sectionId: string) => void;
  toggleAllSectionsCollapse: () => void;
  setWatchlistSort: (column: WatchlistSortColumn) => void;
  setWatchlistDetailSymbol: (symbol: string | null) => void;
  moveSymbol: (sourceSectionId: string, destSectionId: string, fromIndex: number, toIndex: number) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  setWatchlistSections: (nextSections: WatchlistSection[]) => void;
  toggleWatchlistDetail: () => void;
  fetchWatchlistQuotes: () => Promise<void>;
  resetToTVWatchlist: () => void;
  // Compare tab actions
  updateCompareConfig: (tabId: string, config: Partial<CompareTabConfig>) => void;
  addCompareRef: (tabId: string, ref: { symbol: string; name?: string; color?: string; lineWidth?: 1 | 2 | 3 | 4; lineStyle?: 'SOLID' | 'DASHED' | 'DOTTED'; opacity?: number; visible?: boolean; id?: string }) => void;
  removeCompareRef: (tabId: string, refId: string) => void;
  toggleCompareRefVisible: (tabId: string, refId: string) => void;
  updateCompareRefStyle: (tabId: string, refId: string, style: Partial<CompareLineStyleConfig>) => void;
  updateCompareTargetStyle: (tabId: string, style: Partial<CompareLineStyleConfig>) => void;
  applyCompareBundle: (tabId: string, bundleId: string) => void;

  applyCloudTabs: (data: { tabs: XChartTab[]; activeTabId?: string }) => void;
  applyCloudWatchlist: (sections: WatchlistSection[]) => void;
  applyCloudDetailCollapsed: (collapsed: boolean) => void;
}

const TABS_STORAGE_KEY = 'xchart_tabs_state_v1';
const WATCHLIST_STORAGE_KEY = 'stock_xchart_watchlist_v3';
const DETAIL_COLLAPSED_KEY = 'stock_xchart_detail_collapsed';

const DEFAULT_TABS: XChartTab[] = [
  {
    id: 'tab-main',
    type: 'STOCK',
    symbol: 'VRT',
    title: 'VRT',
    timeframe: '10M',
    chartStyle: 'CANDLE',
    resolution: '1D',
    showEnvelope: false,
    showSignals: true,
    settings: createDefaultTabSettings('STOCK', 'VRT'),
  },
  {
    id: 'tab-thb',
    type: 'CURRENCY',
    symbol: 'THB=X',
    title: 'USD/THB',
    timeframe: '1Y',
    chartStyle: 'CANDLE',
    resolution: '1D',
    showEnvelope: false,
    showSignals: false,
    settings: createDefaultTabSettings('CURRENCY', 'THB=X'),
  },
  {
    id: 'tab-heatmap',
    type: 'HEATMAP',
    symbol: 'HEATMAP',
    title: 'Market Heatmap'
  },
  {
    id: 'tab-myport',
    type: 'MYPORT',
    symbol: 'VRT',
    title: '💼 My Port',
    timeframe: 'ALL',
    chartStyle: 'CANDLE',
    resolution: '1D',
    showEnvelope: false,
    showSignals: true,
    settings: {
      ...createDefaultTabSettings('MYPORT', 'VRT'),
      timeframe: 'ALL',
    },
  }
];

export const TRADINGVIEW_WATCHLIST_SECTIONS: WatchlistSection[] = [
  {
    id: 'sec-stocks',
    name: 'STOCKS',
    isCollapsed: false,
    symbols: [
      'WMT', 'VRT', 'DUOL', 'BKNG', 'ELF', 'KLAC', 'GOOGL', 'UBER', 'UNH', 'SPGI',
      'ASML', 'CEG', 'ETN', 'TSM', 'WM', 'NVO', 'ORLY', 'AAPL', 'APP', 'ELV',
      'CRM', 'GWW', 'KO', 'APH', 'TTD', 'MA', 'ADBE', 'MSFT', 'CAH', 'V',
      'PANW', 'RTX', 'LLY', 'ANET', 'TSLA', 'BRK-B', 'JPM', 'INTC', 'ARM', 'FICO',
      'WFC', 'AMD', 'MRVL', 'NET'
    ]
  },
  {
    id: 'sec-strong-growth',
    name: 'STRONG GROWTH',
    isCollapsed: false,
    symbols: ['SOFI', 'AVGO', 'NVDA', 'PLTR', 'ALAB']
  },
  {
    id: 'sec-small-cap',
    name: 'SMALL CAP',
    isCollapsed: false,
    symbols: ['ASTS', 'TWST', 'RKLB', 'VKTX', 'ISRG', 'CRDO', 'JMIA', 'DOCN']
  },
  {
    id: 'sec-waiting',
    name: 'WAITING',
    isCollapsed: false,
    symbols: [
      'EOSE', 'IREN', 'IONQ', 'CRWV', 'AXON', 'MELI', 'NVTS', 'HIMS', 'GOOG', 'SFM',
      'AMZN', 'TMDX', 'COST', 'RBRK', 'NFLX', 'CRWD', 'STRL', 'NBIS', 'OKLO', 'ORCL', 'META'
    ]
  },
  {
    id: 'sec-exchange',
    name: 'EXCHANGE',
    isCollapsed: false,
    symbols: ['SCHD', 'SCHG', '^GSPC', 'QQQ', 'JEPQ', 'THB=X']
  },
  {
    id: 'sec-commodities-crypto',
    name: 'COMMODITIES & CRYPTO',
    isCollapsed: false,
    symbols: ['BTC-USD', 'GC=F', 'CL=F']
  }
];

const DEFAULT_SECTIONS: WatchlistSection[] = TRADINGVIEW_WATCHLIST_SECTIONS;

function loadSavedMyPortPreferences(): MyPortWatchlistPreferences {
  if (typeof window === 'undefined') return DEFAULT_MYPORT_PREFERENCES;
  try {
    const raw = localStorage.getItem(MYPORT_PREFERENCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          sortColumn: parsed.sortColumn || 'percentChange',
          sortDir: parsed.sortDir || 'desc',
          holdingsCollapsed: Boolean(parsed.holdingsCollapsed),
          targetCollapsed: Boolean(parsed.targetCollapsed),
          indexCollapsed: Boolean(parsed.indexCollapsed),
        };
      }
    }
  } catch (e) {}
  try {
    const legH = localStorage.getItem('myport_holdings_collapsed') === 'true';
    const legT = localStorage.getItem('myport_target_collapsed') === 'true';
    const legI = localStorage.getItem('myport_index_collapsed') === 'true';
    return {
      ...DEFAULT_MYPORT_PREFERENCES,
      holdingsCollapsed: legH,
      targetCollapsed: legT,
      indexCollapsed: legI,
    };
  } catch (e) {}
  return DEFAULT_MYPORT_PREFERENCES;
}

function persistMyPortPreferences(prefs: MyPortWatchlistPreferences) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MYPORT_PREFERENCES_KEY, JSON.stringify(prefs));
      pushSettingDebounced(MYPORT_PREFERENCES_KEY, prefs);
    } catch (e) {}
  }
}

function loadSavedTabs(): { tabs: XChartTab[]; activeTabId: string } {
  if (typeof window === 'undefined') {
    return { tabs: DEFAULT_TABS, activeTabId: DEFAULT_TABS[0].id };
  }
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        const activeId = parsed.tabs.some((t: XChartTab) => t.id === parsed.activeTabId)
          ? parsed.activeTabId
          : parsed.tabs[0].id;
        const mappedTabs = parsed.tabs.map(ensureTabSettings);
        return { tabs: mappedTabs, activeTabId: activeId };
      }
    }
  } catch (e) {
    console.warn('[xchartStore] Failed to load saved tabs:', e);
  }
  return { tabs: DEFAULT_TABS, activeTabId: DEFAULT_TABS[0].id };
}

function persistTabs(tabs: XChartTab[], activeTabId: string) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
      pushSettingDebounced(TABS_STORAGE_KEY, { tabs, activeTabId });
    } catch (e) {
      console.warn('[xchartStore] Failed to save tabs to localStorage:', e);
    }
  }
}

function loadSavedSections(): WatchlistSection[] {
  if (typeof window === 'undefined') return DEFAULT_SECTIONS;
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[xchartStore] Failed to load saved watchlist sections:', e);
  }
  return DEFAULT_SECTIONS;
}

function persistSections(sections: WatchlistSection[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(sections));
      pushSettingDebounced(WATCHLIST_STORAGE_KEY, sections);
    } catch (e) {
      console.warn('[xchartStore] Failed to save watchlist to localStorage:', e);
    }
  }
}

const initialTabs = loadSavedTabs();
const initialSections = loadSavedSections();
const initialDetailCollapsed = typeof window !== 'undefined' ? localStorage.getItem(DETAIL_COLLAPSED_KEY) === 'true' : false;
const initialMyPortPrefs = loadSavedMyPortPreferences();

export const useXChartStore = create<XChartState>((set, get) => ({
  tabs: initialTabs.tabs,
  activeTabId: initialTabs.activeTabId,
  watchlistCollapsed: typeof window !== 'undefined' ? window.innerWidth < 768 : false,

  // MyPort Watchlist preferences (Synced to Cloud)
  myportPreferences: initialMyPortPrefs,

  setMyPortSort: (column: MyPortSortColumn) => {
    const { myportPreferences } = get();
    let nextDir: MyPortSortDir = column === 'tier' ? 'asc' : 'desc';
    if (myportPreferences.sortColumn === column) {
      nextDir = myportPreferences.sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      nextDir = column === 'tier' ? 'asc' : 'desc';
    }
    const nextPrefs: MyPortWatchlistPreferences = {
      ...myportPreferences,
      sortColumn: column,
      sortDir: nextDir,
    };
    set({ myportPreferences: nextPrefs });
    persistMyPortPreferences(nextPrefs);
  },

  toggleMyPortHoldingsCollapse: () => {
    const { myportPreferences } = get();
    const nextPrefs: MyPortWatchlistPreferences = {
      ...myportPreferences,
      holdingsCollapsed: !myportPreferences.holdingsCollapsed,
    };
    set({ myportPreferences: nextPrefs });
    persistMyPortPreferences(nextPrefs);
  },

  toggleMyPortTargetCollapse: () => {
    const { myportPreferences } = get();
    const nextPrefs: MyPortWatchlistPreferences = {
      ...myportPreferences,
      targetCollapsed: !myportPreferences.targetCollapsed,
    };
    set({ myportPreferences: nextPrefs });
    persistMyPortPreferences(nextPrefs);
  },

  toggleMyPortIndexCollapse: () => {
    const { myportPreferences } = get();
    const nextPrefs: MyPortWatchlistPreferences = {
      ...myportPreferences,
      indexCollapsed: !myportPreferences.indexCollapsed,
    };
    set({ myportPreferences: nextPrefs });
    persistMyPortPreferences(nextPrefs);
  },

  applyCloudMyPortPreferences: (prefs) => {
    if (!prefs || typeof prefs !== 'object') return;
    const { myportPreferences } = get();
    const nextPrefs: MyPortWatchlistPreferences = {
      ...myportPreferences,
      ...prefs,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MYPORT_PREFERENCES_KEY, JSON.stringify(nextPrefs));
      } catch {}
    }
    set({ myportPreferences: nextPrefs });
  },

  // Per-Tab Chart Settings
  updateTabChartSettings: (tabId: string, settingsUpdate: Partial<XChartTabChartSettings>) => {
    const { tabs, activeTabId } = get();
    let hasChanged = false;
    const nextTabs = tabs.map((t) => {
      if (t.id !== tabId) return t;
      hasChanged = true;
      const currentSettings = t.settings || createDefaultTabSettings(t.type, t.symbol);
      const nextSettings: XChartTabChartSettings = {
        ...currentSettings,
        ...settingsUpdate,
        indicatorSettings: settingsUpdate.indicatorSettings
          ? { ...(currentSettings.indicatorSettings || DEFAULT_INDICATOR_SETTINGS), ...settingsUpdate.indicatorSettings }
          : currentSettings.indicatorSettings,
      };
      return {
        ...t,
        timeframe: nextSettings.timeframe,
        chartStyle: nextSettings.chartStyle,
        resolution: nextSettings.resolution,
        settings: nextSettings,
      };
    });

    if (hasChanged) {
      set({ tabs: nextTabs });
      persistTabs(nextTabs, activeTabId);
    }
  },

  watchlistSections: initialSections,
  watchlistPrices: {},
  watchlistSortColumn: 'percentChange',
  watchlistSortDir: 'desc',
  watchlistDetailSymbol: 'VRT',
  watchlistDetailCollapsed: initialDetailCollapsed,
  watchlistLoading: false,

  setActiveTabId: (id) => {
    const { tabs } = get();
    if (tabs.some((t) => t.id === id)) {
      set({ activeTabId: id });
      persistTabs(tabs, id);
      const activeTab = tabs.find((t) => t.id === id);
      if (activeTab && activeTab.type !== 'HEATMAP') {
        set({ watchlistDetailSymbol: activeTab.symbol });
        if (activeTab.settings?.indicatorSettings) {
          useIndicatorStore.getState().loadTabConfig(id, activeTab.settings.indicatorSettings);
        }
      }
    }
  },

  addTab: ({ type, symbol, title }) => {
    const { tabs } = get();
    const cleanSym = symbol.trim().toUpperCase();
    const existing = tabs.find((t) => t.type === type && t.symbol === cleanSym);
    if (existing) {
      set({ activeTabId: existing.id, watchlistDetailSymbol: cleanSym });
      persistTabs(tabs, existing.id);
      if (existing.settings?.indicatorSettings) {
        useIndicatorStore.getState().loadTabConfig(existing.id, existing.settings.indicatorSettings);
      }
      return;
    }

    if (type === 'COMPARE') {
      const compareConfig = createDefaultCompareConfig(cleanSym);
      const newTab: XChartTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'COMPARE',
        symbol: cleanSym,
        title: title || `📈 Compare: ${cleanSym}`,
        compareConfig,
      };
      const nextTabs = [...tabs, newTab];
      set({ tabs: nextTabs, activeTabId: newTab.id, watchlistDetailSymbol: cleanSym });
      persistTabs(nextTabs, newTab.id);
      return;
    }

    const defaultSettings = createDefaultTabSettings(type, cleanSym);
    const newTab: XChartTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      symbol: cleanSym,
      title: title || cleanSym,
      timeframe: defaultSettings.timeframe,
      chartStyle: defaultSettings.chartStyle,
      resolution: defaultSettings.resolution,
      showEnvelope: false,
      showSignals: type === 'STOCK',
      settings: defaultSettings,
    };

    const nextTabs = [...tabs, newTab];
    set({ tabs: nextTabs, activeTabId: newTab.id, watchlistDetailSymbol: cleanSym });
    persistTabs(nextTabs, newTab.id);
    useIndicatorStore.getState().loadTabConfig(newTab.id, defaultSettings.indicatorSettings);
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;

    const nextTabs = tabs.filter((t) => t.id !== id);
    let nextActiveId = activeTabId;
    if (activeTabId === id) {
      const closedIndex = tabs.findIndex((t) => t.id === id);
      const fallbackIndex = Math.max(0, closedIndex - 1);
      nextActiveId = nextTabs[fallbackIndex]?.id || nextTabs[0].id;
    }

    set({ tabs: nextTabs, activeTabId: nextActiveId });
    persistTabs(nextTabs, nextActiveId);
    const nextActive = nextTabs.find((t) => t.id === nextActiveId);
    if (nextActive?.settings?.indicatorSettings) {
      useIndicatorStore.getState().loadTabConfig(nextActiveId, nextActive.settings.indicatorSettings);
    }
  },

  updateTab: (id, updates) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => {
      if (t.id !== id) return t;
      const updatedTab = { ...t, ...updates };
      return ensureTabSettings(updatedTab);
    });
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  changeSymbolOnActiveTab: (symbol, title) => {
    const { tabs, activeTabId } = get();
    const active = tabs.find((t) => t.id === activeTabId);
    if (!active) return;

    const cleanSym = symbol.trim().toUpperCase();

    // Guard COMPARE tabs: swap the target symbol, never change tab type
    if (active.type === 'COMPARE') {
      const nextTabs = tabs.map((t) => {
        if (t.id !== activeTabId) return t;
        const currentConfig = t.compareConfig || createDefaultCompareConfig(cleanSym);
        // De-duplicate: If cleanSym was previously in refs, remove it (unselect from refs)
        const updatedRefs = currentConfig.refs.filter((r) => r.symbol && r.symbol.toUpperCase() !== cleanSym);
        return {
          ...t,
          symbol: cleanSym,
          title: title || `📈 Compare: ${cleanSym}`,
          compareConfig: {
            ...currentConfig,
            refs: updatedRefs,
          },
        };
      });
      set({ tabs: nextTabs, watchlistDetailSymbol: cleanSym });
      persistTabs(nextTabs, activeTabId);
      return;
    }

    // Guard HEATMAP / MYPORT tabs
    if (active.type === 'HEATMAP' || active.type === 'MYPORT') return;

    const isCurrency = cleanSym.includes('=X') || cleanSym.endsWith('=X');
    const type: XChartTabType = isCurrency ? 'CURRENCY' : 'STOCK';

    const nextTabs = tabs.map((t) =>
      t.id === activeTabId
        ? {
            ...t,
            symbol: cleanSym,
            title: title || (isCurrency && cleanSym === 'THB=X' ? 'USD/THB' : cleanSym),
            type
          }
        : t
    );

    set({ tabs: nextTabs, watchlistDetailSymbol: cleanSym });
    persistTabs(nextTabs, activeTabId);
  },

  toggleWatchlist: () => set((s) => ({ watchlistCollapsed: !s.watchlistCollapsed })),

  // Watchlist actions
  addSymbolToSection: (sectionId: string, symbol: string) => {
    const { watchlistSections, fetchWatchlistQuotes } = get();
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;

    const nextSections = watchlistSections.map((sec) => {
      if (sec.id === sectionId) {
        if (sec.symbols.includes(clean)) return sec;
        return { ...sec, symbols: [...sec.symbols, clean] };
      }
      return sec;
    });

    set({ watchlistSections: nextSections });
    persistSections(nextSections);
    fetchWatchlistQuotes();
  },

  removeSymbolFromSection: (sectionId: string, symbol: string) => {
    const { watchlistSections } = get();
    const clean = symbol.trim().toUpperCase();
    const nextSections = watchlistSections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, symbols: sec.symbols.filter((s) => s !== clean) };
      }
      return sec;
    });
    set({ watchlistSections: nextSections });
    persistSections(nextSections);
  },

  addSection: (name: string) => {
    const { watchlistSections } = get();
    const cleanName = name.trim().toUpperCase();
    if (!cleanName) return;

    const newSec: WatchlistSection = {
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      isCollapsed: false,
      symbols: []
    };
    const nextSections = [...watchlistSections, newSec];
    set({ watchlistSections: nextSections });
    persistSections(nextSections);
  },

  removeSection: (sectionId: string) => {
    const { watchlistSections } = get();
    if (watchlistSections.length <= 1) return; // Keep at least one section
    const nextSections = watchlistSections.filter((s) => s.id !== sectionId);
    set({ watchlistSections: nextSections });
    persistSections(nextSections);
  },

  renameSection: (sectionId: string, newName: string) => {
    const { watchlistSections } = get();
    const cleanName = newName.trim().toUpperCase();
    if (!cleanName) return;
    const nextSections = watchlistSections.map((s) =>
      s.id === sectionId ? { ...s, name: cleanName } : s
    );
    set({ watchlistSections: nextSections });
    persistSections(nextSections);
  },

  toggleSectionCollapse: (sectionId: string) => {
    const { watchlistSections } = get();
    const nextSections = watchlistSections.map((s) =>
      s.id === sectionId ? { ...s, isCollapsed: !s.isCollapsed } : s
    );
    set({ watchlistSections: nextSections });
    persistSections(nextSections);
  },

  toggleAllSectionsCollapse: () => {
    const { watchlistSections } = get();
    const allCollapsed = watchlistSections.length > 0 && watchlistSections.every((s) => s.isCollapsed);
    const nextSections = watchlistSections.map((s) => ({
      ...s,
      isCollapsed: !allCollapsed
    }));
    set({ watchlistSections: nextSections });
    persistSections(nextSections);
  },

  setWatchlistSort: (column: WatchlistSortColumn) => {
    const { watchlistSortColumn, watchlistSortDir } = get();
    if (watchlistSortColumn === column) {
      if (column === 'tier') {
        if (watchlistSortDir === 'asc') {
          set({ watchlistSortDir: 'desc' });
        } else {
          set({ watchlistSortColumn: null, watchlistSortDir: 'asc' });
        }
      } else {
        if (watchlistSortDir === 'desc') {
          set({ watchlistSortDir: 'asc' });
        } else {
          set({ watchlistSortColumn: null, watchlistSortDir: 'desc' });
        }
      }
    } else {
      set({ watchlistSortColumn: column, watchlistSortDir: column === 'tier' ? 'asc' : 'desc' });
    }
  },

  setWatchlistDetailSymbol: (symbol: string | null) => {
    set({ watchlistDetailSymbol: symbol });
  },

  moveSymbol: (sourceSectionId: string, destSectionId: string, fromIndex: number, toIndex: number) => {
    const { watchlistSections } = get();
    const nextSections = watchlistSections.map((s) => ({ ...s, symbols: [...s.symbols] }));
    const srcSec = nextSections.find((s) => s.id === sourceSectionId);
    const destSec = nextSections.find((s) => s.id === destSectionId);
    if (!srcSec || !destSec) return;
    if (fromIndex < 0 || fromIndex >= srcSec.symbols.length) return;

    const [sym] = srcSec.symbols.splice(fromIndex, 1);
    if (!sym) return;

    if (sourceSectionId === destSectionId) {
      const target = fromIndex < toIndex ? toIndex - 1 : toIndex;
      const clamped = Math.max(0, Math.min(srcSec.symbols.length, target));
      srcSec.symbols.splice(clamped, 0, sym);
    } else {
      const existing = destSec.symbols.indexOf(sym);
      if (existing !== -1) {
        destSec.symbols.splice(existing, 1);
      }
      const clamped = Math.max(0, Math.min(destSec.symbols.length, toIndex));
      destSec.symbols.splice(clamped, 0, sym);
    }

    set({ watchlistSections: nextSections, watchlistSortColumn: null });
    persistSections(nextSections);
  },

  moveSection: (fromIndex: number, toIndex: number) => {
    const { watchlistSections } = get();
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= watchlistSections.length || toIndex >= watchlistSections.length) return;
    const nextSections = [...watchlistSections];
    const [moved] = nextSections.splice(fromIndex, 1);
    if (!moved) return;
    nextSections.splice(toIndex, 0, moved);
    set({ watchlistSections: nextSections, watchlistSortColumn: null });
    persistSections(nextSections);
  },

  setWatchlistSections: (nextSections: WatchlistSection[]) => {
    set({ watchlistSections: nextSections, watchlistSortColumn: null });
    persistSections(nextSections);
  },

  toggleWatchlistDetail: () => {
    const next = !get().watchlistDetailCollapsed;
    set({ watchlistDetailCollapsed: next });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DETAIL_COLLAPSED_KEY, String(next));
        pushSettingDebounced(DETAIL_COLLAPSED_KEY, next);
      } catch {}
    }
  },

  fetchWatchlistQuotes: async () => {
    const { watchlistSections, watchlistPrices } = get();
    const sectionSymbols = watchlistSections.flatMap((s) => s.symbols);
    const INDEX_SYMBOLS = ['SPY', 'QQQ', 'SCHG', 'BTC-USD', 'GLD', 'USO', 'UUP', 'SMH', 'TLT'];
    const allSymbols = [...new Set([...sectionSymbols, ...INDEX_SYMBOLS])];
    if (allSymbols.length === 0) return;

    set({ watchlistLoading: true });
    try {
      const res = await api.prices.quoteBatch(allSymbols);
      if (res && typeof res === 'object') {
        set({ watchlistPrices: { ...watchlistPrices, ...res } });
      }
    } catch (err) {
      console.warn('[xchartStore] Failed to fetch batch quotes:', err);
    } finally {
      set({ watchlistLoading: false });
    }
  },

  resetToTVWatchlist: () => {
    set({ watchlistSections: TRADINGVIEW_WATCHLIST_SECTIONS });
    persistSections(TRADINGVIEW_WATCHLIST_SECTIONS);
    get().fetchWatchlistQuotes();
  },

  applyCloudTabs: (data) => {
    if (!data || !Array.isArray(data.tabs) || data.tabs.length === 0) return;
    const activeTabId = data.activeTabId && data.tabs.some((t) => t.id === data.activeTabId)
      ? data.activeTabId
      : data.tabs[0].id;
    const mappedTabs = data.tabs.map(ensureTabSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify({ tabs: mappedTabs, activeTabId }));
      } catch {}
    }
    set({ tabs: mappedTabs, activeTabId });
    const activeTab = mappedTabs.find((t) => t.id === activeTabId);
    if (activeTab?.settings?.indicatorSettings) {
      useIndicatorStore.getState().loadTabConfig(activeTabId, activeTab.settings.indicatorSettings);
    }
  },

  applyCloudWatchlist: (sections) => {
    if (!Array.isArray(sections) || sections.length === 0) return;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(sections));
      } catch {}
    }
    set({ watchlistSections: sections });
    get().fetchWatchlistQuotes();
  },

  applyCloudDetailCollapsed: (collapsed) => {
    if (typeof collapsed !== 'boolean') return;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(DETAIL_COLLAPSED_KEY, String(collapsed));
      } catch {}
    }
    set({ watchlistDetailCollapsed: collapsed });
  },

  // Compare Tab Actions
  updateCompareConfig: (tabId, config) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => {
      if (t.id !== tabId || t.type !== 'COMPARE') return t;
      const current = t.compareConfig || createDefaultCompareConfig(t.symbol);
      return {
        ...t,
        compareConfig: {
          ...current,
          ...config,
        },
      };
    });
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  addCompareRef: (tabId, ref) => {
    const { tabs, activeTabId } = get();
    const cleanSym = ref.symbol.trim().toUpperCase();
    const nextTabs = tabs.map((t) => {
      if (t.id !== tabId || t.type !== 'COMPARE') return t;
      const current = t.compareConfig || createDefaultCompareConfig(t.symbol);
      // Avoid duplicate symbol in refs or adding the target symbol as ref
      if (current.refs.some((r) => r.symbol && r.symbol.toUpperCase() === cleanSym) || (t.symbol && t.symbol.toUpperCase() === cleanSym)) {
        return t;
      }
      const newRef: CompareRefSeries = {
        id: ref.id || `ref-${cleanSym.toLowerCase()}-${Date.now()}`,
        symbol: cleanSym,
        name: ref.name || cleanSym,
        color: ref.color || '#3B82F6',
        lineWidth: ref.lineWidth ?? 2,
        lineStyle: ref.lineStyle || 'SOLID',
        opacity: ref.opacity ?? 0.85,
        visible: ref.visible ?? true,
      };
      return {
        ...t,
        compareConfig: {
          ...current,
          refs: [...current.refs, newRef],
        },
      };
    });
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  removeCompareRef: (tabId, refId) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => {
      if (t.id !== tabId || t.type !== 'COMPARE' || !t.compareConfig) return t;
      return {
        ...t,
        compareConfig: {
          ...t.compareConfig,
          refs: t.compareConfig.refs.filter((r) => r.id !== refId),
        },
      };
    });
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  toggleCompareRefVisible: (tabId, refId) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => {
      if (t.id !== tabId || t.type !== 'COMPARE' || !t.compareConfig) return t;
      return {
        ...t,
        compareConfig: {
          ...t.compareConfig,
          refs: t.compareConfig.refs.map((r) =>
            r.id === refId ? { ...r, visible: !r.visible } : r
          ),
        },
      };
    });
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  updateCompareRefStyle: (tabId, refId, style) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => {
      if (t.id !== tabId || t.type !== 'COMPARE' || !t.compareConfig) return t;
      return {
        ...t,
        compareConfig: {
          ...t.compareConfig,
          refs: t.compareConfig.refs.map((r) =>
            r.id === refId ? { ...r, ...style } : r
          ),
        },
      };
    });
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  updateCompareTargetStyle: (tabId, style) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => {
      if (t.id !== tabId || t.type !== 'COMPARE') return t;
      const current = t.compareConfig || createDefaultCompareConfig(t.symbol);
      return {
        ...t,
        compareConfig: {
          ...current,
          targetStyle: {
            ...current.targetStyle,
            ...style,
          },
        },
      };
    });
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  applyCompareBundle: (tabId, bundleId) => {
    const bundle = COMPARE_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    const currentTab = get().tabs.find((t) => t.id === tabId);
    const targetSymbol = (currentTab?.symbol || 'NVDA').trim().toUpperCase();

    const newRefs: CompareRefSeries[] = bundle.tickers
      .filter((t) => t.symbol && t.symbol.toUpperCase() !== targetSymbol)
      .map((t, idx) => ({
        id: `ref-${t.symbol.toLowerCase()}-${Date.now()}-${idx}`,
        symbol: t.symbol,
        name: t.name,
        color: t.color,
        lineWidth: 2,
        lineStyle: 'SOLID',
        opacity: 0.85,
        visible: true,
        pointMarkersVisible: false,
        pointMarkersRadius: 3,
      }));

    get().updateCompareConfig(tabId, { refs: newRefs });
  },
}));

registerTabIndicatorSync((tabId, config) => {
  useXChartStore.getState().updateTabChartSettings(tabId, { indicatorSettings: config });
});

registerSyncHandler(TABS_STORAGE_KEY, (val) => {
  useXChartStore.getState().applyCloudTabs(val);
});

registerSyncHandler(WATCHLIST_STORAGE_KEY, (val) => {
  useXChartStore.getState().applyCloudWatchlist(val);
});

registerSyncHandler(DETAIL_COLLAPSED_KEY, (val) => {
  useXChartStore.getState().applyCloudDetailCollapsed(val);
});

registerSyncHandler(SYNC_KEYS.MYPORT_PREFERENCES, (val) => {
  useXChartStore.getState().applyCloudMyPortPreferences(val);
});

