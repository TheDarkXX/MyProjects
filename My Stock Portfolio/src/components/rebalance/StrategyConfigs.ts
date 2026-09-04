import { BlueprintEntry } from '../../stores/blueprintStore';

export const STRATEGY_CATEGORIES = [
  'Compounders',
  'Growth',
  'Mid-Tier',
  'Defensive',
  'Small Cap',
  'Bets',
  'Cash',
  'ETF',
] as const;

export type StrategyCategory = typeof STRATEGY_CATEGORIES[number];

export const CATEGORY_CONFIG: Record<StrategyCategory, {
  hex: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
}> = {
  Compounders: {
    hex: '#1D4ED8',
    bg: 'bg-blue-600/20',
    text: 'text-blue-300',
    border: 'border-blue-500/40',
    dot: 'bg-blue-500',
    label: 'Compounders'
  },
  Growth: {
    hex: '#EF4444',
    bg: 'bg-rose-500/20',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    dot: 'bg-rose-500',
    label: 'Growth'
  },
  'Mid-Tier': {
    hex: '#64748B',
    bg: 'bg-slate-600/25',
    text: 'text-slate-200',
    border: 'border-slate-500/40',
    dot: 'bg-slate-400',
    label: 'Mid-Tier'
  },
  Defensive: {
    hex: '#10B981',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    dot: 'bg-emerald-400',
    label: 'Defensive'
  },
  'Small Cap': {
    hex: '#F59E0B',
    bg: 'bg-amber-500/20',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    dot: 'bg-amber-400',
    label: 'Small Cap'
  },
  Bets: {
    hex: '#B45309',
    bg: 'bg-amber-800/30',
    text: 'text-amber-200',
    border: 'border-amber-700/50',
    dot: 'bg-amber-700',
    label: 'Bets'
  },
  Cash: {
    hex: '#475569',
    bg: 'bg-slate-700/40',
    text: 'text-slate-300',
    border: 'border-slate-600/40',
    dot: 'bg-slate-400',
    label: 'Cash'
  },
  ETF: {
    hex: '#EC4899',
    bg: 'bg-pink-500/20',
    text: 'text-pink-300',
    border: 'border-pink-500/40',
    dot: 'bg-pink-400',
    label: 'ETF'
  },
};

export const resolveStockCategory = (symbol: string, rawStockType?: string | null, type?: string, asset?: string): StrategyCategory => {
  if (rawStockType) {
    if (rawStockType === 'Core Compounder') return 'Compounders';
    if (rawStockType === 'Hyper Growth') return 'Growth';
    if (rawStockType === 'Defensive / Value') return 'Defensive';
    if (rawStockType === 'Index / ETF') return 'ETF';
    if (STRATEGY_CATEGORIES.includes(rawStockType as StrategyCategory)) {
      return rawStockType as StrategyCategory;
    }
  }
  const sym = (symbol || '').toUpperCase();
  if (sym === 'COST' || sym === 'ISRG' || sym === 'AAPL' || sym === 'MSFT' || sym === 'GOOGL' || sym === 'GOOG' || sym === 'V' || sym === 'MA') return 'Compounders';
  if (sym === 'NVDA' || sym === 'CRWD' || sym === 'MELI' || sym === 'RBRK' || sym === 'PLTR' || sym === 'META') return 'Growth';
  if (sym === 'AMZN' || sym === 'TSLA' || sym === 'AMD') return 'Mid-Tier';
  if (sym === 'KO' || sym === 'JNJ' || sym === 'PG' || sym === 'O' || sym === 'TLT' || sym === 'GLD') return 'Defensive';
  if (sym === 'HIMS' || sym === 'SQ' || sym === 'SOFI') return 'Small Cap';
  if (sym === 'ASTS' || sym === 'RKLB' || sym === 'CRWV' || sym === 'CRSP' || sym === 'BTC-USD' || sym === 'BTC') return 'Bets';
  if (sym === 'SCHG' || sym === 'VOO' || sym === 'QQQ' || sym === 'SPY' || sym === 'SCHD' || sym === 'VTI' || sym === 'IVV') return 'ETF';
  if (sym === 'CASH' || type === 'DEPOSIT' || type === 'INTEREST' || type === 'WITHDRAW' || asset === 'Cash') return 'Cash';
  return 'Compounders';
};

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Pure Equity' | 'Asset Allocation';
  mode: 'growth' | 'value' | 'dividend';
  entries: Omit<BlueprintEntry, 'portfolio_id' | 'id' | 'updated_at'>[];
}

export const PRESET_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'quality-growth',
    name: 'Quality Growth (Buffett)',
    description: 'โตแบบแข็งแกร่ง + ปลอดภัย (90% Compounders / 10% Cash)',
    category: 'Pure Equity',
    mode: 'value',
    entries: [
      { symbol: 'AAPL', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Compounders' },
      { symbol: 'MSFT', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Compounders' },
      { symbol: 'GOOGL', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Compounders' },
      { symbol: 'CASH', target_percent: 10, target_price: null, status: 'OWNED', category: 'Cash' },
    ]
  },
  {
    id: 'garp-leap',
    name: 'GARP / Leap Growth (Lynch)',
    description: 'โตก้าวกระโดด + เสี่ยงปานกลาง (40% Growth / 40% Compounders / 20% Cash)',
    category: 'Pure Equity',
    mode: 'growth',
    entries: [
      { symbol: 'NVDA', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Growth' },
      { symbol: 'META', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Growth' },
      { symbol: 'AMZN', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Compounders' },
      { symbol: 'V', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Compounders' },
      { symbol: 'CASH', target_percent: 20, target_price: null, status: 'OWNED', category: 'Cash' },
    ]
  },
  {
    id: 'hyper-growth',
    name: 'Hyper Growth (Cathie Wood)',
    description: 'โตขั้นสุด + เสี่ยงสูง (50% Growth / 50% Bets & Small Cap)',
    category: 'Pure Equity',
    mode: 'growth',
    entries: [
      { symbol: 'TSLA', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'Growth' },
      { symbol: 'PLTR', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'Growth' },
      { symbol: 'SQ', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'Small Cap' },
      { symbol: 'CRSP', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'Bets' },
    ]
  },
  {
    id: 'high-conviction',
    name: 'High Conviction (Shay Booler)',
    description: 'สไตล์กระจุกตัว Top 3 ตัวละ 30% เน้นความมั่นใจสูงสุด + 10% Cash',
    category: 'Pure Equity',
    mode: 'growth',
    entries: [
      { symbol: 'TSLA', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Growth' },
      { symbol: 'PLTR', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Growth' },
      { symbol: 'CRWD', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Growth' },
      { symbol: 'CASH', target_percent: 10, target_price: null, status: 'OWNED', category: 'Cash' },
    ]
  },
  {
    id: 'compounding-machines',
    name: 'Compounding Machines (Joseph Carlson)',
    description: 'สไตล์ปันผลเติบโต เน้น ETF + Compounders + Defensive',
    category: 'Pure Equity',
    mode: 'dividend',
    entries: [
      { symbol: 'SCHD', target_percent: 40, target_price: null, status: 'WATCHLIST', category: 'ETF' },
      { symbol: 'AAPL', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Compounders' },
      { symbol: 'MSFT', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Compounders' },
      { symbol: 'O', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Defensive' },
    ]
  },
  {
    id: 'core-satellite',
    name: 'Core-Satellite',
    description: 'สไตล์ผสมผสาน 70% ETF แกนหลัก / 30% Growth & Bets',
    category: 'Asset Allocation',
    mode: 'value',
    entries: [
      { symbol: 'VOO', target_percent: 50, target_price: null, status: 'WATCHLIST', category: 'ETF' },
      { symbol: 'QQQ', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'ETF' },
      { symbol: 'BTC-USD', target_percent: 15, target_price: null, status: 'WATCHLIST', category: 'Bets' },
      { symbol: 'PLTR', target_percent: 15, target_price: null, status: 'WATCHLIST', category: 'Growth' },
    ]
  },
  {
    id: 'all-weather',
    name: 'All-Weather (Dalio)',
    description: 'สไตล์ต้านทานทุกสภาวะเศรษฐกิจด้วย 30% ETF / 70% Defensive Assets',
    category: 'Asset Allocation',
    mode: 'value',
    entries: [
      { symbol: 'VTI', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'ETF' },
      { symbol: 'TLT', target_percent: 40, target_price: null, status: 'WATCHLIST', category: 'Defensive' },
      { symbol: 'IEF', target_percent: 15, target_price: null, status: 'WATCHLIST', category: 'Defensive' },
      { symbol: 'GLD', target_percent: 7.5, target_price: null, status: 'WATCHLIST', category: 'Defensive' },
      { symbol: 'GSG', target_percent: 7.5, target_price: null, status: 'WATCHLIST', category: 'Defensive' },
    ]
  }
];
