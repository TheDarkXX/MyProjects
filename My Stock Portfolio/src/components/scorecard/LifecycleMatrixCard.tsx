import React, { useMemo } from 'react';
import { Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { Activity, ShieldCheck, Zap, Coins, ChevronRight, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface LifecycleMatrixCardProps {
  holdings: Holding[];
  exchangeRate: number;
  isCompact?: boolean;
}

interface StageInfo {
  id: string;
  name: string;
  badgeName: string;
  color: string;
  textColor: string;
  borderColor: string;
  bgLight: string;
  description: string;
  icon: any;
  targetPercent: string;
}

const STAGES: StageInfo[] = [
  {
    id: 'Small Cap',
    name: 'Phase 1: Incubation',
    badgeName: 'Small Cap',
    color: '#facc15',
    textColor: 'text-black',
    borderColor: 'border-yellow-500/40',
    bgLight: 'bg-yellow-500/10',
    description: 'High risk, 10x upside potential, disruptive emerging tech',
    icon: Zap,
    targetPercent: '5 - 15%',
  },
  {
    id: 'Hyper Growth',
    name: 'Phase 2: Acceleration',
    badgeName: 'Hyper Growth',
    color: '#ef4444',
    textColor: 'text-white',
    borderColor: 'border-red-500/40',
    bgLight: 'bg-red-500/10',
    description: 'Scaling megatrend leaders, Rule of 40, market share grabbers',
    icon: Activity,
    targetPercent: '20 - 35%',
  },
  {
    id: 'Core Compounder',
    name: 'Phase 3: Deep Moat',
    badgeName: 'Core Compounder',
    color: '#10b981',
    textColor: 'text-white',
    borderColor: 'border-emerald-500/40',
    bgLight: 'bg-emerald-500/10',
    description: 'Monopolistic FCF generation, pricing power, fortress balance sheets',
    icon: ShieldCheck,
    targetPercent: '35 - 55%',
  },
  {
    id: 'Dividend Growth',
    name: 'Phase 4: Cash Harvest',
    badgeName: 'Dividend Growth & Yield',
    color: '#854d0e',
    textColor: 'text-white',
    borderColor: 'border-amber-700/40',
    bgLight: 'bg-amber-900/10',
    description: 'Capital return, steady dividend hikes, cash payout engines',
    icon: Coins,
    targetPercent: '10 - 25%',
  },
];

export const LifecycleMatrixCard: React.FC<LifecycleMatrixCardProps> = ({ holdings, exchangeRate, isCompact }) => {
  const { currency } = useUiStore();

  const totalPortfolioValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.currentValue, 0);
  }, [holdings]);

  // Aggregate holdings by lifecycle stage
  const stageData = useMemo(() => {
    const map: Record<string, { totalValue: number; holdings: Holding[]; percent: number }> = {
      'Small Cap': { totalValue: 0, holdings: [], percent: 0 },
      'Hyper Growth': { totalValue: 0, holdings: [], percent: 0 },
      'Core Compounder': { totalValue: 0, holdings: [], percent: 0 },
      'Dividend Growth': { totalValue: 0, holdings: [], percent: 0 },
    };

    holdings.forEach(h => {
      // In database / type definitions, stockType maps to our strategies
      const rawType = (h as any).stockType || (h as any).stock_type || 'Core Compounder';
      
      let targetKey = 'Core Compounder';
      if (rawType === 'Small Cap' || rawType === 'Speculative') {
        targetKey = 'Small Cap';
      } else if (rawType === 'Hyper Growth' || rawType === 'Growth' || rawType === 'Winner') {
        targetKey = 'Hyper Growth';
      } else if (rawType === 'Dividend Growth' || rawType === 'High Yield' || rawType === 'Dividend') {
        targetKey = 'Dividend Growth';
      } else {
        targetKey = 'Core Compounder';
      }

      if (map[targetKey]) {
        map[targetKey].totalValue += h.currentValue;
        map[targetKey].holdings.push(h);
      }
    });

    // Calculate percentage
    if (totalPortfolioValue > 0) {
      Object.keys(map).forEach(k => {
        map[k].percent = (map[k].totalValue / totalPortfolioValue) * 100;
      });
    }

    return map;
  }, [holdings, totalPortfolioValue]);

  const currSymbol = currency === 'THB' ? '฿' : '$';

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg lg:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Company Lifecycle Progression Matrix
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#823AFD]/20 to-[#FC2D79]/20 text-white border border-[#823AFD]/40">
                Custom Lifecycle Model
              </span>
            </h3>
            <p className="text-xs text-[#9898C8] mt-0.5">
              Evolution roadmap: Small Cap ➔ Hyper Growth ➔ Core Compounder ➔ Dividend Harvest
            </p>
          </div>
        </div>
      </div>

      {/* Stacked Lifecycle Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[#CBD5E1] font-semibold mb-2">
          <span>Lifecycle Asset Distribution</span>
          <span className="font-mono text-purple-400 font-bold">100% Allocated</span>
        </div>
        
        <div className="w-full h-4 bg-[#1A1D2D] rounded-full overflow-hidden flex shadow-inner border border-[#2A2E45]/80 p-0.5">
          {STAGES.map(stage => {
            const pct = stageData[stage.id]?.percent || 0;
            if (pct <= 0) return null;
            return (
              <div
                key={stage.id}
                style={{ width: `${pct}%`, backgroundColor: stage.color }}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 hover:opacity-90 relative group"
                title={`${stage.badgeName}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
          {STAGES.map(stage => {
            const pct = stageData[stage.id]?.percent || 0;
            return (
              <div key={stage.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: stage.color }} />
                <span className="text-white font-medium">{stage.badgeName}</span>
                <span className="font-mono text-[#9898C8] font-bold">({pct.toFixed(1)}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 Stage Cards Grid */}
      <div className={clsx(
        "grid gap-4",
        isCompact 
          ? "grid-cols-1 sm:grid-cols-2" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      )}>
        {STAGES.map(stage => {
          const data = stageData[stage.id] || { totalValue: 0, holdings: [], percent: 0 };
          const Icon = stage.icon;
          const displayVal = currency === 'THB' ? data.totalValue * exchangeRate : data.totalValue;

          return (
            <div 
              key={stage.id} 
              className={clsx(
                "rounded-2xl border p-4 flex flex-col justify-between transition-all hover:translate-y-[-2px] shadow-sm",
                stage.bgLight,
                stage.borderColor
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-white" style={{ color: stage.color }} />
                    <span className="font-bold text-xs text-white uppercase tracking-wider">
                      {stage.name}
                    </span>
                  </div>
                  <span 
                    style={{ backgroundColor: stage.color }} 
                    className={clsx("text-[10px] font-black px-2 py-0.5 rounded-full", stage.textColor)}
                  >
                    {data.percent.toFixed(1)}%
                  </span>
                </div>

                <p className="text-[11px] text-[#9898C8] leading-snug mb-3">
                  {stage.description}
                </p>
              </div>

              <div>
                <div className="bg-[#0F111A]/80 rounded-xl p-3 border border-[#2A2E45] mb-2">
                  <span className="text-[10px] text-[#9898C8] block mb-0.5">Asset Value</span>
                  <div className="font-mono font-bold text-sm text-white">
                    {currSymbol}{displayVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-[#9898C8]">
                    Target: {stage.targetPercent}
                  </span>
                </div>

                {/* Stock Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                  {data.holdings.length > 0 ? (
                    data.holdings.map(h => (
                      <span 
                        key={h.symbol}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1A1D2D] border border-[#2A2E45] text-white flex items-center gap-1"
                        title={`${h.symbol}: ${(h.weightPercent || 0).toFixed(1)}% of portfolio`}
                      >
                        {h.symbol}
                        <span className="text-[#9898C8] font-normal font-mono">
                          {(h.weightPercent || 0).toFixed(0)}%
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#9898C8] italic">No assets allocated</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
