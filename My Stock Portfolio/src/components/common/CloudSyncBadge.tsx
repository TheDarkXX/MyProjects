import React, { useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useSyncStatusStore } from '../../stores/syncStatusStore';
import { forceResync } from '../../services/settingsSync';
import { useRelativeTime } from '../../hooks/useRelativeTime';
import clsx from 'clsx';

interface CloudSyncBadgeProps {
  variant?: 'header' | 'tab';
  className?: string;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({ variant = 'tab', className }) => {
  const { status, operation, lastSyncedAt, lastError } = useSyncStatusStore();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const relativeTime = useRelativeTime(lastSyncedAt);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'syncing' || isManualSyncing) return;
    setIsManualSyncing(true);
    try {
      await forceResync();
    } finally {
      setTimeout(() => setIsManualSyncing(false), 500);
    }
  };

  const isSyncing = status === 'syncing' || isManualSyncing;

  const tooltipText = isSyncing
    ? (operation === 'push' ? 'กำลังส่งการตั้งค่าขึ้น VPS SQLite...' : 'กำลังดึงการตั้งค่าล่าสุดจาก VPS SQLite...')
    : status === 'error'
      ? `ซิงค์ล้มเหลว (${lastError || 'Network Error'}) • คลิกเพื่อลองใหม่`
      : lastSyncedAt
        ? `Universal Cloud Sync: เชื่อมต่อ VPS สำเร็จ (${relativeTime}) • คลิกเพื่อ Force Sync`
        : 'Universal Cloud Sync พร้อมใช้งาน • คลิกเพื่อซิงค์ทันที';

  // 1. Tab Variant (Inside X-Chart Tab Bar capsule)
  if (variant === 'tab') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isSyncing}
        className={clsx(
          "flex items-center gap-1.5 text-[13px] font-bold cursor-pointer transition-all select-none group focus:outline-none",
          isSyncing && "opacity-90 cursor-wait",
          className
        )}
        title={tooltipText}
      >
        {/* Yellow/Amber LED Dot for Synced */}
        <span className="relative flex items-center justify-center shrink-0">
          <span
            className={clsx(
              "w-2 h-2 rounded-full transition-all duration-300",
              status === 'error'
                ? "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                : isSyncing
                  ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                  : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
            )}
          />
          {status === 'synced' && (
            <span className="absolute w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-30 pointer-events-none" />
          )}
        </span>

        {isSyncing ? (
          <span className="flex items-center gap-1 text-[13px] text-cyan-300 font-semibold">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Syncing...</span>
          </span>
        ) : status === 'error' ? (
          <span className="text-[13px] text-rose-400 font-semibold">Sync Error</span>
        ) : (
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-amber-300 group-hover:text-amber-200 transition-colors font-bold">
              Synced
            </span>
            <span className="text-slate-600 text-[11px]">•</span>
            <span className="font-semibold text-slate-300 tabular-nums">
              {relativeTime}
            </span>
          </div>
        )}
      </button>
    );
  }

  // 2. Header Variant (Ultra-Minimalist Twin Capsule for Top Header)
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSyncing}
      className={clsx(
        "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151822]/80 border transition-all cursor-pointer backdrop-blur-md select-none group hover:-translate-y-0.5 font-heading shadow-sm",
        status === 'error'
          ? "border-rose-500/50 hover:bg-rose-950/30 text-rose-300"
          : isSyncing
            ? "border-cyan-500/50 hover:bg-cyan-950/30 text-cyan-300 cursor-wait"
            : "border-[#2A2E45]/80 hover:border-amber-500/50 hover:bg-[#1A1D2D] text-slate-200",
        className
      )}
      title={tooltipText}
    >
      {/* Yellow/Amber LED Dot */}
      <div className="relative flex items-center justify-center shrink-0">
        <span
          className={clsx(
            "w-2 h-2 rounded-full transition-all duration-300",
            status === 'error'
              ? "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.9)]"
              : isSyncing
                ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
          )}
        />
        {status === 'synced' && (
          <span className="absolute w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-30 pointer-events-none" />
        )}
      </div>

      {/* Single-line Minimalist Content */}
      {isSyncing ? (
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-cyan-300">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Syncing...</span>
        </div>
      ) : status === 'error' ? (
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-rose-400">
          <CloudOff className="w-3.5 h-3.5" />
          <span>Sync Error</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[13px]">
          <span className="font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
            Synced
          </span>
          <span className="text-slate-600 text-[11px]">•</span>
          <span className="font-semibold text-slate-300 tabular-nums">
            {relativeTime}
          </span>
        </div>
      )}
    </button>
  );
};
