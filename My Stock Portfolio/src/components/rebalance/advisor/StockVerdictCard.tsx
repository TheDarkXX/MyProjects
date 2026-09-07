import React, { useState } from 'react';
import { ConsensusBar } from './ConsensusBar';
import { TargetPriceRangeBar } from './TargetPriceRangeBar';

export interface CatalystItem {
  title: string;
  impact: string;
  timeframe?: string;
}

export interface RiskItem {
  title: string;
  impact: string;
}

export interface ConsensusMomentumData {
  direction: 'UPWARD' | 'DOWNWARD' | 'STABLE' | 'INSUFFICIENT_DATA';
  currentMean?: number | null;
  priorMean?: number | null;
  changePct?: number;
  dataPoints?: number;
  currentDate?: string;
  priorDate?: string;
}

export interface StockVerdict {
  symbol: string;
  grade: string;
  flag: string;
  role?: string;
  convictionScore?: number;           // NEW: 1-10
  coreThesis?: string;                // NEW: replaces futureOutlook
  futureOutlook?: string;             // LEGACY: backward compat
  catalysts?: (string | CatalystItem)[];  // DUAL: old string[] or new object[]
  risks?: (string | RiskItem)[];          // DUAL: old string[] or new object[]
  thesisBreaker?: string;             // NEW
  valuationVerdict?: string;          // NEW
  aiTargetPrice?: number | string;
  aiTimeframe?: string;
}

export interface StockVerdictCardProps {
  verdict: StockVerdict;
  fundamentals?: {
    current_price?: number;
    target_mean_price?: number;
    target_high_price?: number;
    target_low_price?: number;
    recommendation_key?: string;
    num_analyst_opinions?: number;
    eps_growth_next_year?: number;
    earnings_beat_streak?: number;
    rec_strong_buy?: number;
    rec_buy?: number;
    rec_hold?: number;
    rec_sell?: number;
    beta?: number;
    pe_trailing?: number;
    pe_forward?: number;
    sector?: string;
  };
  actualHolding?: {
    actualPercent: number;
    pnlPercent?: number;
    marketValue?: number;
    avgCost?: number;
    quantity?: number;
    isOrphan?: boolean;
  } | null;
  consensusMomentum?: ConsensusMomentumData | null;
}

export const StockVerdictCard: React.FC<StockVerdictCardProps> = ({
  verdict,
  fundamentals,
  actualHolding,
  consensusMomentum
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getGradeStyle = (grade: string) => {
    if (!grade) return 'text-sky-400 border-sky-400/40 bg-sky-500/10';
    if (grade.startsWith('A')) return 'text-emerald-400 border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.3)]';
    if (grade.startsWith('B')) return 'text-sky-400 border-sky-400/40 bg-sky-500/10 shadow-[0_0_12px_rgba(56,189,248,0.25)]';
    if (grade.startsWith('C')) return 'text-amber-400 border-amber-400/40 bg-amber-500/10 shadow-[0_0_12px_rgba(251,191,36,0.25)]';
    return 'text-rose-400 border-rose-400/40 bg-rose-500/10 shadow-[0_0_12px_rgba(244,63,94,0.3)]';
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'ADD':
        return 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
      case 'REDUCE':
        return 'bg-amber-500/25 text-amber-300 border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
      case 'HOLD':
        return 'bg-slate-700/60 text-slate-200 border-slate-600';
      case 'TRIM':
        return 'bg-orange-500/25 text-orange-300 border-orange-400/60';
      case 'EXIT':
      case 'CUT':
      case 'REMOVE':
        return 'bg-rose-500/25 text-rose-300 border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const currentPrice = fundamentals?.current_price || 0;
  const targetPrice = fundamentals?.target_mean_price || 0;
  const upsidePercent = (currentPrice > 0 && targetPrice > 0)
    ? ((targetPrice - currentPrice) / currentPrice) * 100
    : null;

  const beatStreak = fundamentals?.earnings_beat_streak || 0;
  const epsGrowth = typeof fundamentals?.eps_growth_next_year === 'number'
    ? fundamentals.eps_growth_next_year * 100
    : null;

  const sym = (verdict.symbol || '').toUpperCase();
  const isKnownETF = ['VOO', 'SPY', 'QQQ', 'SCHD', 'SCHG', 'DIA', 'IWM', 'VTI', 'VXUS', 'BND', 'IVV', 'JEPI', 'JEPQ', 'SMH', 'XLK', 'XLF', 'SOXX'].includes(sym);
  const isETF = isKnownETF || fundamentals?.sector === 'ETF' || (currentPrice > 0 && targetPrice === 0 && (fundamentals?.num_analyst_opinions || 0) === 0 && epsGrowth === null);

  // Runtime Type Guard for Thesis
  const thesisText = (typeof verdict.coreThesis === 'string' && verdict.coreThesis.trim().length > 0)
    ? verdict.coreThesis
    : (typeof verdict.futureOutlook === 'string' && verdict.futureOutlook.trim().length > 0)
    ? verdict.futureOutlook
    : 'ไม่มีข้อมูลภาพรวมในอนาคต';
  const shouldTruncate = thesisText.length > 280;

  // Runtime Type Guard for Catalysts
  const catalystItems: CatalystItem[] = Array.isArray(verdict.catalysts)
    ? verdict.catalysts.map(c => {
        if (typeof c === 'string') {
          return { title: c, impact: '', timeframe: '' };
        }
        return {
          title: c?.title || '',
          impact: c?.impact || '',
          timeframe: c?.timeframe || ''
        };
      }).filter(c => c.title && c.title.trim().length > 0)
    : typeof verdict.catalysts === 'string' && (verdict.catalysts as string).trim().length > 0
    ? [{ title: (verdict.catalysts as string).trim(), impact: '', timeframe: '' }]
    : [];

  // Runtime Type Guard for Risks
  const riskItems: RiskItem[] = Array.isArray(verdict.risks)
    ? verdict.risks.map(r => {
        if (typeof r === 'string') {
          return { title: r, impact: '' };
        }
        return {
          title: r?.title || '',
          impact: r?.impact || ''
        };
      }).filter(r => r.title && r.title.trim().length > 0)
    : typeof verdict.risks === 'string' && (verdict.risks as string).trim().length > 0
    ? [{ title: (verdict.risks as string).trim(), impact: '' }]
    : [];

  // Format Consensus Momentum Badge
  const renderMomentumBadge = () => {
    if (!consensusMomentum) return null;

    if (consensusMomentum.direction === 'UPWARD') {
      return (
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(52,211,153,0.2)]">
          <span>📈</span> สถาบันปรับเป้าขึ้น {consensusMomentum.changePct ? `(+${consensusMomentum.changePct}%)` : ''}
        </span>
      );
    }
    if (consensusMomentum.direction === 'DOWNWARD') {
      return (
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
          <span>📉</span> สถาบันปรับเป้าลง {consensusMomentum.changePct ? `(${consensusMomentum.changePct}%)` : ''}
        </span>
      );
    }
    if (consensusMomentum.direction === 'STABLE') {
      return (
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-bold flex items-center gap-1">
          <span>⚖️</span> เป้าสถาบันทรงตัว
        </span>
      );
    }
    return (
      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 font-medium flex items-center gap-1">
        <span>📊</span> กำลังสะสมข้อมูล (รอ 7+ วัน)
      </span>
    );
  };

  return (
    <div className="bg-[#12141F] border border-[#232738] hover:border-purple-500/40 rounded-xl p-4 md:p-5 transition-all duration-300 flex flex-col justify-between shadow-md group">
      <div className="space-y-3.5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-white tracking-wide">{verdict.symbol}</span>
              {isETF ? (
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/50 font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                  <span>🏛️</span> Index ETF
                </span>
              ) : fundamentals?.sector ? (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {fundamentals.sector}
                </span>
              ) : null}
              {actualHolding ? (
                <span className={`text-xs px-2.5 py-0.5 rounded font-bold flex items-center gap-1 border ${
                  actualHolding.isOrphan
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.25)]'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                }`}>
                  <span>{actualHolding.isOrphan ? '⚠️ นอกแผน' : '💼 ถืออยู่จริง'}</span>
                  <span>{actualHolding.actualPercent}%</span>
                  {typeof actualHolding.pnlPercent === 'number' && (
                    <span className={actualHolding.pnlPercent >= 0 ? 'text-emerald-300 font-black' : 'text-rose-300 font-black'}>
                      ({actualHolding.pnlPercent >= 0 ? `+${actualHolding.pnlPercent}%` : `${actualHolding.pnlPercent}%`})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 font-medium">
                  🎯 ยังไม่มีของ
                </span>
              )}
            </div>
            {verdict.role && (
              <p className="text-[13px] text-slate-300 mt-1 font-medium">
                {verdict.role}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Conviction Score Pill */}
            {typeof verdict.convictionScore === 'number' && (
              <div
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 text-xs font-black ${
                  verdict.convictionScore >= 8
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.25)]'
                    : verdict.convictionScore >= 5
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
                title={`คะแนนความเชื่อมั่นรวม 4 เสาหลัก: ${verdict.convictionScore}/10`}
              >
                <span>🎯</span>
                <span>{verdict.convictionScore}/10</span>
              </div>
            )}
            {/* Action Flag */}
            <span className={`px-2.5 py-1 rounded text-xs font-black border ${getFlagStyle(verdict.flag)}`}>
              {verdict.flag}
            </span>
            {/* Grade */}
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${getGradeStyle(verdict.grade)}`}>
              {verdict.grade || '-'}
            </span>
          </div>
        </div>

        {/* Forward-Looking Key Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2.5 px-3 bg-[#181B2A] rounded-lg border border-[#2A2E45]/80">
          {/* Current & Target Price */}
          <div>
            <div className="text-xs text-slate-400 font-medium">ปัจจุบัน ➔ เป้าหมาย</div>
            <div className="text-[13px] font-bold text-white mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : 'N/A'}</span>
              {isETF && targetPrice === 0 ? (
                <span className="text-sky-400 text-xs font-semibold">(Passive ETF)</span>
              ) : (
                <>
                  <span className="text-slate-400 text-xs font-normal">➔</span>
                  <span className="text-purple-300 font-extrabold">{targetPrice > 0 ? `$${targetPrice.toFixed(2)}` : 'N/A'}</span>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 font-medium">Upside Potential</div>
            <div className="mt-0.5">
              {upsidePercent !== null ? (
                <span className={`inline-flex items-center text-[13px] font-black px-1.5 py-0.5 rounded ${
                  upsidePercent > 0
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                    : 'text-rose-300 bg-rose-500/20 border border-rose-500/40'
                }`}>
                  {upsidePercent > 0 ? `+${upsidePercent.toFixed(1)}%` : `${upsidePercent.toFixed(1)}%`}
                </span>
              ) : isETF ? (
                <span className="text-xs text-sky-300/90 font-medium">อิงดัชนีตลาด</span>
              ) : (
                <span className="text-[13px] text-slate-400 font-semibold">-</span>
              )}
            </div>
          </div>

          {/* EPS Growth or Beat Streak */}
          <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
            {beatStreak > 0 ? (
              <div>
                <div className="text-xs text-slate-400 font-medium">Earnings Track</div>
                <div className="text-[13px] font-bold text-amber-300 flex items-center gap-1 mt-0.5">
                  <span>🏆</span> ชนะ {beatStreak}Q ติด
                </div>
              </div>
            ) : epsGrowth !== null && Math.abs(epsGrowth) > 0 ? (
              <div>
                <div className="text-xs text-slate-400 font-medium">EPS โตปีหน้า</div>
                <div className={`text-[13px] font-bold mt-0.5 ${epsGrowth > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {epsGrowth > 0 ? `↑ ${epsGrowth.toFixed(1)}%` : `↓ ${epsGrowth.toFixed(1)}%`}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-slate-400 font-medium">Beta</div>
                <div className="text-[13px] font-bold text-slate-200 mt-0.5">
                  {fundamentals?.beta ? fundamentals.beta.toFixed(2) : '1.00'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Target Price Range Bar (Low - Mean - High - Current - AI) */}
        {fundamentals && fundamentals.target_low_price && fundamentals.target_high_price && fundamentals.target_high_price > fundamentals.target_low_price ? (
          <TargetPriceRangeBar
            currentPrice={currentPrice}
            targetLow={fundamentals.target_low_price}
            targetMean={fundamentals.target_mean_price}
            targetHigh={fundamentals.target_high_price}
            aiTargetPrice={verdict.aiTargetPrice}
            aiTimeframe={verdict.aiTimeframe}
          />
        ) : null}

        {/* Analyst Consensus Bar */}
        {fundamentals && (
          <div className="px-1">
            <ConsensusBar
              strongBuy={fundamentals.rec_strong_buy}
              buy={fundamentals.rec_buy}
              hold={fundamentals.rec_hold}
              sell={fundamentals.rec_sell}
              recommendationKey={fundamentals.recommendation_key}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* 4 PILLARS OF CONVICTION BLOCKS                            */}
        {/* ========================================================= */}

        {/* Pillar 1: Core Thesis & Economic Moat */}
        <div className="bg-indigo-950/25 border border-indigo-900/40 rounded-lg p-3 space-y-1.5">
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️</span> 1. Core Thesis & Economic Moat
          </div>
          <p className="text-[13px] text-slate-200 leading-relaxed font-normal">
            {shouldTruncate && !isExpanded ? `${thesisText.slice(0, 280)}...` : thesisText}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
            >
              {isExpanded ? 'ย่อข้อความ ▲' : 'อ่านต่อทั้งหมด ▼'}
            </button>
          )}
        </div>

        {/* Pillar 2: Active Catalysts & Key Risks */}
        {(catalystItems.length > 0 || riskItems.length > 0) && (
          <div className="space-y-2">
            {catalystItems.length > 0 && (
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3 space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>🚀</span> 2. Active Catalysts (ปัจจัยเร่งการเติบโต)
                </div>
                <div className="space-y-1.5">
                  {catalystItems.map((cat, idx) => (
                    <div key={idx} className="bg-[#161928] border border-emerald-900/30 rounded-md p-2 text-[13px]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-white font-semibold">{cat.title}</span>
                        {cat.timeframe && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {cat.timeframe}
                          </span>
                        )}
                      </div>
                      {cat.impact && (
                        <div className="text-[13px] text-emerald-300/90 mt-1 font-medium">
                          ⚡ {cat.impact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {riskItems.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 space-y-2">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>⚠️</span> Key Risks (ความเสี่ยงเฉพาะตัว)
                </div>
                <div className="space-y-1.5">
                  {riskItems.map((risk, idx) => (
                    <div key={idx} className="bg-[#161928] border border-amber-900/30 rounded-md p-2 text-[13px]">
                      <div className="text-slate-200 font-semibold">{risk.title}</div>
                      {risk.impact && (
                        <div className="text-[13px] text-amber-300/90 mt-0.5 font-medium">
                          ⚠️ {risk.impact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pillar 3: Thesis Breaker (จุดตายที่ต้องสั่งขายทิ้ง) */}
        {verdict.thesisBreaker && (
          <div className="bg-rose-950/30 border border-rose-900/60 rounded-lg p-3 space-y-1.5 shadow-[0_0_12px_rgba(244,63,94,0.1)]">
            <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span>💥</span> 3. Thesis Breaker (จุดตัดขาดทุนเชิงพื้นฐาน)
            </div>
            <p className="text-[13px] text-rose-200 leading-relaxed font-normal">
              {verdict.thesisBreaker}
            </p>
          </div>
        )}

        {/* Pillar 4: Valuation Verdict & Consensus Momentum */}
        {(verdict.valuationVerdict || consensusMomentum) && (
          <div className="bg-purple-950/25 border border-purple-900/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <span>⚖️</span> 4. Valuation Verdict
              </div>
              {renderMomentumBadge()}
            </div>
            {verdict.valuationVerdict && (
              <p className="text-[13px] text-slate-200 leading-relaxed font-normal">
                {verdict.valuationVerdict}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
