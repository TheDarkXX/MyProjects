import React, { useMemo } from 'react';
import { Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { Activity, ShieldCheck, Zap, Coins, ChevronRight, Sparkles, CheckCircle } from 'lucide-react';
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
  tagline: string;
  targetPercent: string;
  icon: any;
}

const STAGES: StageInfo[] = [
  {
    id: 'Small Cap',
    name: 'Phase 1: Incubation (บ่มเพาะ)',
    badgeName: 'Small Cap',
    color: '#facc15',
    textColor: 'text-black',
    borderColor: 'border-yellow-500/40',
    bgLight: 'bg-yellow-500/10',
    tagline: 'ความเสี่ยงสูง โอกาสเติบโต 10x เทคโนโลยีเกิดใหม่',
    targetPercent: '5 - 15%',
    icon: Zap,
  },
  {
    id: 'Hyper Growth',
    name: 'Phase 2: Acceleration (เร่งเครื่อง)',
    badgeName: 'Hyper Growth',
    color: '#ef4444',
    textColor: 'text-white',
    borderColor: 'border-red-500/40',
    bgLight: 'bg-red-500/10',
    tagline: 'ผู้นำเมกะเทรนด์ กวาด Market Share เติบโตก้าวกระโดด',
    targetPercent: '20 - 35%',
    icon: Activity,
  },
  {
    id: 'Core Compounder',
    name: 'Phase 3: Deep Moat (ป้อมปราการ)',
    badgeName: 'Core Compounder',
    color: '#10b981',
    textColor: 'text-white',
    borderColor: 'border-emerald-500/40',
    bgLight: 'bg-emerald-500/10',
    tagline: 'กระแสเงินสดแข็งแกร่ง กำแพงคูเมืองหนา ทนทานทุกมรสุม',
    targetPercent: '35 - 55%',
    icon: ShieldCheck,
  },
  {
    id: 'Dividend Growth',
    name: 'Phase 4: Cash Harvest (เก็บเกี่ยว)',
    badgeName: 'Dividend Growth',
    color: '#854d0e',
    textColor: 'text-white',
    borderColor: 'border-amber-700/40',
    bgLight: 'bg-amber-900/10',
    tagline: 'จ่ายเงินปันผลสม่ำเสมอ คืนทุนผู้ถือหุ้น ผลิตกระแสเงินสด',
    targetPercent: '10 - 25%',
    icon: Coins,
  },
];

export const LifecycleMatrixCard: React.FC<LifecycleMatrixCardProps> = ({ holdings, exchangeRate, isCompact }) => {
  const { currency } = useUiStore();

  const totalPortfolioValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.currentValue || h.totalCost || 0), 0);
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
      const rawType = (h.stockType || (h as any).stock_type || '').toLowerCase().trim();
      
      let targetKey = 'Core Compounder';
      if (rawType.includes('small') || rawType.includes('speculative') || rawType.includes('bet')) {
        targetKey = 'Small Cap';
      } else if (rawType.includes('growth') || rawType.includes('winner') || rawType.includes('hyper') || rawType.includes('mid-tier')) {
        targetKey = 'Hyper Growth';
      } else if (rawType.includes('dividend') || rawType.includes('yield') || rawType.includes('income') || rawType.includes('defensive')) {
        targetKey = 'Dividend Growth';
      } else {
        targetKey = 'Core Compounder';
      }

      const val = h.currentValue > 0 ? h.currentValue : (h.totalCost || 0);
      if (map[targetKey]) {
        map[targetKey].totalValue += val;
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

  // Strategic Portfolio Diagnosis
  const diagnosis = useMemo(() => {
    const core = stageData['Core Compounder']?.percent || 0;
    const hyper = stageData['Hyper Growth']?.percent || 0;
    const small = stageData['Small Cap']?.percent || 0;
    const div = stageData['Dividend Growth']?.percent || 0;

    if (core >= 50) {
      return {
        tag: 'Fortress Compounder 🏰',
        summary: `เน้นความปลอดภัยสูง ทัพหลักเป็น Core Compounder (${core.toFixed(0)}%) พร้อมทนทานทุกมรสุมตลาด`,
        color: 'text-emerald-400',
      };
    } else if (hyper + small >= 50) {
      return {
        tag: 'Aggressive Alpha 🚀',
        summary: `เน้นบุกทำกำไรสูง มี Hyper Growth & Small Cap รวมกันถึง ${(hyper + small).toFixed(0)}% ผลักดันผลตอบแทน`,
        color: 'text-rose-400',
      };
    } else if (div >= 30) {
      return {
        tag: 'Cash Flow Machine 💵',
        summary: `เน้นผลตอบแทนเงินสดสม่ำเสมอ พอร์ตมี Dividend Growth (${div.toFixed(0)}%) ผลิตกระแสเงินสดต่อเนื่อง`,
        color: 'text-amber-400',
      };
    } else {
      return {
        tag: 'Well-Balanced Portfolio ⚖️',
        summary: `กระจายทัพได้สมดุล มีทั้งฐานรากที่มั่นคงและหัวหอกเร่งการเติบโต`,
        color: 'text-blue-400',
      };
    }
  }, [stageData]);

  const currSymbol = currency === 'THB' ? '฿' : '$';

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all min-w-0 flex flex-col justify-between">
      {/* 1. Header & Diagnosis */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Company Lifecycle Progression
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Lifecycle Matrix
                </span>
              </h3>
              <p className="text-xs text-[#9898C8] mt-0.5">
                การกระจายตัวตามวงจรชีวิตธุรกิจ: Small Cap ➔ Hyper Growth ➔ Core Compounder ➔ Dividend Harvest
              </p>
            </div>
          </div>

          {/* Diagnosis Pill */}
          <div className="bg-[#1A1D2D] border border-[#2A2E45] px-3 py-1.5 rounded-2xl flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className={clsx("text-xs font-bold", diagnosis.color)}>
              {diagnosis.tag}
            </span>
          </div>
        </div>

        {/* Diagnosis Bar */}
        <div className="bg-[#1A1D2D]/60 border border-[#2A2E45] rounded-2xl p-3 mb-5 flex items-center gap-2.5 text-xs">
          <span className="text-purple-400 font-bold shrink-0">💡 สรุปการจัดทัพ:</span>
          <span className="text-[#CBD5E1] font-medium">{diagnosis.summary}</span>
        </div>

        {/* 2. Visual Roadmap Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-[#CBD5E1] font-semibold mb-2">
            <span>สัดส่วนการกระจายทัพทั้งพอร์ต (Allocation)</span>
            <span className="tabular-nums font-prompt text-purple-400 font-bold">100% Allocated</span>
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
                  <span className="tabular-nums font-prompt text-[#CBD5E1] font-bold">({pct.toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. 4 Stage Cards Grid */}
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
                      {stage.badgeName}
                    </span>
                  </div>
                  <span 
                    style={{ backgroundColor: stage.color }} 
                    className={clsx("text-[10px] font-black px-2 py-0.5 rounded-full", stage.textColor)}
                  >
                    {data.percent.toFixed(1)}%
                  </span>
                </div>

                <p className="text-[11px] text-[#9898C8] leading-snug mb-3 line-clamp-2">
                  {stage.tagline}
                </p>
              </div>

              <div>
                <div className="bg-[#0F111A]/80 rounded-xl p-3 border border-[#2A2E45] mb-2">
                  <div className="flex items-center justify-between text-xs text-[#CBD5E1] mb-0.5">
                    <span>มูลค่าจัดสรร</span>
                    <span>เป้าหมาย {stage.targetPercent}</span>
                  </div>
                  <div className="tabular-nums font-prompt font-bold text-base text-white">
                    {currSymbol}{displayVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-xs text-[#CBD5E1] font-medium">
                    {data.holdings.length} หุ้นในกลุ่มนี้
                  </span>
                </div>

                {/* Stock Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                  {data.holdings.length > 0 ? (
                    data.holdings.map(h => (
                      <span 
                        key={h.symbol}
                        className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#1A1D2D] border border-[#2A2E45] text-white flex items-center gap-1 hover:border-[#823AFD] transition-all"
                        title={`${h.symbol}: ${(h.weightPercent || 0).toFixed(1)}% of portfolio`}
                      >
                        {h.symbol}
                        <span className="text-emerald-400 font-normal tabular-nums font-prompt">
                          {(h.weightPercent || 0).toFixed(0)}%
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#64748B] italic py-1">
                      ยังไม่มีการจัดสรรหุ้น
                    </span>
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
