import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getTierMetadata, CyberTier } from '../../utils/tierConfig';

export interface SignalCheckItem {
  label: string;
  pass: boolean;
  value: string;
}

export interface ScenarioPreflightCardProps {
  scenario?: number;
  badge?: string;
  trafficLight?: CyberTier;
  regime?: 'BULL' | 'BEAR' | 'NEUTRAL';
  reasonTh?: string;
  signalsChecklist?: SignalCheckItem[];
  distEma200?: number;
  distEma9?: number;
  isAboveEma9?: boolean;
  banker?: number;
  children: React.ReactNode;
}

export const ScenarioPreflightCard: React.FC<ScenarioPreflightCardProps> = ({
  scenario = 1,
  badge = 'Consolidating',
  trafficLight = 'ON_RADAR',
  regime = 'NEUTRAL',
  reasonTh,
  signalsChecklist = [],
  distEma200,
  distEma9,
  isAboveEma9,
  banker,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const tier = getTierMetadata(trafficLight);

  // Fallback checklist if engine didn't supply full checklist array
  const effectiveChecklist: SignalCheckItem[] = signalsChecklist && signalsChecklist.length > 0 
    ? signalsChecklist 
    : [
        { label: 'EMA Regime', pass: regime === 'BULL', value: regime || 'NEUTRAL' },
        { label: 'Dist EMA 200', pass: distEma200 !== undefined ? Math.abs(distEma200) <= 3.5 : true, value: distEma200 !== undefined ? `${distEma200 >= 0 ? '+' : ''}${distEma200.toFixed(1)}%` : 'Active' },
        { label: 'EMA 9 Trigger', pass: isAboveEma9 ?? true, value: isAboveEma9 ? 'Above EMA 9 (Unlocked ⚡)' : 'Below EMA 9 (Locked 🔒)' },
        { label: 'Banker Flow', pass: (banker ?? 0) >= 5, value: `${(banker ?? 0).toFixed(1)} / 20` },
      ];

  const passedCount = effectiveChecklist.filter(item => item.pass).length;
  const totalCount = effectiveChecklist.length;
  const passPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const isPerfectPass = passPct === 100;

  // Calculate viewport position relative to trigger
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const cardWidth = Math.min(380, window.innerWidth - 24);
      let left = rect.left;
      if (left + cardWidth > window.innerWidth - 12) {
        left = window.innerWidth - cardWidth - 12;
      }
      left = Math.max(12, left);

      setCoords({
        top: rect.bottom + 8,
        left,
      });
    }
  }, []);

  // Hover delay buffer to prevent accidental closing
  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    updatePosition();
    timerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 50);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Toggle pinned state on click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setIsPinned(prev => {
      const next = !prev;
      setIsOpen(next);
      return next;
    });
  };

  // Recalculate on window resize / scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click if pinned or open
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        cardRef.current && !cardRef.current.contains(e.target as Node)
      ) {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Glow theme per tier
  let cardBorder = 'border-slate-700/80';
  let cardGlow = 'shadow-[0_20px_50px_rgba(0,0,0,0.9)]';
  let progressGlow = 'from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]';

  if (tier.id === 'TO_THE_MOON') {
    cardBorder = 'border-purple-500/60';
    cardGlow = 'shadow-[0_20px_50px_rgba(168,85,247,0.4)]';
    progressGlow = 'from-purple-500 via-indigo-400 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]';
  } else if (tier.id === 'BUY_NOW') {
    cardBorder = 'border-emerald-500/60';
    cardGlow = 'shadow-[0_20px_50px_rgba(16,185,129,0.4)]';
    progressGlow = 'from-emerald-500 to-green-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
  } else if (tier.id === 'BUY_ZONE') {
    cardBorder = 'border-cyan-500/60';
    cardGlow = 'shadow-[0_20px_50px_rgba(6,182,212,0.4)]';
    progressGlow = 'from-cyan-500 to-blue-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]';
  } else if (tier.id === 'GET_READY') {
    cardBorder = 'border-amber-500/60';
    cardGlow = 'shadow-[0_20px_50px_rgba(245,158,11,0.4)]';
    progressGlow = 'from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]';
  } else if (tier.id === 'MAYDAY_EXIT' || tier.id === 'SLOW_BLEED' || tier.id === 'DANGER') {
    cardBorder = 'border-rose-500/70';
    cardGlow = 'shadow-[0_20px_50px_rgba(244,63,94,0.45)]';
    progressGlow = 'from-rose-500 to-red-600 shadow-[0_0_12px_rgba(244,63,94,0.5)]';
  }

  return (
    <>
      {/* Trigger Container */}
      <div 
        className="relative inline-flex items-center cursor-pointer" 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div 
          className={`transition-all duration-200 ${
            isOpen ? 'ring-2 ring-white/40 scale-[1.02] brightness-125 rounded-md' : 'hover:brightness-110'
          }`}
        >
          {children}
        </div>
      </div>

      {/* Floating Hologram Preflight Card via Portal to bypass overflow clipping */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={cardRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ 
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999
          }}
          className={`w-[340px] sm:w-[380px] max-w-[92vw] rounded-xl bg-[#090D16]/98 backdrop-blur-2xl border ${cardBorder} ${cardGlow} transition-all duration-200 animate-in fade-in zoom-in-95 font-mono select-none overflow-hidden`}
        >
          {/* Top Indicator Pip (Arrow) */}
          <div className="absolute -top-1.5 left-6 w-3 h-3 bg-[#090D16] border-t border-l border-white/20 transform rotate-45 pointer-events-none" />

          {/* Hologram Card Header */}
          <div className="px-3.5 pt-3 pb-2.5 border-b border-white/10 bg-gradient-to-r from-white/[0.05] to-transparent">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-bold tracking-wider text-slate-200 uppercase">
                <span className="text-amber-400">📡</span>
                <span>PREFLIGHT RADAR HUD</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200">
                  SCENARIO {scenario.toString().padStart(2, '0')}
                </span>
                {isPinned && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                    PINNED
                  </span>
                )}
              </div>
            </div>

            {/* Action Tier & Scenario Badge */}
            <div className="flex items-center gap-2 mt-2">
              <div className={`px-2.5 py-0.5 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-md border ${tier.badgeClass} ${tier.borderClass}`}>
                <span className={tier.animClass}>{tier.icon}</span>
                <span>{tier.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-200 truncate">
                {badge}
              </span>
            </div>

            {/* Criteria Verification Progress Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 font-semibold uppercase tracking-wider">
                  Checklist Criteria:
                </span>
                <span className={`font-black ${isPerfectPass ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {passedCount}/{totalCount} ({passPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/10 p-[0.5px]">
                <div 
                  className={`h-full rounded-full transition-all duration-300 bg-gradient-to-r ${progressGlow}`}
                  style={{ width: `${passPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Checklist Rows */}
          <div className="p-3 space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-none">
            {effectiveChecklist.map((item, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all duration-150 ${
                  item.pass 
                    ? 'bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-950/60 hover:border-emerald-500/50 text-emerald-200' 
                    : 'bg-rose-950/40 border-rose-500/30 hover:bg-rose-950/60 hover:border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    item.pass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {item.pass ? '✓' : '✕'}
                  </span>
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {item.label}
                  </span>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="text-xs font-bold font-mono text-slate-100">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tactical Directive Rationale Footer */}
          {reasonTh && (
            <div className="px-3.5 py-2.5 border-t border-white/10 bg-black/40 text-xs">
              <div className="flex items-start gap-1.5 font-sans leading-relaxed text-slate-200">
                <span className="text-amber-400 shrink-0 text-sm mt-[-1px]">💡</span>
                <div>
                  <span className="text-slate-400 font-mono text-xs font-bold block mb-0.5">
                    TACTICAL DIRECTIVE:
                  </span>
                  <span>{reasonTh}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card Micro Footer Tip */}
          <div className="px-3 py-1 bg-black/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-sans">
            <span>แตะเพื่อปักหมุด / เลื่อนเมาส์ออกเพื่อปิด</span>
            <span className="font-mono text-slate-300 font-bold">{tier.id}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
