import { create } from 'zustand';
import { api } from '../services/api';

export interface ETAItem {
  months: number;
  years: number;
  targetDate: string;
  cagr: number;
}

export interface DashboardData {
  portfolio_id: string;
  total_val_thb: number;
  total_val_usd: number;
  goal_val_thb: number;
  progress_percent: number;
  fx_rate: number;
  monthly_inflow_thb: number;
  dime_cash_usd: number;
  eta: {
    Conservative: ETAItem;
    Base: ETAItem;
    Bull: ETAItem;
  };
  active_sell_alerts_count: number;
  updated_at: string;
}

export interface ShareQuota {
  id: string;
  portfolio_id: string;
  symbol: string;
  category: 'Core' | 'Moonshot';
  target_percent: number;
  base_price: number;
  split_factor: number;
  target_shares: number;
  owned_shares: number;
  progress_percent: number;
  status: 'EMPTY' | 'COLLECTING' | 'LOCKED';
}

export interface RadarRow {
  symbol: string;
  category: string;
  target_percent: number;
  currentPrice: number;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  distEma150: number;
  distEma200: number;
  banker: number;
  rsi14: number | null;
  scenario: number;
  traffic_light: 'BUY_ZONE' | 'WAIT' | 'DANGER';
  badge: string;
  reason: string;
  reason_th: string;
  sparkline: {
    closes: number[];
    ema150: (number | null)[];
    ema200: (number | null)[];
  };
  owned_shares: number;
  target_shares: number;
  progress_percent: number;
  status: string;
}

export interface SellAlert {
  symbol: string;
  layer: string;
  severity: 'HIGH' | 'PROFIT_TAKE' | 'STOP_LOSS' | 'CLEANUP';
  message: string;
  message_th: string;
}

export interface RadarMatrixData {
  rows: RadarRow[];
  sellAlerts: SellAlert[];
  totalPortfolioUsd: number;
  cashUsd: number;
}

export interface RecommendationResult {
  type: 'GOLDEN_SETUP' | 'EARLY_BIRD' | 'CASH_SWEEP';
  symbol?: string;
  shares_to_buy?: number;
  price_per_share?: number;
  total_usd?: number;
  total_thb?: number;
  buy_usd?: number;
  park_fcd_usd?: number;
  current_owned_shares?: number;
  target_shares?: number;
  current_progress?: number;
  projected_progress?: number;
  scenario?: number;
  fcd_yield_pct?: number;
  reason: string;
  reason_th: string;
}

export interface Project2xConfig {
  portfolio_id: string;
  goal_amount_thb: number;
  target_cagr: number;
  target_years: number;
  max_stock_ceiling_pct: number;
  monthly_inflow_thb: number;
  fcd_yield_pct: number;
}

interface Project2xStore {
  selectedTab: 'vault' | 'radar' | 'inflow';
  setSelectedTab: (tab: 'vault' | 'radar' | 'inflow') => void;

  dashboard: DashboardData | null;
  quotas: ShareQuota[];
  radar: RadarMatrixData | null;
  recommendation: RecommendationResult | null;
  config: Project2xConfig | null;

  isLoadingDashboard: boolean;
  isLoadingQuotas: boolean;
  isLoadingRadar: boolean;
  isLoadingRecommendation: boolean;
  isSavingConfig: boolean;
  error: string | null;

  fetchDashboard: (portfolioId: string) => Promise<void>;
  fetchQuotas: (portfolioId: string) => Promise<void>;
  resetQuotas: (portfolioId: string) => Promise<void>;
  fetchRadar: (portfolioId: string) => Promise<void>;
  calculateRecommendation: (portfolioId: string, amountThb: number) => Promise<void>;
  fetchConfig: (portfolioId: string) => Promise<void>;
  updateConfig: (portfolioId: string, updates: Partial<Project2xConfig>) => Promise<void>;
  refreshAll: (portfolioId: string) => Promise<void>;
}

export const useProject2xStore = create<Project2xStore>((set, get) => ({
  selectedTab: 'vault',
  setSelectedTab: (tab) => set({ selectedTab: tab }),

  dashboard: null,
  quotas: [],
  radar: null,
  recommendation: null,
  config: null,

  isLoadingDashboard: false,
  isLoadingQuotas: false,
  isLoadingRadar: false,
  isLoadingRecommendation: false,
  isSavingConfig: false,
  error: null,

  fetchDashboard: async (portfolioId: string) => {
    set({ isLoadingDashboard: true, error: null });
    try {
      const data = await api.project2x.dashboard(portfolioId);
      set({ dashboard: data, isLoadingDashboard: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingDashboard: false });
    }
  },

  fetchQuotas: async (portfolioId: string) => {
    set({ isLoadingQuotas: true, error: null });
    try {
      const data = await api.project2x.quotas(portfolioId);
      set({ quotas: data, isLoadingQuotas: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingQuotas: false });
    }
  },

  resetQuotas: async (portfolioId: string) => {
    set({ isLoadingQuotas: true, error: null });
    try {
      const data = await api.project2x.resetQuotas(portfolioId);
      set({ quotas: data, isLoadingQuotas: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingQuotas: false });
    }
  },

  fetchRadar: async (portfolioId: string) => {
    set({ isLoadingRadar: true, error: null });
    try {
      const data = await api.project2x.scan(portfolioId);
      set({ radar: data, isLoadingRadar: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingRadar: false });
    }
  },

  calculateRecommendation: async (portfolioId: string, amountThb: number) => {
    set({ isLoadingRecommendation: true, error: null });
    try {
      const data = await api.project2x.recommend(portfolioId, amountThb);
      set({ recommendation: data, isLoadingRecommendation: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingRecommendation: false });
    }
  },

  fetchConfig: async (portfolioId: string) => {
    try {
      const data = await api.project2x.config(portfolioId);
      set({ config: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateConfig: async (portfolioId: string, updates: Partial<Project2xConfig>) => {
    set({ isSavingConfig: true, error: null });
    try {
      const data = await api.project2x.updateConfig(portfolioId, updates);
      set({ config: data, isSavingConfig: false });
      await get().refreshAll(portfolioId);
    } catch (err: any) {
      set({ error: err.message, isSavingConfig: false });
    }
  },

  refreshAll: async (portfolioId: string) => {
    await Promise.all([
      get().fetchDashboard(portfolioId),
      get().fetchQuotas(portfolioId),
      get().fetchRadar(portfolioId),
      get().fetchConfig(portfolioId)
    ]);
  }
}));
