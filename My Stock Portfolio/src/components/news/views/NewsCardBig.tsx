import React from 'react';
import { Flame, Sparkles, Clock, Check, EyeOff, ExternalLink, Zap } from 'lucide-react';
import clsx from 'clsx';
import { NewsItem } from '../types';

interface NewsCardBigProps {
  items: NewsItem[];
  selectedTicker: string | null;
  selectedTag: string | null;
  onSelectTicker: (ticker: string) => void;
  onSelectTag: (tag: string) => void;
  onToggleRead: (id: number, currentRead: number) => void;
}

export const NewsCardBig: React.FC<NewsCardBigProps> = ({
  items,
  selectedTicker,
  selectedTag,
  onSelectTicker,
  onSelectTag,
  onToggleRead,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      {items.map((item) => {
        const isMust = item.reading_priority === 'THE_MUST';
        const isCatalyst = item.reading_priority === 'CATALYST' || item.reading_priority === 'GOOD_TO_KNOW';
        const isWatchlist = item.reading_priority === 'WATCHLIST';
        const isRead = item.is_read === 1;

        let tags: string[] = [];
        if (Array.isArray(item.triage_tags)) tags = item.triage_tags;
        else if (typeof item.triage_tags === 'string') {
          try { tags = JSON.parse(item.triage_tags); } catch {}
        }

        return (
          <div
            key={item.id}
            className={clsx(
              "rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between p-5 space-y-4 group",
              isMust
                ? isRead
                  ? "bg-[#111418] border-rose-500/30 opacity-85 hover:opacity-100"
                  : "bg-[#16121D] border-rose-500 shadow-[0_4px_24px_rgba(244,63,94,0.18)]"
                : isCatalyst
                  ? isRead
                    ? "bg-[#111418] border-[#2A2E45] opacity-85 hover:opacity-100"
                    : "bg-[#111418] border-amber-500/30 hover:border-amber-500/60"
                  : isWatchlist
                    ? "bg-[#0D1017] border-sky-500/25 opacity-85 hover:opacity-100"
                    : "bg-[#0D1017] border-[#1F2233] opacity-80 hover:opacity-100"
            )}
          >
            {/* Top Accent Stripe for The Must */}
            {isMust && !isRead && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-[#FC2D79]" />
            )}

            <div className="space-y-3.5">
              {/* Card Header: Badges & Ticker */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* 4-Tier Priority Badge */}
                  {isMust ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400" /> 🚨 THE MUST
                    </span>
                  ) : isCatalyst ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> ⚡ CATALYST
                    </span>
                  ) : isWatchlist ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                      🌐 WATCHLIST
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      💬 CHATTER
                    </span>
                  )}

                  {/* Portfolio Tag */}
                  {item.portfolio_tag === 'main' && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      🏢 พอร์ตหลัก
                    </span>
                  )}
                  {item.portfolio_tag === 'tiger' && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      🐯 พอร์ตลูก
                    </span>
                  )}
                  {item.portfolio_tag === 'dual' && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ⚡ 2 พอร์ต
                    </span>
                  )}

                  {/* Ticker Pill */}
                  <button
                    onClick={() => onSelectTicker(item.ticker)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer",
                      selectedTicker === item.ticker
                        ? "bg-[#823AFD] text-white border-white/30 shadow-[0_0_10px_rgba(130,58,253,0.5)] ring-1 ring-white"
                        : "bg-white/10 hover:bg-[#823AFD]/25 hover:border-[#823AFD] text-white border-white/15"
                    )}
                  >
                    #{item.ticker}
                  </button>

                  {/* Sentiment */}
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold",
                    item.sentiment === 'bullish' && "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30",
                    item.sentiment === 'bearish' && "text-rose-300 bg-rose-500/15 border border-rose-500/30",
                    item.sentiment === 'neutral' && "text-slate-300 bg-slate-800 border border-slate-700"
                  )}>
                    {item.sentiment === 'bullish' ? '🟢 Bullish' : item.sentiment === 'bearish' ? '🔴 Bearish' : '⚪ Neutral'}
                  </span>

                  {/* Score */}
                  {item.relevance_score !== undefined && item.relevance_score > 0 && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-slate-800 text-[#CBD5E1] border border-slate-700 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" /> {item.relevance_score} pts
                    </span>
                  )}
                </div>

                {/* Read Action */}
                <button
                  onClick={() => onToggleRead(item.id, item.is_read)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer",
                    isRead
                      ? "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                  )}
                >
                  {isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  {isRead ? 'อ่านแล้ว' : 'Mark read'}
                </button>
              </div>

              {/* Headline Title */}
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight group-hover:text-[#C4B5FD] transition-colors">
                  {item.headline_th || item.headline}
                </h3>
                {item.headline_th && item.headline_th !== item.headline && (
                  <p className="text-[13px] text-slate-300 font-normal italic leading-snug flex items-center gap-1.5 line-clamp-1">
                    <span className="shrink-0 text-slate-400 font-medium not-italic">ต้นฉบับ:</span>
                    <span className="truncate">{item.headline}</span>
                  </p>
                )}
              </div>

              {/* Priority Reason Banner */}
              {item.priority_reason && (
                <div className={clsx(
                  "text-[13px] px-3.5 py-2 rounded-xl flex items-start gap-2 border",
                  isMust
                    ? "bg-rose-950/30 border-rose-500/30 text-rose-200"
                    : "bg-[#1A1D2D] border-[#2A2E45] text-slate-200"
                )}>
                  <span className="font-bold shrink-0">💡 คัดเกรด:</span>
                  <span>{item.priority_reason}</span>
                </div>
              )}

              {/* AI Summary Box */}
              <div className="bg-[#0A0C12] border border-[#1F2233] rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-[#823AFD] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> สรุปเนื้อหาสำคัญ (AI Synthesized)
                </div>
                <div className="text-[13px] text-slate-200 leading-relaxed font-body whitespace-pre-line">
                  {item.summary_th}
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1F2233] text-[13px] text-slate-300">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">แหล่ง: <strong className="text-slate-200 font-semibold">{item.source_name}</strong></span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 flex items-center gap-1 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#823AFD] hover:text-[#A78BFA] font-bold flex items-center gap-1 transition-colors text-xs"
                >
                  เปิดอ่านต้นฉบับ <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
