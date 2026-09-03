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
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

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

  // Clean, institutional floating return badge: Crisp typography without messy pulse boxes
  const renderValueBadge = (props: any) => {
    const { x, y, width, index } = props;
    const item = data[index];
    if (!item) return null;
    const isPositive = item.profit >= 0;
    const isHovered = activeHoverIndex === index;
    const pctStr = `${isPositive ? '+' : ''}${item.profitPercent.toFixed(1)}%`;

    return (
      <text
        x={x + width / 2}
        y={isHovered ? y - 12 : y - 8}
        fill={isPositive ? '#34D399' : '#FB7185'}
        textAnchor="middle"
        fontSize={isHovered ? "16" : "15"}
        fontWeight="900"
        className="select-none pointer-events-none"
        style={{
          filter: isHovered 
            ? `drop-shadow(0 0 6px ${isPositive ? 'rgba(52,211,153,0.7)' : 'rgba(251,113,133,0.7)'})` 
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.95))',
          transition: 'all 0.15s ease-out'
        }}
      >
        {pctStr}
      </text>
    );
  };

  // Top-App Smart Non-Blocking Placement: Offsets card away from the bar so it NEVER obscures bars or badges
  const getSmartTooltipPos = () => {
    if (!hoverCoord) return undefined;
    const cardWidth = 245;
    // If hovering on right half, shift card to the left; if on left half, shift to the right
    const posX = hoverCoord.x > 380 
      ? Math.max(10, hoverCoord.x - cardWidth - 50) 
      : hoverCoord.x + 55;
    // Lock to top headroom (y: 8) so the card hovers cleanly above without touching bars
    return { x: posX, y: 8 };
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isPeriodPositive = item.profit >= 0;
      const isTotalPositive = item.totalProfit >= 0;

      return (
        <div className="bg-[#0F111A]/95 backdrop-blur-2xl border border-[#2A2E45] p-3.5 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.75)] text-xs text-white min-w-[240px] pointer-events-none z-50 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-[#2A2E45] mb-2">
            <span className="font-black text-white text-base tracking-tight">{item.name}</span>
            <span className="text-[11px] text-[#CBD5E1]">
              {item.shares?.toFixed(4)} shs @ {formatCurrency(item.avgCost || 0)}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[#94A3B8]">Cost Basis:</span>
              <span className="font-semibold text-white tabular-nums">{formatCurrency(item.rawCost)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#94A3B8]">Current Value:</span>
              <span className="font-bold text-white tabular-nums">{formatCurrency(item.rawValue)}</span>
            </div>

            <div className="pt-1.5 border-t border-[#2A2E45]/60 flex justify-between items-center">
              <span className="text-[#94A3B8]">{timeRange} Return:</span>
              <span className={clsx("font-bold tabular-nums", isPeriodPositive ? "text-emerald-400" : "text-rose-400")}>
                {isPeriodPositive ? '+' : ''}{formatCurrency(item.profit)} ({isPeriodPositive ? '+' : ''}{item.profitPercent.toFixed(1)}%)
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#94A3B8]">Total Return:</span>
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
      {/* Header Bar */}
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

        {/* Sort Controls */}
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
        <div className="h-[390px] flex items-center justify-center text-[#9898C8] text-sm">
          No active securities to compare
        </div>
      ) : (
        /* Interactive Bar Chart with Top-App Institutional Polish */
        <div className="w-full" style={{ height: 390, minHeight: 390 }}>
          <ResponsiveContainer width="100%" height={390}>
            <BarChart 
              data={data} 
              barGap={5} 
              barSize={28}
              barCategoryGap="25%"
              margin={{ top: 38, right: 15, left: 5, bottom: 25 }}
              onMouseMove={(state: any) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setActiveHoverIndex(state.activeTooltipIndex);
                  if (state.activeCoordinate) {
                    setHoverCoord(state.activeCoordinate);
                  }
                }
              }}
              onMouseLeave={() => {
                setActiveHoverIndex(null);
                setHoverCoord(null);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2233" vertical={false} />
              
              <XAxis 
                dataKey="name" 
                stroke="#9898C8" 
                tick={{ fill: '#F8FAFC', fontSize: 15, fontWeight: 900 }}
                tickLine={false}
                axisLine={{ stroke: '#2A2E45' }}
              />

              {/* Y-Axis with 25% Headroom for clean badge & card clearance */}
              <YAxis 
                stroke="#9898C8" 
                tickFormatter={formatShortAxis}
                tick={{ fill: '#CBD5E1', fontSize: 14, fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: '#2A2E45' }}
                width={65}
                domain={[0, (dataMax: number) => Math.ceil((dataMax * 1.25) / 100) * 100]}
              />

              {/* Smart Non-Blocking Tooltip: Positioned in top headroom, offset away from active bars */}
              <Tooltip 
                content={<CustomTooltip />} 
                position={getSmartTooltipPos()}
                isAnimationActive={false}
                cursor={{ 
                  fill: 'rgba(255, 255, 255, 0.03)', 
                  radius: 8 
                }} 
              />
              
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ paddingBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}
                formatter={(val) => <span className="text-[#F8FAFC] font-bold text-sm ml-1">{val}</span>}
              />

              {/* Cost Basis Bar: Crisp institutional highlight on hover */}
              <Bar 
                dataKey="cost" 
                name="Cost Basis" 
                radius={[6, 6, 0, 0]} 
                isAnimationActive={true}
                animationDuration={600}
              >
                {data.map((entry, index) => {
                  const isHovered = activeHoverIndex === index;
                  const isDimmed = activeHoverIndex !== null && !isHovered;

                  return (
                    <Cell 
                      key={`cell-cost-${index}`} 
                      fill={isHovered ? "#818CF8" : "#6366F1"}
                      stroke={isHovered ? "#FFFFFF" : "transparent"}
                      strokeWidth={isHovered ? 1.5 : 0}
                      opacity={isDimmed ? 0.65 : 1}
                      style={{
                        transition: 'all 0.15s ease-out',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </Bar>

              {/* Market Value Bar: Crisp institutional highlight on hover */}
              <Bar 
                dataKey="value" 
                name="Current Value" 
                radius={[6, 6, 0, 0]} 
                label={renderValueBadge}
                isAnimationActive={true}
                animationDuration={600}
              >
                {data.map((entry, index) => {
                  const isHovered = activeHoverIndex === index;
                  const isDimmed = activeHoverIndex !== null && !isHovered;
                  const isPositive = entry.profit >= 0;
                  const baseColor = isPositive ? "#10B981" : "#F43F5E";
                  const hoverColor = isPositive ? "#34D399" : "#FB7185";

                  return (
                    <Cell 
                      key={`cell-val-${index}`} 
                      fill={isHovered ? hoverColor : baseColor} 
                      stroke={isHovered ? "#FFFFFF" : "transparent"}
                      strokeWidth={isHovered ? 1.5 : 0}
                      opacity={isDimmed ? 0.65 : 1}
                      style={{
                        transition: 'all 0.15s ease-out',
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
