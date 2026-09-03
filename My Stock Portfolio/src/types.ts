

// --- Transaction & Portfolio Core Types ---

export type TransactionAsset = 'Stock' | 'ETF' | 'Crypto' | 'Cash' | 'Gold' | 'Forex' | 'Other';
export type TransactionStockType = 'Compound' | 'Winner' | 'Small Cap' | 'Cash';
export type DisplayMethod = 'TWR' | 'MWR';

export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND' | 'INTEREST';
  asset: TransactionAsset;
  amount: number;
  price: number;
  fee: number;
  portfolioId: string;
  stockType: TransactionStockType | null;
  note?: string;
  status?: 'DRAFT' | 'CONFIRMED';
}

export interface PortfolioItem {
  symbol: string;
  name: string;
  logo: string;
  lastPrice: number;
  dayChange: number;
  dayChangePercent: number;
  dayReturn: number;
  totalReturn: number;
  totalReturnPercent: number;
  quantity: number;
  avgCost: number;
  totalCost: number;
  currentValue: number;
  portfolioPercent: number;
  sector: string;
  assetType: TransactionAsset;
  stockType: TransactionStockType | null;
  prevWeekReturnPct?: number;
}

export interface SimpleReturnResult {
  netCapitalInvested: number;
  currentValue: number;
  returnAmount: number;
  returnPercent: number;
  calculationMethod: 'SIMPLE';
}

export interface SummaryData {
  currentValue: number;
  totalCost: number;
  dayReturn: number;
  totalReturn: number;
  totalReturnPercent: number;
  portfolioPercent: number;
  simpleReturn?: SimpleReturnResult;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color_hex?: string;
  initial_cash: number;
  created_at?: string;
  user_id?: string;
  base_currency?: string;
  status?: string;
  data: PortfolioItem[];
  cash: SummaryData;
  total: SummaryData;
  goal_amount?: number;
  goal_currency?: 'USD' | 'THB';
  portfolio_mode?: 'CASH_AWARE' | 'STOCKS_ONLY';
}

// --- Data & Cache Types ---

export interface SupabaseLatestPrice {
  price: number;
  change: number;
  percent_change: number;
}

export interface HistoricalDataPoint {
  date: string;
  portfolioValue: number;
  spyPrice: number;
  schgPrice: number;
  goldPrice?: number;
  btcPrice?: number;
}

export interface DailyPortfolioSnapshot {
  portfolio_id: string;
  date: string;
  value: number;
}

export interface PortfolioAnalyticsCache {
    id: string;
    portfolio_id: string;
    time_range: string;
    analytics_mode: string;
    success_rate_pct: number;
    success_rate_numerator: number;
    success_rate_denominator: number;
    avg_return_pct: number;
    snapshot_profitable_count: number;
    snapshot_evaluated_count: number;
    transaction_count: number;
    warnings: string[] | null;
    calculated_at: string;
}

// --- Status & Progress Types ---

export interface LivePriceFetchStatus {
  phase: 'idle' | 'local_cache' | 'cloud_cache' | 'api' | 'saving' | 'rendering' | 'completed';
  progress: number;
  details: { current: number; total: number };
}

export interface ChartApiStatus {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

export interface FetchProgress {
  phase: 'idle' | 'checking_cache' | 'fetching_api' | 'saving_to_cache' | 'calculating' | 'paused';
  progress: number;
  details: { current: number; total: number };
  currentSymbol?: string;
}

export interface SnapshotBackfillStatus {
  phase: 'idle' | 'checking' | 'calculating' | 'saving' | 'complete' | 'error';
  message: string;
  progress?: number;
  details?: {
    processedDays: number;
    totalDays: number;
  };
}

// --- Backup & Restore Types ---

export interface CloudBackup {
  id: string;
  created_at: string;
  backup_name: string;
  backup_data: {
    portfolios: any[];
    transactions: any[];
  };
  metadata: {
    summary: string;
    portfolioCount: number;
    transactionCount: number;
  };
  backup_type: 'auto' | 'manual';
  backup_sequence?: number;
}

export interface AppCheckpoint {
  id: string;
  created_at: string;
  version_summary: string;
  app_files: Record<string, string>;
  file_count: number;
  total_size_kb: number;
}

// --- Miscellaneous Types ---
// Moved from portfolioData to avoid circular dependency
export interface AlphaPickItem {
  company: string;
  symbol: string;
  pickedDate: string;
  returnPercent: number;
  sector: string;
  rating: 'Strong Buy' | 'Buy' | 'Hold';
  holdingPercent: number;
}
