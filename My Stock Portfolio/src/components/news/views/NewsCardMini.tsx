import React from 'react';
import { Flame, Sparkles, Clock, Check, EyeOff, ExternalLink, Zap, Globe } from 'lucide-react';
import clsx from 'clsx';
import { NewsItem } from '../types';

interface NewsCardMiniProps {
  items: NewsItem[];
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
  onToggleRead: (id: number, currentRead: number) => void;
  onOpenDetail?: (item: NewsItem) => void;
}

export const NewsCardMini: React.FC<NewsCardMiniProps> = ({
  items,
  selectedTicker,
  onSelectTicker,
  onToggleRead,
  onOpenDetail,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5 w-full">
      {items.map((item) => {
        const isMust = item.reading_priority === 'THE_MUST';
        const isHighImpact = item.reading_priority === 'HIGH_IMPACT' || item.reading_priority === 'CATALYST';
        const isMacro = item.reading_priority === 'MACRO' || item.portfolio_tag === 'macro' || item.ticker === 'MACRO' || item.ticker === 'MARKET';
        const isGoodToKnow = item.reading_priority === 'GOOD_TO_KNOW' || item.reading_priority === 'WATCHLIST';
        const isRead = item.is_read === 1;

        const summaryFirstBullet = item.summary_th
          ? item.summary_th.split('\n').filter(line => line.trim().length > 0)[0] || item.summary_th
          : '';

        return (
          <div
            key={item.id}
            onClick={() => onOpenDetail?.(item)}
            className={clsx(
              "rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between p-4 group cursor-pointer hover:border-[#823AFD]/50",
              isMust
                ? isRead
                  ? "bg-[#111418] border-rose-500/30 opacity-85 hover:opacity-100"
                  : "bg-[#16121D] border-rose-500 shadow-[0_4px_16px_rgba(244,63,94,0.16)]"
                : isHighImpact
                  ? isRead
                    ? "bg-[#111418] border-[#2A2E45] opacity-85 hover:opacity-100"
                    : "bg-[#111418] border-amber-500/30 hover:border-amber-500/50"
                  : isMacro
                    ? isRead
                      ? "bg-[#0D1017] border-sky-500/25 opacity-85 hover:opacity-100"
                      : "bg-[#0D1017] border-sky-500/50 shadow-[0_4px_16px_rgba(56,189,248,0.12)] hover:border-sky-400"
                    : isGoodToKnow
                      ? "bg-[#0D1017] border-blue-500/25 opacity-85 hover:opacity-100"
                      : "bg-[#0D1017] border-[#1F2233] opacity-80 hover:opacity-100"
            )}
          >
            {/* Top Accent Stripe */}
            {isMust && !isRead && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-[#FC2D79]" />
            )}

            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTicker(item.ticker);
                    }}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg text-xs font-mono font-normal border transition-all cursor-pointer",
                      selectedTicker === item.ticker
                        ? "bg-[#823AFD] text-white border-white/40 shadow-[0_0_8px_rgba(130,58,253,0.5)]"
                        : "bg-white/10 hover:bg-[#823AFD]/20 text-slate-300 hover:text-white border-white/15"
                    )}
                  >
                    #{item.ticker}
                  </button>

                  {/* 5-Tier Priority Badge */}
                  {isMust ? (
                    <span className="px-1.5 py-0.5 rounded text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-rose-400" /> MUST
                    </span>
                  ) : isHighImpact ? (
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber-400" /> HIGH IMPACT
                    </span>
                  ) : isMacro ? (
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-0.5">
                      <Globe className="w-3 h-3 text-sky-400" /> MACRO
                    </span>
                  ) : isGoodToKnow ? (
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      GOOD TO KNOW
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-xs font-normal bg-slate-800 text-slate-400 border border-slate-700">
                      CHATTER
                    </span>
                  )}

                  {item.relevance_score !== undefined && item.relevance_score > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 text-amber-400" /> {item.relevance_score}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRead(item.id, item.is_read);
                  }}
                  className={clsx(
                    "p-1.5 rounded-lg text-xs border transition-all cursor-pointer",
                    isRead
                      ? "bg-slate-800/60 text-slate-500 border-slate-700 hover:text-slate-300"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                  )}
                  title={isRead ? "ทำเครื่องหมายว่ายังไม่อ่าน" : "ทำเครื่องหมายว่าอ่านแล้ว"}
                >
                  {isRead ? <EyeOff className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                </button>
              </div>

              {/* Title */}
              <div>
                <h4 className="text-[14px] font-normal text-slate-300 leading-snug tracking-normal line-clamp-2 group-hover:text-white transition-colors">
                  {item.headline_th || item.headline}
                </h4>
                {item.headline_th && item.headline_th !== item.headline && (
                  <p className="text-[13px] text-slate-400 italic line-clamp-1 mt-1">
                    {item.headline}
                  </p>
                )}
              </div>

              {/* Summary Extract */}
              {summaryFirstBullet && (
                <p className="text-[13px] text-slate-300 leading-relaxed bg-[#0A0C12] border border-[#1F2233] p-2.5 rounded-xl line-clamp-3">
                  {summaryFirstBullet}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2.5 mt-3 border-t border-[#1F2233] flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[110px]" title={item.source_name}>
                {item.source_name}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(item.created_at).toLocaleString('th-TH', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[#A78BFA] hover:text-white"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
