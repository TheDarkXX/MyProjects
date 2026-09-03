import React, { useMemo } from 'react';
import { Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { Target, Crosshair, Award, AlertTriangle, Shield, CheckCircle2, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface ConvictionGaugeCardProps {
  holdings: Holding[];
  exchangeRate: number;
}

export const ConvictionGaugeCard: React.FC<ConvictionGaugeCardProps> = ({ holdings, exchangeRate }) => {
  const { currency } = useUiStore();

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [holdings]);

  // Sort holdings by value descending
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  }, [holdings]);

  // Concentration metrics
  const concentration = useMemo(() => {
    if (totalValue <= 0 || sortedHoldings.length === 0) {
      return { top1: 0, top3: 0, top5: 0, top1Symbol: '-', top3Symbols: [], top5Symbols: [] };
    }

    const top1Val = sortedHoldings[0]?.currentValue || 0;
    const top3Val = sortedHoldings.slice(0, 3).reduce((sum, h) => sum + h.currentValue, 0);
    const top5Val = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + h.currentValue, 0);

    return {
      top1: (top1Val / totalValue) * 100,
      top3: (top3Val / totalValue) * 100,
      top5: (top5Val / totalValue) * 100,
      top1Symbol: sortedHoldings[0]?.symbol || '-',
      top3Symbols: sortedHoldings.slice(0, 3).map(h => h.symbol),
      top5Symbols: sortedHoldings.slice(0, 5).map(h => h.symbol),
    };
  }, [sortedHoldings, totalValue]);

  // Investor Posture determination (Shay Boloor style)
  const posture = useMemo(() => {
    const { top3, top1 } = concentration;
    if (top3 >= 55 || top1 >= 30) {
      return {
        label: 'High Conviction Sniper',
        color: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        badgeBg: 'bg-amber-500/10',
        icon: Crosshair,
        tagline: 'Concentrated alpha bets. Heavy exposure to high-conviction winners.',
        status: 'Optimal for Outperformance',
      };
    } else if (top3 >= 35) {
      return {
        label: 'Balanced Core Compounder',
        color: 'text-blue-400',
        borderColor: 'border-blue-500/40',
        badgeBg: 'bg-blue-500/10',
        icon: Shield,
        tagline: 'Solid balance between core growth champions and tactical diversifiers.',
        status: 'Balanced Risk / Return',
      };
    } else {
      return {
        label: 'Broad Fortress Indexer',
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        badgeBg: 'bg-emerald-500/10',
        icon: CheckCircle2,
        tagline: 'High diversification with subdued single-stock drawdown risk.',
        status: 'Defensive Preservation',
      };
    }
  }, [concentration]);

  const PostureIcon = posture.icon;

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg lg:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Conviction & Concentration Discipline
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40">
                Shay Boloor Framework
              </span>
            </h3>
            <p className="text-xs text-[#9898C8] mt-0.5">
              Portfolio density check: Ensure winners are given enough weight to meaningfully drive returns
            </p>
          </div>
        </div>

        {/* Posture Pill */}
        <div className={clsx(
          "px-4 py-2 rounded-2xl border flex items-center gap-2.5 self-start md:self-auto",
          posture.badgeBg,
          posture.borderColor
        )}>
          <PostureIcon className={clsx("w-4 h-4", posture.color)} />
          <div>
            <span className={clsx("text-xs font-black block tracking-tight", posture.color)}>
              {posture.label}
            </span>
            <span className="text-[10px] text-[#9898C8]">
              {posture.status}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Concentration Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Top 1 */}
        <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9898C8] font-semibold">Top 1 Single Asset</span>
            <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-[#2A2E45]">
              {concentration.top1Symbol}
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums mb-2">
            {concentration.top1.toFixed(1)}%
          </div>
          <div className="w-full h-2 bg-[#0F111A] rounded-full overflow-hidden mb-2">
            <div 
              className={clsx(
                "h-full rounded-full transition-all duration-500",
                concentration.top1 > 35 ? "bg-amber-400" : "bg-[#823AFD]"
              )}
              style={{ width: `${Math.min(100, concentration.top1)}%` }}
            />
          </div>
          <span className="text-[11px] text-[#9898C8]">
            {concentration.top1 > 35 ? '⚠️ High single-stock concentration' : 'Healthy top holding weighting'}
          </span>
        </div>

        {/* Top 3 */}
        <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9898C8] font-semibold">Top 3 Dominance</span>
            <span className="text-xs font-mono font-bold text-[#823AFD] truncate max-w-[120px]">
              {concentration.top3Symbols.join(', ') || '-'}
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums mb-2">
            {concentration.top3.toFixed(1)}%
          </div>
          <div className="w-full h-2 bg-[#0F111A] rounded-full overflow-hidden mb-2">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#823AFD] to-[#FC2D79] transition-all duration-500"
              style={{ width: `${Math.min(100, concentration.top3)}%` }}
            />
          </div>
          <span className="text-[11px] text-[#9898C8]">
            Target for growth outperformance: 45 - 65%
          </span>
        </div>

        {/* Top 5 */}
        <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9898C8] font-semibold">Top 5 Core Holdings</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {concentration.top5Symbols.length} Assets
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums mb-2">
            {concentration.top5.toFixed(1)}%
          </div>
          <div className="w-full h-2 bg-[#0F111A] rounded-full overflow-hidden mb-2">
            <div 
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, concentration.top5)}%` }}
            />
          </div>
          <span className="text-[11px] text-[#9898C8]">
            {concentration.top5 > 80 ? 'Heavy core reliance' : 'Balanced core allocation'}
          </span>
        </div>
      </div>

      {/* Strategy Guidance Box */}
      <div className="bg-gradient-to-r from-[#1A1D2D] to-[#141622] border border-[#2A2E45] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              Benchmark Outperformance Hurdle
            </span>
            <span className="text-[11px] text-[#9898C8]">
              Check relative alpha vs S&P 500 (SPY) and Nasdaq 100 (QQQ) in the Performance tab
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-[#CBD5E1]">
            Active Conviction: <span className="text-emerald-400 font-bold">{(100 - (100 / Math.max(1, holdings.length))).toFixed(0)}% Focus</span>
          </span>
        </div>
      </div>
    </div>
  );
};
