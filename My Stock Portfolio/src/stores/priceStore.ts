import { create } from 'zustand';
import { api } from '../services/api';

interface PriceState {
  prices: Record<string, { price: number; change: number; percent_change: number }>;
  historical: Record<string, any[]>;
  metadata: Record<string, any>;
  exchangeRate: number;
  loading: boolean;
  lastUpdated: Date | null;
  
  fetchPrices: (symbols: string[]) => Promise<void>;
  fetchHistorical: (symbols: string[], from: string, to: string) => Promise<void>;
  fetchMetadata: (symbols: string[]) => Promise<void>;
  fetchExchangeRate: (from?: string, to?: string) => Promise<void>;
}

const PRICES_CACHE_KEY = 'stock_prices_cache_v1';
const HISTORICAL_CACHE_KEY = 'stock_historical_cache_v1';
const EXCHANGERATE_CACHE_KEY = 'stock_exchange_rate_cache_v1';

const getInitialPrices = (): Record<string, { price: number; change: number; percent_change: number }> => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PRICES_CACHE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const getInitialHistorical = (): Record<string, any[]> => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(HISTORICAL_CACHE_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const cleaned: Record<string, any[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) cleaned[k] = v;
    }
    return cleaned;
  } catch {
    return {};
  }
};

const getInitialExchangeRate = (): number => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(EXCHANGERATE_CACHE_KEY) : null;
    if (raw) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  return 34.5;
};

export const usePriceStore = create<PriceState>((set, get) => ({
  prices: getInitialPrices(),
  historical: getInitialHistorical(),
  metadata: {},
  exchangeRate: getInitialExchangeRate(), // Default fallback or cached
  loading: false,
  lastUpdated: null,

  fetchExchangeRate: async (from = 'USD', to = 'THB') => {
    try {
      const data = await api.prices.exchangeRate(from, to);
      if (data && data.rate) {
        try {
          localStorage.setItem(EXCHANGERATE_CACHE_KEY, String(data.rate));
        } catch {}
        set({ exchangeRate: data.rate, lastUpdated: new Date() });
      }
    } catch (error) {
      console.error('Failed to fetch exchange rate', error);
    }
  },

  fetchPrices: async (symbols) => {
    if (symbols.length === 0) return;
    try {
      set({ loading: true });
      const data = await api.prices.latest(symbols);
      set((state) => {
        const nextPrices = { ...state.prices, ...data };
        try {
          localStorage.setItem(PRICES_CACHE_KEY, JSON.stringify(nextPrices));
        } catch {}
        return { 
          prices: nextPrices,
          lastUpdated: new Date(),
          loading: false
        };
      });
    } catch (error) {
      console.error(error);
      set({ loading: false });
    }
  },

  fetchHistorical: async (symbols, from, to) => {
    if (symbols.length === 0) return;
    try {
      const data = await api.prices.historical(symbols, from, to);
      if (data && typeof data === 'object' && !data.error) {
        set((state) => {
          const nextHistorical = { ...state.historical };
          for (const [k, v] of Object.entries(data)) {
            if (Array.isArray(v)) {
              nextHistorical[k] = v;
            }
          }
          try {
            localStorage.setItem(HISTORICAL_CACHE_KEY, JSON.stringify(nextHistorical));
          } catch {}
          return { historical: nextHistorical };
        });
      }
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
