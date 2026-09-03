import React, { useMemo } from 'react';
import { Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { Target, Crosshair, Award, AlertTriangle, Shield, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import clsx from 'clsx';

interface ConvictionGaugeCardProps {
  holdings: Holding[];
  exchangeRate: number;
  isCompact?: boolean;
}

export const ConvictionGaugeCard: React.FC<ConvictionGaugeCardProps> = ({ holdings, exchangeRate, isCompact }) => {
  const { currency } = useUiStore();

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.currentValue || h.totalCost || 0), 0);
  }, [holdings]);

  // Sort holdings by value descending
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const valA = a.currentValue || a.totalCost || 0;
      const valB = b.currentValue || b.totalCost || 0;
      return valB - valA;
    });
  }, [holdings]);

  // Concentration metrics
  const concentration = useMemo(() => {
    if (totalValue <= 0 || sortedHoldings.length === 0) {
      return { top1: 0, top3: 0, top5: 0, top1Symbol: '-', top3Symbols: [], top5Symbols: [] };
    }

    const top1Val = sortedHoldings[0]?.currentValue || sortedHoldings[0]?.totalCost || 0;
    const top3Val = sortedHoldings.slice(0, 3).reduce((sum, h) => sum + (h.currentValue || h.totalCost || 0), 0);
    const top5Val = sortedHoldings.slice(0, 5).reduce((sum, h) => sum + (h.currentValue || h.totalCost || 0), 0);

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
    if (top3 >= 50 || top1 >= 25) {
      return {
        label: '🎯 High Conviction Sniper',
        subtitle: 'เน้นบุกทำ Alpha สูงสุด',
        color: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        badgeBg: 'bg-amber-500/10',
        icon: Crosshair,
        tagline: 'โฟกัสทุ่มน้ำหนักในผู้ชนะตัวจริง (Winners) เปิดโอกาสเอาชนะดัชนีตลาดอย่างมีนัยสำคัญ',
        advice: 'ความหนาแน่นอยู่ใน Sweet Spot ของ Solo Investor ชั้นยอด ให้คอยมอนิเตอร์ผลประกอบการตัวท็อปอย่างใกล้ชิด',
      };
    } else if (top3 >= 35) {
      return {
        label: '⚖️ Balanced Compounder',
        subtitle: 'สมดุลการเติบโตและการป้องกัน',
        color: 'text-blue-400',
        borderColor: 'border-blue-500/40',
        badgeBg: 'bg-blue-500/10',
        icon: Shield,
        tagline: 'กระจายตัวพอเหมาะระหว่างหุ้นหลักและหุ้นเสริม โอกาสสร้างผลตอบแทนสม่ำเสมอ',
        advice: 'พอร์ตมีความเสถียร ไม่เหวี่ยงแรง เหมาะสำหรับการสะสมความมั่งคั่งระยะยาวอย่างสบายใจ',
      };
    } else {
      return {
        label: '🏛️ Broad Fortress Indexer',
        subtitle: 'เน้นป้องกันความเสี่ยงสูงสุด',
        color: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        badgeBg: 'bg-emerald-500/10',
        icon: CheckCircle2,
        tagline: 'กระจายหุ้นหลากหลาย ความเสี่ยงรายตัวต่ำ ผันผวนน้อยใกล้เคียงดัชนี',
        advice: 'ระวังการกระจายตัวมากเกินไป (Over-diversification) จนผลตอบแทนถูกเจือจางเหมือนกองทุนรวม',
      };
    }
  }, [concentration]);

  const PostureIcon = posture.icon;

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all min-w-0 flex flex-col justify-between">
      {/* 1. Header & Posture Pill */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Conviction & Concentration
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Shay Boloor
                </span>
              </h3>
              <p className="text-xs text-[#9898C8] mt-0.5">
                วินัยการโฟกัส: ชั่งน้ำหนักผู้ชนะเพื่อสร้างผลตอบแทนเหนือตลาด (Alpha)
              </p>
            </div>
          </div>

          {/* Posture Pill */}
          <div className={clsx(
            "px-3.5 py-1.5 rounded-2xl border flex items-center gap-2 shrink-0 self-start sm:self-auto",
            posture.badgeBg,
            posture.borderColor
          )}>
            <PostureIcon className={clsx("w-4 h-4", posture.color)} />
            <div>
              <span className={clsx("text-xs font-black block tracking-tight", posture.color)}>
                {posture.label}
              </span>
              <span className="text-[10px] text-[#CBD5E1]">
                {posture.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Actionable Advice Box */}
        <div className="bg-[#1A1D2D]/60 border border-[#2A2E45] rounded-2xl p-3 mb-5 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold">{posture.tagline}</p>
            <p className="text-[#9898C8] text-[11px] mt-0.5">{posture.advice}</p>
          </div>
        </div>

        {/* 2. 3 Concentration Gauges Grid */}
        <div className={clsx(
          "grid gap-4 mb-5",
          isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
        )}>
          {/* Top 1 */}
          <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#9898C8] font-semibold">หุ้นเบอร์ 1 ของพอร์ต</span>
                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {concentration.top1Symbol}
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {concentration.top1.toFixed(1)}%
                </span>
                <span className="text-[10px] text-[#CBD5E1] font-mono">
                  เกณฑ์ดี: 15 - 30%
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#0F111A] rounded-full overflow-hidden mb-2">
                <div 
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    concentration.top1 > 35 ? "bg-amber-400" : "bg-emerald-400"
                  )}
                  style={{ width: `${Math.min(100, concentration.top1)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className={clsx(
                "font-bold px-2 py-0.5 rounded-full text-[10px]",
                concentration.top1 > 35 ? "bg-amber-500/20 text-amber-300" : concentration.top1 >= 15 ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"
              )}>
                {concentration.top1 > 35 ? '⚠️ เสี่ยงสูง เกินเกณฑ์ 35%' : concentration.top1 >= 15 ? '✅ ผ่านเกณฑ์พอดี' : '🔵 น้ำหนักเบาไป'}
              </span>
              <span className="text-[#9898C8] text-[10px]">
                {concentration.top1 > 35 ? 'ระวังตัวนี้สะดุด' : 'น้ำหนักแข็งแกร่ง'}
              </span>
            </div>
          </div>

          {/* Top 3 */}
          <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#9898C8] font-semibold">สามทหารเสือ (Top 3)</span>
                <span className="text-xs font-mono font-bold text-[#FC2D79] truncate max-w-[130px]" title={concentration.top3Symbols.join(', ')}>
                  {concentration.top3Symbols.join(', ') || '-'}
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {concentration.top3.toFixed(1)}%
                </span>
                <span className="text-[10px] text-[#CBD5E1] font-mono">
                  เกณฑ์ดี: 45 - 65%
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#0F111A] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#823AFD] to-[#FC2D79] transition-all duration-500"
                  style={{ width: `${Math.min(100, concentration.top3)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className={clsx(
                "font-bold px-2 py-0.5 rounded-full text-[10px]",
                concentration.top3 >= 45 && concentration.top3 <= 65 ? "bg-emerald-500/20 text-emerald-300" : concentration.top3 > 65 ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
              )}>
                {concentration.top3 >= 45 && concentration.top3 <= 65 ? '🎯 โฟกัสเฉียบคม (Alpha Zone)' : concentration.top3 > 65 ? '⚠️ กระจุกตัวสูงมาก' : '🌧️ กระจายจนเฉื่อย'}
              </span>
              <span className="text-[#9898C8] text-[10px]">
                {concentration.top3 >= 45 ? 'พร้อมชนะดัชนี' : 'ยังเจือจาง'}
              </span>
            </div>
          </div>

          {/* Top 5 */}
          <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#9898C8] font-semibold">ทัพหลัก 5 อันดับแรก</span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {Math.min(5, sortedHoldings.length)} หุ้น
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {concentration.top5.toFixed(1)}%
                </span>
                <span className="text-[10px] text-[#CBD5E1] font-mono">
                  เกณฑ์ดี: 65 - 80%
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#0F111A] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, concentration.top5)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className={clsx(
                "font-bold px-2 py-0.5 rounded-full text-[10px]",
                concentration.top5 >= 65 && concentration.top5 <= 80 ? "bg-emerald-500/20 text-emerald-300" : concentration.top5 > 80 ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
              )}>
                {concentration.top5 >= 65 && concentration.top5 <= 80 ? '💪 ฐานรากแน่นหนา' : concentration.top5 > 80 ? 'พึ่งพา 5 ตัวหลักสูง' : 'กระจายตัวกว้าง'}
              </span>
              <span className="text-[#9898C8] text-[10px]">
                {concentration.top5 >= 65 ? 'Core แข็งแรง' : 'หุ้นย่อยเยอะ'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Benchmark Rulebook (วิธีวัดผลว่าดีหรือไม่ดี) */}
        <div className="bg-[#1A1D2D]/50 border border-[#2A2E45] rounded-2xl p-4 mb-5">
          <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            วิธีวัดผลว่าพอร์ตโฟกัส "ดี" หรือ "ไม่ดี" (Solo Investor Benchmarks)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-[#111418]/80 p-2.5 rounded-xl border border-[#2A2E45]/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">1. หุ้นผู้นำ (Top 1)</span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">15 - 30%</span>
              </div>
              <p className="text-[11px] text-[#9898C8] leading-tight">
                ต้องมีน้ำหนักพอขับเคลื่อนพอร์ต แต่ห้ามเกิน 35% เพื่อป้องกันพอร์ตพังหากหุ้นตัวนี้งบสะดุด (Single-Stock Risk)
              </p>
            </div>

            <div className="bg-[#111418]/80 p-2.5 rounded-xl border border-[#2A2E45]/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">2. สามทหารเสือ (Top 3)</span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">45 - 65%</span>
              </div>
              <p className="text-[11px] text-[#9898C8] leading-tight">
                หัวใจของการสร้าง Alpha ชนะ S&P 500 ตามสูตร Shay Boloor ถ้าต่ำกว่า 30% แปลว่ากระจายหุ้นเยอะจนเฉื่อย (Diworsification)
              </p>
            </div>

            <div className="bg-[#111418]/80 p-2.5 rounded-xl border border-[#2A2E45]/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white">3. ทัพหลัก 5 ตัว (Top 5)</span>
                <span className="text-emerald-400 font-mono font-bold text-[11px]">65 - 80%</span>
              </div>
              <p className="text-[11px] text-[#9898C8] leading-tight">
                เป็นแกนหลักคุมพอร์ต ส่วน 20-35% ที่เหลือค่อยแบ่งไปถือหุ้น Small Cap / Hyper Growth เพื่อเร่งความเร็ว
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Benchmark Outperformance Hurdle Link */}
      <div className="bg-gradient-to-r from-[#1A1D2D] to-[#141622] border border-[#2A2E45] rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              Benchmark Outperformance Hurdle (เกณฑ์วัดผลชนะตลาด)
            </span>
            <span className="text-[11px] text-[#9898C8]">
              เปรียบเทียบ Alpha กับ S&P 500 (SPY) และ Nasdaq 100 (QQQ) ได้ในแท็บ Performance
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-xl">
            {(concentration.top3 > 0 ? concentration.top3 : 50).toFixed(0)}% Conviction Level
          </span>
        </div>
      </div>
    </div>
  );
};
