import React from 'react';
import { Flame, Sparkles, Clock, Check, EyeOff, ExternalLink, Zap, Globe } from 'lucide-react';
import clsx from 'clsx';
import { NewsItem } from '../types';

interface NewsTextListProps {
  items: NewsItem[];
  selectedTicker: string | null;
  selectedTag: string | null;
  onSelectTicker: (ticker: string) => void;
  onSelectTag: (tag: string) => void;
  onToggleRead: (id: number, currentRead: number) => void;
  onOpenDetail?: (item: NewsItem) => void;
}

export const NewsTextList: React.FC<NewsTextListProps> = ({
  items,
  selectedTicker,
  selectedTag,
  onSelectTicker,
  onSelectTag,
  onToggleRead,
  onOpenDetail,
}) => {
  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl divide-y divide-[#1F2233] overflow-hidden w-full shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      {items.map((item) => {
        const isMust = item.reading_priority === 'THE_MUST';
        const isHighImpact = item.reading_priority === 'HIGH_IMPACT' || item.reading_priority === 'CATALYST';
        const isMacro = item.reading_priority === 'MACRO' || item.portfolio_tag === 'macro' || item.ticker === 'MACRO' || item.ticker === 'MARKET';
        const isGoodToKnow = item.reading_priority === 'GOOD_TO_KNOW' || item.reading_priority === 'WATCHLIST';
        const isRead = item.is_read === 1;

        let tags: string[] = [];
        if (Array.isArray(item.triage_tags)) tags = item.triage_tags;
        else if (typeof item.triage_tags === 'string') {
          try { tags = JSON.parse(item.triage_tags); } catch {}
        }

        return (
          <div
            key={item.id}
            onClick={() => onOpenDetail?.(item)}
            className={clsx(
              "p-3 sm:px-4 sm:py-3 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-2.5 group hover:bg-[#161A24] cursor-pointer",
              isRead ? "opacity-75" : "opacity-100",
              isMust && !isRead && "bg-rose-950/10 border-l-2 border-l-rose-500"
            )}
          >
            {/* Left / Center: Bullet + Ticker + 16px Headline + Key Tags */}
            <div className="flex items-start md:items-center gap-2.5 flex-1 min-w-0">
              {/* Bullet Dot */}
              <span className="mt-1 md:mt-0 shrink-0">
                <span className={clsx(
                  "inline-block w-2.5 h-2.5 rounded-full",
                  isMust ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" :
                  isHighImpact ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" :
                  isMacro ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]" :
                  isGoodToKnow ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" :
                  "bg-slate-500"
                )} />
              </span>

              {/* Ticker Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTicker(item.ticker);
                }}
                className={clsx(
                  "px-2 py-0.5 rounded-md text-xs font-mono font-normal border transition-all cursor-pointer shrink-0",
                  selectedTicker === item.ticker
                    ? "bg-[#823AFD] text-white border-white/40 shadow-[0_0_8px_rgba(130,58,253,0.5)] ring-1 ring-white"
                    : "bg-white/10 hover:bg-[#823AFD]/25 text-slate-300 hover:text-white border-white/15"
                )}
                title={`กรองเฉพาะ #${item.ticker}`}
              >
                #{item.ticker}
              </button>

              {/* 5-Tier Priority Pill */}
              {isMust ? (
                <span className="px-1.5 py-0.5 rounded-md text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5 shrink-0">
                  <Flame className="w-3 h-3 text-rose-400" /> MUST
                </span>
              ) : isHighImpact ? (
                <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 shrink-0">
                  <Zap className="w-3 h-3 text-amber-400" /> HIGH IMPACT
                </span>
              ) : isMacro ? (
                <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-0.5 shrink-0">
                  <Globe className="w-3 h-3 text-sky-400" /> MACRO
                </span>
              ) : isGoodToKnow ? (
                <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                  GOOD TO KNOW
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md text-xs font-normal bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                  CHATTER
                </span>
              )}

              {/* Headline (16px Normal Weight, Soft Off-White ~75-80% Brightness) */}
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-normal text-slate-300 leading-snug tracking-normal group-hover:text-white transition-colors truncate">
                  {item.headline_th || item.headline}
                </h3>
              </div>

              {/* Key Tags */}
              <div className="hidden lg:flex items-center gap-1 shrink-0">
                {tags.slice(0, 3).map((t, idx) => {
                  const isVip = t.startsWith('VIP');
                  const isEco = t.startsWith('ECO');
                  const isMacro = t === 'MACRO' || t === 'MARKET_SUMMARY' || t === 'MACRO_PULSE';
                  const isCatalyst = t === 'CATALYST' || t === 'DIRECT_CATALYST';
                  const isPriceShock = t.startsWith('PRICE_SHOCK');
                  const isTagActive = selectedTag === t;
                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTag(t);
                      }}
                      className={clsx(
                        "px-1.5 py-0.5 rounded text-xs font-bold uppercase transition-all cursor-pointer border",
                        isTagActive
                          ? "bg-[#823AFD] text-white border-white/30 shadow-[0_0_8px_rgba(130,58,253,0.4)]"
                          : clsx(
                              isPriceShock && "bg-rose-500/25 text-rose-200 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.4)] hover:bg-rose-500/35",
                              isVip && !isPriceShock && "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25",
                              isEco && "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25",
                              isMacro && "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30",
                              isCatalyst && !isPriceShock && "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25",
                              !isPriceShock && !isVip && !isEco && !isMacro && !isCatalyst && "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                            )
                      )}
                      title={`กรองตามแท็ก #${t}`}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Source, Timestamp, Read Button, Link */}
            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 text-xs text-slate-400 pl-6 md:pl-0">
              <span className="truncate max-w-[110px] font-medium" title={item.source_name}>
                {item.source_name}
              </span>

              <span className="flex items-center gap-1 text-slate-400 whitespace-nowrap">
                <Clock className="w-3 h-3 text-slate-500" />
                {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>

              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#A78BFA] hover:text-white transition-colors"
                  title="เปิดอ่านต้นฉบับ"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(item.id, item.is_read);
                }}
                className={clsx(
                  "px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer",
                  isRead
                    ? "bg-slate-800/60 text-slate-500 border-slate-700 hover:text-slate-300"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                )}
                title={isRead ? "ทำเครื่องหมายว่ายังไม่อ่าน" : "ทำเครื่องหมายว่าอ่านแล้ว"}
              >
                {isRead ? <EyeOff className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                <span className="hidden sm:inline">{isRead ? 'อ่านแล้ว' : 'Mark'}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
