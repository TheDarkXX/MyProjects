import { create } from 'zustand';
import { pushSettingDebounced, registerSyncHandler, SYNC_KEYS } from '../services/settingsSync';

export interface UiPreferences {
  theme: 'dark' | 'light';
  preferred_currency: 'USD' | 'THB';
  stock_sidebar_mode: 'normal' | 'compact';
  stock_xchart_hide_header: boolean;
  stock_xchart_enable_4h_forex: boolean;
}

interface UiState {
  darkMode: boolean;
  sidebarOpen: boolean;
  sidebarMode: 'normal' | 'compact';
  activeTab: string;
  currency: 'USD' | 'THB';
  xchartHideHeader: boolean;
  xchartEnable4HForex: boolean;
  
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarMode: (mode: 'normal' | 'compact') => void;
  toggleSidebarMode: () => void;
  setActiveTab: (tab: string) => void;
  setCurrency: (c: 'USD' | 'THB') => void;
  setXChartHideHeader: (hide: boolean) => void;
  toggleXChartHeader: () => void;
  setXChartEnable4HForex: (enable: boolean) => void;
  applyCloudUiPreferences: (prefs: Partial<UiPreferences>) => void;
  addNotification?: (n: { type: 'success' | 'error' | 'info'; message: string }) => void;
}

const VALID_TABS = ['dashboard', 'scorecard', 'analysis', 'performance', 'risk', 'rebalance', 'transactions', 'snapshots', 'planner', 'settings', 'project2x', 'xchart'];

const getInitialTab = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check URL hash (e.g. #analysis, #performance)
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    if (hash && VALID_TABS.includes(hash)) {
      return hash;
    }
    // 2. Check localStorage
    const saved = localStorage.getItem('stock_portfolio_active_tab');
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  }
  return 'dashboard';
};

const getInitialSidebarMode = (): 'normal' | 'compact' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('stock_sidebar_mode');
    if (saved === 'normal' || saved === 'compact') return saved;
    if (localStorage.getItem('stock_sidebar_collapsed') === 'true') return 'compact';
  }
  return 'normal';
};

function pushCurrentUiPreferences(partial?: Partial<UiPreferences>) {
  if (typeof window === 'undefined') return;
  const current = useUiStore.getState();
  const prefs: UiPreferences = {
    theme: current.darkMode ? 'dark' : 'light',
    preferred_currency: current.currency,
    stock_sidebar_mode: current.sidebarMode,
    stock_xchart_hide_header: current.xchartHideHeader,
    stock_xchart_enable_4h_forex: current.xchartEnable4HForex,
    ...partial,
  };
  pushSettingDebounced(SYNC_KEYS.UI_PREFERENCES, prefs);
}

export const useUiStore = create<UiState>((set) => ({
  darkMode: typeof window !== 'undefined' ? localStorage.getItem('theme') !== 'light' : true,
  sidebarOpen: false,
  sidebarMode: getInitialSidebarMode(),
  activeTab: getInitialTab(),
  currency: (typeof window !== 'undefined' ? (localStorage.getItem('preferred_currency') as 'USD' | 'THB') : null) || 'USD',
  xchartHideHeader: typeof window !== 'undefined' ? localStorage.getItem('stock_xchart_hide_header') === 'true' : false,
  xchartEnable4HForex: typeof window !== 'undefined' ? localStorage.getItem('stock_xchart_enable_4h_forex') !== 'false' : true,

  toggleDarkMode: () => set((state) => {
    const newTheme = !state.darkMode;
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (newTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    pushCurrentUiPreferences({ theme: newTheme ? 'dark' : 'light' });
    return { darkMode: newTheme };
  }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarMode: (mode: 'normal' | 'compact') => {
    localStorage.setItem('stock_sidebar_mode', mode);
    localStorage.setItem('stock_sidebar_collapsed', String(mode === 'compact'));
    pushCurrentUiPreferences({ stock_sidebar_mode: mode });
    set({ sidebarMode: mode });
  },

  toggleSidebarMode: () => set((state) => {
    const next = state.sidebarMode === 'normal' ? 'compact' : 'normal';
    localStorage.setItem('stock_sidebar_mode', next);
    localStorage.setItem('stock_sidebar_collapsed', String(next === 'compact'));
    pushCurrentUiPreferences({ stock_sidebar_mode: next });
    return { sidebarMode: next };
  }),
  
  setActiveTab: (tab: string) => {
    if (VALID_TABS.includes(tab)) {
      localStorage.setItem('stock_portfolio_active_tab', tab);
      if (typeof window !== 'undefined' && window.location.hash.replace('#', '') !== tab) {
        window.location.hash = tab;
      }
    }
    set({ activeTab: tab });
  },

  setCurrency: (currency: 'USD' | 'THB') => {
    localStorage.setItem('preferred_currency', currency);
    pushCurrentUiPreferences({ preferred_currency: currency });
    set({ currency });
  },

  setXChartHideHeader: (hide: boolean) => {
    try {
      localStorage.setItem('stock_xchart_hide_header', String(hide));
    } catch (e) {}
    pushCurrentUiPreferences({ stock_xchart_hide_header: hide });
    set({ xchartHideHeader: hide });
  },

  toggleXChartHeader: () => set((state) => {
    const next = !state.xchartHideHeader;
    try {
      localStorage.setItem('stock_xchart_hide_header', String(next));
    } catch (e) {}
    pushCurrentUiPreferences({ stock_xchart_hide_header: next });
    return { xchartHideHeader: next };
  }),

  setXChartEnable4HForex: (enable: boolean) => set(() => {
    try {
      localStorage.setItem('stock_xchart_enable_4h_forex', String(enable));
    } catch (e) {}
    pushCurrentUiPreferences({ stock_xchart_enable_4h_forex: enable });
    return { xchartEnable4HForex: enable };
  }),

  applyCloudUiPreferences: (prefs) => {
    if (!prefs || typeof prefs !== 'object') return;
    const updates: Partial<UiState> = {};

    if (prefs.theme) {
      const isDark = prefs.theme !== 'light';
      updates.darkMode = isDark;
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } catch {}
    }

    if (prefs.preferred_currency) {
      updates.currency = prefs.preferred_currency;
      try {
        localStorage.setItem('preferred_currency', prefs.preferred_currency);
      } catch {}
    }

    if (prefs.stock_sidebar_mode) {
      updates.sidebarMode = prefs.stock_sidebar_mode;
      try {
        localStorage.setItem('stock_sidebar_mode', prefs.stock_sidebar_mode);
        localStorage.setItem('stock_sidebar_collapsed', String(prefs.stock_sidebar_mode === 'compact'));
      } catch {}
    }

    if (typeof prefs.stock_xchart_hide_header === 'boolean') {
      updates.xchartHideHeader = prefs.stock_xchart_hide_header;
      try {
        localStorage.setItem('stock_xchart_hide_header', String(prefs.stock_xchart_hide_header));
      } catch {}
    }

    if (typeof prefs.stock_xchart_enable_4h_forex === 'boolean') {
      updates.xchartEnable4HForex = prefs.stock_xchart_enable_4h_forex;
      try {
        localStorage.setItem('stock_xchart_enable_4h_forex', String(prefs.stock_xchart_enable_4h_forex));
      } catch {}
    }

    set(updates);
  },

  addNotification: (n) => {
    console.log('[Notification]', n);
  }
}));

registerSyncHandler(SYNC_KEYS.UI_PREFERENCES, (val) => {
  useUiStore.getState().applyCloudUiPreferences(val);
});

// Synchronize if user navigates using browser back / forward buttons
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    if (hash && VALID_TABS.includes(hash)) {
      useUiStore.setState({ activeTab: hash });
      localStorage.setItem('stock_portfolio_active_tab', hash);
    }
  });

  // Ensure initial hash is synchronized with URL
  const initial = getInitialTab();
  if (!window.location.hash && initial !== 'dashboard') {
    window.location.hash = initial;
  }
}
