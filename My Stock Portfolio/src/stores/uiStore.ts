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

export const useUiStore = create<UiState>((set) => ({
  darkMode: localStorage.getItem('theme') !== 'light',
  sidebarOpen: false,
  activeTab: 'dashboard',
  currency: (localStorage.getItem('preferred_currency') as 'USD' | 'THB') || 'USD',

  toggleDarkMode: () => set((state) => {
    const newTheme = !state.darkMode;
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (newTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { darkMode: newTheme };
  }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setActiveTab: (tab) => set({ activeTab: tab }),

  setCurrency: (currency: 'USD' | 'THB') => {
    localStorage.setItem('preferred_currency', currency);
    set({ currency });
  }
}));
