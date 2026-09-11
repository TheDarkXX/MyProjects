import React from 'react';
import { Flame } from 'lucide-react';
import { IndicatorSettings } from '../../types/indicatorConfig';
import { RawBarItem, hexToRgba, TV_FONT_FAMILY } from '../../types/chart';
import { TrendSpeedResult } from '../../utils/indicators/trendSpeed';
import { SuperMoneySignalResult } from '../../utils/indicators/superMoneySignal';

export interface ChartLegendOverlayProps {
  activeLegend: RawBarItem | null;
  activePercentChange: number;
  indicatorConfig: IndicatorSettings;
  superMoneySignalResult: SuperMoneySignalResult | null;
  rsiDataByDate: Map<string, { arsi: number | null; signal: number | null; buyCross: boolean; reversal: boolean; buyZone: boolean }>;
  trendSpeedDataByDate: Map<string, { speed: number | null; color: string; dynEma: number | null; dynColor: string }>;
}

export const ChartLegendBar: React.FC<ChartLegendOverlayProps> = ({
  activeLegend,
  activePercentChange,
  indicatorConfig,
  superMoneySignalResult,
  rsiDataByDate,
  trendSpeedDataByDate,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-[#080C14]/95 border-b border-slate-800/50 text-[13px] text-slate-300">
      {activeLegend ? (
        <>
          <span className="font-bold text-slate-100">
            {activeLegend.time.includes('T') ? activeLegend.time.replace('T', ' ').slice(0, 16) + ' UTC' : activeLegend.time}
          </span>
          <span>
            O: <strong className="text-slate-200">${activeLegend.open.toFixed(2)}</strong>
          </span>
          <span>
            H: <strong className="text-slate-200">${activeLegend.high.toFixed(2)}</strong>
          </span>
          <span>
            L: <strong className="text-slate-200">${activeLegend.low.toFixed(2)}</strong>
          </span>
          <span>
            C:{' '}
            <strong className={activePercentChange >= 0 ? 'text-amber-300' : 'text-rose-400'}>
              ${activeLegend.close.toFixed(2)}
            </strong>
          </span>
          {indicatorConfig.ema1.visible && activeLegend.ema50 && (
            <span className="hidden sm:inline">
              EMA{indicatorConfig.ema1.period}: <strong style={{ color: indicatorConfig.ema1.color }}>${activeLegend.ema50.toFixed(2)}</strong>
            </span>
          )}
          {indicatorConfig.ema2.visible && activeLegend.ema150 && (
            <span className="hidden sm:inline">
              EMA{indicatorConfig.ema2.period}: <strong style={{ color: indicatorConfig.ema2.color }}>${activeLegend.ema150.toFixed(2)}</strong>
            </span>
          )}
          {indicatorConfig.ema3.visible && activeLegend.ema200 && (
            <span className="hidden sm:inline">
              EMA{indicatorConfig.ema3.period}: <strong style={{ color: indicatorConfig.ema3.color }}>${activeLegend.ema200.toFixed(2)}</strong>
            </span>
          )}
          {indicatorConfig.superMoneySignal?.visible && superMoneySignalResult && indicatorConfig.superMoneySignal?.showPaneLabels && (
            <span className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
              <span className="text-slate-400">Signal:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold shadow-sm ${
                superMoneySignalResult.currentDirection === 1
                  ? 'bg-white text-slate-950 font-black'
                  : superMoneySignalResult.currentDirection === 2
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : superMoneySignalResult.currentDirection === -1
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {superMoneySignalResult.currentStatusText}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1">
            Banker:{' '}
            <strong className="font-extrabold" style={{ color: indicatorConfig.mcdx.bankerColor || '#F87171' }}>{activeLegend.banker.toFixed(1)}</strong>
            /20
          </span>
          <span className="hidden md:inline text-slate-300">
            HotMoney: <strong style={{ color: indicatorConfig.mcdx.hotMoneyColor || '#FFF176' }}>{activeLegend.hotMoney.toFixed(1)}</strong>
          </span>
          <span className="hidden md:inline text-slate-300">
            Retail: <strong style={{ color: indicatorConfig.mcdx.retailColor || '#1B5E20' }}>{activeLegend.retail.toFixed(1)}</strong>
          </span>
          {indicatorConfig.ultimateRsi.visible && (
            (() => {
              const rsiInfo = activeLegend ? rsiDataByDate.get(activeLegend.time) : null;
              if (!rsiInfo) return null;
              const arsiVal = rsiInfo.arsi;
              const sigVal = rsiInfo.signal;
              const isOB = arsiVal !== null && arsiVal >= indicatorConfig.ultimateRsi.obValue;
              const isOS = arsiVal !== null && arsiVal <= indicatorConfig.ultimateRsi.osValue;
              const color = isOB ? indicatorConfig.ultimateRsi.obColor : isOS ? indicatorConfig.ultimateRsi.osColor : '#E2E8F0';

              return (
                <span className="flex items-center gap-2 border-l border-slate-700 pl-3">
                  <span>
                    ARSI({indicatorConfig.ultimateRsi.length}):{' '}
                    <strong style={{ color }}>{arsiVal !== null ? arsiVal.toFixed(2) : '--'}</strong>
                  </span>
                  <span>
                    Sig:{' '}
                    <strong style={{ color: indicatorConfig.ultimateRsi.signalColor }}>
                      {sigVal !== null ? sigVal.toFixed(2) : '--'}
                    </strong>
                  </span>
                  {rsiInfo.buyCross && (
                    <span className="px-1.5 py-0.2 rounded bg-white text-slate-950 font-black text-[11px] shadow-sm animate-pulse">
                      BUY
                    </span>
                  )}
                  {rsiInfo.reversal && (
                    <span className="px-1.5 py-0.2 rounded bg-[#FFE600] text-slate-950 font-black text-[11px] shadow-sm">
                      REV
                    </span>
                  )}
                  {rsiInfo.buyZone && (
                    <span className="px-1.5 py-0.2 rounded bg-[#D0FF00] text-slate-950 font-black text-[11px] shadow-sm">
                      ZONE
                    </span>
                  )}
                </span>
              );
            })()
          )}
          {indicatorConfig.trendSpeed?.visible && (
            (() => {
              const tsInfo = activeLegend ? trendSpeedDataByDate.get(activeLegend.time) : null;
              if (!tsInfo) return null;
              return (
                <span className="flex items-center gap-2 border-l border-slate-700 pl-3">
                  <span>
                    Speed:{' '}
                    <strong style={{ color: tsInfo.color }}>
                      {tsInfo.speed !== null ? tsInfo.speed.toFixed(2) : '--'}
                    </strong>
                  </span>
                  {indicatorConfig.trendSpeed?.dynamicTrendVisible && tsInfo.dynEma !== null && (
                    <span className="hidden lg:inline">
                      Dyn:{' '}
                      <strong style={{ color: tsInfo.dynColor }}>
                        ${tsInfo.dynEma.toFixed(2)}
                      </strong>
                    </span>
                  )}
                </span>
              );
            })()
          )}
        </>
      ) : (
        <span className="text-slate-400 italic text-[13px]">Scroll to zoom • Drag anywhere for 2D Pan • Double-click to reset</span>
      )}
    </div>
  );
};

export interface DominanceTableProps {
  trendSpeedResult: TrendSpeedResult | null;
  indicatorConfig: IndicatorSettings;
}

export const DominanceTableOverlay: React.FC<DominanceTableProps> = ({
  trendSpeedResult,
  indicatorConfig,
}) => {
  if (
    !indicatorConfig.trendSpeed?.visible ||
    !indicatorConfig.trendSpeed?.enableTable ||
    !indicatorConfig.trendSpeed?.tableVisible ||
    !trendSpeedResult?.stats
  ) {
    return null;
  }

  return (
    <div
      className="absolute top-3 right-16 z-20 pointer-events-auto bg-[#090D16]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 select-none animate-in fade-in duration-150"
      style={{ fontFamily: TV_FONT_FAMILY }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
        <span className="text-[13px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          Dominance Wave
        </span>
        <span
          className="text-[13px] font-black px-1.5 py-0.5 rounded"
          style={{
            color: trendSpeedResult.stats.dominanceAvgColor,
            backgroundColor: hexToRgba(trendSpeedResult.stats.dominanceAvgColor, 0.15),
            border: `1px solid ${hexToRgba(trendSpeedResult.stats.dominanceAvgColor, 0.3)}`,
          }}
        >
          {trendSpeedResult.stats.dominanceAvgText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Bull Avg:</span>
          <strong className="text-emerald-400">{trendSpeedResult.stats.bullAvg.toFixed(1)}</strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Bear Avg:</span>
          <strong className="text-rose-400">{trendSpeedResult.stats.bearAvg.toFixed(1)}</strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Ratio:</span>
          <strong className="text-slate-200">{trendSpeedResult.stats.waveRatioAvg.toFixed(2)}x</strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Current:</span>
          <strong style={{ color: trendSpeedResult.stats.currentColorAvg }}>
            {trendSpeedResult.stats.currentTextAvg}
          </strong>
        </div>
      </div>
    </div>
  );
};
