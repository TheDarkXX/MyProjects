import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, ChevronLeft, ChevronRight, ExternalLink, Clock, Flame, 
  Zap, Check, EyeOff, Building, Tag, ArrowUp, ArrowDown, BookOpen
} from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NewsItem } from './types';

interface NewsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: NewsItem | null;
  items: NewsItem[];
  onSelectItem: (item: NewsItem) => void;
  onToggleRead: (id: number, currentRead: number) => void;
  onSelectTicker?: (ticker: string) => void;
  onSelectTag?: (tag: string) => void;
}

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  isOpen,
  onClose,
  activeItem,
  items,
  onSelectItem,
  onToggleRead,
  onSelectTicker,
  onSelectTag,
}) => {
  const activeItemRef = useRef<HTMLDivElement>(null);
  const readingCanvasRef = useRef<HTMLDivElement>(null);

  const currentIndex = useMemo(() => {
    if (!activeItem) return -1;
    return items.findIndex(i => i.id === activeItem.id);
  }, [items, activeItem]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < items.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onSelectItem(items[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, items, onSelectItem]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onSelectItem(items[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, items, onSelectItem]);

  // Scroll reading canvas to top on item switch
  useEffect(() => {
    if (readingCanvasRef.current) {
      readingCanvasRef.current.scrollTop = 0;
    }
  }, [activeItem?.id]);

  // Auto scroll active item into view in left rail
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeItem?.id]);

  // Auto-mark as read after viewing for 2.5 seconds
  useEffect(() => {
    if (!activeItem || activeItem.is_read === 1 || !isOpen) return;
    const timer = setTimeout(() => {
      onToggleRead(activeItem.id, 0);
    }, 2500);
    return () => clearTimeout(timer);
  }, [activeItem?.id, activeItem?.is_read, isOpen, onToggleRead]);

  // Pro Keyboard Shortcuts (ArrowUp/Down, J/K, Esc, M)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'm' || e.key === 'M') {
        if (activeItem) {
          e.preventDefault();
          onToggleRead(activeItem.id, activeItem.is_read);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, activeItem, onToggleRead]);

  if (!isOpen || !activeItem) return null;

  const isMust = activeItem.reading_priority === 'THE_MUST';
  const isCatalyst = activeItem.reading_priority === 'CATALYST' || activeItem.reading_priority === 'GOOD_TO_KNOW';
  const isWatchlist = activeItem.reading_priority === 'WATCHLIST';
  const isRead = activeItem.is_read === 1;

  let tags: string[] = [];
  if (Array.isArray(activeItem.triage_tags)) tags = activeItem.triage_tags;
  else if (typeof activeItem.triage_tags === 'string') {
    try { tags = JSON.parse(activeItem.triage_tags); } catch {}
  }

  // Normalizer: Convert raw inline bullets ('•', '\n', etc.) into standard Markdown list items ('- ...')
  const normalizedSummary = useMemo(() => {
    if (!activeItem?.summary_th) return '';
    const raw = activeItem.summary_th;

    // Split by Unicode bullet symbols or newlines
    const rawItems = raw
      .split(/(?:[\r\n]+|[•·●\u2022]\s*)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // If it's just a single sentence without any bullet marks, keep as is
    if (rawItems.length <= 1 && !raw.includes('•')) {
      return raw;
    }

    // Otherwise, turn each discrete item into a clean Markdown bullet item
    return rawItems
      .map(item => `- ${item.replace(/^[-*•·●\u2022\s]+/, '').trim()}`)
      .filter(line => line.length > 2)
      .join('\n');
  }, [activeItem?.summary_th]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to close backdrop */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Main Floating Modal Window */}
      <div className="bg-[#0B0E14] border border-[#2A2E45] rounded-2xl w-full max-w-6xl h-[92vh] max-h-[920px] flex flex-col shadow-[0_16px_50px_rgba(0,0,0,0.7)] overflow-hidden relative">
        
        {/* Top Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-[#10131C] border-b border-[#1F2233] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-[#823AFD]/15 text-[#A78BFA] border border-[#823AFD]/30">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                News Intelligence Deep Dive
              </h2>
              {currentIndex !== -1 && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-xs font-mono bg-white/5 border border-white/10 text-slate-400">
                  ข่าว {currentIndex + 1} จาก {items.length}
                </span>
              )}
            </div>
          </div>

          {/* Shortcuts Hint & Close Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">↑/↓</span>
              <span>หรือ</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">J/K</span>
              <span>เลื่อนข่าว</span>
              <span className="mx-1 text-slate-600">•</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</span>
              <span>ปิด</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง [Esc]"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Master-Detail Split Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT RAIL (25% - 28%): Feed Mini List (Hidden on Mobile) */}
          <div className="w-full md:w-[32%] lg:w-[28%] bg-[#0D1017] border-r border-[#1F2233] flex flex-col overflow-hidden hidden md:flex shrink-0">
            {/* Left Rail Header */}
            <div className="p-3 bg-[#11141E] border-b border-[#1F2233] flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>รายการข่าวในฟีด</span>
              <span className="font-mono text-slate-300">{items.length} รายการ</span>
            </div>

            {/* Scrollable Feed List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#181B28] p-1.5 space-y-1">
              {items.map((item, idx) => {
                const isItemActive = item.id === activeItem.id;
                const isItemMust = item.reading_priority === 'THE_MUST';
                const isItemCatalyst = item.reading_priority === 'CATALYST' || item.reading_priority === 'GOOD_TO_KNOW';
                const isItemWatchlist = item.reading_priority === 'WATCHLIST';
                const isItemRead = item.is_read === 1;

                return (
                  <div
                    key={item.id}
                    ref={isItemActive ? activeItemRef : undefined}
                    onClick={() => onSelectItem(item)}
                    className={clsx(
                      "p-2.5 rounded-xl transition-all cursor-pointer text-left relative",
                      isItemActive
                        ? "bg-[#1C162E] border-l-4 border-[#823AFD] shadow-[0_0_15px_rgba(130,58,253,0.15)] ring-1 ring-[#823AFD]/30"
                        : "hover:bg-[#141724] border-l-4 border-transparent text-slate-400 hover:text-slate-200",
                      isItemRead && !isItemActive && "opacity-60"
                    )}
                  >
                    {/* Top Row: Bullet + Ticker + Priority Dot + Time */}
                    <div className="flex items-center justify-between gap-1.5 mb-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        {/* Priority Dot */}
                        <span className={clsx(
                          "w-2 h-2 rounded-full shrink-0",
                          isItemMust ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" :
                          isItemCatalyst ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]" :
                          isItemWatchlist ? "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]" :
                          "bg-slate-500"
                        )} />

                        {/* Ticker */}
                        <span className={clsx(
                          "font-mono font-normal text-xs px-1.5 py-0.2 rounded border",
                          isItemActive
                            ? "bg-[#823AFD] text-white border-white/30"
                            : "bg-white/5 text-slate-300 border-white/10"
                        )}>
                          #{item.ticker}
                        </span>

                        {isItemMust && (
                          <span className="text-[11px] font-bold text-rose-400">
                            🚨 MUST
                          </span>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Headline Snippet */}
                    <p className={clsx(
                      "text-xs leading-snug line-clamp-2",
                      isItemActive ? "font-medium text-slate-200" : "text-slate-300 font-normal"
                    )}>
                      {item.headline_th || item.headline}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT CANVAS (72% - 75%): Full Deep Dive with DrView Typography */}
          <div 
            ref={readingCanvasRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-[#090C12]"
          >
            {/* Executive Badges Strip */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[#1F2233]">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Ticker Badge */}
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-normal bg-white/10 text-slate-200 border border-white/20 shadow-sm">
                  #{activeItem.ticker}
                </span>

                {/* Priority Pill */}
                {isMust ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 animate-pulse">
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

                {/* Portfolio Badge */}
                {activeItem.portfolio_tag === 'main' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    🏢 พอร์ตหลัก
                  </span>
                )}
                {activeItem.portfolio_tag === 'tiger' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    🐯 พอร์ตลูก
                  </span>
                )}
                {activeItem.portfolio_tag === 'dual' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ⚡ 2 พอร์ต
                  </span>
                )}
                {activeItem.portfolio_tag === 'global' && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    🌐 Watchlist
                  </span>
                )}

                {/* Sentiment */}
                <span className={clsx(
                  "px-2.5 py-1 rounded-full text-xs font-bold",
                  activeItem.sentiment === 'bullish' && "text-emerald-300 bg-emerald-500/15 border border-emerald-500/30",
                  activeItem.sentiment === 'bearish' && "text-rose-300 bg-rose-500/15 border border-rose-500/30",
                  activeItem.sentiment === 'neutral' && "text-slate-300 bg-slate-800 border border-slate-700"
                )}>
                  {activeItem.sentiment === 'bullish' ? '🟢 เชิงบวก' : activeItem.sentiment === 'bearish' ? '🔴 เชิงลบ' : '⚪ เป็นกลาง'}
                </span>

                {/* Relevance Score */}
                {activeItem.relevance_score !== undefined && activeItem.relevance_score > 0 && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800/90 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> {activeItem.relevance_score} pts
                  </span>
                )}
              </div>

              {/* Mark Read Toggle Button */}
              <button
                onClick={() => onToggleRead(activeItem.id, activeItem.is_read)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                  isRead
                    ? "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm"
                )}
                title={isRead ? "สลับเป็นยังไม่อ่าน [M]" : "มาร์กเป็นอ่านแล้ว [M]"}
              >
                {isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isRead ? 'อ่านแล้ว' : 'มาร์กอ่านแล้ว'}</span>
              </button>
            </div>

            {/* Main Headline Block */}
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold text-white leading-snug tracking-tight">
                {activeItem.headline_th || activeItem.headline}
              </h1>
              {activeItem.headline_th && activeItem.headline_th !== activeItem.headline && (
                <p className="text-sm sm:text-base text-slate-400 font-normal italic leading-relaxed">
                  <span className="text-slate-500 font-medium not-italic mr-1.5">ต้นฉบับ:</span>
                  {activeItem.headline}
                </p>
              )}
            </div>

            {/* Metadata Byline Strip */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-slate-400 pb-2">
              <span className="font-semibold text-slate-300">
                แหล่งข่าว: <span className="text-[#A78BFA]">{activeItem.source_name}</span>
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {new Date(activeItem.created_at).toLocaleString('th-TH', { 
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}
              </span>
              {activeItem.source_url && (
                <a
                  href={activeItem.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#A78BFA] hover:text-white flex items-center gap-1 transition-colors underline underline-offset-2"
                >
                  <span>เปิดเว็บต้นฉบับ</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* 1. DrView Markdown Content Canvas (Executive Summary FIRST) */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center gap-2 border-b border-[#1F2233] pb-2">
                <h3 className="text-[17px] font-bold text-[#58A6FF]">
                  📌 บทสรุปและบริบทข่าว (Executive Summary)
                </h3>
              </div>

              {/* ReactMarkdown with DrView Color Palette Mapping */}
              <div className="text-[14.5px] leading-relaxed text-[#C9D1D9] font-normal">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Heading 2: Electric Blue (#58A6FF)
                    h2: ({ node, ...props }) => (
                      <h2 className="text-lg font-bold text-[#58A6FF] my-3 border-b border-[#21262D] pb-1" {...props} />
                    ),
                    // Heading 3: Lavender Purple (#D2A8FF)
                    h3: ({ node, ...props }) => (
                      <h3 className="text-base font-semibold text-[#D2A8FF] my-2.5" {...props} />
                    ),
                    // Strong / Bold: Golden Amber (#FFA657)
                    strong: ({ node, ...props }) => (
                      <strong className="font-bold text-[#FFA657]" {...props} />
                    ),
                    b: ({ node, ...props }) => (
                      <b className="font-bold text-[#FFA657]" {...props} />
                    ),
                    // Inline Code: Coral Red (#FF7B72) with dark red tint pill
                    code: ({ node, ...props }) => (
                      <code className="font-mono text-[13px] bg-[#22171B] border border-[#FF7B72]/30 text-[#FF7B72] px-1.5 py-0.5 rounded shadow-sm" {...props} />
                    ),
                    // Paragraph
                    p: ({ node, ...props }) => (
                      <p className="text-[#C9D1D9] leading-relaxed my-2" {...props} />
                    ),
                    // List and List Item with Glowing Amber Dot & Clear Vertical Spacing
                    ul: ({ node, ...props }) => (
                      <ul className="space-y-3 my-2.5 pl-0 list-none" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="space-y-3 my-2.5 pl-5 list-decimal text-slate-300" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="flex items-start gap-3 text-[#C9D1D9] leading-relaxed my-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FFA657] mt-2.5 shrink-0 shadow-[0_0_8px_rgba(255,166,87,0.8)]" />
                        <div className="flex-1 text-[15px] sm:text-[15.5px] leading-relaxed">{props.children}</div>
                      </li>
                    ),
                    // Blockquote
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-[#58A6FF] pl-4 py-1.5 my-3 bg-[#58A6FF]/5 text-slate-300 rounded-r-xl" {...props} />
                    ),
                  }}
                >
                  {normalizedSummary}
                </ReactMarkdown>
              </div>
            </div>

            {/* 2. DrView Alert Box: AI Priority Reason (Placed at BOTTOM as analysis takeaway) */}
            {activeItem.priority_reason && (
              <div className={clsx(
                "p-4 rounded-xl border flex items-start gap-3 shadow-md mt-4",
                isMust
                  ? "bg-rose-950/25 border-rose-500/40 text-rose-200"
                  : isCatalyst
                    ? "bg-amber-950/25 border-amber-500/40 text-amber-200"
                    : isWatchlist
                      ? "bg-sky-950/25 border-sky-500/40 text-sky-200"
                      : "bg-[#141724] border-[#2A2E45] text-slate-200"
              )}>
                <span className="text-lg shrink-0">💡</span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider opacity-80">
                    เหตุผลที่คัดเกรด (AI Priority Reason):
                  </h4>
                  <p className="text-[14px] sm:text-[15px] font-normal leading-relaxed">
                    {activeItem.priority_reason}
                  </p>
                </div>
              </div>
            )}

            {/* 3. Tags Strip */}
            {tags.length > 0 && (
              <div className="pt-4 border-t border-[#1F2233] flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                  <Tag className="w-3 h-3 text-slate-500" /> แท็ก:
                </span>
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div className="px-4 py-3 sm:px-6 bg-[#10131C] border-t border-[#1F2233] flex items-center justify-between gap-3 shrink-0">
          {/* Previous Button */}
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={clsx(
              "px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm",
              hasPrev
                ? "bg-[#1A1D2D] hover:bg-[#823AFD]/20 text-slate-200 hover:text-white border-[#2A2E45] hover:border-[#823AFD]"
                : "bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed"
            )}
            title="ข่าวก่อนหน้า [↑ หรือ K]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>ก่อนหน้า</span>
          </button>

          {/* Center Counter */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            {currentIndex >= 0 && (
              <span>
                ข่าวที่ <span className="text-white font-bold">{currentIndex + 1}</span> จาก <span className="text-slate-300">{items.length}</span>
              </span>
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={clsx(
              "px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-sm",
              hasNext
                ? "bg-[#1A1D2D] hover:bg-[#823AFD]/20 text-slate-200 hover:text-white border-[#2A2E45] hover:border-[#823AFD]"
                : "bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed"
            )}
            title="ข่าวถัดไป [↓ หรือ J]"
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
