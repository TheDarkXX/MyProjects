import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api } from '../../../services/api';
import { useXChartStore } from '../../../stores/xchartStore';
import { useHoldings } from '../../../hooks/useHoldings';
import { 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Camera, 
  ChevronRight,
  Filter,
  Layers,
  BarChart3,
  Check
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { 
  HeatmapScope, 
  SizeMetric, 
  ColorMetric, 
  GroupBy, 
  HeatmapItem, 
  HeatmapResponse, 
  TooltipState,
  TreemapLeafNode 
} from './types';
import { computeTreemapLayout, formatPercent, formatPrice } from './heatmapEngine';
import { StockLogo } from './StockLogo';
import { HeatmapTooltip } from './HeatmapTooltip';

export const MarketHeatmap: React.FC = () => {
  const { addTab } = useXChartStore();
  const { holdings } = useHoldings();

  // Configuration State
  const [scope, setScope] = useState<HeatmapScope>('sp100');
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('marketCap');
  const [colorMetric, setColorMetric] = useState<ColorMetric>('perf_1d');
  const [groupBy, setGroupBy] = useState<GroupBy>('sector');

  // Backend Data State
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Viewport & Layout State
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Tooltip State
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    item: null,
    isPortfolio: false
  });

  // Watch for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Resize Observer for responsive treemap sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch Heatmap Data from Backend (for non-portfolio scopes)
  const fetchHeatmap = useCallback(async (targetScope: HeatmapScope) => {
    if (targetScope === 'portfolio') return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.market.heatmap(targetScope);
      setData(res);
    } catch (err: any) {
      console.error('[MarketHeatmap] Failed to fetch heatmap:', err);
      setError(err.message || 'Failed to load heatmap data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger fetch when scope changes
  useEffect(() => {
    if (scope !== 'portfolio') {
      fetchHeatmap(scope);
    }
  }, [scope, fetchHeatmap]);

  // Adjust metrics automatically when switching between Portfolio and Market scopes
  useEffect(() => {
    if (scope === 'portfolio') {
      setSizeMetric('portfolioValue');
    } else if (sizeMetric === 'portfolioValue') {
      setSizeMetric('marketCap');
    }
  }, [scope]);

  // Build items array from holdings or fetched data
  const rawItems = useMemo<HeatmapItem[]>(() => {
    if (scope === 'portfolio') {
      return holdings
        .filter((h) => h.currentValue > 0)
        .map((h) => ({
          symbol: h.symbol,
          name: h.symbol,
          sector: h.sector || 'Portfolio Holdings',
          domain: `${h.symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          price: h.lastPrice || 0,
          change: (h.dayChangePercent * (h.lastPrice || 0)) / 100,
          percentChange: h.dayChangePercent || 0,
          marketCap: h.currentValue || 1,
          portfolioValue: h.currentValue || 0,
          portfolioWeight: h.weightPercent || 0,
          totalReturnPercent: h.totalReturnPercent || 0,
          totalReturn: h.totalReturn || 0,
          quantity: h.quantity || 0,
          avgCost: h.avgCost || 0
        }));
    }
    return data?.items || [];
  }, [scope, holdings, data]);

  // Compute Layout through d3 Treemap Engine
  const sectors = useMemo(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return [];
    return computeTreemapLayout(
      rawItems,
      dimensions.width,
      dimensions.height,
      groupBy,
      sizeMetric,
      colorMetric
    );
  }, [rawItems, dimensions.width, dimensions.height, groupBy, sizeMetric, colorMetric]);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };

  // Screenshot capture
  const handleScreenshot = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#131722',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `stock-heatmap-${scope}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to take screenshot:', err);
    }
  };

  // Tile Interaction Handlers
  const handleTileMouseMove = (e: React.MouseEvent, item: HeatmapItem) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      item,
      isPortfolio: scope === 'portfolio'
    });
  };

  const handleTileMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const handleTileClick = (symbol: string) => {
    addTab({ type: 'CHART', symbol, title: symbol });
  };

  // Market state color and label
  const marketState = data?.marketState || 'CLOSED';
  const getMarketStateBadge = () => {
    const s = String(marketState || '').toUpperCase();
    if (s.includes('REGULAR') || s === 'OPEN') {
      return { label: 'Market Open', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }
    if (s.includes('PRE')) {
      return { label: 'Pre-Market', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    }
    if (s.includes('POST')) {
      return { label: 'After-Hours', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
    }
    return { label: 'Market Closed', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
  };
  const marketBadge = getMarketStateBadge();

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#000000] select-none min-h-0 overflow-hidden text-slate-200">
      {/* TradingView-Style Main Heatmap Header Toolbar */}
      <div className="h-12 px-3 border-b border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between gap-3 flex-shrink-0 z-30">
        {/* Left: Dropdowns & Controls */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Scope Selector */}
          <div className="flex items-center gap-1.5 bg-[#141414] px-2.5 py-1.5 rounded-lg border border-[#222222]">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as HeatmapScope)}
              className="bg-transparent text-[13px] font-semibold text-white focus:outline-none cursor-pointer pr-1"
            >
              <option value="sp100" className="bg-[#141414] text-white">S&P 500 (Top 100)</option>
              <option value="sp500" className="bg-[#141414] text-white">S&P 500 (All 503)</option>
              <option value="nasdaq100" className="bg-[#141414] text-white">Nasdaq 100</option>
              <option value="portfolio" className="bg-[#141414] text-white">My Portfolio</option>
              <option value="watchlist" className="bg-[#141414] text-white">Watchlist</option>
            </select>
          </div>

          {/* Size By Metric */}
          <div className="flex items-center gap-1.5 bg-[#141414] px-2.5 py-1.5 rounded-lg border border-[#222222]">
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[13px] text-slate-400">Size:</span>
            <select
              value={sizeMetric}
              onChange={(e) => setSizeMetric(e.target.value as SizeMetric)}
              className="bg-transparent text-[13px] font-semibold text-white focus:outline-none cursor-pointer pr-1"
            >
              {scope === 'portfolio' ? (
                <>
                  <option value="portfolioValue" className="bg-[#141414] text-white">Portfolio Value</option>
                  <option value="equal" className="bg-[#141414] text-white">Equal Weight</option>
                </>
              ) : (
                <>
                  <option value="marketCap" className="bg-[#141414] text-white">Market Cap</option>
                  <option value="equal" className="bg-[#141414] text-white">Equal Weight</option>
                </>
              )}
            </select>
          </div>

          {/* Color By Metric */}
          <div className="flex items-center gap-1.5 bg-[#141414] px-2.5 py-1.5 rounded-lg border border-[#222222]">
            <span className="text-[13px] text-slate-400">Color:</span>
            <select
              value={colorMetric}
              onChange={(e) => setColorMetric(e.target.value as ColorMetric)}
              className="bg-transparent text-[13px] font-semibold text-white focus:outline-none cursor-pointer pr-1"
            >
              <option value="perf_1d" className="bg-[#141414] text-white">Performance (1D)</option>
              {scope === 'portfolio' && (
                <option value="perf_total" className="bg-[#141414] text-white">Total Return</option>
              )}
            </select>
          </div>

          {/* Grouping Toggle */}
          <div className="flex items-center gap-1.5 bg-[#141414] px-2 py-1 rounded-lg border border-[#222222]">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => setGroupBy(groupBy === 'sector' ? 'none' : 'sector')}
              className={`px-2 py-0.5 rounded text-[13px] font-medium transition-colors ${
                groupBy === 'sector' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sector
            </button>
            <button
              onClick={() => setGroupBy('none')}
              className={`px-2 py-0.5 rounded text-[13px] font-medium transition-colors ${
                groupBy === 'none' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              None
            </button>
          </div>
        </div>

        {/* Right: Market State, Refresh, Screenshot, Fullscreen */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Market State Badge */}
          {scope !== 'portfolio' && (
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold border ${marketBadge.color}`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              {marketBadge.label}
            </div>
          )}

          {/* Refresh Button */}
          {scope !== 'portfolio' && (
            <button
              onClick={() => fetchHeatmap(scope)}
              disabled={loading}
              title={`Cache age: ${data?.cacheAgeSeconds ?? 0}s. Click to refresh.`}
              className="p-1.5 rounded-lg bg-[#141414] border border-[#222222] text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}

          {/* Screenshot Button */}
          <button
            onClick={handleScreenshot}
            title="Take Screenshot"
            className="p-1.5 rounded-lg bg-[#141414] border border-[#222222] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg bg-[#141414] border border-[#222222] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full relative overflow-hidden bg-[#000000] p-1 select-none"
      >
        {/* Error Notification */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-rose-900/90 border border-rose-500 text-white text-[13px] px-4 py-2 rounded-lg shadow-xl flex items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-white/80 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && rawItems.length === 0 && (
          <div className="absolute inset-0 z-30 bg-[#000000]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-[14px] font-medium text-slate-300">Loading {scope.toUpperCase()} Heatmap...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && rawItems.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <Layers className="w-12 h-12 text-slate-600" />
            <p className="text-[14px]">No constituents or active holdings found for this view.</p>
          </div>
        )}

        {/* Treemap Sectors & Tiles Rendering */}
        {sectors.map((sector) => (
          <div
            key={sector.name}
            className="absolute rounded-[2px] border border-[#222222] bg-[#000000] overflow-hidden"
            style={{
              left: sector.x0,
              top: sector.y0,
              width: sector.width,
              height: sector.height
            }}
          >
            {/* Sector Breadcrumb Header (when grouped and big enough) */}
            {groupBy === 'sector' && sector.height >= 40 && (
              <div 
                className="h-[22px] px-2 flex items-center text-[13px] font-semibold text-slate-400 tracking-wide select-none truncate hover:text-white transition-colors"
                title={sector.name}
              >
                <span className="truncate">{sector.name}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-slate-500 flex-shrink-0" />
              </div>
            )}

            {/* Sector Leaves / Stock Tiles */}
            {sector.leaves.map((leaf: TreemapLeafNode) => {
              // Convert absolute leaf coordinates to relative inside the sector box
              const tileLeft = leaf.x0 - sector.x0;
              const tileTop = leaf.y0 - sector.y0;
              const { data: item, tier, width: w, height: h, color } = leaf;
              const pct = colorMetric === 'perf_total' && item.totalReturnPercent !== undefined 
                ? item.totalReturnPercent 
                : item.percentChange;

              return (
                <div
                  key={item.symbol}
                  onClick={() => handleTileClick(item.symbol)}
                  onMouseMove={(e) => handleTileMouseMove(e, item)}
                  onMouseLeave={handleTileMouseLeave}
                  className="absolute cursor-pointer flex flex-col items-center justify-center p-1 rounded-[2px] border border-black hover:ring-2 hover:ring-white/90 hover:brightness-110 hover:z-20 transition-all duration-75 overflow-hidden select-none"
                  style={{
                    left: tileLeft,
                    top: tileTop,
                    width: w,
                    height: h,
                    backgroundColor: color
                  }}
                >
                  {/* XL Tier: Logo + Symbol + Price + Percent */}
                  {tier === 'XL' && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-0.5 pointer-events-none">
                      <StockLogo symbol={item.symbol} domain={item.domain} size={22} />
                      <span className="font-bold text-[14px] text-white tracking-wide leading-none drop-shadow">
                        {item.symbol}
                      </span>
                      <span className="text-[13px] font-medium text-white/90 leading-none drop-shadow">
                        {formatPrice(item.price)}
                      </span>
                      <span className="font-bold text-[13px] text-white leading-none drop-shadow">
                        {formatPercent(pct)}
                      </span>
                    </div>
                  )}

                  {/* L Tier: Logo + Symbol + Percent */}
                  {tier === 'L' && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-1 pointer-events-none">
                      <StockLogo symbol={item.symbol} domain={item.domain} size={18} />
                      <span className="font-bold text-[13px] text-white tracking-wide leading-none drop-shadow">
                        {item.symbol}
                      </span>
                      <span className="font-bold text-[13px] text-white leading-none drop-shadow">
                        {formatPercent(pct)}
                      </span>
                    </div>
                  )}

                  {/* M Tier: Symbol + Percent */}
                  {tier === 'M' && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-0.5 pointer-events-none">
                      <span className="font-bold text-[13px] text-white tracking-wide leading-none drop-shadow">
                        {item.symbol}
                      </span>
                      <span className="font-semibold text-[13px] text-white leading-none drop-shadow">
                        {formatPercent(pct)}
                      </span>
                    </div>
                  )}

                  {/* S Tier: Symbol Only */}
                  {tier === 'S' && (
                    <div className="w-full h-full flex items-center justify-center text-center pointer-events-none">
                      <span className="font-bold text-[13px] text-white tracking-wide leading-none drop-shadow truncate px-0.5">
                        {item.symbol}
                      </span>
                    </div>
                  )}

                  {/* XS Tier: Compact Tile */}
                  {tier === 'XS' && (
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      {w >= 28 && h >= 16 && (
                        <span className="font-bold text-[13px] text-white leading-none truncate opacity-90 drop-shadow">
                          {item.symbol.slice(0, 3)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Floating Tooltip Component */}
        <HeatmapTooltip 
          tooltip={tooltip} 
          containerRect={containerRef.current ? containerRef.current.getBoundingClientRect() : null} 
        />
      </div>

      {/* TradingView-Style Exact 7-Step Bottom Legend Bar */}
      <div className="h-11 px-4 border-t border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-between text-[13px] text-slate-300 flex-shrink-0 z-20 select-none">
        {/* Stats summary */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">
            {rawItems.length} {rawItems.length === 1 ? 'stock' : 'stocks'}
          </span>
          {data?.lastUpdated && scope !== 'portfolio' && (
            <span className="text-slate-400 hidden sm:inline">
              Updated {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* 7-Step Color Ramp Legend matching TradingView close-up */}
        <div className="flex flex-col items-center">
          {/* Percentage Labels */}
          <div className="flex items-center text-[12px] text-slate-400 font-medium pb-0.5">
            <span className="w-8 text-center">-3%</span>
            <span className="w-8 text-center">-2%</span>
            <span className="w-8 text-center">-1%</span>
            <span className="w-8 text-center">0%</span>
            <span className="w-8 text-center">1%</span>
            <span className="w-8 text-center">2%</span>
            <span className="w-8 text-center">3%</span>
          </div>
          {/* Color Segments with 1px black divider */}
          <div className="flex items-center h-2.5 rounded-[2px] overflow-hidden gap-[1px] bg-black">
            <div className="w-8 h-full bg-[#F13948]" title="<= -3.0%" />
            <div className="w-8 h-full bg-[#B12A35]" title="-3.0% to -1.5%" />
            <div className="w-8 h-full bg-[#7F1B24]" title="-1.5% to -0.5%" />
            <div className="w-8 h-full bg-[#3D3D3D]" title="-0.5% to +0.5%" />
            <div className="w-8 h-full bg-[#1A3327]" title="+0.5% to +1.5%" />
            <div className="w-8 h-full bg-[#0A6639]" title="+1.5% to +3.0%" />
            <div className="w-8 h-full bg-[#129955]" title=">= +3.0%" />
          </div>
        </div>
      </div>
    </div>
  );
};
