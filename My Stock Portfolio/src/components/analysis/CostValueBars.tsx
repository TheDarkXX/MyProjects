import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { HeatmapTimeRange } from './Heatmap';
import { BarChart3 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  holdings: Holding[];
  timeRange?: HeatmapTimeRange;
}

type SortType = 'Value' | 'Cost' | 'Profit $' | 'Profit %' | 'A-Z';

export const CostValueBars: React.FC<Props> = ({ holdings = [], timeRange = '1D' }) => {
  const [sortBy, setSortBy] = useState<SortType>('Value');

  const { currency } = useUiStore();
  const { exchangeRate, historical } = usePriceStore();

  const formatCurrency = (val: number) => {
    if (isNaN(val)) return '$0.00';
    if (currency === 'THB' && exchangeRate) {
      const converted = Math.round(val * exchangeRate);
      return `฿${converted.toLocaleString('th-TH')}`;
    }
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatShortAxis = (val: number) => {
    if (isNaN(val)) return '';
    const symbol = currency === 'THB' ? '฿' : '$';
    const rate = currency === 'THB' && exchangeRate ? exchangeRate : 1;
    const converted = val * rate;

    if (Math.abs(converted) >= 1_000_000) {
      return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(converted) >= 1_000) {
      return `${symbol}${Math.round(converted / 1_000)}k`;
    }
    return `${symbol}${Math.round(converted)}`;
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

  const data = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    let items = holdings
      .filter(h => (h.currentValue > 0 || h.totalCost > 0) && h.symbol !== 'CASH')
      .map(h => {
        let periodProfit = h.dayReturn || 0;
        let periodProfitPercent = h.dayChangePercent || 0;

        if (timeRange === '1D') {
          periodProfit = h.dayReturn || 0;
          periodProfitPercent = h.dayChangePercent || 0;
        } else if (timeRange === 'Total') {
          periodProfit = h.totalReturn || 0;
          periodProfitPercent = h.totalReturnPercent || 0;
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
              periodProfit = (endPrice - startPrice) * (h.quantity || 0);
            }
          }
        }

        return {
          name: h.symbol,
          cost: h.totalCost || 0,
          value: h.currentValue || 0,
          rawCost: h.totalCost || 0,
          rawValue: h.currentValue || 0,
          profit: periodProfit,
          profitPercent: periodProfitPercent,
          totalProfit: h.totalReturn || 0,
          totalProfitPercent: h.totalReturnPercent || 0,
          shares: h.quantity || 0,
          avgCost: h.avgCost || 0
        };
      });

    switch (sortBy) {
      case 'Value':
        items.sort((a, b) => b.rawValue - a.rawValue);
        break;
      case 'Cost':
        items.sort((a, b) => b.rawCost - a.rawCost);
        break;
      case 'Profit $':
        items.sort((a, b) => b.profit - a.profit);
        break;
      case 'Profit %':
        items.sort((a, b) => b.profitPercent - a.profitPercent);
        break;
      case 'A-Z':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return items.slice(0, 16);
  }, [holdings, sortBy, timeRange, historical]);

  // Floating Return Badge above Market Value Bar: Enlarged +4 levels (fontSize: 15px, Font-Black)
  const renderValueBadge = (props: any) => {
    const { x, y, width, index } = props;
    const item = data[index];
    if (!item) return null;
    const isPositive = item.profit >= 0;
    const pctStr = `${isPositive ? '+' : ''}${item.profitPercent.toFixed(1)}%`;

    return (
      <text
        x={x + width / 2}
        y={y - 10}
        fill={isPositive ? '#34D399' : '#FB7185'}
        textAnchor="middle"
        fontSize="15"
        fontWeight="900"
        className="select-none pointer-events-none font-black"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.95))' }}
      >
        {pctStr}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isPeriodPositive = item.profit >= 0;
      const isTotalPositive = item.totalProfit >= 0;

      return (
        <div className="bg-[#0F111A]/95 backdrop-blur-xl border border-[#2A2E45] p-4 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] text-xs text-white min-w-[240px] z-50">
          <div className="flex justify-between items-center pb-2.5 border-b border-[#2A2E45] mb-2.5">
            <span className="font-black text-white text-base tracking-tight">{item.name}</span>
            <span className="text-[11px] text-[#CBD5E1]">
              {item.shares?.toFixed(4)} shares @ {formatCurrency(item.avgCost || 0)}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[#CBD5E1]">Cost Basis:</span>
              <span className="font-semibold text-white tabular-nums">{formatCurrency(item.rawCost)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#CBD5E1]">Current Value:</span>
              <span className="font-bold text-white tabular-nums">{formatCurrency(item.rawValue)}</span>
            </div>

            <div className="pt-2 border-t border-[#2A2E45]/60 flex justify-between items-center">
              <span className="text-[#CBD5E1]">{timeRange} Return:</span>
              <span className={clsx("font-bold tabular-nums", isPeriodPositive ? "text-emerald-400" : "text-rose-400")}>
                {isPeriodPositive ? '+' : ''}{formatCurrency(item.profit)} ({isPeriodPositive ? '+' : ''}{item.profitPercent.toFixed(1)}%)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#CBD5E1]">Total Return:</span>
              <span className={clsx("font-bold tabular-nums", isTotalPositive ? "text-emerald-400" : "text-rose-400")}>
                {isTotalPositive ? '+' : ''}{formatCurrency(item.totalProfit)} ({isTotalPositive ? '+' : ''}{item.totalProfitPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col">
      {/* Header Bar: Enlarged Title & Subtitle (+4 font levels) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#38BDF8]/20 border border-[#10B981]/30 flex items-center justify-center shadow-inner">
            <BarChart3 className="w-5 h-5 text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Cost vs Market Value</h3>
            <p className="text-sm font-medium text-[#CBD5E1] mt-0.5">
              Paired capital comparison with {timeRange} return badges
            </p>
          </div>
        </div>

        {/* Sort Controls (Size Preserved as requested) */}
        <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-xl gap-1 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-[#9898C8] px-2 uppercase">Sort By:</span>
          {(['Value', 'Cost', 'Profit $', 'Profit %', 'A-Z'] as SortType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSortBy(type)}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                sortBy === type 
                  ? "bg-gradient-to-r from-[#10B981] to-[#38BDF8] text-[#0F111A] font-black shadow-md" 
                  : "text-[#CBD5E1] hover:text-white hover:bg-white/5"
              )}
            >
              {type === 'Profit $' ? `Profit $ (${timeRange})` : type === 'Profit %' ? `Profit % (${timeRange})` : type}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[380px] flex items-center justify-center text-[#9898C8] text-sm">
          No active securities to compare
        </div>
      ) : (
        /* Height increased to 390px for comfortable breathing room with +4 larger fonts */
        <div className="w-full" style={{ height: 390, minHeight: 390 }}>
          <ResponsiveContainer width="100%" height={390}>
            <BarChart 
              data={data} 
              barGap={5} 
              barSize={28}
              barCategoryGap="25%"
              margin={{ top: 32, right: 15, left: 5, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2233" vertical={false} />
              
              {/* X-Axis Ticker Labels: Enlarged +4 levels (fontSize: 15, fontWeight: 900) */}
              <XAxis 
                dataKey="name" 
                stroke="#9898C8" 
                tick={{ fill: '#F8FAFC', fontSize: 15, fontWeight: 900 }}
                tickLine={false}
                axisLine={{ stroke: '#2A2E45' }}
              />

              {/* Y-Axis Value Labels: Enlarged +4 levels (fontSize: 14, fontWeight: 700) */}
              <YAxis 
                stroke="#9898C8" 
                tickFormatter={formatShortAxis}
                tick={{ fill: '#CBD5E1', fontSize: 14, fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: '#2A2E45' }}
                width={65}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              
              {/* Legend: Enlarged +4 levels (fontSize: 14px, Font-Bold) */}
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ paddingBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}
                formatter={(val) => <span className="text-[#F8FAFC] font-bold text-sm ml-1">{val}</span>}
              />

              {/* Cost Basis Bar (Indigo-500) */}
              <Bar 
                dataKey="cost" 
                name="Cost Basis" 
                fill="#6366F1"
                radius={[6, 6, 0, 0]} 
              />

              {/* Market Value Bar (Emerald-500 if profit >= 0, Rose-500 if loss) + Floating Return Badge */}
              <Bar 
                dataKey="value" 
                name="Current Value" 
                radius={[6, 6, 0, 0]} 
                label={renderValueBadge}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-bar-${index}`} 
                    fill={entry.profit >= 0 ? "#10B981" : "#F43F5E"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
