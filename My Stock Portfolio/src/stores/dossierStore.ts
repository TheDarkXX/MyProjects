import { create } from 'zustand';
import { api } from '../services/api';

export interface QuarterlyFinancialItem {
  fiscal_quarter: string;
  report_date: string;
  revenue_usd: number;
  yoy_revenue_growth_pct: number | null;
  eps_actual: number | null;
  eps_estimate: number | null;
  eps_surprise_pct: number | null;
  gross_margin_pct: number | null;
}

export interface PEHistoryItem {
  date: string;
  price: number;
  pe: number;
  pe_forward: number | null;
  peg_ratio: number | null;
}

export interface SpecificDriverItem {
  metric_key: string;
  metric_label: string;
  metric_value: number;
  metric_unit: string;
  safe_threshold: number | null;
  danger_threshold: number | null;
}

export interface ThesisScenario {
  cagr: number;
  multiple: number;
  targetPrice: number;
  thesis: string;
}

export interface ThesisData {
  secularTrend: string;
  catalysts: Array<{ quarter: string; title: string; desc: string }>;
  tamCurrentB: number;
  tamFuture3YB: number;
  marketSharePct: number;
  moatBreakdown: {
    scaleAdvantage: { score: number; maxScore: number; reason: string };
    switchingCost: { score: number; maxScore: number; reason: string };
    networkEffect: { score: number; maxScore: number; reason: string };
  };
  scenarios: {
    bear: ThesisScenario;
    base: ThesisScenario;
    bull: ThesisScenario;
  };
  milestones: Array<{ year: string; target: string; status: 'DONE' | 'IN_PROGRESS' | 'PENDING' }>;
}

export interface DossierPayload {
  symbol: string;
  name: string;
  category: 'Core' | 'Moonshot';
  marketCap?: number;
  thesis?: ThesisData;
  liveQuote: {
    price: number;
    change: number;
    percent_change: number;
    dayHigh: number;
    dayLow: number;
    volume: number;
  };
  currentPrice: number;
  basePrice: number;
  targetPrice3Y: number;
  doublerProgressPct: number;
  verdict: 'BUY_ADD' | 'HOLD_RIDE' | 'TRIM_SELL';
  verdictReason: string;
  holding: {
    shares: number;
    avgCost: number;
    totalInvested: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
    targetShares: number;
    quotaProgressPct: number;
    quotaSharesRemaining: number;
    lots: Array<{
      id: string;
      date: string;
      type: string;
      shares: number;
      price: number;
      fee: number;
      note?: string;
    }>;
  };
  radar: {
    scenario: number;
    trafficLight: 'BUY_ZONE' | 'WAIT' | 'DANGER';
    ema50: number | null;
    ema150: number | null;
    ema200: number | null;
    bankerFlow: number;
    sellSignal: string | null;
    actionSuggested: string;
  };
  vitalSigns: {
    revenueGrowthYoY: number;
    revenueGrowthStatus: 'HYPER_GROWTH' | 'STEADY' | 'DECELERATING';
    epsBeatStreak: number;
    grossMarginPct: number;
    grossMarginStatus: 'STRONG' | 'MOAT_BREAKER';
    peForward: number;
    pegRatio: number;
    valuationStatus: 'UNDERVALUED' | 'FAIR' | 'STRETCHED';
  };
  quarterlyFinancials: QuarterlyFinancialItem[];
  peHistory: PEHistoryItem[];
  specificDriver: SpecificDriverItem | null;
  moatAutoFlags: {
    grossMarginDeclining3Q: boolean;
    epsBeatStreak: number;
  };
}

interface DossierState {
  isOpen: boolean;
  selectedSymbol: string | null;
  portfolioId: string | null;
  data: DossierPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  activeSubTab: 'cockpit' | 'financials' | 'thesis';
  setActiveSubTab: (tab: 'cockpit' | 'financials' | 'thesis') => void;

  columnMode: 2 | 3 | 4;
  setColumnMode: (mode: 2 | 3 | 4) => void;
  openDossier: (portfolioIdOrSymbol: string, symbol?: string) => Promise<void>;
  closeDossier: () => void;
  selectSymbol: (symbol: string) => Promise<void>;
  refreshFinancials: () => Promise<void>;
  updateDriver: (metric_key: string, metric_value: number) => Promise<void>;
}

export const useDossierStore = create<DossierState>((set, get) => ({
  isOpen: false,
  selectedSymbol: null,
  portfolioId: null,
  data: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  activeSubTab: (localStorage.getItem('xray_sub_tab') as 'cockpit' | 'financials' | 'thesis') || 'cockpit',
  columnMode: (Number(localStorage.getItem('xray_column_mode')) as 2 | 3 | 4) || 3,

  setActiveSubTab: (tab: 'cockpit' | 'financials' | 'thesis') => {
    localStorage.setItem('xray_sub_tab', tab);
    set({ activeSubTab: tab });
  },

  setColumnMode: (mode: 2 | 3 | 4) => {
    localStorage.setItem('xray_column_mode', String(mode));
    set({ columnMode: mode });
  },

  openDossier: async (portfolioIdOrSymbol: string, symbol?: string) => {
    let targetPid = portfolioIdOrSymbol;
    let targetSym = symbol;

    if (!symbol) {
      // Called with 1 arg: e.g. openDossier('NVDA')
      targetSym = portfolioIdOrSymbol;
      targetPid = get().portfolioId || localStorage.getItem('active_portfolio_id') || 'default';
    }

    const symUpper = (targetSym || 'NVDA').toUpperCase();

    set({
      isOpen: true,
      portfolioId: targetPid,
      selectedSymbol: symUpper,
      isLoading: true,
      error: null
    });

    try {
      const data = await api.project2x.dossier(targetPid, symUpper);
      set({ data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load dossier', isLoading: false });
    }
  },

  closeDossier: () => {
    set({ isOpen: false });
  },

  selectSymbol: async (symbol: string) => {
    let pid = get().portfolioId;
    if (!pid || pid === 'default') {
      const stored = localStorage.getItem('active_portfolio_id');
      if (stored) pid = stored;
    }
    const finalPid = pid || 'default';

    set({ selectedSymbol: symbol.toUpperCase(), portfolioId: finalPid, isLoading: true, error: null });
    try {
      const data = await api.project2x.dossier(finalPid, symbol);
      set({ data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to switch stock', isLoading: false });
    }
  },

  refreshFinancials: async () => {
    const { portfolioId, selectedSymbol } = get();
    if (!portfolioId || !selectedSymbol) return;

    set({ isRefreshing: true, error: null });
    try {
      const data = await api.project2x.refreshFinancials(portfolioId, selectedSymbol);
      set({ data, isRefreshing: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to refresh financials', isRefreshing: false });
    }
  },

  updateDriver: async (metric_key: string, metric_value: number) => {
    const { portfolioId, selectedSymbol, data } = get();
    if (!portfolioId || !selectedSymbol) return;

    try {
      const updated = await api.project2x.saveDriver(portfolioId, selectedSymbol, {
        metric_key,
        metric_value
      });

      if (data && data.specificDriver) {
        set({
          data: {
            ...data,
            specificDriver: {
              ...data.specificDriver,
              metric_value: Number(metric_value)
            }
          }
        });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to save driver' });
    }
  }
}));
