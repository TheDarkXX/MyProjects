
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { PortfolioItem } from '../types';

// --- Component Props & State ---
interface HeatmapProps {
  data: PortfolioItem[];
  currency: 'USD' | 'THB';
  exchangeRate: number;
  portfolioPriceData: Record<string, Record<string, number>>;
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'Total';
const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', 'Total'];

// --- Helper Functions ---
const formatCurrency = (value: number, currency: 'USD' | 'THB', exchangeRate: number) => {
    const rate = currency === 'THB' ? exchangeRate : 1;
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency,
    };
    if (currency === 'THB') {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }
    return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', options).format(value * rate);
};

const getStartDateForRange = (range: TimeRange): Date => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    switch (range) {
        case '1W': today.setDate(today.getDate() - 7); break;
        case '1M': today.setMonth(today.getMonth() - 1); break;
        case '3M': today.setMonth(today.getMonth() - 3); break;
        case '6M': today.setMonth(today.getMonth() - 6); break;
        case '1Y': today.setFullYear(today.getFullYear() - 1); break;
        case 'YTD': return new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        default: break;
    }
    return today;
};

const findPriceOnOrBefore = (targetDate: Date, symbolPrices: Record<string, number>): number | null => {
    if (!symbolPrices || Object.keys(symbolPrices).length === 0) return null;

    const availableDates = Object.keys(symbolPrices).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Descending
    const targetDateStr = targetDate.toISOString().split('T')[0];

    for (const dateStr of availableDates) {
        if (dateStr <= targetDateStr) {
            return symbolPrices[dateStr];
        }
    }
    return null;
};

// --- Main Component ---
const Heatmap: React.FC<HeatmapProps> = ({ data, currency, exchangeRate, portfolioPriceData }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: '', x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 450 });
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 450
        });
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);

  const processedData = useMemo(() => {
    if (!data || !portfolioPriceData) return [];

    return data.map(item => {
        let periodReturnPercent: number;

        if (timeRange === '1D') {
            periodReturnPercent = item.dayChangePercent;
        } else if (timeRange === 'Total') {
            periodReturnPercent = item.totalReturnPercent;
        } else {
            const startDate = getStartDateForRange(timeRange);
            const symbolPrices = portfolioPriceData[item.symbol];

            if (!symbolPrices) {
                periodReturnPercent = 0;
            } else {
                const endPrice = item.lastPrice;
                const startPrice = findPriceOnOrBefore(startDate, symbolPrices);

                if (startPrice && startPrice > 0 && endPrice) {
                    periodReturnPercent = ((endPrice / startPrice) - 1) * 100;
                } else {
                    periodReturnPercent = 0; // Cannot calculate, show as neutral
                }
            }
        }
        
        return {
            ...item,
            periodReturnPercent,
        };
    });
  }, [data, timeRange, portfolioPriceData]);


  const colorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([-3, -0.5, 0, 0.5, 3])
      .range(['#7F1B23', '#b91c1c', '#4B5563', '#15803d', '#0B6639'])
      .clamp(true);
  }, []);

  const treemapData = useMemo(() => {
    const validData = processedData.filter(d => d.currentValue > 0 && d.sector && d.sector !== 'N/A');
    if (validData.length === 0 || dimensions.width === 0) return null;

    const groupedBySector = d3.group(validData, d => d.sector);

    // Create sector objects with total value and sort them
    const sortedSectors = Array.from(groupedBySector, ([sectorName, stocks]) => ({
        name: sectorName,
        children: stocks,
        totalValue: d3.sum(stocks, s => s.currentValue)
    })).sort((a, b) => b.totalValue - a.totalValue);

    const hierarchyData = {
        name: 'root',
        children: sortedSectors
    };

    const root = d3.hierarchy(hierarchyData)
        .sum((d: any) => d.currentValue)
        .sort((a, b) => b.value! - a.value!); // Sort leaves within each sector

    const treemap = d3.treemap()
        .size([dimensions.width, dimensions.height])
        .paddingInner(2)    // Space between stock cells
        .paddingTop(28)     // Space for sector title
        .paddingOuter(4)    // Space around each sector group
        .round(true);

    treemap(root);
    return root;
  }, [processedData, dimensions]);


  const sortedLayout = useMemo(() => {
    if (!treemapData) return [];
    const leaves = treemapData.leaves();
    // Render hovered item last to bring it to the front (for z-index effect)
    return [...leaves].sort((a, b) => {
        const aIsHovered = (a.data as PortfolioItem).symbol === hoveredSymbol;
        const bIsHovered = (b.data as PortfolioItem).symbol === hoveredSymbol;
        if (aIsHovered && !bIsHovered) return 1;
        if (!aIsHovered && bIsHovered) return -1;
        return 0;
    });
  }, [treemapData, hoveredSymbol]);

  const handleMouseOver = (event: React.MouseEvent, d: d3.HierarchyRectangularNode<any>) => {
    const item = d.data as PortfolioItem & { periodReturnPercent: number };
    setHoveredSymbol(item.symbol);

    const formatUsd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    const formatThb = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value * exchangeRate);

    const timeRangeLabel = timeRange === '1D' ? 'Day Change' : timeRange === 'Total' ? 'Total Return' : `${timeRange} Return`;
    const performanceValue = item.periodReturnPercent;
    
    const content = `
      <div class="font-bold text-base mb-1">${item.symbol}</div>
      <div class="text-sm">Value: <span>${formatUsd(item.currentValue)} (${formatThb(item.currentValue)})</span></div>
      <div class="text-sm">Weight: <span>${item.portfolioPercent.toFixed(2)}%</span></div>
      <div class="text-sm">${timeRangeLabel}: <span>${performanceValue.toFixed(2)}%</span></div>
    `;
    
    if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const tooltipX = containerRect.left + (d.x0 + d.x1) / 2;
        const tooltipY = containerRect.top + d.y0;

        setTooltip({
            visible: true,
            content,
            x: tooltipX,
            y: tooltipY,
        });
    }
  };

  const handleMouseOut = () => {
    setHoveredSymbol(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="bg-[#1E293B] border border-white/5 p-4 sm:p-6 rounded-[20px] shadow-lg">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h3 className="text-lg font-semibold text-white">Portfolio Heatmap</h3>
        <div className="flex items-center bg-gray-800 p-1 rounded-md text-sm">
          {timeRanges.map(range => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-2 py-0.5 rounded-md text-xs transition-colors ${timeRange === range ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700'}`}>
              {range}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="relative">
        {tooltip.visible && (
            <div
                style={{
                    position: 'fixed',
                    top: `${tooltip.y}px`,
                    left: `${tooltip.x}px`,
                    transform: 'translate(-50%, -100%) translateY(-10px)',
                }}
                className="bg-gray-900/90 border border-gray-600 rounded-md shadow-lg p-3 text-white pointer-events-none z-20 backdrop-blur-sm"
                dangerouslySetInnerHTML={{ __html: tooltip.content }}
            />
        )}
        <svg width={dimensions.width} height={dimensions.height}>
          {treemapData?.children?.map(sectorNode => (
            <g key={sectorNode.data.name}>
                 <rect
                    x={sectorNode.x0}
                    y={sectorNode.y0}
                    width={sectorNode.x1 - sectorNode.x0}
                    height={sectorNode.y1 - sectorNode.y0}
                    fill="none"
                    stroke="rgba(100, 116, 139, 0.4)"
                    strokeWidth="1.5"
                    rx="4"
                />
                 <rect 
                    x={sectorNode.x0 + 1}
                    y={sectorNode.y0 + 1}
                    width={(sectorNode.x1 - sectorNode.x0) - 2}
                    height={26}
                    fill="rgba(0,0,0,0.25)"
                    rx="2"
                />
                <text
                    x={sectorNode.x0 + 8}
                    y={sectorNode.y0 + 18}
                    className="fill-white font-bold text-base pointer-events-none"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                    {sectorNode.data.name}
                </text>
            </g>
          ))}
          {sortedLayout && sortedLayout.length > 0 ? sortedLayout.map(d => {
            const item = d.data as PortfolioItem & { periodReturnPercent: number };
            const width = d.x1 - d.x0;
            const height = d.y1 - d.y0;
            const isTextVisible = width > 40 && height > 20;
            const performanceValue = item.periodReturnPercent;
            const fillColor = performanceValue !== undefined ? colorScale(performanceValue) : '#4B5563';
            const isHovered = item.symbol === hoveredSymbol;

            return (
              <g 
                key={item.symbol} 
                transform={`translate(${d.x0}, ${d.y0})`} 
                onMouseOver={e => handleMouseOver(e, d)} 
                onMouseOut={handleMouseOut}
              >
                <g style={{
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: `${width / 2}px ${height / 2}px`,
                    transition: 'transform 0.2s ease-out',
                    zIndex: isHovered ? 10 : 1,
                }}>
                  <rect
                    width={width}
                    height={height}
                    fill={fillColor}
                    rx="2"
                    style={{
                        stroke: isHovered ? '#3B82F6' : '#1F2937',
                        strokeWidth: isHovered ? 2 : 1,
                    }}
                  />
                  {isTextVisible && (
                    <text
                      x={width / 2}
                      y={height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white font-bold pointer-events-none"
                      style={{ fontSize: Math.max(8, Math.min(width / 4, height / 2.5, 16)), textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                    >
                      <tspan x={width / 2} dy="-0.5em">{item.symbol}</tspan>
                      <tspan x={width / 2} dy="1.2em" className="font-normal" style={{ fontSize: '0.8em' }}>
                        {performanceValue.toFixed(2)}%
                      </tspan>
                    </text>
                  )}
                </g>
              </g>
            );
          }) : (
              <text x={dimensions.width / 2} y={dimensions.height / 2} textAnchor="middle" fill="#6B7280" className="text-lg">
                  No data to display in heatmap.
              </text>
          )}
        </svg>
      </div>
    </div>
  );
};

export default Heatmap;
