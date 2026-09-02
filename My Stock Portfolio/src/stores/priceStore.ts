import { create } from 'zustand';
import { api } from '../services/api';

interface PriceState {
  prices: Record<string, { price: number; change: number; percent_change: number }>;
  historical: Record<string, any[]>;
  metadata: Record<string, any>;
  loading: boolean;
  
  fetchPrices: (symbols: string[]) => Promise<void>;
  fetchHistorical: (symbols: string[], from: string, to: string) => Promise<void>;
  fetchMetadata: (symbols: string[]) => Promise<void>;
}

export const usePriceStore = create<PriceState>((set, get) => ({
  prices: {},
  historical: {},
  metadata: {},
  loading: false,

  fetchPrices: async (symbols) => {
    if (symbols.length === 0) return;
    try {
      const data = await api.prices.latest(symbols);
      set((state) => ({ prices: { ...state.prices, ...data } }));
    } catch (error) {
      console.error(error);
    }
  },

  fetchHistorical: async (symbols, from, to) => {
    if (symbols.length === 0) return;
    try {
      const data = await api.prices.historical(symbols, from, to);
      set((state) => ({ historical: { ...state.historical, ...data } }));
    } catch (error) {
      console.error(error);
    }
  },

  fetchMetadata: async (symbols) => {
    if (symbols.length === 0) return;
    try {
      const data = await api.metadata.list(symbols);
      set((state) => ({ metadata: { ...state.metadata, ...data } }));
    } catch (error) {
      console.error(error);
    }
  }
}));
