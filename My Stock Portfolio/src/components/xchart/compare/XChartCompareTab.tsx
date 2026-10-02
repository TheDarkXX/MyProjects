import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useXChartStore,
  CompareTimeFrame,
  createDefaultCompareConfig,
} from '../../../stores/xchartStore';
import { useCompareData } from './useCompareData';
import { CompareLWChart, CompareHoverData, DynamicBaseStats } from './CompareLWChart';
import { CompareLegend } from './CompareLegend';
import { CompareConfigModal } from './CompareConfigModal';
import {
  Sliders,
  Maximize2,
  Minimize2,
  RefreshCw,
  GitCompareArrows,
  AlertCircle,
  TrendingUp,
  CircleDot,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

interface XChartCompareTabProps {
  tabId: string;
  symbol: string;
}

const TIMEFRAMES: CompareTimeFrame[] = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'];

export const XChartCompareTab: React.FC<XChartCompareTabProps> = ({ tabId, symbol }) => {
  const { tabs, updateCompareConfig } = useXChartStore();
  const currentTab = tabs.find((t) => t.id === tabId);

  // Fallback to default compare config if not yet set
  const compareConfig = useMemo(() => {
    return currentTab?.compareConfig || createDefaultCompareConfig(symbol);
  }, [currentTab?.compareConfig, symbol]);

  const activeTimeframe = compareConfig.timeframe || '1Y';
  const targetStyle = compareConfig.targetStyle;
  const refs = compareConfig.refs;

  // Custom data hook with lifetime raw data ref & master calendar
  const { targetSeries, refSeriesList, loading, error, rawDataMapRef, masterDatesRef } = useCompareData(
    symbol,
    refs,
    activeTimeframe,
    targetStyle
  );

  // Real-time hover sync state
  const [hoverData, setHoverData] = useState<CompareHoverData | null>(null);

  // Dynamic visible window stats (leftmost 0% base date & returns)
  const [dynamicStats, setDynamicStats] = useState<DynamicBaseStats | null>(null);
  const resetZoomRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setDynamicStats(null);
  }, [symbol, activeTimeframe]);

  const handleDynamicBaseChange = useCallback((stats: DynamicBaseStats) => {
    setDynamicStats(stats);
  }, []);

  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configInitialSection, setConfigInitialSection] = useState<'target' | 'refs' | 'display'>('refs');

  const handleOpenConfig = (section: 'target' | 'refs' | 'display' = 'refs') => {
    setConfigInitialSection(section);
    setIsConfigOpen(true);
  };

  const isOverOneYear = (tf: CompareTimeFrame) => tf === '3Y' || tf === '5Y' || tf === 'MAX';

  const handleSelectTimeframe = (tf: CompareTimeFrame) => {
    // TradingView rule: <= 1Y -> showPointMarkers = true, > 1Y -> showPointMarkers = false (auto-off)
    const autoMarkers = !isOverOneYear(tf);
    updateCompareConfig(tabId, {
      timeframe: tf,
      showPointMarkers: autoMarkers,
    });
  };

  const handleToggleFullscreen = useCallback(() => {
    const target = document.getElementById('xchart-terminal-container');
    if (!document.fullscreenElement) {
      target?.requestFullscreen?.().catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  }, []);

  const visibleRefsCount = refs.filter((r) => r.visible).length;

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0B1220] overflow-hidden select-none min-h-0 relative">
      {/* 1. Sub-Toolbar Bar (Height: 38px) */}
      <div className="h-[38px] px-3 bg-[#0F1424] border-b border-[#1F2538] flex items-center justify-between shrink-0 select-none z-10 text-[13px]">
        {/* Left: Target Pill & Timeframe Selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Target Stock Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 shrink-0 text-white font-semibold">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: targetStyle.color }}
            />
            <span className="font-bold tracking-wide font-heading">{symbol}</span>
            <span className="text-[11px] text-amber-400 font-mono">(0% Target)</span>
          </div>

          <div className="h-4 w-[1px] bg-[#2A314A] mx-1 shrink-0" />

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-[#13192B] p-0.5 rounded-lg border border-[#242A40] shrink-0">
            {TIMEFRAMES.map((tf) => {
              const isActive = activeTimeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => handleSelectTimeframe(tf)}
                  className={clsx(
                    'px-2.5 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer',
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  )}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Controls & Config Toggle */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {/* Active Refs Pill */}
          <button
            onClick={() => handleOpenConfig('refs')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Manage Reference Tickers"
          >
            <GitCompareArrows className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {visibleRefsCount}/{refs.length} Refs
            </span>
          </button>

          {/* Settings & Config Button */}
          <button
            onClick={() => handleOpenConfig('refs')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/50 text-xs font-bold text-cyan-300 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Config & Refs</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Chart Canvas Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden min-h-0 bg-[#0B1220]">
        {/* Floating Indicator-Style Ref Legend (Requested by User) */}
        <CompareLegend
          tabId={tabId}
          targetSeries={targetSeries}
          refSeriesList={refSeriesList}
          hoverData={hoverData}
          dynamicBaseDate={dynamicStats?.baseDate}
          dynamicTargetReturn={dynamicStats?.targetReturn}
          dynamicRefReturns={dynamicStats?.refReturns}
          onOpenConfig={handleOpenConfig}
        />

        {/* Loading Overlay */}
        {loading && !targetSeries && (
          <div className="absolute inset-0 z-30 bg-[#0B1220]/80 backdrop-blur-xs flex flex-col items-center justify-center p-8 select-none">
            <div className="relative flex items-center justify-center mb-3">
              <div className="w-12 h-12 rounded-full border-2 border-[#1F2538] border-t-cyan-400 animate-spin" />
              <GitCompareArrows className="w-5 h-5 text-cyan-400 absolute" />
            </div>
            <div className="text-sm font-bold text-white tracking-wide">
              กำลังปรับฐานข้อมูลสัมพัทธ์ (0.00% Baseline)
            </div>
            <div className="text-xs text-slate-400 mt-1">
              คำนวณการเติบโตของ {symbol} เทียบกับ Benchmarks ({activeTimeframe})...
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 z-30 bg-[#0B1220]/90 flex flex-col items-center justify-center p-8 select-none text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
            <div className="text-sm font-bold text-white mb-1">ไม่สามารถโหลดข้อมูลเปรียบเทียบได้</div>
            <div className="text-xs text-slate-400 max-w-md mb-4">{error}</div>
            <button
              onClick={() => handleOpenConfig('refs')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              เปิดการตั้งค่าเพื่อเปลี่ยน Ticker
            </button>
          </div>
        )}

        {/* Lightweight Chart Engine */}
        <CompareLWChart
          timeframe={compareConfig.timeframe}
          targetSeries={targetSeries}
          refSeriesList={refSeriesList}
          rawDataMapRef={rawDataMapRef}
          masterDatesRef={masterDatesRef}
          showBaselineZero={compareConfig.showBaselineZero}
          baselineStyle={compareConfig.baselineStyle}
          baselineColor={compareConfig.baselineColor}
          showPointMarkers={compareConfig.showPointMarkers}
          pointMarkersRadius={compareConfig.pointMarkersRadius}
          applyMarkersToRefs={compareConfig.applyMarkersToRefs}
          onCrosshairMove={setHoverData}
          onDynamicBaseChange={handleDynamicBaseChange}
          onResetZoomReady={(resetFn) => {
            resetZoomRef.current = resetFn;
          }}
        />
      </div>

      {/* 3. TradingView-Style Bottom Dock (Height: 34px) */}
      <div className="h-[34px] px-3 bg-[#0F1424] border-t border-[#1F2538] flex items-center justify-between shrink-0 select-none z-10 text-xs">
        {/* Left: Quick Timeframe Selector (TradingView Style) */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => {
            const isActive = activeTimeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => handleSelectTimeframe(tf)}
                className={clsx(
                  'px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer',
                  isActive
                    ? 'bg-cyan-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                {tf}
              </button>
            );
          })}
          <div className="h-3.5 w-[1px] bg-[#2A314A] mx-1" />
          <button
            onClick={() => resetZoomRef.current?.()}
            className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-medium"
            title="Fit / Reset Zoom"
          >
            Fit View
          </button>
        </div>

        {/* Center: Dynamic 0% Anchor Info */}
        <div className="hidden md:flex items-center gap-2">
          {dynamicStats?.baseDate ? (
            <span className="text-[11px] text-amber-300 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Day 1 (0.00%): <strong className="text-white">{dynamicStats.baseDate}</strong>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-mono">
              0% Baseline: Auto Viewport
            </span>
          )}
        </div>

        {/* Right: Quick Toggles (Base 0 & Dots & Config) */}
        <div className="flex items-center gap-2">
          {/* Base 0 Line Toggle */}
          <button
            onClick={() =>
              updateCompareConfig(tabId, {
                showBaselineZero: compareConfig.showBaselineZero === false ? true : false,
              })
            }
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border',
              compareConfig.showBaselineZero !== false
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
            )}
            title="Toggle 0.00% Base Line"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span>0% Line</span>
          </button>

          {/* Dots / Markers Toggle */}
          <button
            onClick={() =>
              updateCompareConfig(tabId, {
                showPointMarkers: compareConfig.showPointMarkers === false ? true : false,
              })
            }
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border',
              compareConfig.showPointMarkers !== false
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
            )}
            title="Toggle จุดไข่ปลา (Point Markers)"
          >
            <CircleDot className="w-3 h-3" />
            <span>Dots</span>
          </button>

          {/* Quick Bundles Trigger */}
          <button
            onClick={() => handleOpenConfig('refs')}
            className="px-2 py-0.5 rounded text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Bundles</span>
          </button>
        </div>
      </div>

      {/* 4. Compare Config Modal */}
      <CompareConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        tabId={tabId}
        targetSymbol={symbol}
        initialSection={configInitialSection}
      />
    </div>
  );
};
