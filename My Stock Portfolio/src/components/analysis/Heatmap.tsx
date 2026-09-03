import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { LayoutGrid, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

export type HeatmapTimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'Total';

interface HeatmapProps {
  holdings: Holding[];
  timeRange?: HeatmapTimeRange;
  onTimeRangeChange?: (range: HeatmapTimeRange) => void;
}

interface TooltipState {
  visible: boolean;
  item: any | null;
  x: number;
  y: number;
}

const SECTOR_MAP: Record<string, string> = {
  META: 'Communication Services',
  GOOGL: 'Communication Services',
  GOOG: 'Communication Services',
  NFLX: 'Communication Services',
  DIS: 'Communication Services',
  TMUS: 'Communication Services',
  VZ: 'Communication Services',
  T: 'Communication Services',
  SNAP: 'Communication Services',
  PINS: 'Communication Services',
  SPOT: 'Communication Services',

  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Technology',
  CRWD: 'Technology',
  RBRK: 'Technology',
  CRWV: 'Technology',
  ASTS: 'Technology',
  AMD: 'Technology',
  INTC: 'Technology',
  QCOM: 'Technology',
  AVGO: 'Technology',
  CRM: 'Technology',
  ORCL: 'Technology',
  ADBE: 'Technology',
  CSCO: 'Technology',
  NOW: 'Technology',
  PLTR: 'Technology',
  SNOW: 'Technology',
  TWLO: 'Technology',
  CRDO: 'Technology',
  CLS: 'Technology',
  APP: 'Technology',

  ISRG: 'Healthcare',
  HIMS: 'Healthcare',
  LLY: 'Healthcare',
  UNH: 'Healthcare',
  JNJ: 'Healthcare',
  ABBV: 'Healthcare',
  MRK: 'Healthcare',
  PFE: 'Healthcare',
  TMO: 'Healthcare',
  ABT: 'Healthcare',
  DHR: 'Healthcare',
  BMY: 'Healthcare',
  AMGN: 'Healthcare',
  GILD: 'Healthcare',
  VRTX: 'Healthcare',
  REGN: 'Healthcare',

  MELI: 'Consumer Cyclical',
  AMZN: 'Consumer Cyclical',
  TSLA: 'Consumer Cyclical',
  HD: 'Consumer Cyclical',
  MCD: 'Consumer Cyclical',
  NKE: 'Consumer Cyclical',
  SBUX: 'Consumer Cyclical',
  TJX: 'Consumer Cyclical',
  LOW: 'Consumer Cyclical',
  BKNG: 'Consumer Cyclical',
  RCL: 'Consumer Cyclical',
  CCL: 'Consumer Cyclical',
  EAT: 'Consumer Cyclical',
  GRBK: 'Consumer Cyclical',
  ATGE: 'Consumer Cyclical',

  WMT: 'Consumer Defensive',
  COST: 'Consumer Defensive',
  PG: 'Consumer Defensive',
  KO: 'Consumer Defensive',
  PEP: 'Consumer Defensive',
  PM: 'Consumer Defensive',
  MO: 'Consumer Defensive',
  CL: 'Consumer Defensive',
  MDLZ: 'Consumer Defensive',

  JPM: 'Financials',
  BAC: 'Financials',
  WFC: 'Financials',
  C: 'Financials',
  GS: 'Financials',
  MS: 'Financials',
  V: 'Financials',
  MA: 'Financials',
  AXP: 'Financials',
  BRK: 'Financials',
  'BRK.B': 'Financials',
  'BRK.A': 'Financials',
  BLK: 'Financials',
  SCHW: 'Financials',
  SYF: 'Financials',
  MFC: 'Financials',

  RKLB: 'Industrials',
  CAT: 'Industrials',
  DE: 'Industrials',
  UNP: 'Industrials',
  HON: 'Industrials',
  GE: 'Industrials',
  BA: 'Industrials',
  LMT: 'Industrials',
  RTX: 'Industrials',
  UPS: 'Industrials',
  FDX: 'Industrials',
  UBER: 'Industrials',
  STRL: 'Industrials',
  POWL: 'Industrials',
  AGX: 'Industrials',
  CAAP: 'Industrials',
  BLBD: 'Industrials',
  SKYW: 'Industrials',

  XOM: 'Energy',
  CVX: 'Energy',
  COP: 'Energy',
  SLB: 'Energy',
  EOG: 'Energy',
  OXY: 'Energy',

  SCHG: 'Index & ETF',
  NEE: 'Utilities',
  DUK: 'Utilities',
  SO: 'Utilities',
  PLD: 'Real Estate',
  AMT: 'Real Estate',
  EQIX: 'Real Estate',
};

const TIME_RANGES: HeatmapTimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'Total'];

export const Heatmap: React.FC<HeatmapProps> = ({ 
  holdings, 
  timeRange: externalTimeRange, 
  onTimeRangeChange 
}) => {
  // Treemap Timeframe defaults to '1D' independently as requested
  const [internalTimeRange, setInternalTimeRange] = useState<HeatmapTimeRange>('1D');
  const activeTimeRange = externalTimeRange || internalTimeRange;

  const handleTimeRangeSelect = (range: HeatmapTimeRange) => {
    setInternalTimeRange(range);
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    }
  };

  const { currency } = useUiStore();
  const { exchangeRate, historical } = usePriceStore();
  const { transactions } = useTransactionStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, item: null, x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = Math.round(rect.width);
        if (w > 0) {
          // Proportional full-width height formula (min 520px, max 680px, ratio ~0.44)
          const h = Math.max(520, Math.min(680, Math.round(w * 0.44)));
          setDimensions({ width: w, height: h });
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const formatCurrency = (value: number) => {
    if (currency === 'THB' && exchangeRate) {
      const converted = Math.round(value * exchangeRate);
      return `฿${converted.toLocaleString('th-TH')}`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatUsd = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  const txSectorMap = useMemo(() => {
    const map: Record<string, string> = {};
    transactions
      .filter(t => t.status === 'CONFIRMED' && t.type === 'BUY' && t.symbol)
      .forEach(tx => {
        if (tx.stock_type) {
          map[tx.symbol] = tx.stock_type;
        }
      });
    return map;
  }, [transactions]);

  const processedHoldings = useMemo(() => {
    const activeHoldings = holdings.filter(h => h.currentValue > 0);
    const totalPortfolioValue = activeHoldings.reduce((sum, h) => sum + h.currentValue, 0);

    return activeHoldings.map(h => {
      let periodReturnPercent = h.dayChangePercent;
      let periodReturnAmount = h.dayReturn;

      if (activeTimeRange === '1D') {
        periodReturnPercent = h.dayChangePercent;
        periodReturnAmount = h.dayReturn;
      } else if (activeTimeRange === 'Total') {
        periodReturnPercent = h.totalReturnPercent;
        periodReturnAmount = h.totalReturn;
      } else {
        const symbolHistory = historical[h.symbol];
        if (symbolHistory && symbolHistory.length > 0) {
          const startDate = getStartDateForRange(activeTimeRange);
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
            periodReturnPercent = ((endPrice - startPrice) / startPrice) * 100;
            periodReturnAmount = (endPrice - startPrice) * h.quantity;
          }
        }
      }

      const sector = SECTOR_MAP[h.symbol] || txSectorMap[h.symbol] || 'Other / Diversified';
      const weightPercent = totalPortfolioValue > 0 ? (h.currentValue / totalPortfolioValue) * 100 : 0;

      return {
        ...h,
        sector,
        weightPercent,
        periodReturnPercent,
        periodReturnAmount,
      };
    });
  }, [holdings, activeTimeRange, historical, txSectorMap]);

  const colorScale = useMemo(() => {
    const limit = (activeTimeRange === '1D' || activeTimeRange === '1W') ? 3 : (activeTimeRange === '1M' || activeTimeRange === '3M') ? 8 : 20;

    return d3.scaleLinear<string>()
      .domain([-limit, -limit * 0.25, 0, limit * 0.25, limit])
      .range([
        '#dc2626', // Vibrant Red
        '#991b1b', // Mild Red
        '#232838', // Neutral Slate
        '#15803d', // Mild Green
        '#16a34a'  // Vibrant Green
      ])
      .clamp(true);
  }, [activeTimeRange]);

  const treemapData = useMemo(() => {
    if (processedHoldings.length === 0 || dimensions.width === 0) return null;

    const grouped = d3.group(processedHoldings, d => d.sector);

    const sectorNodes = Array.from(grouped, ([sectorName, stocks]) => ({
      name: sectorName,
      totalValue: d3.sum(stocks, s => s.currentValue),
      children: stocks,
    })).sort((a, b) => b.totalValue - a.totalValue);

    const hierarchyData = {
      name: 'Portfolio',
      children: sectorNodes
    };

    const root = d3.hierarchy<any>(hierarchyData)
      .sum((d: any) => d.currentValue || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Golden Ratio (~1.618) Squarify creates balanced, elegant rectangular tiles without narrow strips
    const treemapLayout = d3.treemap<any>()
      .tile(d3.treemapSquarify.ratio((1 + Math.sqrt(5)) / 2))
      .size([dimensions.width, dimensions.height])
      .paddingOuter(3)
      .paddingInner(3)
      .paddingTop((d: any) => d.depth === 1 ? 22 : 2)
      .round(true);

    treemapLayout(root);
    return root;
  }, [processedHoldings, dimensions]);

  const leaves = useMemo(() => {
    if (!treemapData) return [];
    return [...treemapData.leaves()].sort((a, b) => {
      if (a.data.symbol === hoveredSymbol) return 1;
      if (b.data.symbol === hoveredSymbol) return -1;
      return 0;
    });
  }, [treemapData, hoveredSymbol]);

  const handleMouseEnter = (event: React.MouseEvent, node: any) => {
    setHoveredSymbol(node.data.symbol);
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setTooltip({
        visible: true,
        item: node.data,
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top,
      });
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (containerRef.current && tooltip.visible) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setTooltip(prev => ({
        ...prev,
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top,
      }));
    }
  };

  const handleMouseLeave = () => {
    setHoveredSymbol(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  if (processedHoldings.length === 0) {
    return (
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
        <LayoutGrid className="w-12 h-12 text-[#9898C8]/40 mb-3" />
        <h3 className="text-xl font-bold text-white mb-1">No Active Holdings</h3>
        <p className="text-[#9898C8] text-sm">Add or confirm buy transactions to view the interactive portfolio heatmap.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#823AFD]/20 to-[#FC2D79]/20 border border-[#823AFD]/30 flex items-center justify-center shadow-inner">
            <LayoutGrid className="w-5 h-5 text-[#823AFD]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Market Treemap</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-[#CBD5E1] font-semibold">
                Finviz Style
              </span>
            </div>
            <p className="text-xs text-[#CBD5E1] mt-0.5">
              Size proportional to portfolio value • Color indicates {activeTimeRange} return
            </p>
          </div>
        </div>

        {/* Dedicated Heatmap Timeframe Pill Selector */}
        <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-2xl gap-1 overflow-x-auto custom-scrollbar">
          {TIME_RANGES.map(range => (
            <button
              key={range}
              onClick={() => handleTimeRangeSelect(range)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap",
                activeTimeRange === range
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_2px_8px_rgba(130,58,253,0.35)]"
                  : "text-[#CBD5E1] hover:text-white hover:bg-white/5"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Height Full-Width SVG Container */}
      <div 
        ref={containerRef} 
        className="w-full relative select-none rounded-2xl overflow-hidden border border-[#2A2E45]/60 bg-[#0B0F17]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg 
          width="100%" 
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: dimensions.height }}
          className="w-full block overflow-hidden"
        >
          {/* 1. Sector Containers & Header Labels */}
          {treemapData?.children?.map((sectorNode: any) => {
            const sectorWidth = sectorNode.x1 - sectorNode.x0;
            const sectorHeight = sectorNode.y1 - sectorNode.y0;
            const sectorPercent = treemapData.value > 0 ? (sectorNode.value / treemapData.value) * 100 : 0;

            return (
              <g key={`sector-${sectorNode.data.name}`}>
                {/* Sector Border Box */}
                <rect
                  x={sectorNode.x0}
                  y={sectorNode.y0}
                  width={sectorWidth}
                  height={sectorHeight}
                  fill="rgba(17, 24, 39, 0.4)"
                  stroke="rgba(71, 85, 105, 0.5)"
                  strokeWidth="1.5"
                  rx="6"
                />

                {/* Sector Header Pill */}
                {sectorHeight >= 45 && sectorWidth >= 55 && (
                  <>
                    <rect
                      x={sectorNode.x0 + 2}
                      y={sectorNode.y0 + 2}
                      width={Math.max(0, sectorWidth - 4)}
                      height={18}
                      fill="rgba(15, 23, 42, 0.85)"
                      rx="3"
                    />
                    <text
                      x={sectorNode.x0 + 6}
                      y={sectorNode.y0 + 14}
                      fill="#CBD5E1"
                      fontSize="10.5"
                      fontWeight="700"
                      letterSpacing="0.4px"
                      className="pointer-events-none uppercase font-heading"
                    >
                      {sectorNode.data.name}
                      {sectorWidth > 110 && (
                        <tspan fill="#94A3B8" fontWeight="500" dx="5">
                          {sectorPercent.toFixed(1)}%
                        </tspan>
                      )}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* 2. Stock Leaf Cells */}
          {leaves.map((d: any) => {
            const item = d.data;
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            const returnPct = item.periodReturnPercent || 0;
            const fillColor = colorScale(returnPct);
            const isHovered = item.symbol === hoveredSymbol;

            // Proportional threshold tiers
            const showThreeLines = width >= 80 && height >= 68;
            const showTwoLines = width >= 46 && height >= 36;
            const showSymbolOnly = width >= 26 && height >= 18;

            // Refined elegant typography sizes (proportional, not oversized, sleek hierarchy)
            const symbolFontSize = Math.max(12, Math.min(18, Math.round(Math.min(width / 4.8, height / 3.4))));
            const returnFontSize = Math.max(11, Math.min(14, Math.round(symbolFontSize * 0.82)));
            const subFontSize = Math.max(10, Math.min(12, Math.round(symbolFontSize * 0.7)));

            return (
              <g
                key={`stock-${item.symbol}`}
                transform={`translate(${d.x0}, ${d.y0})`}
                onMouseEnter={(e) => handleMouseEnter(e, d)}
                className="cursor-pointer"
              >
                {/* Stock Cell Rectangle: Crisp Glow Hover */}
                <rect
                  width={width}
                  height={height}
                  fill={fillColor}
                  rx="4"
                  stroke={isHovered ? '#FFFFFF' : 'rgba(11, 15, 23, 0.9)'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                  style={{
                    filter: isHovered ? 'brightness(1.18) drop-shadow(0 0 8px rgba(255,255,255,0.75))' : 'none'
                  }}
                />

                {/* Typography: Symbol, Return %, Weight / Value */}
                {showThreeLines ? (
                  <g className="pointer-events-none font-heading" textAnchor="middle">
                    {/* Row 1: Symbol */}
                    <text
                      x={width / 2}
                      y={height / 2 - (returnFontSize * 0.85)}
                      fill="#FFFFFF"
                      fontSize={symbolFontSize}
                      fontWeight="800"
                      letterSpacing="0.3px"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                    >
                      {item.symbol}
                    </text>

                    {/* Row 2: Return % */}
                    <text
                      x={width / 2}
                      y={height / 2 + (returnFontSize * 0.5)}
                      fill="#FFFFFF"
                      fontSize={returnFontSize}
                      fontWeight="700"
                      className="tabular-nums"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                    >
                      {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                    </text>

                    {/* Row 3: Weight % and Sub-value (Subtle, crisp) */}
                    <text
                      x={width / 2}
                      y={height / 2 + (returnFontSize * 0.5) + (subFontSize * 1.35)}
                      fill="#E2E8F0"
                      fontSize={subFontSize}
                      fontWeight="600"
                      className="tabular-nums opacity-90"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                    >
                      {width >= 120 ? `${formatCurrency(item.currentValue)} • ` : ''}{item.weightPercent.toFixed(1)}%
                    </text>
                  </g>
                ) : showTwoLines ? (
                  <g className="pointer-events-none font-heading" textAnchor="middle">
                    <text
                      x={width / 2}
                      y={height / 2 - 2}
                      fill="#FFFFFF"
                      fontSize={symbolFontSize}
                      fontWeight="800"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                    >
                      {item.symbol}
                    </text>
                    <text
                      x={width / 2}
                      y={height / 2 + returnFontSize + 1}
                      fill="#FFFFFF"
                      fontSize={returnFontSize}
                      fontWeight="700"
                      className="tabular-nums"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                    >
                      {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                    </text>
                  </g>
                ) : showSymbolOnly ? (
                  <text
                    x={width / 2}
                    y={height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FFFFFF"
                    fontSize={Math.max(10, Math.min(13, Math.round(width / 3.8)))}
                    fontWeight="800"
                    className="pointer-events-none font-heading"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                  >
                    {item.symbol}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* 3. Rich Glassmorphic Hover Tooltip */}
        {tooltip.visible && tooltip.item && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(Math.max(16, tooltip.x + 12), dimensions.width - 290)}px`,
              top: `${Math.min(Math.max(16, tooltip.y + 12), dimensions.height - 230)}px`,
            }}
            className="w-72 bg-[#0F111A]/95 backdrop-blur-xl border border-[#2A2E45] rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)] z-50 pointer-events-none text-white animate-fade-in"
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2E45] mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-tight">{tooltip.item.symbol}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#823AFD]/20 text-[#A78BFA] border border-[#823AFD]/30">
                  {tooltip.item.sector}
                </span>
              </div>
              <div className={clsx(
                "flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg",
                tooltip.item.periodReturnPercent >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              )}>
                {tooltip.item.periodReturnPercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{tooltip.item.periodReturnPercent >= 0 ? '+' : ''}{tooltip.item.periodReturnPercent.toFixed(2)}%</span>
              </div>
            </div>

            {/* Tooltip Metrics Grid */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#CBD5E1]">Market Value:</span>
                <span className="font-bold text-white text-sm">
                  {formatCurrency(tooltip.item.currentValue)}
                  {currency === 'THB' && (
                    <span className="text-[11px] text-[#9898C8] font-normal ml-1">({formatUsd(tooltip.item.currentValue)})</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#CBD5E1]">Portfolio Weight:</span>
                <span className="font-bold text-[#A78BFA]">{tooltip.item.weightPercent.toFixed(2)}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#CBD5E1]">Last Price:</span>
                <span className="font-semibold text-white">
                  ${tooltip.item.lastPrice?.toFixed(2)}
                  <span className={clsx("ml-1 text-[11px]", tooltip.item.dayChangePercent >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    ({tooltip.item.dayChangePercent >= 0 ? '+' : ''}{tooltip.item.dayChangePercent?.toFixed(2)}% 1D)
                  </span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#CBD5E1]">Shares Held:</span>
                <span className="font-semibold text-white">
                  {tooltip.item.quantity?.toFixed(4)} <span className="text-[#9898C8] font-normal">@ avg ${tooltip.item.avgCost?.toFixed(2)}</span>
                </span>
              </div>

              <div className="pt-2 border-t border-[#2A2E45]/60 flex justify-between items-center">
                <span className="text-[#CBD5E1]">{activeTimeRange} Return:</span>
                <span className={clsx("font-bold", tooltip.item.periodReturnAmount >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {tooltip.item.periodReturnAmount >= 0 ? '+' : ''}{formatCurrency(tooltip.item.periodReturnAmount)} ({tooltip.item.periodReturnPercent >= 0 ? '+' : ''}{tooltip.item.periodReturnPercent.toFixed(2)}%)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#CBD5E1]">Total Return:</span>
                <span className={clsx("font-bold", tooltip.item.totalReturn >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {tooltip.item.totalReturn >= 0 ? '+' : ''}{formatCurrency(tooltip.item.totalReturn)} ({tooltip.item.totalReturnPercent >= 0 ? '+' : ''}{tooltip.item.totalReturnPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Summary Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#CBD5E1] pt-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Performance Scale:</span>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded bg-[#dc2626] text-white font-bold text-[10px]">-3%+</span>
            <span className="px-1.5 py-0.5 rounded bg-[#991b1b] text-white text-[10px]">-1%</span>
            <span className="px-1.5 py-0.5 rounded bg-[#232838] text-white text-[10px]">0%</span>
            <span className="px-1.5 py-0.5 rounded bg-[#15803d] text-white text-[10px]">+1%</span>
            <span className="px-2 py-0.5 rounded bg-[#16a34a] text-white font-bold text-[10px]">+3%+</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[#9898C8]">
          <span>Holdings: <strong className="text-white">{processedHoldings.length} stocks</strong></span>
          <span>Currency: <strong className="text-[#823AFD]">{currency}</strong></span>
          {currency === 'THB' && exchangeRate && (
            <span>FX: <strong className="text-white">1 USD = ฿{exchangeRate.toFixed(2)}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};
