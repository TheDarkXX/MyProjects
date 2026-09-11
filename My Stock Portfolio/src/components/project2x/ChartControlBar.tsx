import React from 'react';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Zap,
  Sliders,
} from 'lucide-react';
import { IndicatorManagerPopover } from '../xchart/IndicatorManagerPopover';
import { IndicatorSettings } from '../../types/indicatorConfig';
import { TimeFrame, ChartStyle, Resolution } from '../../types/chart';

export interface ChartControlBarProps {
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
  indicatorInitialView: 'list' | 'ema' | 'envelope' | 'signals' | 'mcdx' | 'ultimateRsi' | 'trendSpeed' | 'smcLite' | 'anchoredVwap' | 'superMoneySignal';
  setIndicatorInitialView: (view: 'list' | 'ema' | 'envelope' | 'signals' | 'mcdx' | 'ultimateRsi' | 'trendSpeed' | 'smcLite' | 'anchoredVwap' | 'superMoneySignal') => void;
  indicatorConfig: IndicatorSettings;
  timeframe: TimeFrame;
  applyTimeframeRange: (tf: TimeFrame) => void;
  onAddInflow?: () => void;
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChartControlBar: React.FC<ChartControlBarProps> = ({
  symbol,
  currentPrice,
  livePrice,
  activePercentChange,
  isLiveActive,
  isMarketOpen,
  badge,
  trafficLight,
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
}) => {
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

        {trafficLight === 'BUY_ZONE' && (
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-[13px] font-bold">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> BUY ZONE
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
          onClick={() => setIsFullscreen(prev => !prev)}
          title="Toggle Fullscreen View (Key: F)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[13px] font-bold hover:bg-cyan-900/60 transition-all shadow-md"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          {isFullscreen ? 'Exit [ESC]' : 'Full [F]'}
        </button>
      </div>
    </div>
  );
};
