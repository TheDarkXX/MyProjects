import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Settings,
  X,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
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
  onToggleAnchoredVWAP?: () => void;
  onToggleVolumeProfile?: () => void;
  onOpenConfig: (view: 'ema' | 'envelope' | 'trendSpeed' | 'superMoneySignal' | 'mcdx' | 'ultimateRsi' | 'list' | 'anchoredVwap') => void;
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
  onToggleAnchoredVWAP,
  onToggleVolumeProfile,
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

  const [removedItems, setRemovedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tv_legend_removed_items');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  // If indicator is activated in top Indicators menu, unmark from removed items
  useEffect(() => {
    setRemovedItems((prev) => {
      let changed = false;
      const next = { ...prev };
      if (prev['emaRibbon'] && (indicatorConfig.ema1.visible || indicatorConfig.ema2.visible || indicatorConfig.ema3.visible)) {
        delete next['emaRibbon'];
        changed = true;
      }
      if (prev['envelope'] && indicatorConfig.envelope.visible) {
        delete next['envelope'];
        changed = true;
      }
      if (prev['dynamicTrend'] && indicatorConfig.trendSpeed?.dynamicTrendVisible) {
        delete next['dynamicTrend'];
        changed = true;
      }
      if (prev['superMoneySignal'] && indicatorConfig.superMoneySignal?.visible) {
        delete next['superMoneySignal'];
        changed = true;
      }
      if (prev['anchoredVwap'] && indicatorConfig.anchoredVwap?.visible) {
        delete next['anchoredVwap'];
        changed = true;
      }
      if (prev['volumeProfile'] && indicatorConfig.volumeProfile?.visible) {
        delete next['volumeProfile'];
        changed = true;
      }
      if (changed) {
        try {
          localStorage.setItem('tv_legend_removed_items', JSON.stringify(next));
        } catch (_) {}
        return next;
      }
      return prev;
    });
  }, [
    indicatorConfig.ema1.visible,
    indicatorConfig.ema2.visible,
    indicatorConfig.ema3.visible,
    indicatorConfig.envelope.visible,
    indicatorConfig.trendSpeed?.dynamicTrendVisible,
    indicatorConfig.superMoneySignal?.visible,
    indicatorConfig.anchoredVwap?.visible,
    indicatorConfig.volumeProfile?.visible,
  ]);

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

  const handleRemoveItem = (id: string, cleanupAction?: () => void) => {
    setRemovedItems((prev) => {
      const next = { ...prev, [id]: true };
      try {
        localStorage.setItem('tv_legend_removed_items', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    cleanupAction?.();
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

  // 1. EMA Ribbon
  if (!removedItems['emaRibbon']) {
    const emas = [
      { key: 'ema1' as const, period: indicatorConfig.ema1.period, val: activeLegend?.ema50, color: indicatorConfig.ema1.color, visible: indicatorConfig.ema1.visible },
      { key: 'ema2' as const, period: indicatorConfig.ema2.period, val: activeLegend?.ema150, color: indicatorConfig.ema2.color, visible: indicatorConfig.ema2.visible },
      { key: 'ema3' as const, period: indicatorConfig.ema3.period, val: activeLegend?.ema200, color: indicatorConfig.ema3.color, visible: indicatorConfig.ema3.visible },
    ];
    const anyEmaVisible = emas.some((e) => e.visible);
    const periodsText = emas.map((e) => e.period).join(' ');

    activeItems.push({
      id: 'emaRibbon',
      title: 'EMA Ribbon',
      params: `${periodsText} close`,
      multiValues: emas.map((e) => ({
        label: '',
        value: e.val !== undefined && e.val !== null ? `$${e.val.toFixed(2)}` : '--',
        color: anyEmaVisible && e.visible ? e.color : '#64748B',
      })),
      visible: anyEmaVisible,
      isLocked: lockedItems['emaRibbon'] ?? true,
      onToggleLock: () => handleToggleItemLock('emaRibbon'),
      onToggle: () => {
        if (anyEmaVisible) {
          emas.filter((e) => e.visible).forEach((e) => onToggleEMA(e.key));
        } else {
          emas.forEach((e) => onToggleEMA(e.key));
        }
      },
      onConfigure: () => onOpenConfig('ema'),
      onRemove: () => {
        handleRemoveItem('emaRibbon', () => {
          emas.filter((e) => e.visible).forEach((e) => onToggleEMA(e.key));
        });
      },
    });
  }

  // 2. Bedrock Envelope
  if (!removedItems['envelope']) {
    const baseEma = activeLegend?.ema200;
    const pct = indicatorConfig.envelope.percent;
    const isEnvVisible = indicatorConfig.envelope.visible;
    const upper = baseEma !== undefined && baseEma !== null ? baseEma * (1 + pct / 100) : null;
    const lower = baseEma !== undefined && baseEma !== null ? baseEma * (1 - pct / 100) : null;

    activeItems.push({
      id: 'envelope',
      title: 'Bedrock Envelope',
      params: `±${pct}% ${indicatorConfig.envelope.emaPeriod || 200}`,
      multiValues: [
        { label: '+', value: upper !== null ? `$${upper.toFixed(2)}` : '--', color: isEnvVisible ? indicatorConfig.envelope.color : '#64748B' },
        { label: '-', value: lower !== null ? `$${lower.toFixed(2)}` : '--', color: isEnvVisible ? indicatorConfig.envelope.color : '#64748B' },
      ],
      visible: isEnvVisible,
      isLocked: lockedItems['envelope'] ?? true,
      onToggleLock: () => handleToggleItemLock('envelope'),
      onToggle: onToggleEnvelope,
      onConfigure: () => onOpenConfig('envelope'),
      onRemove: () => handleRemoveItem('envelope', () => {
        if (isEnvVisible) onToggleEnvelope();
      }),
    });
  }

  // 3. Dynamic Trend EMA (Zeiierman)
  if (!removedItems['dynamicTrend'] && indicatorConfig.trendSpeed?.visible) {
    const isDynVisible = indicatorConfig.trendSpeed?.dynamicTrendVisible ?? true;
    const dynVal = trendSpeedData?.dynEma;
    activeItems.push({
      id: 'dynamicTrend',
      title: 'Dyn Trend EMA',
      params: 'Zeiierman',
      valueText: dynVal !== null && dynVal !== undefined ? `$${dynVal.toFixed(2)}` : '--',
      valueColor: isDynVisible ? (trendSpeedData?.dynColor || '#F7D02C') : '#64748B',
      visible: isDynVisible,
      isLocked: lockedItems['dynamicTrend'] ?? true,
      onToggleLock: () => handleToggleItemLock('dynamicTrend'),
      onToggle: onToggleTrendSpeedDyn,
      onConfigure: () => onOpenConfig('trendSpeed'),
      onRemove: () => handleRemoveItem('dynamicTrend', () => {
        if (isDynVisible) onToggleTrendSpeedDyn();
      }),
    });
  }

  // 4. Super Money Trend Signal
  if (!removedItems['superMoneySignal'] && superMoneySignalResult) {
    const isSmVisible = indicatorConfig.superMoneySignal?.visible ?? true;
    const dir = superMoneySignalResult.currentDirection;
    activeItems.push({
      id: 'superMoneySignal',
      title: 'Super Money Signal',
      badge: {
        text: superMoneySignalResult.currentStatusText || 'NEUTRAL',
        bgClass: !isSmVisible
          ? 'bg-slate-800 text-slate-500'
          : dir === 1
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          : dir === 2
          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
          : dir === -1
          ? 'bg-rose-600/20 text-rose-300 border border-rose-600/40'
          : 'bg-slate-800 text-slate-300',
        textClass: 'px-1.5 py-0.2 rounded text-[11px] font-medium',
      },
      visible: isSmVisible,
      isLocked: lockedItems['superMoneySignal'] ?? true,
      onToggleLock: () => handleToggleItemLock('superMoneySignal'),
      onToggle: onToggleSuperMoneySignal,
      onConfigure: () => onOpenConfig('superMoneySignal'),
      onRemove: () => handleRemoveItem('superMoneySignal', () => {
        if (isSmVisible) onToggleSuperMoneySignal();
      }),
    });
  }

  // 5. Anchored VWAP
  if (!removedItems['anchoredVwap'] && indicatorConfig.anchoredVwap) {
    const isAvwapVisible = indicatorConfig.anchoredVwap.visible;
    const modeLabel = indicatorConfig.anchoredVwap.anchorMode === 'ytd' ? 'YTD' : indicatorConfig.anchoredVwap.anchorMode === 'swingLow60D' ? '60D' : '10-11M';
    activeItems.push({
      id: 'anchoredVwap',
      title: 'Anchored VWAP',
      params: modeLabel,
      visible: isAvwapVisible,
      isLocked: lockedItems['anchoredVwap'] ?? true,
      onToggleLock: () => handleToggleItemLock('anchoredVwap'),
      onToggle: onToggleAnchoredVWAP || (() => {}),
      onConfigure: () => onOpenConfig('anchoredVwap'),
      onRemove: () => handleRemoveItem('anchoredVwap', () => {
        if (isAvwapVisible) onToggleAnchoredVWAP?.();
      }),
    });
  }

  // 6. Volume Profile (VPVR)
  if (!removedItems['volumeProfile'] && indicatorConfig.volumeProfile) {
    const isVpVisible = indicatorConfig.volumeProfile.visible;
    activeItems.push({
      id: 'volumeProfile',
      title: 'Volume Profile',
      params: `${indicatorConfig.volumeProfile.rowSize || 40} rows`,
      visible: isVpVisible,
      isLocked: lockedItems['volumeProfile'] ?? true,
      onToggleLock: () => handleToggleItemLock('volumeProfile'),
      onToggle: onToggleVolumeProfile || (() => {}),
      onConfigure: () => onOpenConfig('list'),
      onRemove: () => handleRemoveItem('volumeProfile', () => {
        if (isVpVisible) onToggleVolumeProfile?.();
      }),
    });
  }

  // 7. Auto Support / Resistance
  if (!removedItems['autoSR'] && autoSRCount > 0) {
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
      onRemove: () => handleRemoveItem('autoSR', onToggleAutoSR),
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
          <Layers className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>Indicators ({activeItems.filter(i => i.visible).length}/{activeItems.length})</span>
          <ChevronDown className="w-3 h-3 text-slate-300 group-hover:text-white" />
        </button>
      ) : (
        // Expanded Stacked List (TradingView Style - Compact 10px text with 12px icons)
        <div className="pointer-events-auto flex flex-col gap-0.5 p-0.5 rounded bg-transparent transition-all duration-150 group/container">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-slate-800/50 transition-colors group/row text-[10px] leading-none ${
                !item.visible ? 'opacity-75' : ''
              }`}
            >
              {/* Title & Parameters */}
              <span className={`font-normal whitespace-nowrap ${item.visible ? 'text-slate-200' : 'text-slate-400'}`}>
                {item.title}
              </span>

              {item.params && (
                <span className={`text-[10px] whitespace-nowrap font-mono ${item.visible ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.params}
                </span>
              )}

              {/* Single Live Value */}
              {item.valueText && (
                <span
                  className="font-normal font-mono text-[10px] whitespace-nowrap"
                  style={{ color: item.visible ? (item.valueColor || '#CBD5E1') : '#94A3B8' }}
                >
                  {item.valueText}
                </span>
              )}

              {/* Multi Live Values */}
              {item.multiValues && (
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  {item.multiValues.map((mv, idx) => (
                    <span key={idx} className="whitespace-nowrap">
                      {mv.label && <span className="text-slate-400 text-[9px] mr-0.5">{mv.label}</span>}
                      <span className="font-normal" style={{ color: item.visible ? mv.color : '#94A3B8' }}>
                        {item.visible ? mv.value : '--'}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Status Badge */}
              {item.badge && (
                <span className={`${item.badge.bgClass} ${item.badge.textClass} whitespace-nowrap leading-tight text-[9px]`}>
                  {item.badge.text}
                </span>
              )}

              {/* Stealth Hover Action Toolbar */}
              <div className="flex items-center gap-0.5 ml-1.5 opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto transition-opacity duration-150">
                {/* 👁️ Eye Toggle */}
                <button
                  onClick={item.onToggle}
                  title={item.visible ? 'Hide on Chart' : 'Show on Chart'}
                  className={`p-0.5 rounded hover:bg-slate-700/80 transition-colors cursor-pointer ${
                    item.visible ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-amber-400'
                  }`}
                >
                  {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
                </button>

                {/* ⚙️ Gear (Direct Settings) */}
                <button
                  onClick={item.onConfigure}
                  title={`Configure ${item.title}`}
                  className="p-0.5 rounded hover:bg-slate-700/80 text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                </button>

                {/* 🔒 / 🔓 Lock Toggle */}
                {item.onToggleLock && (
                  <button
                    onClick={item.onToggleLock}
                    title={item.isLocked ? '🔒 Locked (Click to unlock)' : '🔓 Unlocked (Click to lock)'}
                    className="p-0.5 rounded hover:bg-slate-700/80 transition-colors cursor-pointer"
                  >
                    {item.isLocked ? (
                      <Lock className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-slate-300 hover:text-white" />
                    )}
                  </button>
                )}

                {/* ✕ Close/Remove */}
                <button
                  onClick={item.onRemove}
                  title={`Remove ${item.title}`}
                  className="p-0.5 rounded hover:bg-rose-500/25 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Minimal Expand/Collapse Bar */}
          <div className="pt-0.5 mt-0.5 border-t border-slate-800/60 flex items-center justify-between px-1">
            <button
              onClick={handleToggleCollapse}
              className="text-[9px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ChevronUp className="w-2.5 h-2.5" />
              <span>Collapse</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
