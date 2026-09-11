import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Settings,
  X,
  Lock,
  Unlock,
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
  autoSRLocked?: boolean;
  globalDrawingsVisible?: boolean;

  onToggleEMA: (key: 'ema1' | 'ema2' | 'ema3') => void;
  onToggleEnvelope: () => void;
  onToggleTrendSpeedDyn: () => void;
  onToggleSuperMoneySignal: () => void;
  onToggleAutoSR: () => void;
  onToggleAutoSRLock?: () => void;
  onOpenConfig: (view: 'ema' | 'envelope' | 'trendSpeed' | 'superMoneySignal' | 'mcdx' | 'ultimateRsi' | 'list') => void;
  onOpenDrawingSettings?: () => void;
}

export const MainPaneIndicatorLegend: React.FC<MainPaneIndicatorLegendProps> = ({
  indicatorConfig,
  activeLegend,
  superMoneySignalResult,
  trendSpeedData,
  autoSRCount = 0,
  autoSRLocked = false,
  globalDrawingsVisible = true,
  onToggleEMA,
  onToggleEnvelope,
  onToggleTrendSpeedDyn,
  onToggleSuperMoneySignal,
  onToggleAutoSR,
  onToggleAutoSRLock,
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

  const [lockedItems, setLockedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tv_legend_locked_items');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
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

  const handleToggleItemLock = (id: string) => {
    setLockedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('tv_legend_locked_items', JSON.stringify(next));
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
    isLocked: boolean;
    onToggleLock?: () => void;
    onToggle: () => void;
    onConfigure: () => void;
    onRemove: () => void;
  }> = [];

  // 1. EMA Ribbon (Grouped under single name as in Indicator Manager)
  const hasAnyEma = indicatorConfig.ema1.visible || indicatorConfig.ema2.visible || indicatorConfig.ema3.visible;
  if (hasAnyEma) {
    const emas = [
      { key: 'ema1' as const, period: indicatorConfig.ema1.period, val: activeLegend?.ema50, color: indicatorConfig.ema1.color, visible: indicatorConfig.ema1.visible },
      { key: 'ema2' as const, period: indicatorConfig.ema2.period, val: activeLegend?.ema150, color: indicatorConfig.ema2.color, visible: indicatorConfig.ema2.visible },
      { key: 'ema3' as const, period: indicatorConfig.ema3.period, val: activeLegend?.ema200, color: indicatorConfig.ema3.color, visible: indicatorConfig.ema3.visible },
    ];
    const activeEmas = emas.filter((e) => e.visible);
    const periodsText = activeEmas.map((e) => e.period).join(' ');

    activeItems.push({
      id: 'emaRibbon',
      title: 'EMA Ribbon',
      params: `${periodsText} close`,
      multiValues: activeEmas.map((e) => ({
        label: '',
        value: e.val !== undefined && e.val !== null ? `$${e.val.toFixed(2)}` : '--',
        color: e.color,
      })),
      visible: true,
      isLocked: lockedItems['emaRibbon'] ?? true,
      onToggleLock: () => handleToggleItemLock('emaRibbon'),
      onToggle: () => {
        const allOn = emas.every((e) => e.visible);
        if (allOn) {
          emas.forEach((e) => onToggleEMA(e.key));
        } else {
          emas.filter((e) => !e.visible).forEach((e) => onToggleEMA(e.key));
        }
      },
      onConfigure: () => onOpenConfig('ema'),
      onRemove: () => {
        activeEmas.forEach((e) => onToggleEMA(e.key));
      },
    });
  }

  // 2. Bedrock Envelope
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
      isLocked: lockedItems['envelope'] ?? true,
      onToggleLock: () => handleToggleItemLock('envelope'),
      onToggle: onToggleEnvelope,
      onConfigure: () => onOpenConfig('envelope'),
      onRemove: onToggleEnvelope,
    });
  }

  // 3. Dynamic Trend EMA (Zeiierman)
  if (indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.dynamicTrendVisible) {
    const dynVal = trendSpeedData?.dynEma;
    activeItems.push({
      id: 'dynamicTrend',
      title: 'Dyn Trend EMA',
      params: 'Zeiierman',
      valueText: dynVal !== null && dynVal !== undefined ? `$${dynVal.toFixed(2)}` : '--',
      valueColor: trendSpeedData?.dynColor || '#F7D02C',
      visible: true,
      isLocked: lockedItems['dynamicTrend'] ?? true,
      onToggleLock: () => handleToggleItemLock('dynamicTrend'),
      onToggle: onToggleTrendSpeedDyn,
      onConfigure: () => onOpenConfig('trendSpeed'),
      onRemove: onToggleTrendSpeedDyn,
    });
  }

  // 4. Super Money Trend Signal
  if (indicatorConfig.superMoneySignal?.visible && superMoneySignalResult) {
    const dir = superMoneySignalResult.currentDirection;
    activeItems.push({
      id: 'superMoneySignal',
      title: 'Super Money Signal',
      badge: {
        text: superMoneySignalResult.currentStatusText || 'NEUTRAL',
        bgClass:
          dir === 1
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            : dir === 2
            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
            : dir === -1
            ? 'bg-rose-600/20 text-rose-300 border border-rose-600/40'
            : 'bg-slate-800 text-slate-300',
        textClass: 'px-1.5 py-0.2 rounded text-[11px] font-medium',
      },
      visible: indicatorConfig.superMoneySignal.visible,
      isLocked: lockedItems['superMoneySignal'] ?? true,
      onToggleLock: () => handleToggleItemLock('superMoneySignal'),
      onToggle: onToggleSuperMoneySignal,
      onConfigure: () => onOpenConfig('superMoneySignal'),
      onRemove: onToggleSuperMoneySignal,
    });
  }

  // 5. Auto Support / Resistance (Active in Drawing Store)
  if (autoSRCount > 0) {
    activeItems.push({
      id: 'autoSR',
      title: 'Auto S/R Swings',
      params: `${autoSRCount} lvls`,
      valueText: globalDrawingsVisible ? (autoSRLocked ? '🔒 Locked' : '🔓 Unlocked') : 'Hidden',
      valueColor: globalDrawingsVisible ? (autoSRLocked ? '#FBBF24' : '#10B981') : '#64748B',
      visible: globalDrawingsVisible,
      isLocked: autoSRLocked,
      onToggleLock: onToggleAutoSRLock,
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
          className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0B101B]/80 hover:bg-[#0B101B] border border-slate-700/60 hover:border-slate-500 text-slate-200 hover:text-white shadow-lg backdrop-blur-md text-[10px] font-normal transition-all group cursor-pointer"
          title="Expand Indicator Legend"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>Indicators ({activeItems.length})</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-white" />
        </button>
      ) : (
        // Expanded Stacked List (TradingView Style - Compact 10px text with clear 16px icons)
        <div className="pointer-events-auto flex flex-col gap-0.5 p-0.5 rounded bg-[#0B101B]/50 hover:bg-[#0B101B]/85 border border-transparent hover:border-slate-700/60 backdrop-blur-sm transition-all duration-150 group/container shadow-lg">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-slate-800/50 transition-colors group/row text-[10px] leading-none"
            >
              {/* Title & Parameters (Regular font weight, crisp & clean 10px) */}
              <span className="font-normal text-slate-200 whitespace-nowrap">
                {item.title}
              </span>

              {item.params && (
                <span className="text-slate-400 text-[10px] whitespace-nowrap font-mono">
                  {item.params}
                </span>
              )}

              {/* Single Live Value */}
              {item.valueText && (
                <span
                  className="font-normal font-mono text-[10px] whitespace-nowrap"
                  style={{ color: item.valueColor || '#CBD5E1' }}
                >
                  {item.valueText}
                </span>
              )}

              {/* Multi Live Values (e.g. EMA Ribbon values, Envelope Upper/Lower) */}
              {item.multiValues && (
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  {item.multiValues.map((mv, idx) => (
                    <span key={idx} className="whitespace-nowrap">
                      {mv.label && <span className="text-slate-400 text-[9px] mr-0.5">{mv.label}</span>}
                      <span className="font-normal" style={{ color: mv.color }}>
                        {mv.value}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Status Badge (e.g. SuperMoney Signal BUY/HOLD/EXIT) */}
              {item.badge && (
                <span className={`${item.badge.bgClass} ${item.badge.textClass} whitespace-nowrap leading-tight text-[9px]`}>
                  {item.badge.text}
                </span>
              )}

              {/* Stealth Hover Action Toolbar (Enlarged 4 levels to w-4 h-4 for clear visibility) */}
              <div className="flex items-center gap-1 ml-1.5 opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto transition-opacity duration-150">
                {/* 👁️ Eye Toggle */}
                <button
                  onClick={item.onToggle}
                  title={item.visible ? 'Hide on Chart' : 'Show on Chart'}
                  className="p-1 rounded hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {item.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* ⚙️ Gear (Direct Settings) */}
                <button
                  onClick={item.onConfigure}
                  title={`Configure ${item.title}`}
                  className="p-1 rounded hover:bg-slate-700/80 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* 🔒 / 🔓 Lock Toggle */}
                {item.onToggleLock && (
                  <button
                    onClick={item.onToggleLock}
                    title={item.isLocked ? '🔒 Locked (Click to unlock)' : '🔓 Unlocked (Click to lock)'}
                    className="p-1 rounded hover:bg-slate-700/80 transition-colors cursor-pointer"
                  >
                    {item.isLocked ? (
                      <Lock className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Unlock className="w-4 h-4 text-slate-300 hover:text-white" />
                    )}
                  </button>
                )}

                {/* ✕ Close/Remove */}
                <button
                  onClick={item.onRemove}
                  title={`Remove ${item.title}`}
                  className="p-1 rounded hover:bg-rose-500/25 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {/* Bottom Chevron to Collapse */}
          <div className="flex items-center justify-between pt-0.5 border-t border-slate-800/40 mt-0.5">
            <button
              onClick={handleToggleCollapse}
              className="p-0.5 rounded hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
              title="Collapse Indicator Legend"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="text-[10px] opacity-70 group-hover/container:opacity-100">Collapse</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
