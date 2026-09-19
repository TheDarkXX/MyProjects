import { create } from 'zustand';
import { api } from '../services/api';

export interface ETAItem {
  months: number;
  years: number;
  targetDate: string;
  cagr: number;
}

export interface MilestoneItem {
  year: number;
  level: number;
  icon: string;
  name: string;
  thTitle: string;
  target_thb: number;
  target_usd: number;
  prev_target_thb?: number;
  prev_target_usd?: number;
  progress_in_level?: number;
  remaining_to_evolve_thb?: number;
  remaining_to_evolve_usd?: number;
  is_unlocked: boolean;
  is_current: boolean;
}

export interface RealizedCagrData {
  cagr: number;
  cagr_pct: number;
  years_investing: number;
  days_investing?: number;
  net_invested_usd: number;
  is_young?: boolean;
  display_label?: string;
  forward_holdings_cagr?: number;
}

export interface DashboardData {
  portfolio_id: string;
  total_val_thb: number;
  total_val_usd: number;
  goal_val_thb: number;
  progress_percent: number;
  fx_rate: number;
  monthly_inflow_thb: number;
  auto_inflow_thb?: number | null;
  auto_inflow_usd?: number | null;
  realized_cagr?: RealizedCagrData | null;
  milestones?: MilestoneItem[];
  dime_cash_usd: number;
  eta: {
    Conservative: ETAItem;
    Base: ETAItem;
    Bull: ETAItem;
    Auto?: ETAItem;
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
  distEma50?: number;
  ema9?: number | null;
  distEma9?: number;
  isAboveEma9?: boolean;
  hasRsiDivergence?: boolean;
  distEma150: number;
  distEma200: number;
  banker: number;
  rsi14: number | null;
  regime?: 'BULL' | 'NEUTRAL' | 'BEAR';
  volRatio?: number;
  high52W?: number;
  drawdownFrom52W?: number;
  scenario: number;
  traffic_light: 'TO_THE_MOON' | 'BUY_NOW' | 'BUY_ZONE' | 'GET_READY' | 'ON_RADAR' | 'SLOW_BLEED' | 'FALLING_KNIFE' | 'MAYDAY_EXIT' | 'WAIT' | 'DANGER';
  badge: string;
  reason: string;
  reason_th: string;
  checklist?: {
    regimePass: boolean;
    distPass: boolean;
    bankerPass: boolean;
    rsiPass: boolean;
    candlePass: boolean;
    volumePass: boolean;
  };
  signals_checklist?: Array<{
    label: string;
    pass: boolean;
    value: string;
  }>;
  sparkline: {
    dates?: string[];
    closes: number[];
    opens?: number[];
    highs?: number[];
    lows?: number[];
    volumes?: number[];
    ema9?: (number | null)[];
    ema50?: (number | null)[];
    ema150: (number | null)[];
    ema200: (number | null)[];
    bankerSeries?: number[];
    hotMoneySeries?: number[];
    retailSeries?: number[];
    bankerMaSeries?: number[];
  };
  owned_shares: number;
  target_shares: number;
  progress_percent: number;
  status: string;
  // Fundamental & Allocation Columns
  weight_pct?: number;
  market_value_usd?: number;
  pe_trailing?: number | null;
  pe_forward?: number | null;
  peg_ratio?: number | null;
  expected_cagr?: number;
  consecutive_eps_qs?: number;
}

export interface FundamentalItem {
  symbol: string;
  pe_trailing: number | null;
  pe_forward: number | null;
  peg_ratio: number | null;
  revenue_cagr_3y: number | null;
  eps_cagr_3y: number | null;
  expected_cagr_3y: number;
  consecutive_eps_qs: number;
  updated_at: string;
}

export interface BackfillStatusData {
  isRunning: boolean;
  total: number;
  completed: number;
  currentSymbol: string;
  errors: Array<{ symbol: string; error: string }>;
  symbolStatus: Record<string, 'PENDING' | 'FETCHING' | 'DONE' | 'ERROR'>;
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

export interface CompactTierInfo {
  symbol: string;
  traffic_light: 'TO_THE_MOON' | 'BUY_NOW' | 'BUY_ZONE' | 'GET_READY' | 'ON_RADAR' | 'SLOW_BLEED' | 'FALLING_KNIFE' | 'MAYDAY_EXIT' | 'WAIT' | 'DANGER';
  badge: string;
  scenario: number;
  reason_th?: string;
  reason?: string;
}

interface Project2xStore {
  selectedTab: 'radar' | 'vault' | 'inflow' | 'all';
  setSelectedTab: (tab: 'radar' | 'vault' | 'inflow' | 'all') => void;

  dashboard: DashboardData | null;
  quotas: ShareQuota[];
  radar: RadarMatrixData | null;
  compactTiers: Record<string, CompactTierInfo>;
  recommendation: RecommendationResult | null;
  config: Project2xConfig | null;

  isLoadingDashboard: boolean;
  isLoadingQuotas: boolean;
  isLoadingRadar: boolean;
  isLoadingRecommendation: boolean;
  isSavingConfig: boolean;
  isBackfilling: boolean;
  backfillStatus: BackfillStatusData | null;
  fundamentals: FundamentalItem[];
  error: string | null;

  fetchDashboard: (portfolioId: string) => Promise<void>;
  fetchQuotas: (portfolioId: string) => Promise<void>;
  resetQuotas: (portfolioId: string) => Promise<void>;
  fetchRadar: (portfolioId: string) => Promise<void>;
  calculateRecommendation: (portfolioId: string, amountThb: number) => Promise<void>;
  fetchConfig: (portfolioId: string) => Promise<void>;
  updateConfig: (portfolioId: string, updates: Partial<Project2xConfig>) => Promise<void>;
  triggerBackfill: (portfolioId: string, years?: number) => Promise<void>;
  checkBackfillStatus: (portfolioId: string) => Promise<void>;
  fetchFundamentalsList: (portfolioId: string) => Promise<void>;
  updateFundamentalItem: (portfolioId: string, data: { symbol: string; expected_cagr_3y?: number; consecutive_eps_qs?: number }) => Promise<void>;
  refreshAll: (portfolioId: string) => Promise<void>;
}

const getInitialRadar = (): RadarMatrixData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('p2x_radar_cache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
};

const getInitialCompactTiers = (): Record<string, CompactTierInfo> => {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem('p2x_compact_tiers');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return {};
};

export const useProject2xStore = create<Project2xStore>((set, get) => ({
  selectedTab: 'radar',
  setSelectedTab: (tab) => set({ selectedTab: tab }),

  dashboard: null,
  quotas: [],
  radar: getInitialRadar(),
  compactTiers: getInitialCompactTiers(),
  recommendation: null,
  config: null,
  backfillStatus: null,
  fundamentals: [],

  isLoadingDashboard: false,
  isLoadingQuotas: false,
  isLoadingRadar: false,
  isLoadingRecommendation: false,
  isSavingConfig: false,
  isBackfilling: false,
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
      if (typeof window !== 'undefined' && data?.rows) {
        try {
          const map: Record<string, CompactTierInfo> = {};
          for (const r of data.rows) {
            map[r.symbol.toUpperCase()] = {
              symbol: r.symbol,
              traffic_light: r.traffic_light,
              badge: r.badge,
              scenario: r.scenario,
              reason_th: r.reason_th,
              reason: r.reason
            };
          }
          localStorage.setItem('p2x_compact_tiers', JSON.stringify(map));
          set({ compactTiers: map });
        } catch (e) {
          console.warn('[Project2xStore] Failed to save compact tiers cache:', e);
        }
      }
      if (typeof window !== 'undefined' && data) {
        try {
          localStorage.setItem('p2x_radar_cache', JSON.stringify(data));
        } catch {}
      }
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

  triggerBackfill: async (portfolioId: string, years = 10) => {
    set({ isBackfilling: true, error: null });
    try {
      await api.project2x.backfill(portfolioId, years);
      await get().checkBackfillStatus(portfolioId);
    } catch (err: any) {
      set({ error: err.message, isBackfilling: false });
    }
  },

  checkBackfillStatus: async (portfolioId: string) => {
    try {
      const status = await api.project2x.backfillStatus(portfolioId);
      set({ backfillStatus: status, isBackfilling: status?.isRunning || false });
    } catch (err: any) {
      console.warn('Check backfill status error:', err);
    }
  },

  fetchFundamentalsList: async (portfolioId: string) => {
    try {
      const data = await api.project2x.fundamentals(portfolioId);
      set({ fundamentals: data });
    } catch (err: any) {
      console.warn('Fetch fundamentals error:', err);
    }
  },

  updateFundamentalItem: async (portfolioId: string, data: { symbol: string; expected_cagr_3y?: number; consecutive_eps_qs?: number }) => {
    try {
      await api.project2x.updateFundamentals(portfolioId, data);
      await get().fetchFundamentalsList(portfolioId);
      await get().fetchRadar(portfolioId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  refreshAll: async (portfolioId: string) => {
    await Promise.all([
      get().fetchDashboard(portfolioId),
      get().fetchQuotas(portfolioId),
      get().fetchRadar(portfolioId),
      get().fetchConfig(portfolioId),
      get().fetchFundamentalsList(portfolioId)
    ]);
  }
}));
