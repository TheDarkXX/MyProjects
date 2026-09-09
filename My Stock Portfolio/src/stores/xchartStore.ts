import { create } from 'zustand';

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

interface XChartState {
  tabs: XChartTab[];
  activeTabId: string;
  watchlistCollapsed: boolean;
  
  setActiveTabId: (id: string) => void;
  addTab: (tab: { type: XChartTabType; symbol: string; title?: string }) => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<XChartTab>) => void;
  changeSymbolOnActiveTab: (symbol: string, title?: string) => void;
  toggleWatchlist: () => void;
}

const STORAGE_KEY = 'xchart_tabs_state_v1';

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

function loadSavedTabs(): { tabs: XChartTab[]; activeTabId: string } {
  if (typeof window === 'undefined') {
    return { tabs: DEFAULT_TABS, activeTabId: DEFAULT_TABS[0].id };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function persistState(tabs: XChartTab[], activeTabId: string) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }));
    } catch (e) {
      console.warn('[xchartStore] Failed to save tabs to localStorage:', e);
    }
  }
}

const initial = loadSavedTabs();

export const useXChartStore = create<XChartState>((set, get) => ({
  tabs: initial.tabs,
  activeTabId: initial.activeTabId,
  watchlistCollapsed: false,

  setActiveTabId: (id) => {
    const { tabs } = get();
    if (tabs.some((t) => t.id === id)) {
      set({ activeTabId: id });
      persistState(tabs, id);
    }
  },

  addTab: ({ type, symbol, title }) => {
    const { tabs } = get();
    const cleanSym = symbol.trim().toUpperCase();
    // If a tab with identical symbol and type exists, just switch to it
    const existing = tabs.find((t) => t.type === type && t.symbol === cleanSym);
    if (existing) {
      set({ activeTabId: existing.id });
      persistState(tabs, existing.id);
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
    set({ tabs: nextTabs, activeTabId: newTab.id });
    persistState(nextTabs, newTab.id);
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return; // Keep at least one tab open

    const nextTabs = tabs.filter((t) => t.id !== id);
    let nextActiveId = activeTabId;
    if (activeTabId === id) {
      const closedIndex = tabs.findIndex((t) => t.id === id);
      const fallbackIndex = Math.max(0, closedIndex - 1);
      nextActiveId = nextTabs[fallbackIndex]?.id || nextTabs[0].id;
    }

    set({ tabs: nextTabs, activeTabId: nextActiveId });
    persistState(nextTabs, nextActiveId);
  },

  updateTab: (id, updates) => {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) => (t.id === id ? { ...t, ...updates } : t));
    set({ tabs: nextTabs });
    persistState(nextTabs, activeTabId);
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

    set({ tabs: nextTabs });
    persistState(nextTabs, activeTabId);
  },

  toggleWatchlist: () => set((s) => ({ watchlistCollapsed: !s.watchlistCollapsed }))
}));
