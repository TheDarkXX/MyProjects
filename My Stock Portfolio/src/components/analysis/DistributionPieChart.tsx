import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Holding } from '../../hooks/useHoldings';
import { useTransactionStore } from '../../stores/transactionStore';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { Layers } from 'lucide-react';
import clsx from 'clsx';
import { CATEGORY_CONFIG, STRATEGY_CATEGORIES, StrategyCategory } from '../rebalance/StrategyConfigs';

interface Props {
  holdings: Holding[];
}

const SECTOR_MAP: Record<string, string> = {
  META: 'Communication Services',
  GOOGL: 'Communication Services',
  GOOG: 'Communication Services',
  NFLX: 'Communication Services',
  DIS: 'Communication Services',
  TMUS: 'Communication Services',
  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Technology',
  CRWD: 'Technology',
  RBRK: 'Technology',
  CRWV: 'Technology',
  ASTS: 'Technology',
  AMD: 'Technology',
  QCOM: 'Technology',
  AVGO: 'Technology',
  PLTR: 'Technology',
  ISRG: 'Healthcare',
  HIMS: 'Healthcare',
  LLY: 'Healthcare',
  UNH: 'Healthcare',
  JNJ: 'Healthcare',
  MELI: 'Consumer Cyclical',
  AMZN: 'Consumer Cyclical',
  TSLA: 'Consumer Cyclical',
  HD: 'Consumer Cyclical',
  RCL: 'Consumer Cyclical',
  WMT: 'Consumer Defensive',
  COST: 'Consumer Defensive',
  PG: 'Consumer Defensive',
  JPM: 'Financials',
  BAC: 'Financials',
  V: 'Financials',
  MA: 'Financials',
  BRK: 'Financials',
  'BRK.B': 'Financials',
  RKLB: 'Industrials',
  CAT: 'Industrials',
  UBER: 'Industrials',
  XOM: 'Energy',
  CVX: 'Energy',
  SCHG: 'Index & ETF'
};

const PALETTE = [
  '#38BDF8', '#823AFD', '#FC2D79', '#00C49F', '#F59E0B',
  '#EC4899', '#6366F1', '#14B8A6', '#F43F5E', '#A78BFA'
];

export const DistributionPieChart: React.FC<Props> = ({ holdings }) => {
  const [mode, setMode] = useState<'Sector' | 'Asset' | 'Type'>('Sector');
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const { transactions } = useTransactionStore();
  const { currency } = useUiStore();
  const { exchangeRate } = usePriceStore();

  const formatCurrency = (val: number) => {
    if (currency === 'THB' && exchangeRate) {
      const converted = Math.round(val * exchangeRate);
      return `฿${converted.toLocaleString('th-TH')}`;
    }
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const data = useMemo(() => {
    const txMetaMap: Record<string, { asset: string; stock_type: string }> = {};
    transactions
      .filter(t => t.status === 'CONFIRMED' && t.type === 'BUY')
      .forEach(tx => {
        if (tx.symbol) {
          txMetaMap[tx.symbol] = {
            asset: tx.asset || 'Stock',
            stock_type: tx.stock_type || 'Unknown'
          };
        }
      });

    const groups: Record<string, number> = {};
    let totalPortfolioVal = 0;

    holdings.forEach(h => {
      if (h.currentValue <= 0 || h.symbol === 'CASH') return;
      totalPortfolioVal += h.currentValue;

      let key = 'Other';
      if (mode === 'Sector') {
        key = SECTOR_MAP[h.symbol] || 'Other / Diversified';
      } else if (mode === 'Asset') {
        key = txMetaMap[h.symbol]?.asset || 'Stock';
      } else {
        key = txMetaMap[h.symbol]?.stock_type || 'Unknown';
      }

      groups[key] = (groups[key] || 0) + h.currentValue;
    });

    const result = Object.entries(groups).map(([name, value]) => ({
      name,
      value,
      sharePercent: totalPortfolioVal > 0 ? (value / totalPortfolioVal) * 100 : 0,
      color: ''
    }));

    result.sort((a, b) => b.value - a.value);

    return result.map((d, i) => {
      let color = PALETTE[i % PALETTE.length];
      if (mode === 'Strategy' && STRATEGY_CATEGORIES.includes(d.name as StrategyCategory)) {
        color = CATEGORY_CONFIG[d.name as StrategyCategory].hex;
      }
      return {
        ...d,
        color
      };
    });
  }, [holdings, transactions, mode]);

  const totalPortfolioValue = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const activeItem = data[activeIndex] || data[0] || null;

  // Clean, non-bold, accurately calculated slice labels (Fixed % bug & no heavy bold)
  const renderCustomSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent < 0.04) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const item = data[index];
    if (!item) return null;

    let shortName = item.name;
    if (shortName === 'Communication Services') shortName = 'Comm';
    if (shortName === 'Consumer Cyclical') shortName = 'Cyclical';
    if (shortName === 'Consumer Defensive') shortName = 'Defensive';

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none"
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}
      >
        {/* Category Name: Clean, Not Heavy Bold */}
        <tspan x={x} dy="-0.45em" fontSize="13" fontWeight="600" fill="#FFFFFF">
          {shortName}
        </tspan>
        {/* Accurately displayed share % without artificial multiplication */}
        <tspan x={x} dy="1.25em" fontSize="12" fontWeight="500" fill="#FFFFFF">
          {item.sharePercent.toFixed(1)}%
        </tspan>
      </text>
    );
  };

  // Clean active shape: Only expands slice slightly (outerRadius + 8) without any distracting outer border ring
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="#0F111A"
          strokeWidth={2}
          style={{ filter: 'brightness(1.15) drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
        />
      </g>
    );
  };

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col h-[460px]">
      {/* Header: Title + Mode Toggle (Sector / Asset / Type) */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#38BDF8]/20 to-[#823AFD]/20 border border-[#38BDF8]/30 flex items-center justify-center">
            <Layers className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Distribution</h3>
            <p className="text-xs text-[#9898C8]">Portfolio Concentration by {mode}</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-xl gap-1">
          {(['Sector', 'Asset', 'Type'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setActiveIndex(0); }}
              className={clsx(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mode === m ? "bg-[#38BDF8] text-[#0F111A] shadow-md font-black" : "text-[#CBD5E1] hover:text-white"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#9898C8] text-sm">
          No distribution data available
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center min-h-0">
          {/* Left: Doughnut with Clean Slices Labels + Center Stat (5 cols) */}
          <div className="md:col-span-5 h-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="88%"
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  paddingAngle={2}
                  label={renderCustomSliceLabel}
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke="#0F111A" 
                      strokeWidth={2} 
                      className="cursor-pointer transition-all duration-300"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Stat Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {activeItem ? (
                <>
                  <span className="text-sm font-bold text-white tracking-tight truncate max-w-[120px]">
                    {activeItem.name}
                  </span>
                  <span className="text-xl font-bold text-[#A78BFA] mt-0.5">
                    {activeItem.sharePercent.toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-[#CBD5E1] font-semibold tabular-nums mt-0.5">
                    {formatCurrency(activeItem.value)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs text-[#9898C8] font-semibold">Total</span>
                  <span className="text-base font-bold text-white tabular-nums">
                    {formatCurrency(totalPortfolioValue)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Interactive Legend Grid (7 cols) */}
          <div className="md:col-span-7 h-full flex flex-col min-h-0">
            <div className="grid grid-cols-12 text-[11px] font-bold text-[#9898C8] uppercase tracking-wider px-3 pb-2 border-b border-[#2A2E45]/60">
              <span className="col-span-6">{mode}</span>
              <span className="col-span-4 text-right">Value</span>
              <span className="col-span-2 text-right">Share</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 pt-1">
              {data.map((item, idx) => {
                const isSelected = activeIndex === idx;

                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={clsx(
                      "grid grid-cols-12 items-center px-3 py-2.5 rounded-xl transition-all cursor-pointer group select-none relative overflow-hidden",
                      isSelected 
                        ? "bg-[#1A1D2D] border border-[#823AFD]/50 shadow-[0_2px_12px_rgba(130,58,253,0.2)]" 
                        : "hover:bg-[#1A1D2D]/60 border border-transparent"
                    )}
                  >
                    <div 
                      className="absolute left-0 bottom-0 top-0 opacity-10 pointer-events-none rounded-xl transition-all"
                      style={{ width: `${item.sharePercent}%`, backgroundColor: item.color }}
                    />

                    {/* Group Name + Indicator (6 cols) */}
                    <div className="col-span-6 flex items-center gap-2 min-w-0 relative z-10">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125" 
                        style={{ backgroundColor: item.color, boxShadow: isSelected ? `0 0 8px ${item.color}` : 'none' }}
                      />
                      <span className="font-semibold text-white text-xs truncate">{item.name}</span>
                    </div>

                    {/* Total Value (4 cols) */}
                    <div className="col-span-4 text-right font-semibold text-white text-xs tabular-nums relative z-10">
                      {formatCurrency(item.value)}
                    </div>

                    {/* % Share (2 cols) */}
                    <div className="col-span-2 text-right font-bold text-xs text-[#A78BFA] tabular-nums relative z-10">
                      {item.sharePercent.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
