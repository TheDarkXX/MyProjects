import React from 'react';
import { Flame, Sparkles, Clock, Check, EyeOff, ExternalLink, Zap } from 'lucide-react';
import clsx from 'clsx';
import { NewsItem } from '../types';

interface NewsRowListProps {
  items: NewsItem[];
  selectedTicker: string | null;
  selectedTag: string | null;
  onSelectTicker: (ticker: string) => void;
  onSelectTag: (tag: string) => void;
  onToggleRead: (id: number, currentRead: number) => void;
}

export const NewsRowList: React.FC<NewsRowListProps> = ({
  items,
  selectedTicker,
  selectedTag,
  onSelectTicker,
  onSelectTag,
  onToggleRead,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 w-full">
      {items.map((item) => {
        const isMust = item.reading_priority === 'THE_MUST';
        const isGood = item.reading_priority === 'GOOD_TO_KNOW';
        const isRead = item.is_read === 1;

        // Extract first bullet or first line from summary_th
        const summaryFirstBullet = item.summary_th
          ? item.summary_th.split('\n').filter(line => line.trim().length > 0)[0] || item.summary_th
          : '';

        let tags: string[] = [];
        if (Array.isArray(item.triage_tags)) tags = item.triage_tags;
        else if (typeof item.triage_tags === 'string') {
          try { tags = JSON.parse(item.triage_tags); } catch {}
        }

        return (
          <div
            key={item.id}
            className={clsx(
              "rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between p-4 sm:p-4.5 group",
              isMust
                ? isRead
                  ? "bg-[#111418] border-rose-500/30 opacity-85 hover:opacity-100"
                  : "bg-[#16121D] border-rose-500 shadow-[0_4px_20px_rgba(244,63,94,0.16)]"
                : isGood
                  ? isRead
                    ? "bg-[#111418] border-[#2A2E45] opacity-85 hover:opacity-100"
                    : "bg-[#111418] border-amber-500/35 hover:border-amber-500/60"
                  : "bg-[#0D1017] border-[#1F2233] opacity-80 hover:opacity-100"
            )}
          >
            {/* Top Accent Stripe for The Must */}
            {isMust && !isRead && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-[#FC2D79]" />
            )}

            <div className="space-y-2.5">
              {/* Top Row: Badges, Ticker, Sentiment & Read Action */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Priority Badge */}
                  {isMust ? (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400" /> THE MUST
                    </span>
                  ) : isGood ? (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> GOOD TO KNOW
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      ☕ OPTIONAL
                    </span>
                  )}

                  {/* Ticker Pill */}
                  <button
                    onClick={() => onSelectTicker(item.ticker)}
                    className={clsx(
                      "px-2.5 py-0.5 rounded-lg text-xs font-mono font-black border transition-all cursor-pointer",
                      selectedTicker === item.ticker
                        ? "bg-[#823AFD] text-white border-white/40 shadow-[0_0_10px_rgba(130,58,253,0.5)] ring-1 ring-white"
                        : "bg-white/10 hover:bg-[#823AFD]/25 hover:border-[#823AFD] text-white border-white/15"
                    )}
                    title={`กรองเฉพาะ #${item.ticker}`}
                  >
                    #{item.ticker}
                  </button>

                  {/* Portfolio Tag */}
                  {item.portfolio_tag === 'main' && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      พอร์ตหลัก
                    </span>
                  )}
                  {item.portfolio_tag === 'tiger' && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      พอร์ตลูก
                    </span>
                  )}
                  {item.portfolio_tag === 'dual' && (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      2 พอร์ต
                    </span>
                  )}

                  {/* Sentiment */}
                  <span className={clsx(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    item.sentiment === 'bullish' && "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30",
                    item.sentiment === 'bearish' && "text-rose-300 bg-rose-500/15 border border-rose-500/30",
                    item.sentiment === 'neutral' && "text-slate-300 bg-slate-800 border border-slate-700"
                  )}>
                    {item.sentiment === 'bullish' ? '🟢 Bullish' : item.sentiment === 'bearish' ? '🔴 Bearish' : '⚪ Neutral'}
                  </span>

                  {/* Score */}
                  {item.relevance_score !== undefined && item.relevance_score > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-800/90 text-[#CBD5E1] border border-slate-700 flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber-400" /> {item.relevance_score}
                    </span>
                  )}
                </div>

                {/* Mark Read Button */}
                <button
                  onClick={() => onToggleRead(item.id, item.is_read)}
                  className={clsx(
                    "px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer shrink-0",
                    isRead
                      ? "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                  )}
                  title={isRead ? "คลิกเพื่อเปลี่ยนเป็นยังไม่อ่าน" : "คลิกเพื่อทำเครื่องหมายว่าอ่านแล้ว"}
                >
                  {isRead ? <EyeOff className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  {isRead ? 'อ่านแล้ว' : 'Mark'}
                </button>
              </div>

              {/* Title Section: Catchy Thai + Original Subtitle */}
              <div className="space-y-1">
                <h3 className="text-[15px] sm:text-base font-bold text-white leading-snug tracking-tight group-hover:text-[#C4B5FD] transition-colors">
                  {item.headline_th || item.headline}
                </h3>
                {item.headline_th && item.headline_th !== item.headline && (
                  <p className="text-[13px] text-slate-300 italic leading-snug truncate">
                    <span className="not-italic text-slate-400 font-medium mr-1.5">ต้นฉบับ:</span>
                    {item.headline}
                  </p>
                )}
              </div>

              {/* Summary Extract (First Bullet) */}
              {summaryFirstBullet && (
                <p className="text-[13px] text-slate-200 leading-relaxed bg-[#0A0C12]/80 border border-[#1F2233] rounded-xl p-2.5 line-clamp-2">
                  {summaryFirstBullet}
                </p>
              )}
            </div>

            {/* Bottom Footer: Tags, Source & Date */}
            <div className="pt-2.5 mt-2.5 border-t border-[#1F2233] flex items-center justify-between text-[13px] text-slate-300 gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-slate-400 font-medium truncate max-w-[130px]" title={item.source_name}>
                  {item.source_name}
                </span>
                {tags.slice(0, 2).map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectTag(t)}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-xs font-bold uppercase transition-all cursor-pointer border",
                      selectedTag === t
                        ? "bg-[#823AFD] text-white border-white/30"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#A78BFA] hover:text-white font-bold flex items-center gap-0.5 transition-colors text-xs"
                    title="อ่านบทความต้นฉบับ"
                  >
                    อ่านเต็ม <ExternalLink className="w-3 h-3" />
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
