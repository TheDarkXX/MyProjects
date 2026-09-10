import { create } from 'zustand';

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

export const useUiStore = create<UiState>((set) => ({
  darkMode: localStorage.getItem('theme') !== 'light',
  sidebarOpen: false,
  sidebarMode: getInitialSidebarMode(),
  activeTab: getInitialTab(),
  currency: (localStorage.getItem('preferred_currency') as 'USD' | 'THB') || 'USD',
  xchartHideHeader: typeof window !== 'undefined' ? localStorage.getItem('stock_xchart_hide_header') === 'true' : false,
  xchartEnable4HForex: typeof window !== 'undefined' ? localStorage.getItem('stock_xchart_enable_4h_forex') !== 'false' : true,

  toggleDarkMode: () => set((state) => {
    const newTheme = !state.darkMode;
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (newTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { darkMode: newTheme };
  }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarMode: (mode: 'normal' | 'compact') => {
    localStorage.setItem('stock_sidebar_mode', mode);
    localStorage.setItem('stock_sidebar_collapsed', String(mode === 'compact'));
    set({ sidebarMode: mode });
  },

  toggleSidebarMode: () => set((state) => {
    const next = state.sidebarMode === 'normal' ? 'compact' : 'normal';
    localStorage.setItem('stock_sidebar_mode', next);
    localStorage.setItem('stock_sidebar_collapsed', String(next === 'compact'));
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
    set({ currency });
  },

  setXChartHideHeader: (hide: boolean) => {
    try {
      localStorage.setItem('stock_xchart_hide_header', String(hide));
    } catch (e) {}
    set({ xchartHideHeader: hide });
  },

  toggleXChartHeader: () => set((state) => {
    const next = !state.xchartHideHeader;
    try {
      localStorage.setItem('stock_xchart_hide_header', String(next));
    } catch (e) {}
    return { xchartHideHeader: next };
  }),

  setXChartEnable4HForex: (enable: boolean) => set(() => {
    try {
      localStorage.setItem('stock_xchart_enable_4h_forex', String(enable));
    } catch (e) {}
    return { xchartEnable4HForex: enable };
  }),

  addNotification: (n) => {
    console.log('[Notification]', n);
  }
}));

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
