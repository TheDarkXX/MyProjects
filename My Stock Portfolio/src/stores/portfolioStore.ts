import { create } from 'zustand';
import { api } from '../services/api';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  icon: string;
  color_hex: string;
  initial_cash: number;
  base_currency: string;
}

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  loading: boolean;
  error: string | null;
  
  fetchPortfolios: () => Promise<void>;
  setActivePortfolio: (id: string) => void;
  createPortfolio: (data: Partial<Portfolio>) => Promise<void>;
  updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolios: [],
  activePortfolioId: localStorage.getItem('active_portfolio_id'),
  loading: false,
  error: null,

  fetchPortfolios: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.portfolios.list();
      set({ portfolios: data, loading: false });
      
      // Auto-select first if none selected
      const currentActive = get().activePortfolioId;
      if (data.length > 0 && (!currentActive || !data.find((p: Portfolio) => p.id === currentActive))) {
        get().setActivePortfolio(data[0].id);
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  setActivePortfolio: (id: string) => {
    localStorage.setItem('active_portfolio_id', id);
    set({ activePortfolioId: id });
  },

  createPortfolio: async (data) => {
    const newPort = await api.portfolios.create(data);
    set((state) => ({ portfolios: [newPort, ...state.portfolios] }));
    get().setActivePortfolio(newPort.id);
  },

  updatePortfolio: async (id, data) => {
    const updated = await api.portfolios.update(id, data);
    set((state) => ({
      portfolios: state.portfolios.map((p) => (p.id === id ? updated : p))
    }));
  },

  deletePortfolio: async (id) => {
    await api.portfolios.delete(id);
    set((state) => ({
      portfolios: state.portfolios.filter((p) => p.id !== id),
      activePortfolioId: state.activePortfolioId === id ? (state.portfolios[0]?.id || null) : state.activePortfolioId
    }));
  }
}));
