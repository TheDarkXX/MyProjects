import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Calendar, 
  Layers, 
  FileText, 
  ExternalLink,
  Sparkles,
  Clock,
  Send
} from 'lucide-react';
import { NewsDigest } from './types';

interface NewsDigestModalProps {
  digest: NewsDigest | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTicker?: (ticker: string) => void;
}

export const NewsDigestModal: React.FC<NewsDigestModalProps> = ({
  digest,
  isOpen,
  onClose,
  onSelectTicker
}) => {
  const [copied, setCopied] = useState(false);
  const [sendingLine, setSendingLine] = useState(false);
  const [lineSent, setLineSent] = useState(false);

  if (!isOpen || !digest) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(digest.raw_markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  const handlePushLine = async () => {
    if (!digest) return;
    setSendingLine(true);
    try {
      const res = await fetch(`/api/news/digests/${digest.id}/push-line`, { method: 'POST' });
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

  // Simple, robust Markdown parser for standard briefings
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
          <h1 key={`h1-${keyIdx++}`} className="text-xl sm:text-2xl font-bold text-white mt-4 mb-2 pb-2 border-b border-slate-700/60 flex items-center gap-2">
            <span className="text-indigo-400">#</span> {trimmed.slice(2)}
          </h1>
        );
        continue;
      }

      // H2 Header
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${keyIdx++}`} className="text-lg sm:text-xl font-bold text-indigo-300 mt-6 mb-3 flex items-center gap-2">
            {trimmed.slice(3)}
          </h2>
        );
        continue;
      }

      // H3 Header
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${keyIdx++}`} className="text-base sm:text-lg font-semibold text-slate-200 mt-4 mb-2">
            {trimmed.slice(4)}
          </h3>
        );
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('>')) {
        elements.push(
          <div key={`bq-${keyIdx++}`} className="border-l-4 border-indigo-500/80 bg-indigo-950/20 px-4 py-2 my-2 rounded-r text-slate-300 italic text-sm">
            {renderInlineMarkdown(trimmed.replace(/^>\s*/, ''))}
          </div>
        );
        continue;
      }

      // Bullet points (-, *, •)
      if (/^[-*•]\s+/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[-*•]\s+/, '');
        elements.push(
          <div key={`bullet-${keyIdx++}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-sm sm:text-base text-slate-200 leading-relaxed">
            <span className="text-indigo-400 font-bold mt-1 select-none">•</span>
            <div className="flex-1">{renderInlineMarkdown(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Sub-bullet (indented)
      if (/^\s+[-*•]\s+/.test(line)) {
        const subBulletText = line.trim().replace(/^[-*•]\s+/, '');
        elements.push(
          <div key={`subbullet-${keyIdx++}`} className="flex items-start gap-2.5 my-1 pl-8 text-sm text-slate-300 leading-relaxed">
            <span className="text-slate-500 select-none">◦</span>
            <div className="flex-1">{renderInlineMarkdown(subBulletText)}</div>
          </div>
        );
        continue;
      }

      // Horizontal Divider
      if (/^---|\*\*\*|___$/.test(trimmed)) {
        elements.push(
          <hr key={`hr-${keyIdx++}`} className="border-slate-800 my-4" />
        );
        continue;
      }

      // Regular Paragraph
      elements.push(
        <p key={`p-${keyIdx++}`} className="text-sm sm:text-base text-slate-300 leading-relaxed my-1.5">
          {renderInlineMarkdown(trimmed)}
        </p>
      );
    }

    return elements;
  };

  // Helper for bold and ticker highlighting
  const renderInlineMarkdown = (text: string) => {
    // Regex for bold **text** or tickers [$TICKER]
    const parts = text.split(/(\*\*.*?\*\*|\[\$?[A-Z0-9\.\-]+\])/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-white">
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
            title={`คลิกเพื่อกรองข่าว ${ticker}`}
          >
            {ticker}
          </span>
        );
      }

      return part;
    });
  };

  const isWeekly = digest.digest_type === 'weekly';
  const createdDate = (() => {
    try {
      const raw = digest.created_at || '';
      const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
      const d = new Date(iso);
      if (isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return digest.created_at || '';
    }
  })();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-800/90 border-b border-slate-700/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isWeekly ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isWeekly 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {isWeekly ? 'Weekly Brief' : 'On-Demand Digest'}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {createdDate}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 line-clamp-1">
                {digest.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePushLine}
              disabled={sendingLine || lineSent}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-all ${
                lineSent
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                  : 'text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/30'
              }`}
              title="ส่งบทสรุปข่าวกรองชุดนี้เข้า LINE (Money AI)"
            >
              {lineSent ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>ส่งเข้า LINE แล้ว!</span>
                </>
              ) : (
                <>
                  <Send className={`w-3.5 h-3.5 text-emerald-400 ${sendingLine ? 'animate-pulse' : ''}`} />
                  <span>{sendingLine ? 'กำลังส่ง...' : 'ส่งเข้า LINE'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
              title="คัดลอกเนื้อหา Markdown ทั้งหมด"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>คัดลอก</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tickers & Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs sm:text-sm text-slate-300 flex-shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium">หุ้นที่ครอบคลุม:</span>
            {digest.tickers_covered && digest.tickers_covered.length > 0 ? (
              digest.tickers_covered.map(t => (
                <button
                  key={t}
                  onClick={() => onSelectTicker?.(t)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-indigo-900/40 text-slate-200 border border-slate-700 hover:border-indigo-500/50 rounded text-xs font-mono font-semibold transition-colors"
                >
                  ${t}
                </button>
              ))
            ) : (
              <span className="text-slate-500">-</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              สังเคราะห์จาก <strong>{digest.article_count}</strong> ข่าวกรอง
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-2 text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-white">
          {renderMarkdown(digest.raw_markdown)}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800/60 border-t border-slate-700/60 text-xs text-slate-400 flex-shrink-0">
          <span>AI News Digest • Portfolio Intelligence Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs sm:text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
