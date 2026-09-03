import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { HeatmapTimeRange } from './Heatmap';
import { PieChart as PieIcon, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  holdings: Holding[];
  timeRange?: HeatmapTimeRange;
}

const PALETTE = [
  '#823AFD', '#FC2D79', '#00C49F', '#38BDF8', '#FFBB28',
  '#FF8042', '#A78BFA', '#F43F5E', '#10B981', '#F59E0B',
  '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6', '#06B6D4'
];

export const AllocationPieChart: React.FC<Props> = ({ holdings, timeRange = '1D' }) => {
  const [mode, setMode] = useState<'weight' | 'profit'>('weight');
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const { currency } = useUiStore();
  const { exchangeRate, historical } = usePriceStore();

  // Unified Currency Formatter adhering to zero-decimal THB standard
  const formatCurrency = (val: number) => {
    if (currency === 'THB' && exchangeRate) {
      const converted = Math.round(val * exchangeRate);
      return `฿${converted.toLocaleString('th-TH')}`;
    }
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStartDateForRange = (range: HeatmapTimeRange): string => {
    const today = new Date();
    switch (range) {
      case '1D': today.setDate(today.getDate() - 1); break;
      case '1W': today.setDate(today.getDate() - 7); break;
      case '1M': today.setDate(today.getDate() - 30); break;
      case '3M': today.setDate(today.getDate() - 90); break;
      case 'YTD': return `${today.getFullYear()}-01-01`;
      case '1Y': today.setFullYear(today.getFullYear() - 1); break;
      case 'Total': default: return '2020-01-01';
    }
    return today.toISOString().split('T')[0];
  };

  // Process data with currency & timeframe returns
  const data = useMemo(() => {
    const active = holdings.filter(h => h.currentValue > 0 || h.totalCost > 0);
    const totalVal = active.reduce((sum, h) => sum + h.currentValue, 0);

    const items = active.map(h => {
      let periodProfit = h.dayReturn;
      let periodProfitPercent = h.dayChangePercent;

      if (timeRange === '1D') {
        periodProfit = h.dayReturn;
        periodProfitPercent = h.dayChangePercent;
      } else if (timeRange === 'Total') {
        periodProfit = h.totalReturn;
        periodProfitPercent = h.totalReturnPercent;
      } else {
        const symbolHistory = historical[h.symbol];
        if (symbolHistory && symbolHistory.length > 0) {
          const startDate = getStartDateForRange(timeRange);
          const sorted = [...symbolHistory].sort((a, b) => a.date.localeCompare(b.date));
          let startPrice = sorted[0].price;
          for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].date <= startDate) {
              startPrice = sorted[i].price;
              break;
            }
          }
          const endPrice = h.lastPrice || sorted[sorted.length - 1].price;
          if (startPrice > 0 && endPrice > 0) {
            periodProfitPercent = ((endPrice - startPrice) / startPrice) * 100;
            periodProfit = (endPrice - startPrice) * h.quantity;
          }
        }
      }

      const weightPct = totalVal > 0 ? (h.currentValue / totalVal) * 100 : 0;
      const chartValue = mode === 'weight' ? h.currentValue : Math.max(0, periodProfit);

      return {
        name: h.symbol,
        value: chartValue,
        currentValue: h.currentValue,
        weightPercent: weightPct,
        profit: periodProfit,
        profitPercent: periodProfitPercent,
        totalProfit: h.totalReturn,
        totalProfitPercent: h.totalReturnPercent,
        color: ''
      };
    });

    // Sort descending
    const filtered = items.filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    return filtered.map((d, i) => ({
      ...d,
      color: PALETTE[i % PALETTE.length]
    }));
  }, [holdings, mode, timeRange, historical]);

  const activeItem = data[activeIndex] || data[0] || null;
  const totalModeValue = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  // Render Custom Active Shape with Neon Glow Ring
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: `drop-shadow(0 0 10px ${fill}99)` }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 11}
          outerRadius={outerRadius + 14}
          fill={fill}
          opacity={0.8}
        />
      </g>
    );
  };

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col h-[460px]">
      {/* Header: Title + Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#823AFD]/20 to-[#FC2D79]/20 border border-[#823AFD]/30 flex items-center justify-center">
            <PieIcon className="w-4 h-4 text-[#823AFD]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Allocation</h3>
            <p className="text-xs text-[#9898C8]">
              {mode === 'weight' ? 'Portfolio Weight Breakdown' : `${timeRange} Profit Contribution`}
            </p>
          </div>
        </div>

        {/* Toggle Pills */}
        <div className="flex bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-xl gap-1">
          <button
            onClick={() => { setMode('weight'); setActiveIndex(0); }}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              mode === 'weight' ? "bg-[#823AFD] text-white shadow-md" : "text-[#CBD5E1] hover:text-white"
            )}
          >
            Weight
          </button>
          <button
            onClick={() => { setMode('profit'); setActiveIndex(0); }}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              mode === 'profit' ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md" : "text-[#CBD5E1] hover:text-white"
            )}
          >
            Profit ({timeRange})
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[#9898C8] text-sm">
          No active allocation data for this selection
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center min-h-0">
          {/* Left: Glowing Doughnut Chart with Center Stat (5 cols) */}
          <div className="md:col-span-5 h-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="64%"
                  outerRadius="88%"
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  paddingAngle={2}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {activeItem ? (
                <>
                  <span className="text-xl font-black text-white tracking-tight">{activeItem.name}</span>
                  <span className="text-sm font-bold text-[#38BDF8] mt-0.5">
                    {totalModeValue > 0 ? ((activeItem.value / totalModeValue) * 100).toFixed(1) : '0.0'}%
                  </span>
                  <span className="text-[11px] text-[#9898C8] font-semibold tabular-nums mt-0.5">
                    {formatCurrency(activeItem.currentValue)}
                  </span>
                </>
              ) : (
                <span className="text-xs text-[#9898C8]">Hover Slice</span>
              )}
            </div>
          </div>

          {/* Right: Beautiful Interactive Legend Grid (7 cols) */}
          <div className="md:col-span-7 h-full flex flex-col min-h-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] font-bold text-[#9898C8] uppercase tracking-wider px-3 pb-2 border-b border-[#2A2E45]/60">
              <span className="col-span-4">Asset</span>
              <span className="col-span-3 text-right">Value</span>
              <span className="col-span-3 text-right">P/L ({timeRange})</span>
              <span className="col-span-2 text-right">Weight</span>
            </div>

            {/* Scrollable Legend Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 pt-1">
              {data.map((item, idx) => {
                const isSelected = activeIndex === idx;
                const isPositive = item.profit >= 0;

                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={clsx(
                      "grid grid-cols-12 items-center px-3 py-2 rounded-xl text-xs transition-all cursor-pointer group select-none",
                      isSelected 
                        ? "bg-[#1A1D2D] border border-[#38BDF8]/40 shadow-[0_2px_12px_rgba(56,189,248,0.15)]" 
                        : "hover:bg-[#1A1D2D]/60 border border-transparent"
                    )}
                  >
                    {/* Col 1: Dot + Symbol (4 cols) */}
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125" 
                        style={{ backgroundColor: item.color, boxShadow: isSelected ? `0 0 8px ${item.color}` : 'none' }}
                      />
                      <span className="font-bold text-white truncate">{item.name}</span>
                    </div>

                    {/* Col 2: Market Value (3 cols) */}
                    <div className="col-span-3 text-right font-semibold text-[#E2E8F0] tabular-nums">
                      {formatCurrency(item.currentValue)}
                    </div>

                    {/* Col 3: Profit / Loss ($ & %) (3 cols) */}
                    <div className="col-span-3 text-right">
                      <div className={clsx("font-bold tabular-nums text-[11px]", isPositive ? "text-emerald-400" : "text-rose-400")}>
                        {isPositive ? '+' : ''}{formatCurrency(item.profit)}
                      </div>
                      <div className={clsx("text-[10px] tabular-nums", isPositive ? "text-emerald-400/80" : "text-rose-400/80")}>
                        {isPositive ? '+' : ''}{item.profitPercent.toFixed(1)}%
                      </div>
                    </div>

                    {/* Col 4: Weight % (2 cols) */}
                    <div className="col-span-2 text-right font-bold text-[#38BDF8] tabular-nums">
                      {item.weightPercent.toFixed(1)}%
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
