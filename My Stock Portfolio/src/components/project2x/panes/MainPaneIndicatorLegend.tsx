import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Settings,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { IndicatorSettings } from '../../../types/indicatorConfig';
import { RawBarItem } from '../../../types/chart';

export interface MainPaneIndicatorLegendProps {
  indicatorConfig: IndicatorSettings;
  activeLegend: RawBarItem | null;
  superMoneySignalResult?: {
    currentDirection: number;
    currentStatusText: string;
  } | null;
  trendSpeedData?: {
    dynEma: number | null;
    speed: number | null;
    dynColor: string;
    color: string;
  } | null;
  autoSRCount?: number;
  globalDrawingsVisible?: boolean;

  onToggleEMA: (key: 'ema1' | 'ema2' | 'ema3') => void;
  onToggleEnvelope: () => void;
  onToggleTrendSpeedDyn: () => void;
  onToggleSuperMoneySignal: () => void;
  onToggleAutoSR: () => void;
  onOpenConfig: (view: 'ema' | 'envelope' | 'trendSpeed' | 'superMoneySignal' | 'mcdx' | 'ultimateRsi' | 'list') => void;
  onOpenDrawingSettings?: () => void;
}

export const MainPaneIndicatorLegend: React.FC<MainPaneIndicatorLegendProps> = ({
  indicatorConfig,
  activeLegend,
  superMoneySignalResult,
  trendSpeedData,
  autoSRCount = 0,
  globalDrawingsVisible = true,
  onToggleEMA,
  onToggleEnvelope,
  onToggleTrendSpeedDyn,
  onToggleSuperMoneySignal,
  onToggleAutoSR,
  onOpenConfig,
  onOpenDrawingSettings,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tv_main_legend_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('tv_main_legend_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  // Compute live active indicator list
  const activeItems: Array<{
    id: string;
    title: string;
    params?: string;
    valueText?: string;
    valueColor?: string;
    badge?: { text: string; bgClass: string; textClass: string };
    multiValues?: Array<{ label: string; value: string; color: string }>;
    visible: boolean;
    onToggle: () => void;
    onConfigure: () => void;
    onRemove: () => void;
  }> = [];

  // 1. EMA 1
  if (indicatorConfig.ema1.visible) {
    const val = activeLegend?.ema50;
    activeItems.push({
      id: 'ema1',
      title: `EMA ${indicatorConfig.ema1.period}`,
      params: 'close',
      valueText: val !== undefined && val !== null ? `$${val.toFixed(2)}` : '--',
      valueColor: indicatorConfig.ema1.color,
      visible: indicatorConfig.ema1.visible,
      onToggle: () => onToggleEMA('ema1'),
      onConfigure: () => onOpenConfig('ema'),
      onRemove: () => onToggleEMA('ema1'),
    });
  }

  // 2. EMA 2
  if (indicatorConfig.ema2.visible) {
    const val = activeLegend?.ema150;
    activeItems.push({
      id: 'ema2',
      title: `EMA ${indicatorConfig.ema2.period}`,
      params: 'close',
      valueText: val !== undefined && val !== null ? `$${val.toFixed(2)}` : '--',
      valueColor: indicatorConfig.ema2.color,
      visible: indicatorConfig.ema2.visible,
      onToggle: () => onToggleEMA('ema2'),
      onConfigure: () => onOpenConfig('ema'),
      onRemove: () => onToggleEMA('ema2'),
    });
  }

  // 3. EMA 3
  if (indicatorConfig.ema3.visible) {
    const val = activeLegend?.ema200;
    activeItems.push({
      id: 'ema3',
      title: `EMA ${indicatorConfig.ema3.period}`,
      params: 'close',
      valueText: val !== undefined && val !== null ? `$${val.toFixed(2)}` : '--',
      valueColor: indicatorConfig.ema3.color,
      visible: indicatorConfig.ema3.visible,
      onToggle: () => onToggleEMA('ema3'),
      onConfigure: () => onOpenConfig('ema'),
      onRemove: () => onToggleEMA('ema3'),
    });
  }

  // 4. Bedrock Envelope
  if (indicatorConfig.envelope.visible) {
    const baseEma = activeLegend?.ema200;
    const pct = indicatorConfig.envelope.percent;
    const upper = baseEma !== undefined && baseEma !== null ? baseEma * (1 + pct / 100) : null;
    const lower = baseEma !== undefined && baseEma !== null ? baseEma * (1 - pct / 100) : null;

    activeItems.push({
      id: 'envelope',
      title: 'Bedrock Envelope',
      params: `±${pct}% ${indicatorConfig.envelope.emaPeriod}`,
      multiValues: [
        { label: '+', value: upper !== null ? `$${upper.toFixed(2)}` : '--', color: indicatorConfig.envelope.color },
        { label: '-', value: lower !== null ? `$${lower.toFixed(2)}` : '--', color: indicatorConfig.envelope.color },
      ],
      visible: indicatorConfig.envelope.visible,
      onToggle: onToggleEnvelope,
      onConfigure: () => onOpenConfig('envelope'),
      onRemove: onToggleEnvelope,
    });
  }

  // 5. Dynamic Trend EMA (Zeiierman)
  if (indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.dynamicTrendVisible) {
    const dynVal = trendSpeedData?.dynEma;
    activeItems.push({
      id: 'dynamicTrend',
      title: 'Dyn Trend EMA',
      params: 'Zeiierman',
      valueText: dynVal !== null && dynVal !== undefined ? `$${dynVal.toFixed(2)}` : '--',
      valueColor: trendSpeedData?.dynColor || '#F7D02C',
      visible: true,
      onToggle: onToggleTrendSpeedDyn,
      onConfigure: () => onOpenConfig('trendSpeed'),
      onRemove: onToggleTrendSpeedDyn,
    });
  }

  // 6. Super Money Trend Signal
  if (indicatorConfig.superMoneySignal?.visible && superMoneySignalResult) {
    const dir = superMoneySignalResult.currentDirection;
    activeItems.push({
      id: 'superMoneySignal',
      title: 'Super Money Signal',
      badge: {
        text: superMoneySignalResult.currentStatusText || 'NEUTRAL',
        bgClass:
          dir === 1
            ? 'bg-emerald-500 text-slate-950 font-black'
            : dir === 2
            ? 'bg-amber-400 text-slate-950 font-black'
            : dir === -1
            ? 'bg-rose-600 text-white font-bold'
            : 'bg-slate-800 text-slate-300 font-medium',
        textClass: 'px-1.5 py-0.5 rounded text-[11px]',
      },
      visible: indicatorConfig.superMoneySignal.visible,
      onToggle: onToggleSuperMoneySignal,
      onConfigure: () => onOpenConfig('superMoneySignal'),
      onRemove: onToggleSuperMoneySignal,
    });
  }

  // 7. Auto Support / Resistance (Active in Drawing Store)
  if (autoSRCount > 0) {
    activeItems.push({
      id: 'autoSR',
      title: 'Auto S/R Swings',
      params: `${autoSRCount} levels`,
      valueText: globalDrawingsVisible ? 'Active' : 'Hidden',
      valueColor: globalDrawingsVisible ? '#10B981' : '#64748B',
      visible: globalDrawingsVisible,
      onToggle: onToggleAutoSR,
      onConfigure: onOpenDrawingSettings || (() => {}),
      onRemove: onToggleAutoSR,
    });
  }

  // If nothing is active, return null
  if (activeItems.length === 0) return null;

  return (
    <div className="absolute top-2 left-2 z-25 pointer-events-none select-none">
      {isCollapsed ? (
        // Collapsed Minimal Badge
        <button
          onClick={handleToggleCollapse}
          className="pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0B101B]/80 hover:bg-[#0B101B] border border-slate-700/60 hover:border-slate-500 text-slate-300 hover:text-white shadow-lg backdrop-blur-md text-[13px] font-medium transition-all group cursor-pointer"
          title="Expand Indicator Legend"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>Indicators ({activeItems.length})</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        </button>
      ) : (
        // Expanded Stacked List (TradingView Style)
        <div className="pointer-events-auto flex flex-col gap-0.5 p-1 rounded-lg bg-[#0B101B]/60 hover:bg-[#0B101B]/90 border border-transparent hover:border-slate-700/70 backdrop-blur-sm transition-all duration-200 group/container shadow-xl">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-800/60 transition-colors group/row text-[13px]"
            >
              {/* Title & Parameters */}
              <span className="font-bold text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] whitespace-nowrap">
                {item.title}
              </span>

              {item.params && (
                <span className="text-slate-400 text-[13px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] whitespace-nowrap">
                  {item.params}
                </span>
              )}

              {/* Single Live Value */}
              {item.valueText && (
                <span
                  className="font-bold font-mono text-[13px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap"
                  style={{ color: item.valueColor || '#CBD5E1' }}
                >
                  {item.valueText}
                </span>
              )}

              {/* Multi Live Values (e.g. Envelope Upper/Lower) */}
              {item.multiValues && (
                <div className="flex items-center gap-1.5 font-mono text-[13px]">
                  {item.multiValues.map((mv, idx) => (
                    <span key={idx} className="whitespace-nowrap">
                      <span className="text-slate-400 text-xs">{mv.label}</span>
                      <strong className="font-bold ml-0.5" style={{ color: mv.color }}>
                        {mv.value}
                      </strong>
                    </span>
                  ))}
                </div>
              )}

              {/* Status Badge (e.g. SuperMoney Signal BUY/HOLD/EXIT) */}
              {item.badge && (
                <span className={`${item.badge.bgClass} ${item.badge.textClass} whitespace-nowrap leading-tight`}>
                  {item.badge.text}
                </span>
              )}

              {/* Stealth Hover Action Toolbar (TradingView Style) */}
              <div className="flex items-center gap-0.5 ml-1 opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto transition-opacity duration-150">
                {/* 👁️ Eye Toggle */}
                <button
                  onClick={item.onToggle}
                  title={item.visible ? 'Hide on Chart' : 'Show on Chart'}
                  className="p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                {/* ⚙️ Gear (Direct Settings) */}
                <button
                  onClick={item.onConfigure}
                  title={`Configure ${item.title}`}
                  className="p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                {/* ✕ Close/Remove */}
                <button
                  onClick={item.onRemove}
                  title={`Remove ${item.title}`}
                  className="p-1 rounded hover:bg-rose-500/25 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Bottom Chevron to Collapse */}
          <div className="flex items-center justify-between pt-0.5 border-t border-slate-800/40 mt-0.5">
            <button
              onClick={handleToggleCollapse}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Collapse Indicator Legend"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="text-[11px] opacity-70 group-hover/container:opacity-100">Collapse</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
