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
  onOpenDetail?: (item: NewsItem) => void;
}

export const NewsRowList: React.FC<NewsRowListProps> = ({
  items,
  selectedTicker,
  selectedTag,
  onSelectTicker,
  onSelectTag,
  onToggleRead,
  onOpenDetail,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
      {items.map((item) => {
        const isMust = item.reading_priority === 'THE_MUST';
        const isCatalyst = item.reading_priority === 'CATALYST' || item.reading_priority === 'GOOD_TO_KNOW';
        const isWatchlist = item.reading_priority === 'WATCHLIST';
        const isRead = item.is_read === 1;

        return (
          <div
            key={item.id}
            onClick={() => onOpenDetail?.(item)}
            className={clsx(
              "rounded-xl border transition-all duration-150 relative overflow-hidden flex flex-col justify-between p-2.5 sm:p-3 group cursor-pointer hover:border-[#823AFD]/50",
              isMust
                ? isRead
                  ? "bg-[#111418] border-rose-500/30 opacity-85 hover:opacity-100"
                  : "bg-[#16121D] border-rose-500/80 shadow-[0_2px_14px_rgba(244,63,94,0.14)]"
                : isCatalyst
                  ? isRead
                    ? "bg-[#111418] border-[#2A2E45] opacity-85 hover:opacity-100"
                    : "bg-[#111418] border-amber-500/30 hover:border-amber-500/50"
                  : isWatchlist
                    ? "bg-[#0D1017] border-sky-500/25 opacity-85 hover:opacity-100"
                    : "bg-[#0D1017] border-[#1F2233] opacity-80 hover:opacity-100"
            )}
          >
            {/* Top Accent Stripe for The Must */}
            {isMust && !isRead && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 via-orange-500 to-[#FC2D79]" />
            )}

            <div className="space-y-1.5">
              {/* Top Row: Badges, Ticker, Sentiment & Read Action */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {/* Ticker Pill */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTicker(item.ticker);
                    }}
                    className={clsx(
                      "px-2 py-0.5 rounded-md text-xs font-mono font-normal border transition-all cursor-pointer",
                      selectedTicker === item.ticker
                        ? "bg-[#823AFD] text-white border-white/40 shadow-[0_0_8px_rgba(130,58,253,0.5)] ring-1 ring-white"
                        : "bg-white/10 hover:bg-[#823AFD]/25 hover:border-[#823AFD] text-slate-300 hover:text-white border-white/15"
                    )}
                    title={`กรองเฉพาะ #${item.ticker}`}
                  >
                    #{item.ticker}
                  </button>

                  {/* 4-Tier Priority Badge */}
                  {isMust ? (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-rose-400" /> MUST
                    </span>
                  ) : isCatalyst ? (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-amber-400" /> CATALYST
                    </span>
                  ) : isWatchlist ? (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      WATCHLIST
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-normal bg-slate-800 text-slate-400 border border-slate-700">
                      CHATTER
                    </span>
                  )}

                  {/* Portfolio Tag */}
                  {item.portfolio_tag === 'main' && (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      หลัก
                    </span>
                  )}
                  {item.portfolio_tag === 'tiger' && (
                    <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      ลูก
                    </span>
                  )}

                  {/* Sentiment */}
                  <span className={clsx(
                    "px-1.5 py-0.2 rounded-full text-xs font-bold",
                    item.sentiment === 'bullish' && "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30",
                    item.sentiment === 'bearish' && "text-rose-300 bg-rose-500/15 border border-rose-500/30",
                    item.sentiment === 'neutral' && "text-slate-300 bg-slate-800 border border-slate-700"
                  )}>
                    {item.sentiment === 'bullish' ? '🟢 Bull' : item.sentiment === 'bearish' ? '🔴 Bear' : '⚪'}
                  </span>

                  {/* Score */}
                  {item.relevance_score !== undefined && item.relevance_score > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 text-amber-400" /> {item.relevance_score}
                    </span>
                  )}
                </div>

                {/* Mark Read Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRead(item.id, item.is_read);
                  }}
                  className={clsx(
                    "p-1 rounded-md text-xs border transition-all cursor-pointer shrink-0",
                    isRead
                      ? "bg-slate-800/60 text-slate-500 border-slate-700 hover:text-slate-200"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                  )}
                  title={isRead ? "คลิกเพื่อเปลี่ยนเป็นยังไม่อ่าน" : "คลิกเพื่อทำเครื่องหมายว่าอ่านแล้ว"}
                >
                  {isRead ? <EyeOff className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                </button>
              </div>

              {/* Title Only (Ultra Compact) */}
              <div>
                <h3 className="text-[13.5px] sm:text-[14px] font-normal text-slate-300 leading-snug tracking-normal line-clamp-2 group-hover:text-white transition-colors">
                  {item.headline_th || item.headline}
                </h3>
              </div>
            </div>

            {/* Bottom Footer: Source & Date */}
            <div className="pt-1.5 mt-1.5 border-t border-[#1F2233]/70 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[120px] font-medium" title={item.source_name}>
                {item.source_name}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-slate-400">
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
                    title="เปิดอ่านต้นฉบับ"
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
