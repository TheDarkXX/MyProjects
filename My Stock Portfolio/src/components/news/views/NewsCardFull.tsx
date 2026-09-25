import React from 'react';
import { Flame, Sparkles, Clock, Check, EyeOff, ExternalLink, Zap, Globe } from 'lucide-react';
import clsx from 'clsx';
import { NewsItem } from '../types';

interface NewsCardFullProps {
  items: NewsItem[];
  selectedTicker: string | null;
  selectedTag: string | null;
  onSelectTicker: (ticker: string) => void;
  onSelectTag: (tag: string) => void;
  onToggleRead: (id: number, currentRead: number) => void;
  onOpenDetail?: (item: NewsItem) => void;
}

export const NewsCardFull: React.FC<NewsCardFullProps> = ({
  items,
  selectedTicker,
  selectedTag,
  onSelectTicker,
  onSelectTag,
  onToggleRead,
  onOpenDetail,
}) => {
  return (
    <div className="space-y-4 w-full">
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
            className={clsx(
              "rounded-2xl border transition-all duration-200 relative overflow-hidden",
              isMust
                ? isRead
                  ? "bg-[#111418] border-rose-500/30 opacity-85 hover:opacity-100"
                  : "bg-[#16121D] border-rose-500 shadow-[0_4px_24px_rgba(244,63,94,0.18)]"
                : isHighImpact
                  ? isRead
                    ? "bg-[#111418] border-[#2A2E45] opacity-85 hover:opacity-100"
                    : "bg-[#111418] border-amber-500/30 hover:border-amber-500/60"
                  : isMacro
                    ? isRead
                      ? "bg-[#0D1017] border-sky-500/25 opacity-85 hover:opacity-100"
                      : "bg-[#0D1017] border-sky-500/50 shadow-[0_4px_24px_rgba(56,189,248,0.15)] hover:border-sky-400"
                    : isGoodToKnow
                      ? "bg-[#0D1017] border-blue-500/25 opacity-85 hover:opacity-100"
                      : "bg-[#0D1017] border-[#1F2233] opacity-80 hover:opacity-100"
            )}
          >
            {/* Top Accent Stripe for The Must */}
            {isMust && !isRead && (
              <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-orange-500 to-[#FC2D79]" />
            )}

            <div className="p-5 sm:p-6 space-y-4">
              {/* Card Header: Badges & Ticker */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 5-Tier Priority Badge */}
                  {isMust ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
                      <Flame className="w-3.5 h-3.5 text-rose-400" /> 🚨 THE MUST
                    </span>
                  ) : isHighImpact ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> ⚡ HIGH IMPACT
                    </span>
                  ) : isMacro ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-sky-400" /> 🌐 MACRO
                    </span>
                  ) : isGoodToKnow ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      📘 GOOD TO KNOW
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      💬 CHATTER
                    </span>
                  )}

                  {/* Portfolio Tag Badge */}
                  {item.portfolio_tag === 'main' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      🏢 พอร์ตหลัก
                    </span>
                  )}
                  {item.portfolio_tag === 'tiger' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      🐯 พอร์ตลูก
                    </span>
                  )}
                  {item.portfolio_tag === 'dual' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ⚡ มีใน 2 พอร์ต
                    </span>
                  )}
                  {item.portfolio_tag === 'project2x' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      🎯 Project 2X
                    </span>
                  )}
                  {item.portfolio_tag === 'macro' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      🌐 มหภาค
                    </span>
                  )}
                  {item.portfolio_tag === 'global' && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                      🌐 ทั่วไป
                    </span>
                  )}

                  {/* Ticker Pill */}
                  <button
                    onClick={() => onSelectTicker(item.ticker)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-normal border transition-all cursor-pointer flex items-center gap-1",
                      selectedTicker === item.ticker
                        ? "bg-[#823AFD] text-white border-white/30 shadow-[0_0_12px_rgba(130,58,253,0.5)] ring-1 ring-white"
                        : "bg-white/10 hover:bg-[#823AFD]/25 hover:border-[#823AFD] text-slate-300 hover:text-white border-white/15"
                    )}
                    title={`คลิกเพื่อกรองข่าวเฉพาะหุ้น #${item.ticker}`}
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
                    {item.sentiment === 'bullish' ? '🟢 เชิงบวก' : item.sentiment === 'bearish' ? '🔴 เชิงลบ' : '⚪ เป็นกลาง'}
                  </span>

                  {/* Triage Relevance Score */}
                  {item.relevance_score !== undefined && item.relevance_score > 0 && (
                    <span className={clsx(
                      "px-2 py-0.5 rounded-lg text-xs font-mono font-black flex items-center gap-1 border",
                      item.relevance_score >= 80 
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                        : item.relevance_score >= 60 
                          ? "bg-[#823AFD]/20 text-[#C4B5FD] border-[#823AFD]/40" 
                          : "bg-slate-800 text-slate-300 border-slate-700"
                    )}>
                      <Zap className="w-3 h-3" /> {item.relevance_score} pts
                    </span>
                  )}

                  {/* Triage Tags */}
                  {tags.map((t, idx) => {
                    const isVip = t.startsWith('VIP');
                    const isEco = t.startsWith('ECO');
                    const isMacro = t === 'MACRO' || t === 'MARKET_SUMMARY';
                    const isCatalyst = t === 'CATALYST';
                    const isTagActive = selectedTag === t;
                    return (
                      <button 
                        key={idx}
                        onClick={() => onSelectTag(t)}
                        className={clsx(
                          "px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-0.5",
                          isTagActive
                            ? "bg-[#823AFD] text-white border-white/30 shadow-[0_0_10px_rgba(130,58,253,0.4)]"
                            : clsx(
                                isVip && "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25",
                                isEco && "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25",
                                isMacro && "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25",
                                isCatalyst && "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25",
                                !isVip && !isEco && !isMacro && !isCatalyst && "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                              )
                        )}
                        title={`คลิกเพื่อกรองข่าวตามแท็ก #${t}`}
                      >
                        <span>#{t}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Timestamp & Read Toggle */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(item.created_at).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => onToggleRead(item.id, item.is_read)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer",
                      isRead
                        ? "bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200"
                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                    )}
                    title={isRead ? "คลิกเพื่อเปลี่ยนเป็นยังไม่อ่าน" : "คลิกเพื่อทำเครื่องหมายว่าอ่านแล้ว"}
                  >
                    {isRead ? <EyeOff className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    {isRead ? 'อ่านแล้ว' : 'Mark read'}
                  </button>
                </div>
              </div>

              {/* Headline Title */}
              <div 
                onClick={() => onOpenDetail?.(item)} 
                className="space-y-1 cursor-pointer group/title"
              >
                <h2 className="text-base sm:text-lg font-normal text-slate-300 leading-snug tracking-normal group-hover/title:text-white transition-colors">
                  {item.headline_th || item.headline}
                </h2>
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
                  <span className="font-bold shrink-0">💡 เหตุผลที่คัดเกรด:</span>
                  <span>{item.priority_reason}</span>
                </div>
              )}

              {/* AI Summary Box */}
              <div className="bg-[#0A0C12] border border-[#1F2233] rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-[#823AFD] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Synthesized Summary (GPT-5.6 Terra)
                </div>
                <div className="text-[13px] text-slate-200 leading-relaxed font-body whitespace-pre-line">
                  {item.summary_th}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[13px] text-slate-400">
                <span>แหล่งอ้างอิง: <span className="text-slate-200 font-medium">{item.source_name}</span></span>
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
          </div>
        );
      })}
    </div>
  );
};
