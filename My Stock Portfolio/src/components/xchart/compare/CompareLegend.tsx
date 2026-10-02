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
  onOpenConfig: (activeSection?: 'target' | 'refs') => void;
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
                              className="text-[10px] text-amber-300 bg-amber-500/15 px-1 py-0.2 rounded border border-amber-500/30 shrink-0 font-medium"
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

            {/* Quick Add Ref Action */}
            <div className="pt-1.5 flex items-center justify-between">
              <button
                onClick={() => onOpenConfig('refs')}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/20 hover:border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่ม Ref Ticker / Benchmark</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
