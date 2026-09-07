import React, { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Layers, Trophy, CheckSquare, Square, Eye, EyeOff, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

interface HoldingsPerformanceAttributionProps {
  transactions: Transaction[];
  priceData: Record<string, Record<string, number>>; // symbol -> date -> price
  displayDates: string[]; // dates matching the current active timeRange
  portfolioReturnData?: { date: string; value?: number }[]; // Portfolio TWR %
  timeRangeLabel?: string;
}

const PALETTE = [
  '#38BDF8', // Sky
  '#A855F7', // Purple
  '#F43F5E', // Rose
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#84CC16', // Lime
  '#E11D48', // Crimson
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const PORTFOLIO_COLOR = '#FBBF24'; // Golden amber

export const HoldingsPerformanceAttribution: React.FC<HoldingsPerformanceAttributionProps> = ({
  transactions,
  priceData,
  displayDates,
  portfolioReturnData = [],
  timeRangeLabel = 'Period',
}) => {
  // 1. Calculate active holdings & first buy date
  const { activeHoldings, firstBuyDates } = useMemo(() => {
    const confirmedTxs = transactions
      .filter(t => t.status !== 'CANCELLED' && t.asset !== 'Cash' && t.symbol && t.symbol !== 'CASH')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const holdingsMap: Record<string, { quantity: number; totalCost: number }> = {};
    const buyDateMap: Record<string, string> = {};

    confirmedTxs.forEach(t => {
      const sym = t.symbol.toUpperCase();
      const qty = Number(t.amount || 0);
      const price = Number(t.price || 0);
      const dateStr = t.date ? t.date.split('T')[0] : '';

      if (!holdingsMap[sym]) {
        holdingsMap[sym] = { quantity: 0, totalCost: 0 };
      }

      if (t.type === 'BUY') {
        holdingsMap[sym].quantity += qty;
        holdingsMap[sym].totalCost += qty * price;
        if (!buyDateMap[sym] && dateStr) {
          buyDateMap[sym] = dateStr;
        }
      } else if (t.type === 'SELL') {
        holdingsMap[sym].quantity = Math.max(0, holdingsMap[sym].quantity - qty);
      }
    });

    // Active symbols with positive quantity, sorted by totalCost (size)
    const active = Object.keys(holdingsMap)
      .filter(sym => holdingsMap[sym].quantity > 0.0001)
      .sort((a, b) => holdingsMap[b].totalCost - holdingsMap[a].totalCost);

    return {
      activeHoldings: active,
      firstBuyDates: buyDateMap,
    };
  }, [transactions]);

  // Color mapping per symbol
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeHoldings.forEach((sym, idx) => {
      map[sym] = PALETTE[idx % PALETTE.length];
    });
    return map;
  }, [activeHoldings]);

  // Selection state (default: Top 5 selected)
  const [selectedSymbols, setSelectedSymbols] = useState<Record<string, boolean>>({});
  const [showPortfolio, setShowPortfolio] = useState<boolean>(true);

  useEffect(() => {
    if (activeHoldings.length > 0) {
      const initial: Record<string, boolean> = {};
      activeHoldings.forEach((sym, idx) => {
        initial[sym] = idx < 5; // Top 5
      });
      setSelectedSymbols(initial);
    }
  }, [activeHoldings.join(',')]);

  const toggleSymbol = (sym: string) => {
    setSelectedSymbols(prev => ({
      ...prev,
      [sym]: !prev[sym],
    }));
  };

  const selectTop5 = () => {
    const updated: Record<string, boolean> = {};
    activeHoldings.forEach((sym, idx) => {
      updated[sym] = idx < 5;
    });
    setSelectedSymbols(updated);
  };

  const selectAll = () => {
    const updated: Record<string, boolean> = {};
    activeHoldings.forEach(sym => {
      updated[sym] = true;
    });
    setSelectedSymbols(updated);
  };

  const clearAll = () => {
    const updated: Record<string, boolean> = {};
    activeHoldings.forEach(sym => {
      updated[sym] = false;
    });
    setSelectedSymbols(updated);
  };

  // 2. Build time series data normalized to Day 0
  const { chartData, leaderboardData } = useMemo(() => {
    if (displayDates.length === 0 || activeHoldings.length === 0) {
      return { chartData: [], leaderboardData: [] };
    }

    const startDate = displayDates[0];
    const portfolioMap = new Map<string, number>();
    portfolioReturnData.forEach(p => {
      if (p.date && p.value !== undefined) {
        portfolioMap.set(p.date, p.value);
      }
    });

    // Base price map for each holding
    // If firstBuyDate <= startDate -> base is price on or closest before startDate
    // If firstBuyDate > startDate -> base is price on firstBuyDate
    const basePriceMap: Record<string, number> = {};
    const effectiveStartMap: Record<string, string> = {};

    activeHoldings.forEach(sym => {
      const prices = priceData[sym] || {};
      const firstBuy = firstBuyDates[sym] || startDate;

      if (firstBuy <= startDate) {
        effectiveStartMap[sym] = startDate;
        // find price on startDate, or closest preceding date
        if (prices[startDate]) {
          basePriceMap[sym] = prices[startDate];
        } else {
          const sortedDates = Object.keys(prices).filter(d => d <= startDate).sort();
          if (sortedDates.length > 0) {
            basePriceMap[sym] = prices[sortedDates[sortedDates.length - 1]];
          } else {
            // fallback to first available
            const anyDates = Object.keys(prices).sort();
            basePriceMap[sym] = anyDates.length > 0 ? prices[anyDates[0]] : 0;
          }
        }
      } else {
        effectiveStartMap[sym] = firstBuy;
        if (prices[firstBuy]) {
          basePriceMap[sym] = prices[firstBuy];
        } else {
          const sortedDates = Object.keys(prices).filter(d => d >= firstBuy).sort();
          basePriceMap[sym] = sortedDates.length > 0 ? prices[sortedDates[0]] : 0;
        }
      }
    });

    const series: any[] = [];
    const latestReturns: Record<string, number | null> = {};

    displayDates.forEach(date => {
      const point: any = { date };

      if (portfolioMap.has(date)) {
        point['Portfolio'] = portfolioMap.get(date);
      }

      activeHoldings.forEach(sym => {
        const firstValidDate = effectiveStartMap[sym];
        const basePrice = basePriceMap[sym];
        const prices = priceData[sym] || {};

        if (date < firstValidDate) {
          // Stock was NOT yet in the portfolio
          point[sym] = null;
        } else if (basePrice && basePrice > 0) {
          let currentPrice = prices[date];
          if (currentPrice === undefined) {
            // lookup last known price up to date
            const pastDates = Object.keys(prices).filter(d => d <= date && d >= firstValidDate).sort();
            if (pastDates.length > 0) {
              currentPrice = prices[pastDates[pastDates.length - 1]];
            }
          }

          if (currentPrice !== undefined && basePrice > 0) {
            const pct = ((currentPrice - basePrice) / basePrice) * 100;
            point[sym] = Number(pct.toFixed(2));
            latestReturns[sym] = point[sym];
          } else {
            point[sym] = null;
          }
        } else {
          point[sym] = null;
        }
      });

      series.push(point);
    });

    // Compute leaderboard ranking
    const ranking = activeHoldings.map(sym => {
      const ret = latestReturns[sym] ?? 0;
      const isNew = (firstBuyDates[sym] || '') > startDate;
      return {
        symbol: sym,
        returnPercent: ret,
        color: colorMap[sym],
        isNew,
        firstBuyDate: firstBuyDates[sym],
      };
    }).sort((a, b) => b.returnPercent - a.returnPercent);

    return {
      chartData: series,
      leaderboardData: ranking,
    };
  }, [displayDates, activeHoldings, priceData, firstBuyDates, portfolioReturnData, colorMap]);

  // Max absolute return for horizontal bar scaling
  const maxAbsReturn = useMemo(() => {
    const vals = leaderboardData.map(d => Math.abs(d.returnPercent));
    return Math.max(...vals, 10);
  }, [leaderboardData]);

  // Custom Chart Tooltip
  const CustomAttributionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sortedPayload = [...payload].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
      return (
        <div className="bg-[#0F172A]/95 backdrop-blur-md text-[#CBD5E1] p-3.5 border border-gray-700/80 rounded-xl shadow-2xl text-xs z-50 min-w-[200px]">
          <p className="font-bold mb-2 text-[13px] text-white border-b border-gray-700/60 pb-1">
            {new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
          </p>
          <div className="space-y-1.5">
            {sortedPayload.map((entry: any, index: number) => {
              if (entry.value === null || entry.value === undefined) return null;
              const isPort = entry.name === 'Portfolio';
              const val = Number(entry.value);
              return (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className={clsx("truncate font-medium", isPort ? "text-amber-300 font-bold" : "text-gray-300")}>
                      {entry.name}
                    </span>
                  </div>
                  <span className={clsx("font-mono font-bold shrink-0", val >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {val >= 0 ? '+' : ''}{val.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (activeHoldings.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Header with Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] flex items-center justify-center text-[#823AFD]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Holdings Performance Attribution
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#823AFD]/15 text-[#A855F7] border border-[#823AFD]/30">
                Normalized Trajectory
              </span>
            </h3>
            <p className="text-[13px] text-[#CBD5E1]">
              เปรียบเทียบผลตอบแทนหุ้นรายตัวในพอร์ตแข่งกันเอง (วันแรกที่ซื้อ = ฐาน 0%)
            </p>
          </div>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-2 bg-[#141824] border border-[#2A2E45] p-1 rounded-xl text-xs">
          <button
            onClick={selectTop5}
            className="px-2.5 py-1 rounded-lg font-medium text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            Top 5
          </button>
          <button
            onClick={selectAll}
            className="px-2.5 py-1 rounded-lg font-medium text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            All
          </button>
          <button
            onClick={clearAll}
            className="px-2.5 py-1 rounded-lg font-medium text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stock Filter Checkboxes Bar */}
      <div className="bg-[#141824] border border-[#2A2E45] rounded-2xl p-3.5 flex flex-wrap items-center gap-3">
        {/* Portfolio Reference Toggle */}
        <button
          onClick={() => setShowPortfolio(!showPortfolio)}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all",
            showPortfolio
              ? "bg-[#FBBF24]/15 border-[#FBBF24] text-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.2)]"
              : "bg-[#1A1D2D] border-[#2A2E45] text-gray-400 opacity-60 hover:opacity-100"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
          <span>My Portfolio (TWR)</span>
        </button>

        <div className="h-4 w-px bg-gray-700/60 mx-1 hidden sm:block" />

        {/* Individual Stock Toggles */}
        {activeHoldings.map(sym => {
          const isSelected = !!selectedSymbols[sym];
          const color = colorMap[sym];
          const isNew = (firstBuyDates[sym] || '') > (displayDates[0] || '');

          return (
            <button
              key={sym}
              onClick={() => toggleSymbol(sym)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1.2 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                isSelected
                  ? "bg-[#1E293B] border-opacity-60 text-white shadow-sm"
                  : "bg-[#111418]/60 border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1A1D2D]"
              )}
              style={{
                borderColor: isSelected ? color : 'transparent',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-transform"
                style={{
                  backgroundColor: isSelected ? color : '#6B7280',
                  transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                }}
              />
              <span className={clsx(isSelected ? "text-white" : "text-gray-400")}>{sym}</span>
              {isNew && (
                <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 ml-0.5">
                  New
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Row: 3/4 Line Chart + 1/4 Leaderboard Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3/4): Holdings Trajectory Line Chart */}
        <div className="lg:col-span-3 bg-[#111827] border border-[#2A2E45] rounded-3xl p-5 shadow-2xl flex flex-col justify-between min-h-[440px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                Holdings Trajectory ({timeRangeLabel})
              </h4>
              <p className="text-[13px] text-[#CBD5E1]">
                เส้นกราฟเริ่มนับ 0% ณ วันแรกที่ซื้อเข้าพอร์ตจริง
              </p>
            </div>
          </div>

          <div className="w-full h-80 flex-1">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    tickFormatter={tick => new Date(tick).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    tick={{ fontSize: 13, fill: '#CBD5E1' }}
                    dy={8}
                    axisLine={{ stroke: '#2A2E45' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tickFormatter={tick => `${tick.toFixed(0)}%`}
                    tick={{ fontSize: 13, fill: '#CBD5E1' }}
                    axisLine={{ stroke: '#2A2E45' }}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomAttributionTooltip />} />

                  {/* Portfolio Reference Line */}
                  {showPortfolio && (
                    <Line
                      type="monotone"
                      dataKey="Portfolio"
                      name="Portfolio"
                      stroke={PORTFOLIO_COLOR}
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                    />
                  )}

                  {/* Individual Stock Lines */}
                  {activeHoldings.map(sym => {
                    if (!selectedSymbols[sym]) return null;
                    return (
                      <Line
                        key={sym}
                        type="monotone"
                        dataKey={sym}
                        name={sym}
                        stroke={colorMap[sym]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No historical price data available for selected holdings.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/4): Leaderboard Bar Chart */}
        <div className="lg:col-span-1 bg-[#111827] border border-[#2A2E45] rounded-3xl p-5 shadow-2xl flex flex-col justify-between min-h-[440px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h4 className="text-white font-bold text-base tracking-wide">Holdings Ranking</h4>
            </div>
            <p className="text-[13px] text-[#CBD5E1] mb-4">
              เรียงลำดับผลตอบแทนในรอบ {timeRangeLabel}
            </p>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {leaderboardData.map((item, idx) => {
                const isPositive = item.returnPercent >= 0;
                const isSelected = !!selectedSymbols[item.symbol];
                const barWidth = Math.max(6, Math.min(100, (Math.abs(item.returnPercent) / maxAbsReturn) * 100));

                return (
                  <div
                    key={item.symbol}
                    onClick={() => toggleSymbol(item.symbol)}
                    className={clsx(
                      "p-2.5 rounded-2xl border transition-all cursor-pointer group",
                      isSelected
                        ? "bg-[#141824] border-[#2A2E45] hover:border-gray-600"
                        : "bg-[#0D1017] border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-500 font-bold w-4 text-[12px]">
                          #{idx + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-bold text-white text-[13px]">{item.symbol}</span>
                        {item.isNew && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            New
                          </span>
                        )}
                      </div>
                      <span
                        className={clsx(
                          "font-mono font-bold text-[13px] tabular-nums",
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {isPositive ? '+' : ''}{item.returnPercent.toFixed(2)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#1A1D2D] rounded-full overflow-hidden flex">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-700",
                          isPositive
                            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                            : "bg-gradient-to-r from-rose-500 to-red-400"
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-[#2A2E45]/80 text-[12px] text-gray-400 text-center">
            คลิกที่หุ้นเพื่อเปิด/ปิดเส้นบนกราฟ
          </div>
        </div>
      </div>
    </div>
  );
};
