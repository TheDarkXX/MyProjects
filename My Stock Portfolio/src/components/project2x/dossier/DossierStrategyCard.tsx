import React from 'react';
import { ShieldCheck, AlertTriangle, Calendar, Sparkles } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierStrategyCardProps {
  data: DossierPayload;
}

function formatMarketCap(cap?: number): string {
  if (!cap || cap <= 0) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

export const DossierStrategyCard: React.FC<DossierStrategyCardProps> = ({ data }) => {
  const currentPrice = data.currentPrice || 0;
  const verdict = data.verdict || 'HOLD_RIDE';

  // Earnings Date
  const earningsDate = data.financialMetrics?.earningsDate || (data.quarterlyFinancials?.[0]?.report_date) || null;
  const formattedEarnings = earningsDate ? new Date(earningsDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : null;

  // Analyst Consensus
  const analystTarget = data.analystConsensus?.targetMean;
  const analystRec = data.analystConsensus?.recommendationKey || 'Buy';
  const analystUpside = analystTarget && currentPrice > 0 
    ? ((analystTarget - currentPrice) / currentPrice) * 100 
    : null;

  const verdictConfig = {
    BUY_ADD: {
      badgeClass: 'bg-gradient-to-r from-violet-900/60 to-purple-900/60 border-violet-500/50 shadow-[0_0_14px_rgba(130,58,253,0.3)]',
      textClass: 'text-violet-200',
      title: 'BUY ADD ZONE',
      subtitle: 'ทยอยสะสมตามโควตา',
      icon: <ShieldCheck className="w-4 h-4 text-violet-300 shrink-0" />
    },
    HOLD_RIDE: {
      badgeClass: 'bg-gradient-to-r from-slate-900/90 to-indigo-950/60 border-slate-600/50 shadow-[0_0_14px_rgba(148,163,184,0.15)]',
      textClass: 'text-slate-200',
      title: 'HOLD & RIDE',
      subtitle: 'ถือทับมือตามระบบ',
      icon: <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
    },
    TRIM_SELL: {
      badgeClass: 'bg-gradient-to-r from-pink-950/80 to-rose-950/80 border-[#FC2D79]/60 shadow-[0_0_16px_rgba(252,45,121,0.3)]',
      textClass: 'text-pink-200',
      title: 'TRIM / SELL ALERT',
      subtitle: 'พักกำไรลดความเสี่ยง',
      icon: <AlertTriangle className="w-4 h-4 text-[#FC2D79] shrink-0" />
    }
  }[verdict] || {
    badgeClass: 'bg-slate-900 border-white/10',
    textClass: 'text-slate-200',
    title: 'HOLD & RIDE',
    subtitle: 'ถือตามระบบ',
    icon: <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
  };

  return (
    <div className="bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex flex-col justify-between gap-3 h-full transition-all">
      {/* Top: Action Verdict Badge & Earnings Catalyst */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${verdictConfig.badgeClass} flex-1 min-w-0`}>
          {verdictConfig.icon}
          <div className="flex flex-col min-w-0">
            <span className={`text-[13px] font-black tracking-wider uppercase font-mono truncate ${verdictConfig.textClass}`}>
              {verdictConfig.title}
            </span>
            <span className="text-[11px] font-medium text-slate-300 truncate">
              {verdictConfig.subtitle}
            </span>
          </div>
        </div>

        {/* Earnings Date Badge */}
        {formattedEarnings && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0A0E1A] border border-white/10 text-[12px] font-mono text-slate-300 shrink-0" title="วันรายงานผลประกอบการงวดถัดไป">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>งบ: {formattedEarnings}</span>
          </div>
        )}
      </div>

      {/* Bottom: Wall Street Consensus Target & Market Cap */}
      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-normal">เป้า Wall St:</span>
          <span className="text-emerald-300 font-bold font-mono text-[14px]">
            {analystTarget && analystTarget > 0 ? `$${analystTarget.toFixed(0)}` : '-'}
          </span>
          <span className="text-[11px] font-bold text-emerald-400/90 font-mono">
            ({analystRec.toUpperCase()})
          </span>
          {analystUpside !== null && (
            <span className="text-[12px] font-mono font-medium text-emerald-400">
              ({analystUpside > 0 ? '+' : ''}{analystUpside.toFixed(0)}%)
            </span>
          )}
        </div>

        {data.marketCap && data.marketCap > 0 && (
          <div className="flex items-center gap-1 text-[12px] font-mono text-slate-300 shrink-0">
            <span className="text-slate-400">Cap:</span>
            <span className="font-bold text-white">{formatMarketCap(data.marketCap)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DossierStrategyCard;
