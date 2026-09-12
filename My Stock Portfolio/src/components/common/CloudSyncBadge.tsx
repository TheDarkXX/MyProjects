import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useSyncStatusStore } from '../../stores/syncStatusStore';
import { forceResync } from '../../services/settingsSync';
import clsx from 'clsx';

interface CloudSyncBadgeProps {
  variant?: 'header' | 'tab';
  className?: string;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({ variant = 'tab', className }) => {
  const { status, operation, lastSyncedAt, lastError } = useSyncStatusStore();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

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

  // Format timestamp for tooltip & UI
  const timeString = lastSyncedAt
    ? lastSyncedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // Tooltip content
  const tooltipText = isSyncing
    ? (operation === 'push' ? 'กำลังส่งการตั้งค่าขึ้น VPS SQLite...' : 'กำลังดึงการตั้งค่าล่าสุดจาก VPS SQLite...')
    : status === 'error'
      ? `ซิงค์ล้มเหลว (${lastError || 'Network Error'}) • คลิกเพื่อลองใหม่`
      : lastSyncedAt
        ? `Universal Cloud Sync: เชื่อมต่อ VPS สำเร็จ (${timeString} น.) • คลิกเพื่อ Force Sync`
        : 'Universal Cloud Sync พร้อมใช้งาน • คลิกเพื่อซิงค์ทันที';

  // 1. Tab Variant (Compact pill inside X-Chart Tab Bar capsule)
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
        {/* LED Indicator Dot - Yellow/Amber for Synced per user specification */}
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
            <span className="absolute w-2 h-2 rounded-full bg-amber-400 animate-ping opacity-40 pointer-events-none" />
          )}
        </span>

        {/* Icon & Label */}
        {isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 text-cyan-300 animate-spin shrink-0" />
        ) : status === 'error' ? (
          <CloudOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : (
          <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
        )}

        <span
          className={clsx(
            "text-[13px] tracking-wide transition-colors font-heading",
            status === 'error'
              ? "text-rose-400"
              : isSyncing
                ? "text-cyan-300"
                : "text-amber-300 group-hover:text-amber-200"
          )}
        >
          {isSyncing ? 'Syncing...' : status === 'error' ? 'Sync Error' : 'Cloud Synced'}
        </span>
      </button>
    );
  }

  // 2. Header Variant (For top layout Header)
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSyncing}
      className={clsx(
        "hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#151822]/80 border transition-all cursor-pointer backdrop-blur-md font-heading select-none group hover:-translate-y-0.5",
        status === 'error'
          ? "border-rose-500/50 hover:bg-rose-950/30 text-rose-300"
          : isSyncing
            ? "border-cyan-500/50 hover:bg-cyan-950/30 text-cyan-300 cursor-wait"
            : "border-[#2A2E45]/80 hover:border-amber-500/50 hover:bg-[#1A1D2D] text-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.2)]",
        className
      )}
      title={tooltipText}
    >
      {/* LED Indicator Dot */}
      <div className="relative flex items-center justify-center shrink-0">
        <span
          className={clsx(
            "w-2.5 h-2.5 rounded-full transition-all duration-300",
            status === 'error'
              ? "bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]"
              : isSyncing
                ? "bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.9)]"
                : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
          )}
        />
        {status === 'synced' && (
          <span className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping opacity-50 pointer-events-none" />
        )}
      </div>

      {/* Cloud Icon */}
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 text-cyan-300 animate-spin shrink-0" />
      ) : status === 'error' ? (
        <CloudOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      ) : (
        <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
      )}

      {/* Text Info */}
      <div className="flex flex-col text-left leading-tight">
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "font-bold text-[13px] tracking-wide transition-colors font-heading",
              status === 'error'
                ? "text-rose-300"
                : isSyncing
                  ? "text-cyan-300"
                  : "text-amber-300 group-hover:text-amber-200"
            )}
          >
            {isSyncing ? 'Syncing...' : status === 'error' ? 'Sync Error' : 'Cloud Synced'}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-normal tabular-nums font-heading">
          {timeString ? `${timeString} น.` : 'VPS Ready'}
        </span>
      </div>
    </button>
  );
};
