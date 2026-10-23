import React, { useState } from 'react';
import { Eye, EyeOff, Settings, X, Plus, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useXChartStore } from '../../../stores/xchartStore';
import { NormalizedTickerSeries } from './useCompareData';
import { CompareHoverData } from './CompareLWChart';
import clsx from 'clsx';

interface CompareLegendProps {
  tabId: string;
  targetSeries: NormalizedTickerSeries | null;
  refSeriesList: NormalizedTickerSeries[];
  hoverData: CompareHoverData | null;
  dynamicBaseDate?: string | null;
  dynamicTargetReturn?: number | null;
  dynamicRefReturns?: Record<string, number | null>;
  onOpenConfig: (activeSection?: 'target' | 'refs' | 'display', presetMode?: 'targets' | 'myport' | 'custom') => void;
  onApplyPresetDirect?: (mode: 'targets' | 'myport' | 'custom') => void;
  activePresetMode?: 'targets' | 'myport' | 'custom';
}

export const CompareLegend: React.FC<CompareLegendProps> = ({
  tabId,
  targetSeries,
  refSeriesList,
  hoverData,
  dynamicBaseDate,
  dynamicTargetReturn,
  dynamicRefReturns,
  onOpenConfig,
  onApplyPresetDirect,
  activePresetMode,
}) => {
  const { toggleCompareRefVisible, removeCompareRef } = useXChartStore();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const formatPercent = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return '—';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  const getReturnColor = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return 'text-slate-400';
    if (val > 0) return 'text-emerald-400';
    if (val < 0) return 'text-rose-400';
    return 'text-slate-300';
  };

  const activeHoverDate = hoverData?.time;

  return (
    <div className="absolute top-3 left-3 z-20 flex flex-col pointer-events-auto select-none max-w-[340px]">
      <div className="bg-[#0B0F19]/90 backdrop-blur-md border border-[#2A2E45]/80 rounded-xl shadow-2xl overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#151926]/90 border-b border-[#2A2E45]/50 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-slate-200 tracking-wide font-heading">
              Ref. Legend
            </span>
            {activeHoverDate ? (
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono text-[11px] border border-cyan-500/20">
                {activeHoverDate}
              </span>
            ) : dynamicBaseDate ? (
              <span
                className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[11px] border border-amber-500/20"
                title="Dynamic 0% Left-Edge Base Date"
              >
                Base: {dynamicBaseDate}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono text-[11px]">
                0% Base
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenConfig()}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Compare Settings & Ref Manager"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Legend' : 'Collapse Legend'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Legend Body */}
        {!isCollapsed && (
          <div className="p-2 space-y-1 divide-y divide-[#1F2233]/50 text-[13px]">
            {/* Target Stock Row */}
            {targetSeries && (
              <div className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Target Color Pill */}
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: targetSeries.color }}
                  />
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="font-bold text-white tracking-wide truncate">
                      {targetSeries.symbol}
                    </span>
                    <span className="text-[11px] text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 shrink-0 font-medium">
                      Target
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* % Return */}
                  <span
                    className={clsx(
                      'font-mono font-bold text-[13px]',
                      getReturnColor(
                        hoverData
                          ? hoverData.targetReturn
                          : dynamicTargetReturn != null
                          ? dynamicTargetReturn
                          : targetSeries.latestReturn
                      )
                    )}
                  >
                    {formatPercent(
                      hoverData
                        ? hoverData.targetReturn
                        : dynamicTargetReturn != null
                        ? dynamicTargetReturn
                        : targetSeries.latestReturn
                    )}
                  </span>

                  <button
                    onClick={() => onOpenConfig('target')}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-white transition-opacity cursor-pointer"
                    title="Edit Target Style"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Reference Stock Rows */}
            <div className="pt-1 space-y-0.5">
              {refSeriesList.length === 0 ? (
                <div className="px-2 py-2 text-center text-xs text-slate-400">
                  ไม่มี Ref Stock — กดปุ่ม + ด้านล่างเพื่อเพิ่ม
                </div>
              ) : (
                refSeriesList.map((ref) => {
                  const isVisible = ref.visible;
                  const currentReturn = hoverData
                    ? hoverData.refReturns[ref.id]
                    : dynamicRefReturns?.[ref.id] != null
                    ? dynamicRefReturns[ref.id]
                    : ref.latestReturn;

                  const isIpoAfterBase =
                    Boolean(ref.startDate && dynamicBaseDate && ref.startDate > dynamicBaseDate);

                  return (
                    <div
                      key={ref.id}
                      className={clsx(
                        'flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg transition-colors group',
                        isVisible ? 'hover:bg-white/5' : 'opacity-50 hover:opacity-75 bg-black/20'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Eye Button for Show / Hide toggle */}
                        <button
                          onClick={() => toggleCompareRefVisible(tabId, ref.id)}
                          className={clsx(
                            'p-0.5 rounded transition-all cursor-pointer group/eye shrink-0',
                            isVisible
                              ? 'text-cyan-400 hover:text-white'
                              : 'text-slate-500 hover:text-slate-300'
                          )}
                          title={isVisible ? 'คลิกเพื่อซ่อนเส้นนี้ (Hide)' : 'คลิกเพื่อแสดงเส้นนี้ (Show)'}
                        >
                          {isVisible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Color Swatch Dot */}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{
                            backgroundColor: ref.color,
                            opacity: isVisible ? ref.opacity : 0.3,
                          }}
                        />

                        {/* Symbol Name & Ref Tag */}
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <span
                            className={clsx(
                              'font-semibold text-slate-200 tracking-wide truncate',
                              !isVisible && 'line-through text-slate-500'
                            )}
                          >
                            {ref.symbol}
                          </span>
                          {isIpoAfterBase && (
                            <span
                              className="text-[11px] text-amber-300 bg-amber-500/15 px-1 py-0.2 rounded border border-amber-500/30 shrink-0 font-medium"
                              title={`IPO / เริ่มเทรดเมื่อ ${ref.startDate}`}
                            >
                              IPO {ref.startDate?.slice(0, 4)}
                            </span>
                          )}
                          {ref.name && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[80px]" title={ref.name}>
                              {ref.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Live % Return + Action Icons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isVisible ? (
                          <span
                            className={clsx(
                              'font-mono font-bold text-[13px]',
                              getReturnColor(currentReturn)
                            )}
                          >
                            {formatPercent(currentReturn)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono italic">
                            ซ่อนอยู่
                          </span>
                        )}

                        {/* Remove Action Button on Hover */}
                        <button
                          onClick={() => removeCompareRef(tabId, ref.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title={`Remove ${ref.symbol}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Presets 3-Button Strip (2X Targets, My Port, Custom) */}
            <div className="pt-2 border-t border-[#1F2538] space-y-1.5">
              <div className="text-[11px] text-slate-400 font-semibold px-0.5 flex items-center justify-between">
                <span>Presets ด่วน:</span>
                <span className="text-[10px] text-amber-400 font-mono">1-Click</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onApplyPresetDirect ? onApplyPresetDirect('targets') : onOpenConfig('refs', 'targets')}
                  className={clsx(
                    "px-1.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                    activePresetMode === 'targets'
                      ? "bg-amber-500/25 border-amber-500/50 text-amber-300 shadow-xs"
                      : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-slate-300 hover:text-white"
                  )}
                  title="สลับเปรียบเทียบ Project 2X Targets (13 ตัว) ทันที"
                >
                  <span>🎯 2X</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApplyPresetDirect ? onApplyPresetDirect('myport') : onOpenConfig('refs', 'myport')}
                  className={clsx(
                    "px-1.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                    activePresetMode === 'myport'
                      ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300 shadow-xs"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-slate-300 hover:text-white"
                  )}
                  title="สลับเปรียบเทียบหุ้นในพอร์ต (My Port) ทันที"
                >
                  <span>💼 Port</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApplyPresetDirect ? onApplyPresetDirect('custom') : onOpenConfig('refs', 'custom')}
                  className={clsx(
                    "px-1.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                    activePresetMode === 'custom'
                      ? "bg-cyan-500/25 border-cyan-500/50 text-cyan-300 shadow-xs"
                      : "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20 text-slate-300 hover:text-white"
                  )}
                  title="สลับเปรียบเทียบ Custom & Benchmarks ทันที"
                >
                  <span>⚡ Custom</span>
                </button>
              </div>

              {/* + เพิ่ม Ref Ticker / Search */}
              <button
                onClick={() => onOpenConfig('refs', 'targets')}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ ค้นหา / เพิ่ม Ticker อื่นๆ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
