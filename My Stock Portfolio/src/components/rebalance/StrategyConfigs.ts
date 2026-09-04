import { BlueprintEntry } from '../../stores/blueprintStore';

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
    description: 'โตแบบแข็งแกร่ง + ปลอดภัย (60% Mega-Cap / 30% Mid-Cap / 10% Cash)',
    category: 'Pure Equity',
    mode: 'value',
    entries: [
      { symbol: 'AAPL', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Mega-Cap' },
      { symbol: 'MSFT', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Mega-Cap' },
      { symbol: 'GOOGL', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Mid-Cap' },
      { symbol: 'CASH', target_percent: 10, target_price: null, status: 'OWNED', category: 'Cash' },
    ]
  },
  {
    id: 'garp-leap',
    name: 'GARP / Leap Growth (Lynch)',
    description: 'โตก้าวกระโดด + เสี่ยงปานกลาง (40% Fast Growers / 40% Stalwarts)',
    category: 'Pure Equity',
    mode: 'growth',
    entries: [
      { symbol: 'NVDA', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Fast Growers' },
      { symbol: 'META', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Fast Growers' },
      { symbol: 'AMZN', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Stalwarts' },
      { symbol: 'V', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Stalwarts' },
      { symbol: 'CASH', target_percent: 20, target_price: null, status: 'OWNED', category: 'Cash' },
    ]
  },
  {
    id: 'hyper-growth',
    name: 'Hyper Growth (Cathie Wood)',
    description: 'โตขั้นสุด + เสี่ยงสูง (เทคโนโลยีเปลี่ยนโลก 100%)',
    category: 'Pure Equity',
    mode: 'growth',
    entries: [
      { symbol: 'TSLA', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'Innovation' },
      { symbol: 'PLTR', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'AI' },
      { symbol: 'SQ', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'Fintech' },
      { symbol: 'CRSP', target_percent: 25, target_price: null, status: 'WATCHLIST', category: 'Genomics' },
    ]
  },
  {
    id: 'high-conviction',
    name: 'High Conviction (Shay Booler)',
    description: 'สไตล์กระจุกตัว Top 3 ตัวละ 15-25% เน้นความมั่นใจสูงสุด',
    category: 'Pure Equity',
    mode: 'growth',
    entries: [
      { symbol: 'TSLA', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Top Conviction' },
      { symbol: 'PLTR', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Top Conviction' },
      { symbol: 'CRWD', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Top Conviction' },
      { symbol: 'CASH', target_percent: 10, target_price: null, status: 'OWNED', category: 'Cash' },
    ]
  },
  {
    id: 'compounding-machines',
    name: 'Compounding Machines (Joseph Carlson)',
    description: 'สไตล์ปันผลเติบโต เน้น DRIP กลับเข้าพอร์ท',
    category: 'Pure Equity',
    mode: 'dividend',
    entries: [
      { symbol: 'SCHD', target_percent: 40, target_price: null, status: 'WATCHLIST', category: 'Core Dividend' },
      { symbol: 'AAPL', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Dividend Growth' },
      { symbol: 'MSFT', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Dividend Growth' },
      { symbol: 'O', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'High Yield REIT' },
    ]
  },
  {
    id: 'core-satellite',
    name: 'Core-Satellite',
    description: 'สไตล์ผสมผสาน 70% มั่นคง / 30% ซิ่ง',
    category: 'Asset Allocation',
    mode: 'value',
    entries: [
      { symbol: 'VOO', target_percent: 50, target_price: null, status: 'WATCHLIST', category: 'Core' },
      { symbol: 'QQQ', target_percent: 20, target_price: null, status: 'WATCHLIST', category: 'Core' },
      { symbol: 'BTC-USD', target_percent: 15, target_price: null, status: 'WATCHLIST', category: 'Satellite' },
      { symbol: 'PLTR', target_percent: 15, target_price: null, status: 'WATCHLIST', category: 'Satellite' },
    ]
  },
  {
    id: 'all-weather',
    name: 'All-Weather (Dalio)',
    description: 'สไตล์ต้านทานทุกสภาวะเศรษฐกิจด้วย Risk Parity',
    category: 'Asset Allocation',
    mode: 'value',
    entries: [
      { symbol: 'VTI', target_percent: 30, target_price: null, status: 'WATCHLIST', category: 'Stocks' },
      { symbol: 'TLT', target_percent: 40, target_price: null, status: 'WATCHLIST', category: 'Long Bonds' },
      { symbol: 'IEF', target_percent: 15, target_price: null, status: 'WATCHLIST', category: 'Intermediate Bonds' },
      { symbol: 'GLD', target_percent: 7.5, target_price: null, status: 'WATCHLIST', category: 'Gold' },
      { symbol: 'GSG', target_percent: 7.5, target_price: null, status: 'WATCHLIST', category: 'Commodities' },
    ]
  }
];
