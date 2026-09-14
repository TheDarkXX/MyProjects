import React, { useState } from 'react';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Sliders,
  Briefcase,
  Undo2,
  Redo2,
  History,
  ChevronDown,
} from 'lucide-react';
import { IndicatorManagerPopover } from '../xchart/IndicatorManagerPopover';
import { IndicatorSettings } from '../../types/indicatorConfig';
import { TimeFrame, ChartStyle, Resolution } from '../../types/chart';
import { usePositionOverlayStore } from '../../stores/usePositionOverlayStore';
import { PositionSettingsPopover } from './position/PositionSettingsPopover';
import { useCanvasHistoryStore } from '../../stores/canvasHistoryStore';
import { CanvasHistoryPopover } from './history/CanvasHistoryPopover';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';
import { useXChartStore } from '../../stores/xchartStore';

export interface ChartControlBarProps {
  isMobile?: boolean;
  symbol: string;
  currentPrice: number;
  livePrice: number;
  activePercentChange: number;
  isLiveActive: boolean;
  isMarketOpen: boolean;
  badge?: string;
  trafficLight?: 'BUY_ZONE' | 'WAIT' | 'DANGER';
  resolution: Resolution;
  setResolution: (res: Resolution) => void;
  canShow4H: boolean;
  chartStyle: ChartStyle;
  setChartStyle: (style: ChartStyle) => void;
  isIndicatorOpen: boolean;
  setIsIndicatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  indicatorInitialView: 'list' | 'ema' | 'envelope' | 'signals' | 'mcdx' | 'ultimateRsi' | 'trendSpeed' | 'smcLite' | 'anchoredVwap' | 'superMoneySignal' | 'volumeProfile';
  setIndicatorInitialView: (view: 'list' | 'ema' | 'envelope' | 'signals' | 'mcdx' | 'ultimateRsi' | 'trendSpeed' | 'smcLite' | 'anchoredVwap' | 'superMoneySignal' | 'volumeProfile') => void;
  indicatorConfig: IndicatorSettings;
  timeframe: TimeFrame;
  applyTimeframeRange: (tf: TimeFrame) => void;
  onAddInflow?: () => void;
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleFullscreen?: () => void;
  hasPosition?: boolean;
}

export const ChartControlBar: React.FC<ChartControlBarProps> = ({
  isMobile: propIsMobile,
  symbol,
  currentPrice,
  livePrice,
  activePercentChange,
  isLiveActive,
  isMarketOpen,
  badge,
  resolution,
  setResolution,
  canShow4H,
  chartStyle,
  setChartStyle,
  isIndicatorOpen,
  setIsIndicatorOpen,
  indicatorInitialView,
  setIndicatorInitialView,
  indicatorConfig,
  timeframe,
  applyTimeframeRange,
  onAddInflow,
  isFullscreen,
  setIsFullscreen,
  onToggleFullscreen,
  hasPosition = false,
}) => {
  const { isMobile: layoutIsMobile } = useDeviceLayout();
  const isMobile = propIsMobile ?? layoutIsMobile;
  const toggleWatchlist = useXChartStore((state) => state.toggleWatchlist);

  const { config: positionConfig, toggleEnabled: togglePositionEnabled } = usePositionOverlayStore();
  const [isPositionSettingsOpen, setIsPositionSettingsOpen] = useState(false);

  const past = useCanvasHistoryStore((state) => state.past);
  const future = useCanvasHistoryStore((state) => state.future);
  const isHistoryOpen = useCanvasHistoryStore((state) => state.isHistoryOpen);
  const toggleHistoryOpen = useCanvasHistoryStore((state) => state.toggleHistoryOpen);
  const setHistoryOpen = useCanvasHistoryStore((state) => state.setHistoryOpen);
  const undo = useCanvasHistoryStore((state) => state.undo);
  const redo = useCanvasHistoryStore((state) => state.redo);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const peekUndo = past[0];
  const peekRedo = future[0];

  if (isMobile) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-[#0D1322] border-b border-slate-800/80 gap-2 select-none shrink-0 min-h-[44px]">
        {/* Left: Ticker Symbol (clickable to open Watchlist) + Price + %Change */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={toggleWatchlist}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 active:scale-95 transition-all text-slate-100 font-black text-sm tracking-wide cursor-pointer shadow-sm min-h-[36px]"
            title="เลือกหุ้นจาก Watchlist / My Port"
          >
            <span>{symbol}</span>
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
          </button>

          <span className="text-sm font-bold text-amber-400 font-mono">
            ${(livePrice || currentPrice).toFixed(2)}
          </span>

          <span
            className={`text-[13px] font-bold flex items-center gap-0.5 font-mono ${
              activePercentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {activePercentChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {activePercentChange >= 0 ? '+' : ''}
            {activePercentChange.toFixed(2)}%
          </span>
        </div>

        {/* Right: Resolution [1D|1W] + Indicators [⚙️] + Fullscreen [⛶] */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Resolution pills */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/60">
            {canShow4H && (
              <button
                type="button"
                onClick={() => setResolution('4H')}
                className={`px-2 py-1 rounded text-[13px] font-bold transition-all cursor-pointer min-h-[32px] ${
                  resolution === '4H'
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                4H
              </button>
            )}
            <button
              type="button"
              onClick={() => setResolution('1D')}
              className={`px-2 py-1 rounded text-[13px] font-bold transition-all cursor-pointer min-h-[32px] ${
                resolution === '1D'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1D
            </button>
            <button
              type="button"
              onClick={() => setResolution('1W')}
              className={`px-2 py-1 rounded text-[13px] font-bold transition-all cursor-pointer min-h-[32px] ${
                resolution === '1W'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1W
            </button>
          </div>

          {/* Indicator Manager Trigger */}
          <div className="relative">
            <button
              type="button"
              data-indicator-trigger="true"
              onClick={() => setIsIndicatorOpen(prev => !prev)}
              title="Indicators"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-bold border transition-all cursor-pointer min-h-[36px] ${
                isIndicatorOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                  : 'bg-slate-900/90 border-slate-700/60 text-slate-200 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-400 text-xs font-black">
                {[
                  indicatorConfig.ema1.visible,
                  indicatorConfig.ema2.visible,
                  indicatorConfig.ema3.visible,
                  indicatorConfig.envelope.visible,
                  indicatorConfig.signals.visible,
                  indicatorConfig.mcdx.visible,
                  indicatorConfig.ultimateRsi.visible,
                  indicatorConfig.trendSpeed?.visible,
                ].filter(Boolean).length}
              </span>
            </button>

            {isIndicatorOpen && (
              <IndicatorManagerPopover
                initialView={indicatorInitialView}
                onClose={() => {
                  setIsIndicatorOpen(false);
                  setIndicatorInitialView('list');
                }}
              />
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => {
              if (onToggleFullscreen) onToggleFullscreen();
              else setIsFullscreen(prev => !prev);
            }}
            title="Fullscreen"
            className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0D1322] border-b border-slate-800/80">
      {/* LEFT: Stock Info + Live Pulse Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-wider text-slate-100">{symbol}</span>
          <span className="text-base font-bold text-amber-400">
            ${(livePrice || currentPrice).toFixed(2)}
          </span>
          <span
            className={`text-sm font-semibold flex items-center gap-0.5 ${
              activePercentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {activePercentChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {activePercentChange >= 0 ? '+' : ''}
            {activePercentChange.toFixed(2)}%
          </span>
        </div>

        {/* Live Heartbeat Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-bold tracking-wide border transition-all ${
            isLiveActive && isMarketOpen
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900 border-slate-700/60 text-slate-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveActive && isMarketOpen ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
          />
          {isLiveActive && isMarketOpen ? 'LIVE 30s' : 'CLOSED'}
        </div>

        {/* Badge & Scenario Pill */}
        {badge && (
          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[13px] font-bold">
            {badge}
          </span>
        )}
      </div>

      {/* RIGHT: Switchers & Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Resolution: 4H | 1D | 1W */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
          {canShow4H && (
            <button
              onClick={() => setResolution('4H')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                resolution === '4H'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="4-Hour Intraday Candles (USD/THB)"
            >
              4H
            </button>
          )}
          <button
            onClick={() => setResolution('1D')}
            className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
              resolution === '1D'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setResolution('1W')}
            className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
              resolution === '1W'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Week
          </button>
        </div>

        {/* Chart Style: Candle | Heikin-Ashi | Area */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
          <button
            onClick={() => setChartStyle('CANDLE')}
            className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
              chartStyle === 'CANDLE'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Candle
          </button>
          <button
            onClick={() => setChartStyle('HEIKIN_ASHI')}
            className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
              chartStyle === 'HEIKIN_ASHI'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            HA
          </button>
          <button
            onClick={() => setChartStyle('AREA')}
            className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
              chartStyle === 'AREA'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Area
          </button>
        </div>

        {/* Indicators Dropdown Menu */}
        <div className="relative">
          <button
            type="button"
            data-indicator-trigger="true"
            onClick={() => setIsIndicatorOpen(prev => !prev)}
            title="Indicator Manager & Custom Settings"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold border transition-all cursor-pointer ${
              isIndicatorOpen
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)] font-extrabold'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Indicators</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-400 text-[11px] font-black">
              {[
                indicatorConfig.ema1.visible,
                indicatorConfig.ema2.visible,
                indicatorConfig.ema3.visible,
                indicatorConfig.envelope.visible,
                indicatorConfig.signals.visible,
                indicatorConfig.mcdx.visible,
                indicatorConfig.ultimateRsi.visible,
                indicatorConfig.trendSpeed?.visible,
              ].filter(Boolean).length}
            </span>
          </button>

          {isIndicatorOpen && (
            <IndicatorManagerPopover
              initialView={indicatorInitialView}
              onClose={() => {
                setIsIndicatorOpen(false);
                setIndicatorInitialView('list');
              }}
            />
          )}
        </div>

        {/* Position Overlay Button & Settings (Shown only when stock is owned in portfolio) */}
        {hasPosition && (
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
            <button
              onClick={togglePositionEnabled}
              title={positionConfig.enabled ? 'Hide My Position & Avg Cost Overlay' : 'Show My Position & Avg Cost Overlay'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                positionConfig.enabled
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Position</span>
            </button>
            <button
              onClick={() => setIsPositionSettingsOpen(true)}
              title="Position Overlay Settings (Color, Width, Pattern, Snapping)"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Position Settings Popover */}
        {isPositionSettingsOpen && (
          <PositionSettingsPopover onClose={() => setIsPositionSettingsOpen(false)} />
        )}

        {/* Timeframe Presets: 10M | 1Y | 5Y | ALL */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
          {(['10M', '1Y', '5Y', 'ALL'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => applyTimeframeRange(tf)}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
              title={`View ${tf} Range`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Canvas Undo / Redo & History Group */}
        <div className="relative flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
          {/* Undo */}
          <button
            onClick={() => undo(symbol)}
            disabled={!canUndo}
            title={canUndo ? `Undo: ${peekUndo?.description || ''} (Ctrl+Z)` : 'ไม่มีประวัติให้ Undo (Ctrl+Z)'}
            className={`p-1.5 rounded-md transition-all ${
              canUndo
                ? 'text-slate-200 hover:text-amber-400 hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Redo */}
          <button
            onClick={() => redo(symbol)}
            disabled={!canRedo}
            title={canRedo ? `Redo: ${peekRedo?.description || ''} (Ctrl+Y)` : 'ไม่มีประวัติให้ Redo (Ctrl+Y)'}
            className={`p-1.5 rounded-md transition-all ${
              canRedo
                ? 'text-slate-200 hover:text-amber-400 hover:bg-slate-800 cursor-pointer'
                : 'text-slate-600 opacity-40 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* History Action Log Popover Trigger */}
          <button
            onClick={toggleHistoryOpen}
            title="เปิดดูประวัติการกระทำทั้งหมด (History Action Log)"
            className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
              isHistoryOpen
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : past.length > 0
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            {past.length > 0 && (
              <span className="text-[13px] font-mono leading-none">
                {past.length}
              </span>
            )}
          </button>

          {/* Popover Dropdown */}
          {isHistoryOpen && (
            <CanvasHistoryPopover
              symbol={symbol}
              onClose={() => setHistoryOpen(false)}
            />
          )}
        </div>

        {/* Reset Zoom & Auto-Scale */}
        <button
          onClick={() => applyTimeframeRange('10M')}
          title="Reset Zoom to 10M Default & Auto-Scale (or Double-Click Chart)"
          className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Allocate Inflow */}
        {onAddInflow && (
          <button
            onClick={onAddInflow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[13px] font-extrabold shadow-md hover:bg-emerald-400 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Allocate Inflow
          </button>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={() => {
            if (onToggleFullscreen) {
              onToggleFullscreen();
            } else {
              setIsFullscreen(prev => !prev);
            }
          }}
          title="Toggle Fullscreen View (Key: F)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[13px] font-bold hover:bg-cyan-900/60 transition-all shadow-md cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          {isFullscreen ? 'Exit [ESC]' : 'Full [F]'}
        </button>
      </div>
    </div>
  );
};
