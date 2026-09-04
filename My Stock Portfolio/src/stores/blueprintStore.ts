import { create } from 'zustand';
import { api } from '../services/api';

export interface BlueprintEntry {
  id?: string;
  portfolio_id: string;
  symbol: string;
  target_percent: number;
  target_price: number | null;
  status: 'OWNED' | 'WATCHLIST';
  category: string;
  notes?: string;
  updated_at?: string;
}

interface BlueprintStore {
  blueprints: BlueprintEntry[];
  isLoading: boolean;
  error: string | null;
  strategyMode: 'value' | 'growth' | 'dividend';
  
  setStrategyMode: (mode: 'value' | 'growth' | 'dividend') => void;
  fetchBlueprints: (portfolioId: string) => Promise<void>;
  upsertBlueprint: (portfolioId: string, entry: Partial<BlueprintEntry>) => Promise<void>;
  deleteBlueprint: (portfolioId: string, symbol: string) => Promise<void>;
  autoGenerate: (portfolioId: string) => Promise<void>;
  applyTemplate: (portfolioId: string, template: Partial<BlueprintEntry>[]) => Promise<void>;
}

export const useBlueprintStore = create<BlueprintStore>((set, get) => ({
  blueprints: [],
  isLoading: false,
  error: null,
  strategyMode: 'value',

  setStrategyMode: (mode) => set({ strategyMode: mode }),

  fetchBlueprints: async (portfolioId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.blueprints.list(portfolioId);
      set({ blueprints: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  upsertBlueprint: async (portfolioId: string, entry: Partial<BlueprintEntry>) => {
    try {
      await api.blueprints.upsert(portfolioId, entry);
      await get().fetchBlueprints(portfolioId);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteBlueprint: async (portfolioId: string, symbol: string) => {
    try {
      await api.blueprints.delete(portfolioId, symbol);
      set(state => ({
        blueprints: state.blueprints.filter(b => b.symbol !== symbol)
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  autoGenerate: async (portfolioId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.blueprints.autoGenerate(portfolioId);
      await get().fetchBlueprints(portfolioId);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  applyTemplate: async (portfolioId: string, template: Partial<BlueprintEntry>[]) => {
    set({ isLoading: true, error: null });
    try {
      for (const entry of template) {
        await api.blueprints.upsert(portfolioId, entry);
      }
      await get().fetchBlueprints(portfolioId);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
