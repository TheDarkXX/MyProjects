import { create } from 'zustand';
import { api } from '../services/api';

export type XChartTabType = 'STOCK' | 'CURRENCY' | 'HEATMAP';

export interface XChartTab {
  id: string;
  type: XChartTabType;
  symbol: string;
  title: string;
  timeframe?: '7D' | '1M' | '3M' | '6M' | '10M' | '1Y' | 'ALL';
  chartStyle?: 'CANDLE' | 'HEIKIN_ASHI' | 'AREA';
  resolution?: '1D' | '1W' | '4H';
  showEnvelope?: boolean;
  showSignals?: boolean;
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

export type WatchlistSortColumn = 'symbol' | 'price' | 'change' | 'percentChange' | null;
export type WatchlistSortDir = 'asc' | 'desc';

interface XChartState {
  tabs: XChartTab[];
  activeTabId: string;
  watchlistCollapsed: boolean;

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
  setWatchlistSort: (column: WatchlistSortColumn) => void;
  setWatchlistDetailSymbol: (symbol: string | null) => void;
  moveSymbol: (sourceSectionId: string, destSectionId: string, fromIndex: number, toIndex: number) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  setWatchlistSections: (nextSections: WatchlistSection[]) => void;
  toggleWatchlistDetail: () => void;
  fetchWatchlistQuotes: () => Promise<void>;
  resetToTVWatchlist: () => void;
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
    showSignals: true
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
    showSignals: false
  },
  {
    id: 'tab-heatmap',
    type: 'HEATMAP',
    symbol: 'HEATMAP',
    title: 'Market Heatmap'
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
        return { tabs: parsed.tabs, activeTabId: activeId };
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
    } catch (e) {
      console.warn('[xchartStore] Failed to save watchlist to localStorage:', e);
    }
  }
}

const initialTabs = loadSavedTabs();
const initialSections = loadSavedSections();
const initialDetailCollapsed = typeof window !== 'undefined' ? localStorage.getItem(DETAIL_COLLAPSED_KEY) === 'true' : false;

export const useXChartStore = create<XChartState>((set, get) => ({
  tabs: initialTabs.tabs,
  activeTabId: initialTabs.activeTabId,
  watchlistCollapsed: false,

  watchlistSections: initialSections,
  watchlistPrices: {},
  watchlistSortColumn: null,
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
      return;
    }

    const newTab: XChartTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      symbol: cleanSym,
      title: title || cleanSym,
      timeframe: '10M',
      chartStyle: 'CANDLE',
      resolution: '1D',
      showEnvelope: false,
      showSignals: type === 'STOCK'
    };

    const nextTabs = [...tabs, newTab];
    set({ tabs: nextTabs, activeTabId: newTab.id, watchlistDetailSymbol: cleanSym });
    persistTabs(nextTabs, newTab.id);
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
  },

  updateTab: (id, updates) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tabs: nextTabs });
    persistTabs(nextTabs, activeTabId);
  },

  changeSymbolOnActiveTab: (symbol, title) => {
    const { tabs, activeTabId } = get();
    const active = tabs.find((t) => t.id === activeTabId);
    if (!active) return;

    const cleanSym = symbol.trim().toUpperCase();
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

  setWatchlistSort: (column: WatchlistSortColumn) => {
    const { watchlistSortColumn, watchlistSortDir } = get();
    if (watchlistSortColumn === column) {
      if (watchlistSortDir === 'desc') {
        set({ watchlistSortDir: 'asc' });
      } else {
        set({ watchlistSortColumn: null, watchlistSortDir: 'desc' });
      }
    } else {
      set({ watchlistSortColumn: column, watchlistSortDir: 'desc' });
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
      } catch {}
    }
  },

  fetchWatchlistQuotes: async () => {
    const { watchlistSections, watchlistPrices } = get();
    const allSymbols = [...new Set(watchlistSections.flatMap((s) => s.symbols))];
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
  }
}));
