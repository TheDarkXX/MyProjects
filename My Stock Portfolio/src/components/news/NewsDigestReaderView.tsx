import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Sparkles, BookOpen, Clock, Calendar, Copy, Check, Send, 
  ExternalLink, RefreshCw, Search, ChevronRight, Layers, ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';
import { NewsDigest } from './types';

interface NewsDigestReaderViewProps {
  onSelectTicker?: (ticker: string) => void;
  onSwitchToFeed?: () => void;
  initialDigestId?: number | null;
  initialDigests?: NewsDigest[];
}

export const NewsDigestReaderView: React.FC<NewsDigestReaderViewProps> = ({
  onSelectTicker,
  onSwitchToFeed,
  initialDigestId,
  initialDigests
}) => {
  const [digests, setDigests] = useState<NewsDigest[]>(initialDigests || []);
  const [selectedId, setSelectedId] = useState<number | null>(initialDigestId || initialDigests?.[0]?.id || null);
  const [selectedDigest, setSelectedDigest] = useState<NewsDigest | null>(null);
  const [loadingList, setLoadingList] = useState(!initialDigests || initialDigests.length === 0);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generatingDays, setGeneratingDays] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'weekly' | 'ondemand'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Actions state
  const [copied, setCopied] = useState(false);
  const [sendingLine, setSendingLine] = useState(false);
  const [lineSent, setLineSent] = useState(false);
  
  // High-speed ref cache for full digests (0ms switching, no effect re-triggers)
  const digestCacheRef = useRef<Record<number, NewsDigest>>({});

  // Sync initialDigests if parent updates
  useEffect(() => {
    if (initialDigests && initialDigests.length > 0) {
      setDigests(initialDigests);
      setLoadingList(false);
      setSelectedId(prev => prev ?? initialDigests[0].id);
    }
  }, [initialDigests]);

  // Helper for safe Thai date format
  const formatDigestDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const d = new Date(iso);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Fetch list of all digests (zero external deps, runs once or on manual refresh)
  const fetchDigests = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await fetch('/api/news/digests');
      const data = await res.json();
      if (data.success && Array.isArray(data.digests)) {
        setDigests(data.digests);
        setSelectedId(prev => prev ?? (data.digests[0]?.id || null));
      }
    } catch (err) {
      console.error('[NewsDigestReader] Failed to fetch digests:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if we didn't receive initialDigests
    if (!initialDigests || initialDigests.length === 0) {
      fetchDigests();
    }
  }, [fetchDigests, initialDigests]);

  // Load selected digest detail with 0ms memory cache
  useEffect(() => {
    if (!selectedId) return;

    if (digestCacheRef.current[selectedId]) {
      setSelectedDigest(digestCacheRef.current[selectedId]);
      return;
    }

    let isMounted = true;
    const loadDetail = async () => {
      try {
        setLoadingDetail(true);
        const res = await fetch(`/api/news/digests/${selectedId}`);
        const data = await res.json();
        if (isMounted && data.success && data.digest) {
          digestCacheRef.current[selectedId] = data.digest;
          setSelectedDigest(data.digest);
        }
      } catch (err) {
        console.error('[NewsDigestReader] Failed to load digest detail:', err);
      } finally {
        if (isMounted) setLoadingDetail(false);
      }
    };

    loadDetail();
    return () => { isMounted = false; };
  }, [selectedId]);

  // Handle on-demand generation
  const handleGenerate = async (days: number = 7) => {
    try {
      setGeneratingDays(days);
      const res = await fetch('/api/news/digests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, type: 'ondemand' })
      });
      const data = await res.json();
      if (data.success && data.digest) {
        setDigestCache(prev => ({ ...prev, [data.digest.id]: data.digest }));
        setSelectedId(data.digest.id);
        setSelectedDigest(data.digest);
        fetchDigests();
      } else {
        alert(data.message || 'ไม่สามารถสร้างสรุปข่าวได้ในขณะนี้');
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการสังเคราะห์ข่าว: ' + err.message);
    } finally {
      setGeneratingDays(null);
    }
  };

  // Copy Markdown
  const handleCopy = async () => {
    if (!selectedDigest?.raw_markdown) return;
    try {
      await navigator.clipboard.writeText(selectedDigest.raw_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  // Push to LINE
  const handlePushLine = async () => {
    if (!selectedDigest) return;
    try {
      setSendingLine(true);
      const res = await fetch(`/api/news/digests/${selectedDigest.id}/push-line`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLineSent(true);
        setTimeout(() => setLineSent(false), 3000);
      } else {
        alert('ส่งเข้า LINE ไม่สำเร็จ: ' + (data.error || 'กรุณาลองใหม่อีกครั้ง'));
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการส่งเข้า LINE: ' + err.message);
    } finally {
      setSendingLine(false);
    }
  };

  // Filtered digests list
  const filteredDigests = useMemo(() => {
    return digests.filter(d => {
      if (filterType !== 'all' && d.digest_type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (d.title || '').toLowerCase().includes(q);
        const matchesTicker = (d.tickers_covered || []).some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTicker) return false;
      }
      return true;
    });
  }, [digests, filterType, searchQuery]);

  // Markdown Parser
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let keyIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        elements.push(<div key={`spacer-${keyIdx++}`} className="h-3" />);
        continue;
      }

      // H1 Header
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${keyIdx++}`} className="text-xl sm:text-2xl font-black text-white mt-6 mb-3 pb-2 border-b border-slate-700/60 flex items-center gap-2 font-heading">
            <span className="text-indigo-400">#</span> {trimmed.slice(2)}
          </h1>
        );
        continue;
      }

      // H2 Header
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${keyIdx++}`} className="text-lg sm:text-xl font-bold text-indigo-300 mt-6 mb-3 flex items-center gap-2 font-heading">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
            {trimmed.slice(3)}
          </h2>
        );
        continue;
      }

      // H3 Header
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${keyIdx++}`} className="text-base sm:text-lg font-bold text-slate-200 mt-4 mb-2 font-heading">
            {trimmed.slice(4)}
          </h3>
        );
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('>')) {
        elements.push(
          <div key={`bq-${keyIdx++}`} className="border-l-4 border-indigo-500/80 bg-indigo-950/20 px-4 py-2.5 my-3 rounded-r-xl text-slate-300 italic text-sm leading-relaxed">
            {renderInlineMarkdown(trimmed.replace(/^>\s*/, ''))}
          </div>
        );
        continue;
      }

      // Bullet points (-, *, •)
      if (/^[-*•]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[-*•]\s+/, '');
        elements.push(
          <div key={`bullet-${keyIdx++}`} className="flex items-start gap-2.5 my-2 pl-2 text-sm sm:text-base text-slate-200 leading-relaxed font-body">
            <span className="text-indigo-400 font-bold mt-1 select-none">•</span>
            <div className="flex-1">{renderInlineMarkdown(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Horizontal Divider
      if (/^---|\*\*\*|___$/.test(trimmed)) {
        elements.push(
          <hr key={`hr-${keyIdx++}`} className="border-slate-800 my-5" />
        );
        continue;
      }

      // Regular Paragraph
      elements.push(
        <p key={`p-${keyIdx++}`} className="text-sm sm:text-base text-slate-300 leading-relaxed my-2 font-body">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }

    return elements;
  };

  const renderInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\[\$?[A-Z0-9\.\-]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (/^\[\$?[A-Z0-9\.\-]+\]$/.test(part)) {
        const ticker = part.replace(/[\[\]\$]/g, '');
        return (
          <span 
            key={idx}
            onClick={() => onSelectTicker?.(ticker)}
            className="inline-block px-1.5 py-0.5 mx-0.5 text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded cursor-pointer hover:bg-indigo-500/30 transition-colors"
            title={`คลิกเพื่อดูข่าวของหุ้น ${ticker}`}
          >
            ${ticker}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* 1. Header & Actions Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-heading">
              AI Market & Portfolio Briefings
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                Sunday 19:00 ICT • GPT-5.6 Terra
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              คลังบทสรุปข่าวกรองการลงทุนฉบับผู้บริหาร — สังเคราะห์สาระสำคัญ ภาพนโยบาย Macro และผลกระทบต่อพอร์ตโฟลิโอ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onSwitchToFeed && (
            <button
              onClick={onSwitchToFeed}
              className="px-3.5 py-2 rounded-xl bg-[#1A1D2D] hover:bg-[#252A40] text-slate-300 hover:text-white border border-[#2A2E45] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับไปฟีดข่าวสด
            </button>
          )}

          <button
            onClick={() => handleGenerate(7)}
            disabled={generatingDays !== null}
            className={clsx(
              "px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer",
              generatingDays === 7
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 animate-pulse"
                : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/50"
            )}
            title="สร้าง AI Weekly Market & Portfolio Brief รอบ 7 วันล่าสุดทันที"
          >
            <Sparkles className={clsx("w-3.5 h-3.5", generatingDays === 7 && "animate-spin")} />
            {generatingDays === 7 ? 'กำลังสังเคราะห์ 7 วัน...' : '⚡ สรุป 7 วันล่าสุด'}
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Archive Library Master List (4 Cols) */}
        <div className="lg:col-span-4 bg-[#111418] border border-[#2A2E45] rounded-2xl p-4 space-y-3.5 shadow-lg flex flex-col max-h-[calc(100vh-210px)] overflow-hidden">
          <div className="flex items-center justify-between pb-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white font-heading">คลังประวัติบทสรุป</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredDigests.length}
              </span>
            </div>
            <button
              onClick={fetchDigests}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="รีเฟรชรายการ"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", loadingList && "animate-spin")} />
            </button>
          </div>

          {/* Search & Type Filter */}
          <div className="space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="ค้นหาชื่อชุดสรุป หรือ $TICKER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B0D13] text-xs text-white pl-8 pr-3 py-2 rounded-xl border border-[#2A2E45] focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-[#0B0D13] p-1 rounded-xl border border-[#2A2E45]">
              {(['all', 'weekly', 'ondemand'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={clsx(
                    "flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize",
                    filterType === t
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {t === 'all' ? 'ทั้งหมด' : t === 'weekly' ? 'Weekly' : 'On-Demand'}
                </button>
              ))}
            </div>
          </div>

          {/* Archive Cards List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingList && digests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs">กำลังโหลดคลังประวัติ...</span>
              </div>
            ) : filteredDigests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs space-y-3 px-2">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p>ไม่พบบทสรุปตามเงื่อนไขที่เลือก</p>
                <button
                  onClick={() => handleGenerate(7)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 transition-colors text-xs font-semibold"
                >
                  สร้างสรุป 7 วันเดี๋ยวนี้
                </button>
              </div>
            ) : (
              filteredDigests.map((d) => {
                const isSelected = selectedId === d.id;
                const isWeekly = d.digest_type === 'weekly';
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={clsx(
                      "p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 text-left group",
                      isSelected
                        ? "bg-[#1E1B4B]/60 border-indigo-500/80 shadow-[0_0_16px_rgba(99,102,241,0.2)]"
                        : "bg-[#0B0D13] hover:bg-[#151824] border-[#1F2233] hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        isWeekly 
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" 
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      )}>
                        {isWeekly ? 'Weekly' : 'On-Demand'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatDigestDate(d.created_at)}
                      </span>
                    </div>

                    <h4 className={clsx(
                      "text-xs sm:text-sm font-bold transition-colors line-clamp-2 leading-snug",
                      isSelected ? "text-white" : "text-slate-300 group-hover:text-white"
                    )}>
                      {d.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>{d.article_count} ข่าวที่วิเคราะห์</span>
                      {d.tickers_covered && d.tickers_covered.length > 0 && (
                        <div className="flex items-center gap-1">
                          {d.tickers_covered.slice(0, 3).map(t => (
                            <span key={t} className="px-1 py-0.2 bg-slate-800 text-slate-300 rounded font-mono text-[10px]">
                              ${t}
                            </span>
                          ))}
                          {d.tickers_covered.length > 3 && (
                            <span className="text-[10px] text-slate-500">+{d.tickers_covered.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full-Featured Editorial Reader (8 Cols) */}
        <div className="lg:col-span-8 bg-[#111418] border border-[#2A2E45] rounded-2xl shadow-xl flex flex-col min-h-[500px]">
          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm font-semibold">กำลังโหลดบทสรุปฉบับเต็ม...</p>
            </div>
          ) : !selectedDigest ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-500 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">เลือกบทสรุปจากแถบด้านซ้ายเพื่อเปิดอ่าน</p>
            </div>
          ) : (
            <>
              {/* Reader Header Banner */}
              <div className="p-6 border-b border-[#2A2E45] bg-[#0E1017]/80 rounded-t-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                        selectedDigest.digest_type === 'weekly' 
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" 
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      )}>
                        {selectedDigest.digest_type === 'weekly' ? 'Weekly Market Brief' : 'On-Demand Digest'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatDigestDate(selectedDigest.created_at)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        • {selectedDigest.article_count} ข่าวกรองที่คัดกรอง
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight leading-snug">
                      {selectedDigest.title}
                    </h1>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={handlePushLine}
                      disabled={sendingLine || lineSent}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm",
                        lineSent
                          ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40"
                          : "text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/30"
                      )}
                      title="ส่งบทสรุปนี้เข้า LINE (Money AI)"
                    >
                      {lineSent ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ส่ง LINE แล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Send className={clsx("w-3.5 h-3.5", sendingLine && "animate-spin")} />
                          <span>{sendingLine ? 'กำลังส่ง...' : 'ส่งเข้า LINE'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopy}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm",
                        copied
                          ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                          : "text-slate-300 bg-[#1A1D2D] hover:bg-[#252A40] border-[#2A2E45] hover:text-white"
                      )}
                      title="คัดลอกบทความรูปแบบ Markdown"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                          <span>คัดลอกแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Ticker Badges Bar */}
                {selectedDigest.tickers_covered && selectedDigest.tickers_covered.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                    <span className="text-slate-400 font-medium">หุ้นที่ครอบคลุม:</span>
                    {selectedDigest.tickers_covered.map(t => (
                      <button
                        key={t}
                        onClick={() => onSelectTicker?.(t)}
                        className="px-2 py-0.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-500/30 font-mono text-xs font-bold transition-all cursor-pointer"
                        title={`คลิกเพื่อสลับไปดูข่าวของ ${t}`}
                      >
                        ${t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reader Body Content */}
              <div className="p-6 sm:p-8 overflow-y-auto leading-relaxed space-y-4">
                {selectedDigest.raw_markdown ? (
                  <article className="prose prose-invert max-w-none">
                    {renderMarkdown(selectedDigest.raw_markdown)}
                  </article>
                ) : (
                  <div className="text-center py-16 text-slate-500 text-sm">
                    ไม่มีเนื้อหาสำหรับบทสรุปนี้
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
