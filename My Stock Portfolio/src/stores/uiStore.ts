import { create } from 'zustand';

interface UiState {
  darkMode: boolean;
  sidebarOpen: boolean;
  activeTab: string;
  currency: 'USD' | 'THB';
  
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
  setCurrency: (c: 'USD' | 'THB') => void;
}

const VALID_TABS = ['dashboard', 'scorecard', 'analysis', 'performance', 'risk', 'rebalance', 'transactions', 'snapshots', 'planner', 'settings'];

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

export const useUiStore = create<UiState>((set) => ({
  darkMode: localStorage.getItem('theme') !== 'light',
  sidebarOpen: false,
  activeTab: getInitialTab(),
  currency: (localStorage.getItem('preferred_currency') as 'USD' | 'THB') || 'USD',

  toggleDarkMode: () => set((state) => {
    const newTheme = !state.darkMode;
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (newTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { darkMode: newTheme };
  }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
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
