import { create } from 'zustand';

interface UiState {
  darkMode: boolean;
  sidebarOpen: boolean;
  activeTab: string;
  
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  darkMode: localStorage.getItem('theme') !== 'light',
  sidebarOpen: false,
  activeTab: 'dashboard',

  toggleDarkMode: () => set((state) => {
    const newTheme = !state.darkMode;
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    if (newTheme) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return { darkMode: newTheme };
  }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  setActiveTab: (tab) => set({ activeTab: tab })
}));
