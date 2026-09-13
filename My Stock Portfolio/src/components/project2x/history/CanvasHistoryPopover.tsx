import React, { useEffect, useRef } from 'react';
import {
  History,
  Trash2,
  TrendingUp,
  Minus,
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  X,
  Clock,
} from 'lucide-react';
import { useCanvasHistoryStore, CanvasCommand, CanvasIconType } from '../../../stores/canvasHistoryStore';

interface CanvasHistoryPopoverProps {
  symbol: string;
  onClose: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return 'เมื่อสักครู่';
  if (diffSec < 60) return `${diffSec}s ที่แล้ว`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ที่แล้ว`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ที่แล้ว`;
}

function getActionIcon(iconType: CanvasIconType) {
  switch (iconType) {
    case 'line':
      return <Minus className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'trend':
      return <TrendingUp className="w-4 h-4 text-blue-400 shrink-0" />;
    case 'indicator':
      return <Layers className="w-4 h-4 text-purple-400 shrink-0" />;
    case 'trash':
      return <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />;
    case 'sparkles':
      return <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />;
    default:
      return <History className="w-4 h-4 text-slate-300 shrink-0" />;
  }
}

export const CanvasHistoryPopover: React.FC<CanvasHistoryPopoverProps> = ({ symbol, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const past = useCanvasHistoryStore((state) => state.past);
  const future = useCanvasHistoryStore((state) => state.future);
  const jumpToPast = useCanvasHistoryStore((state) => state.jumpToPast);
  const jumpToFuture = useCanvasHistoryStore((state) => state.jumpToFuture);
  const clearHistory = useCanvasHistoryStore((state) => state.clearHistory);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const totalActions = past.length + future.length;

  return (
    <div
      ref={popoverRef}
      className="absolute top-full right-0 mt-2 w-80 md:w-96 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md z-50 overflow-hidden flex flex-col text-[13px] animate-in fade-in duration-150"
      style={{ maxHeight: '480px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <span className="font-extrabold text-slate-200">ประวัติการกระทำ (History)</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[13px] font-mono font-bold">
            {past.length}/30
          </span>
        </div>
        <div className="flex items-center gap-1">
          {totalActions > 0 && (
            <button
              onClick={() => clearHistory()}
              title="ล้างประวัติทั้งหมด"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-1.5 space-y-1">
        {totalActions === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 px-4">
            <RotateCcw className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
            <div className="font-bold text-slate-300 text-[13px]">ยังไม่มีประวัติการกระทำ</div>
            <div className="text-[13px] text-slate-400 mt-1">
              เมื่อวาดเส้น ปรับแต่ง หรือเปิด/ปิดอินดิเคเตอร์ ประวัติจะถูกบันทึกที่นี่
            </div>
          </div>
        ) : (
          <>
            {/* 1. Future Actions (Redoable) */}
            {future.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-[13px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>อนาคต (Redoable)</span>
                  <span className="text-slate-500 font-normal">— คลิกเพื่อก้าวไปข้างหน้า</span>
                </div>
                <div className="space-y-0.5">
                  {future.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => jumpToFuture(cmd.id, symbol)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-slate-400 italic hover:text-amber-300 hover:bg-slate-800/70 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="opacity-60 group-hover:opacity-100">{getActionIcon(cmd.iconType)}</div>
                        <span className="truncate text-slate-300 group-hover:text-amber-200">{cmd.description}</span>
                        {cmd.symbol !== 'GLOBAL' && (
                          <span className="px-1 py-0.2 rounded text-[13px] bg-slate-800/80 text-slate-400 font-mono font-bold shrink-0">
                            {cmd.symbol}
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] text-slate-400 shrink-0 font-mono">
                        {formatRelativeTime(cmd.timestamp)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Current Canvas Anchor */}
            <div className="px-2.5 py-1.5 my-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-emerald-300 font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>สถานะปัจจุบันบน Canvas</span>
              </div>
              <span className="text-[13px] text-emerald-400 font-normal font-mono">ACTIVE</span>
            </div>

            {/* 3. Past Actions (Undoable) */}
            {past.length > 0 && (
              <div className="pt-1">
                <div className="px-2 py-1 text-[13px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>ประวัติที่ผ่านมา (Undoable)</span>
                  <span className="text-slate-500 font-normal">— คลิกเพื่อย้อนกลับทันที</span>
                </div>
                <div className="space-y-0.5">
                  {past.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      onClick={() => jumpToPast(cmd.id, symbol)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
                        idx === 0
                          ? 'bg-slate-800/50 hover:bg-slate-800 text-slate-200'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getActionIcon(cmd.iconType)}
                        <span className="truncate group-hover:text-amber-300">{cmd.description}</span>
                        {cmd.symbol !== 'GLOBAL' && (
                          <span className="px-1 py-0.2 rounded text-[13px] bg-slate-800/90 text-slate-300 font-mono font-bold shrink-0">
                            {cmd.symbol}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[13px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span>{formatRelativeTime(cmd.timestamp)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[13px] text-slate-400">
        <span>คีย์ลัด: Ctrl+Z (Undo) / Ctrl+Y (Redo)</span>
        <span className="font-bold text-slate-300">คลิกที่รายการเพื่อวาร์ปทันที</span>
      </div>
    </div>
  );
};
