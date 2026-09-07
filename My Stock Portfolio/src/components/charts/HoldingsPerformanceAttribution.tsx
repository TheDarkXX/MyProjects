import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Transaction } from '../../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Layers, Trophy, CheckSquare, Square, Eye, EyeOff, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

interface HoldingsPerformanceAttributionProps {
  transactions: Transaction[];
  priceData: Record<string, Record<string, number>>; // symbol -> date -> price
  displayDates: string[]; // dates matching the current active timeRange
  portfolioReturnData?: { date: string; value?: number }[]; // Portfolio TWR %
  spyReturnData?: { date: string; value?: number }[]; // S&P 500 %
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
const SPY_COLOR = '#A855F7'; // S&P 500 Vibrant Purple

export type AttributionMode = 'inception' | 'tradingview';

export const HoldingsPerformanceAttribution: React.FC<HoldingsPerformanceAttributionProps> = ({
  transactions,
  priceData,
  displayDates,
  portfolioReturnData = [],
  spyReturnData = [],
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

  // Attribution Mode: 'inception' (Default - Since Buy) vs 'tradingview' (Dynamic Window Rebase)
  const [mode, setMode] = useState<AttributionMode>('inception');

  // Selection state (default: Top 5 selected)
  const [selectedSymbols, setSelectedSymbols] = useState<Record<string, boolean>>({});
  const [showPortfolio, setShowPortfolio] = useState<boolean>(true);
  const [showSpy, setShowSpy] = useState<boolean>(true);

  // Zoom state for Ctrl + Scroll
  const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  // Reset zoom when timeframe changes
  useEffect(() => {
    setZoomRange(null);
  }, [timeRangeLabel, displayDates[0]]);

  const effectiveDates = useMemo(() => {
    if (!zoomRange) return displayDates;
    return displayDates.slice(zoomRange.startIndex, zoomRange.endIndex + 1);
  }, [displayDates, zoomRange]);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (displayDates.length < 6) return;

        const currentStart = zoomRange ? zoomRange.startIndex : 0;
        const currentEnd = zoomRange ? zoomRange.endIndex : displayDates.length - 1;
        const currentSpan = currentEnd - currentStart;
        const zoomDelta = Math.max(1, Math.round(currentSpan * 0.12));

        if (e.deltaY < 0) {
          // Zoom In: shrink window
          if (currentSpan <= 5) return;
          const newStart = Math.min(currentEnd - 5, currentStart + zoomDelta);
          const newEnd = Math.max(newStart + 5, currentEnd - zoomDelta);
          setZoomRange({ startIndex: newStart, endIndex: newEnd });
        } else {
          // Zoom Out: expand window
          const newStart = Math.max(0, currentStart - zoomDelta);
          const newEnd = Math.min(displayDates.length - 1, currentEnd + zoomDelta);
          if (newStart === 0 && newEnd === displayDates.length - 1) {
            setZoomRange(null);
          } else {
            setZoomRange({ startIndex: newStart, endIndex: newEnd });
          }
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [displayDates, zoomRange]);

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

  // 2. Build time series data (Supports both 'inception' and 'tradingview' modes)
  const { chartData, leaderboardData } = useMemo(() => {
    if (effectiveDates.length === 0 || activeHoldings.length === 0) {
      return { chartData: [], leaderboardData: [] };
    }

    // Window start date (left-most visible date)
    const startDate = effectiveDates[0];
    const portfolioMap = new Map<string, number>();
    portfolioReturnData.forEach(p => {
      if (p.date && p.value !== undefined) {
        portfolioMap.set(p.date, p.value);
      }
    });

    const baselinePortfolio = portfolioMap.get(startDate) ?? 0;

    const spyMap = new Map<string, number>();
    spyReturnData.forEach(p => {
      if (p.date && p.value !== undefined) {
        spyMap.set(p.date, p.value);
      }
    });

    const baselineSpy = spyMap.get(startDate) ?? 0;

    const basePriceMap: Record<string, number> = {};
    const effectiveStartMap: Record<string, string> = {};

    activeHoldings.forEach(sym => {
      const prices = priceData[sym] || {};
      const firstBuy = firstBuyDates[sym] || startDate;

      if (mode === 'tradingview') {
        // TradingView: Window Rebase (left-most date = 0%)
        if (firstBuy <= startDate) {
          effectiveStartMap[sym] = startDate;
          if (prices[startDate]) {
            basePriceMap[sym] = prices[startDate];
          } else {
            const sortedDates = Object.keys(prices).filter(d => d <= startDate).sort();
            if (sortedDates.length > 0) {
              basePriceMap[sym] = prices[sortedDates[sortedDates.length - 1]];
            } else {
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
      } else {
        // Inception: Actual return since first bought into portfolio
        effectiveStartMap[sym] = firstBuy;
        if (prices[firstBuy]) {
          basePriceMap[sym] = prices[firstBuy];
        } else {
          const sortedDates = Object.keys(prices).filter(d => d >= firstBuy).sort();
          if (sortedDates.length > 0) {
            basePriceMap[sym] = prices[sortedDates[0]];
          } else {
            const anyDates = Object.keys(prices).sort();
            basePriceMap[sym] = anyDates.length > 0 ? prices[anyDates[0]] : 0;
          }
        }
      }
    });

    const series: any[] = [];
    const latestReturns: Record<string, number | null> = {};

    // Build chart data slice for effectiveDates
    effectiveDates.forEach(date => {
      const point: any = { date };

      if (portfolioMap.has(date)) {
        const rawPort = portfolioMap.get(date) ?? 0;
        if (mode === 'tradingview') {
          point['Portfolio'] = Number((rawPort - baselinePortfolio).toFixed(2));
        } else {
          point['Portfolio'] = Number(rawPort.toFixed(2));
        }
      } else if (mode === 'tradingview' && date === startDate) {
        point['Portfolio'] = 0;
      }

      if (spyMap.has(date)) {
        const rawSpy = spyMap.get(date) ?? 0;
        if (mode === 'tradingview') {
          point['S&P 500'] = Number((rawSpy - baselineSpy).toFixed(2));
        } else {
          point['S&P 500'] = Number(rawSpy.toFixed(2));
        }
      } else if (mode === 'tradingview' && date === startDate) {
        point['S&P 500'] = 0;
      }

      activeHoldings.forEach(sym => {
        const firstValidDate = effectiveStartMap[sym];
        const basePrice = basePriceMap[sym];
        const prices = priceData[sym] || {};

        if (date < firstValidDate) {
          // Stock was NOT yet in the portfolio
          point[sym] = null;
        } else if (date === firstValidDate) {
          // Exactly Day 0 for this stock -> 0.00%
          point[sym] = 0;
          if (latestReturns[sym] === undefined) {
            latestReturns[sym] = 0;
          }
        } else if (basePrice && basePrice > 0) {
          let currentPrice = prices[date];
          if (currentPrice === undefined) {
            const pastDates = Object.keys(prices).filter(d => d <= date).sort();
            if (pastDates.length > 0) {
              currentPrice = prices[pastDates[pastDates.length - 1]];
            }
          }

          if (currentPrice !== undefined && basePrice > 0) {
            const pct = ((currentPrice - basePrice) / basePrice) * 100;
            point[sym] = Number(pct.toFixed(2));
            latestReturns[sym] = point[sym];
          } else {
            point[sym] = 0;
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
      const isNew = mode === 'tradingview'
        ? (firstBuyDates[sym] || '') > startDate
        : (firstBuyDates[sym] || '') > (effectiveDates[0] || '');
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
  }, [mode, displayDates, effectiveDates, activeHoldings, priceData, firstBuyDates, portfolioReturnData, spyReturnData, colorMap]);

  // Sort holdings by return descending (มาก ไว้หน้า)
  const sortedHoldingsByReturn = useMemo(() => {
    return [...activeHoldings].sort((a, b) => {
      const itemA = leaderboardData.find(d => d.symbol === a);
      const itemB = leaderboardData.find(d => d.symbol === b);
      const retA = itemA ? itemA.returnPercent : -999999;
      const retB = itemB ? itemB.returnPercent : -999999;
      return retB - retA;
    });
  }, [activeHoldings, leaderboardData]);

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
              const isSpy = entry.name === 'S&P 500';
              const val = Number(entry.value);
              return (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className={clsx(
                      "truncate font-medium",
                      isPort ? "text-amber-300 font-bold" : isSpy ? "text-purple-300 font-bold" : "text-gray-300"
                    )}>
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

  // Pixel-space anti-collision and boundary clamping for end labels
  const lineOffsets = useMemo(() => {
    const lastPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    if (!lastPoint) return {};

    const active: { name: string; val: number }[] = [];
    if (showPortfolio && typeof lastPoint['Portfolio'] === 'number') {
      active.push({ name: 'Portfolio', val: lastPoint['Portfolio'] });
    }
    if (showSpy && typeof lastPoint['S&P 500'] === 'number') {
      active.push({ name: 'S&P 500', val: lastPoint['S&P 500'] });
    }
    activeHoldings.forEach(sym => {
      if (selectedSymbols[sym] && typeof lastPoint[sym] === 'number') {
        active.push({ name: sym, val: lastPoint[sym] });
      }
    });

    if (active.length === 0) return {};

    // Find min and max across all visible points to determine exact Y-domain scale
    let minVal = Infinity;
    let maxVal = -Infinity;
    chartData.forEach(p => {
      if (showPortfolio && typeof p['Portfolio'] === 'number') {
        if (p['Portfolio'] < minVal) minVal = p['Portfolio'];
        if (p['Portfolio'] > maxVal) maxVal = p['Portfolio'];
      }
      if (showSpy && typeof p['S&P 500'] === 'number') {
        if (p['S&P 500'] < minVal) minVal = p['S&P 500'];
        if (p['S&P 500'] > maxVal) maxVal = p['S&P 500'];
      }
      activeHoldings.forEach(sym => {
        if (selectedSymbols[sym] && typeof p[sym] === 'number') {
          if (p[sym] < minVal) minVal = p[sym];
          if (p[sym] > maxVal) maxVal = p[sym];
        }
      });
    });

    if (!isFinite(minVal) || !isFinite(maxVal) || minVal === maxVal) {
      minVal = 0;
      maxVal = 100;
    }

    const span = Math.max(1, maxVal - minVal);
    const domainMax = maxVal + span * 0.05;
    const domainMin = minVal - span * 0.05;
    const domainSpan = domainMax - domainMin;

    const plotTop = 22;
    const plotHeight = 275;
    const minSpacing = 27; // Minimum vertical gap between badges
    const topSafeY = 24;   // Never clip above top border
    const bottomSafeY = plotTop + plotHeight - 14; // Never clip below bottom axis

    // Calculate raw pixel Y for each active label
    const items = active.map(item => {
      const normalized = (domainMax - item.val) / domainSpan;
      const rawY = plotTop + Math.max(0, Math.min(plotHeight, normalized * plotHeight));
      return {
        name: item.name,
        val: item.val,
        rawY,
        y: rawY,
      };
    });

    // Sort ascending by rawY (from top of screen to bottom)
    items.sort((a, b) => a.rawY - b.rawY);

    if (items.length === 1) {
      const clampedY = Math.max(topSafeY, Math.min(bottomSafeY, items[0].rawY));
      return { [items[0].name]: Math.round(clampedY - items[0].rawY) };
    }

    // Forward pass: ensure minSpacing between adjacent labels
    for (let i = 0; i < items.length; i++) {
      if (i === 0) {
        if (items[i].y < topSafeY) items[i].y = topSafeY;
      } else {
        if (items[i].y < items[i - 1].y + minSpacing) {
          items[i].y = items[i - 1].y + minSpacing;
        }
      }
    }

    // Backward pass: if bottom-most label pushed past bottomSafeY, push cluster up
    if (items[items.length - 1].y > bottomSafeY) {
      items[items.length - 1].y = bottomSafeY;
      for (let i = items.length - 2; i >= 0; i--) {
        if (items[i].y > items[i + 1].y - minSpacing) {
          items[i].y = items[i + 1].y - minSpacing;
        }
      }
    }

    // Final top clamp guard
    if (items[0].y < topSafeY) {
      items[0].y = topSafeY;
      for (let i = 1; i < items.length; i++) {
        if (items[i].y < items[i - 1].y + minSpacing) {
          items[i].y = items[i - 1].y + minSpacing;
        }
      }
    }

    const offsets: Record<string, number> = {};
    items.forEach(item => {
      offsets[item.name] = Math.round(item.y - item.rawY);
    });
    return offsets;
  }, [chartData, showPortfolio, showSpy, activeHoldings, selectedSymbols]);

  // Safe EndOfLineLabel component matching main chart style with boundary safety
  const EndOfLineLabel = (props: any) => {
    const { index, value, x, y, stroke, yOffset = 0, name } = props;

    if (index !== chartData.length - 1) return null;
    if (value === undefined || value === null || !isFinite(value) || typeof y !== 'number') return null;

    const isPort = name === 'Portfolio';
    const isSpy = name === 'S&P 500';
    const rawPct = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    const labelText = isPort ? `${rawPct} - Portfolio` : isSpy ? `${rawPct} - S&P 500` : `${rawPct} - ${name}`;
    const textWidth = Math.max(64, labelText.length * 7 + 16);
    const badgeHeight = (isPort || isSpy) ? 24 : 22;

    // Boundary clamped target Y
    const targetY = Math.max(22, Math.min(290, y + yOffset));
    const badgeY = targetY - badgeHeight / 2;

    const badgeFill = isPort ? "#1a1607" : isSpy ? "#180e29" : "#0F172A";
    const badgeStroke = isPort ? "#FBBF24" : isSpy ? "#A855F7" : stroke;
    const textFill = isPort ? "#FBBF24" : isSpy ? "#C084FC" : "#FFFFFF";

    return (
      <g>
        <rect
          x={x + 8}
          y={badgeY}
          width={textWidth}
          height={badgeHeight}
          fill={badgeFill}
          stroke={badgeStroke}
          strokeOpacity={1}
          strokeWidth={(isPort || isSpy) ? "1.8" : "1.4"}
          rx="5"
          style={{
            filter: isPort 
              ? 'drop-shadow(0 2px 8px rgba(251,191,36,0.35))' 
              : isSpy 
                ? 'drop-shadow(0 2px 8px rgba(168,85,247,0.35))' 
                : 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
          }}
        />
        <text
          x={x + 8 + textWidth / 2}
          y={targetY + 4}
          fill={textFill}
          fillOpacity={1}
          fontSize={(isPort || isSpy) ? "12px" : "11px"}
          fontWeight={(isPort || isSpy) ? "bold" : "600"}
          fontFamily="'Roboto Flex', sans-serif"
          textAnchor="middle"
          style={{
            fontFeatureSettings: "'tnum'",
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          }}
        >
          {labelText}
        </text>
      </g>
    );
  };

  if (activeHoldings.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Header with Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] flex items-center justify-center text-[#823AFD]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Holdings Performance Attribution
              <span className={clsx(
                "text-xs font-semibold px-2 py-0.5 rounded-full border transition-all",
                mode === 'inception'
                  ? "bg-[#823AFD]/15 text-[#A855F7] border-[#823AFD]/30"
                  : "bg-[#06B6D4]/15 text-[#38BDF8] border-[#06B6D4]/30"
              )}>
                {mode === 'inception' ? 'Since Inception (Default)' : 'TradingView Rebase'}
              </span>
            </h3>
            <p className="text-[13px] text-[#CBD5E1]">
              {mode === 'inception'
                ? 'เส้นกราฟเริ่มนับ 0% ณ วันแรกที่ซื้อหุ้นแต่ละตัวเข้าพอร์ตจริง (Actual Return Since Buy)'
                : 'เปรียบเทียบโมเมนตัมแบบ TradingView (ทุกเส้นเริ่มสตาร์ท 0.00% ณ วันแรกซ้ายสุดของจอ)'}
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher & Quick Selection Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#141824] border border-[#2A2E45] p-1 rounded-xl text-xs">
            <button
              onClick={() => setMode('inception')}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.2 rounded-lg font-bold transition-all cursor-pointer",
                mode === 'inception'
                  ? "bg-[#823AFD] text-white shadow-sm shadow-[#823AFD]/40"
                  : "text-[#CBD5E1] hover:text-white hover:bg-[#1E293B]"
              )}
            >
              <span>💼</span>
              <span>Since Inception</span>
            </button>
            <button
              onClick={() => setMode('tradingview')}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.2 rounded-lg font-bold transition-all cursor-pointer",
                mode === 'tradingview'
                  ? "bg-[#06B6D4] text-white shadow-sm shadow-[#06B6D4]/40"
                  : "text-[#CBD5E1] hover:text-white hover:bg-[#1E293B]"
              )}
            >
              <span>⚡</span>
              <span>TradingView (0%)</span>
            </button>
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex items-center gap-1 bg-[#141824] border border-[#2A2E45] p-1 rounded-xl text-xs">
            <button
              onClick={selectTop5}
              className="px-2.5 py-1.2 rounded-lg font-medium text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              Top 5
            </button>
            <button
              onClick={selectAll}
              className="px-2.5 py-1.2 rounded-lg font-medium text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              All
            </button>
            <button
              onClick={clearAll}
              className="px-2.5 py-1.2 rounded-lg font-medium text-[#CBD5E1] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Stock Filter Checkboxes Bar (Sorted by % profit descending - มาก ไว้หน้า) */}
      <div className="bg-[#141824] border border-[#2A2E45] rounded-2xl p-3.5 flex flex-wrap items-center gap-2.5">
        {/* Portfolio Reference Toggle */}
        <button
          onClick={() => setShowPortfolio(!showPortfolio)}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
            showPortfolio
              ? "bg-[#FBBF24]/15 border-[#FBBF24] text-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.2)]"
              : "bg-[#1A1D2D] border-[#2A2E45] text-gray-400 opacity-60 hover:opacity-100"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
          <span>My Portfolio (TWR)</span>
        </button>

        {/* S&P 500 Benchmark Toggle */}
        <button
          onClick={() => setShowSpy(!showSpy)}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
            showSpy
              ? "bg-[#A855F7]/15 border-[#A855F7] text-[#C084FC] shadow-[0_0_12px_rgba(168,85,247,0.25)]"
              : "bg-[#1A1D2D] border-[#2A2E45] text-gray-400 opacity-60 hover:opacity-100"
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]" />
          <span>S&P 500 (SPY)</span>
        </button>

        <div className="h-4 w-px bg-gray-700/60 mx-1 hidden sm:block" />

        {/* Individual Stock Toggles sorted by return descending (มาก ไว้หน้า) */}
        {sortedHoldingsByReturn.map(sym => {
          const isSelected = !!selectedSymbols[sym];
          const color = colorMap[sym];
          const isNew = (firstBuyDates[sym] || '') > (displayDates[0] || '');
          const rankingItem = leaderboardData.find(d => d.symbol === sym);
          const ret = rankingItem?.returnPercent ?? 0;
          const isPositive = ret >= 0;

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
              <span className={clsx(isSelected ? "text-white font-bold" : "text-gray-400")}>{sym}</span>
              <span
                className={clsx(
                  "font-mono text-[11px] font-bold tabular-nums ml-0.5",
                  isPositive ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {isPositive ? '+' : ''}{ret.toFixed(1)}%
              </span>
              {isNew && (
                <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 ml-0.5">
                  New
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Row: 4/5 Line Chart + 1/5 Leaderboard Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (4/5): Holdings Trajectory Line Chart */}
        <div ref={chartContainerRef} className="lg:col-span-4 bg-[#111827] border border-[#2A2E45] rounded-3xl p-5 shadow-2xl flex flex-col justify-between min-h-[440px]">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h4 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
                Holdings Trajectory ({timeRangeLabel})
              </h4>
              <p className="text-[13px] text-[#CBD5E1]">
                {mode === 'inception'
                  ? 'เส้นกราฟเริ่มนับ 0% ณ วันแรกที่ซื้อเข้าพอร์ตจริง (Actual Cost-Basis)'
                  : 'ทุกเส้นเริ่มสตาร์ทที่ 0.00% ณ วันแรกทางซ้ายของจอ (Dynamic Rebase)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-400 hidden sm:inline-flex items-center gap-1 font-medium">
                <span>💡</span>
                <span>Ctrl + Scroll to Zoom</span>
              </span>
              {zoomRange && (
                <button
                  onClick={() => setZoomRange(null)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Reset Zoom
                </button>
              )}
            </div>
          </div>

          <div className="w-full h-80 flex-1">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 155, left: -10, bottom: 5 }}>
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

                  {/* TradingView-style 0.00% Baseline */}
                  <ReferenceLine y={0} stroke="rgba(255, 255, 255, 0.28)" strokeDasharray="3 3" strokeWidth={1.2} />

                  {/* Portfolio Reference Line */}
                  {showPortfolio && (
                    <Line
                      type="monotone"
                      dataKey="Portfolio"
                      name="Portfolio"
                      stroke={PORTFOLIO_COLOR}
                      strokeWidth={2.8}
                      dot={false}
                      connectNulls={false}
                      label={<EndOfLineLabel yOffset={lineOffsets['Portfolio'] || 0} name="Portfolio" />}
                    />
                  )}

                  {/* S&P 500 Benchmark Line */}
                  {showSpy && (
                    <Line
                      type="monotone"
                      dataKey="S&P 500"
                      name="S&P 500"
                      stroke={SPY_COLOR}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      connectNulls={false}
                      label={<EndOfLineLabel yOffset={lineOffsets['S&P 500'] || 0} name="S&P 500" />}
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
                        label={<EndOfLineLabel yOffset={lineOffsets[sym] || 0} name={sym} />}
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

        {/* Right Column (1/5): Leaderboard Bar Chart */}
        <div className="lg:col-span-1 bg-[#111827] border border-[#2A2E45] rounded-3xl p-5 shadow-2xl flex flex-col justify-between min-h-[440px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h4 className="text-white font-bold text-base tracking-wide">Holdings Ranking</h4>
            </div>
            <p className="text-[13px] text-[#CBD5E1] mb-4">
              {mode === 'inception' ? 'ผลตอบแทนจริงนับตั้งแต่วันที่ซื้อ' : `ผลตอบแทนเฉพาะรอบ ${timeRangeLabel}`}
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
