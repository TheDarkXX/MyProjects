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
  resolution?: '1D' | '1W';
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
  toggleWatchlistDetail: () => void;
  fetchWatchlistQuotes: () => Promise<void>;
}

const TABS_STORAGE_KEY = 'xchart_tabs_state_v1';
const WATCHLIST_STORAGE_KEY = 'stock_xchart_watchlist_v2';
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

const DEFAULT_SECTIONS: WatchlistSection[] = [
  {
    id: 'sec-waiting',
    name: 'WAITING',
    isCollapsed: false,
    symbols: ['TMDX', 'COST', 'RBRK', 'NFLX', 'CRWD', 'STRL', 'NBIS', 'OKLO', 'ORCL', 'META']
  },
  {
    id: 'sec-project2x',
    name: 'PROJECT 2X CORE',
    isCollapsed: false,
    symbols: ['VRT', 'NVDA', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
  },
  {
    id: 'sec-macro',
    name: 'MACRO & FX',
    isCollapsed: false,
    symbols: ['THB=X']
  }
];

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
  }
}));
