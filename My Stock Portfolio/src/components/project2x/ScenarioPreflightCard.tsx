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
        { label: 'EMA 9 Trigger', pass: isAboveEma9 ?? true, value: isAboveEma9 ? 'Unlocked ⚡' : 'Locked 🔒' },
        { label: 'Banker Flow', pass: (banker ?? 0) >= 5, value: `${(banker ?? 0).toFixed(1)}/20` },
      ];

  const passedCount = effectiveChecklist.filter(item => item.pass).length;
  const totalCount = effectiveChecklist.length;
  const passPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
  const isPerfectPass = passPct === 100;

  // Calculate viewport position relative to trigger (Compact width: 290px)
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const cardWidth = Math.min(295, window.innerWidth - 24);
      let left = rect.left;
      if (left + cardWidth > window.innerWidth - 12) {
        left = window.innerWidth - cardWidth - 12;
      }
      left = Math.max(12, left);

      setCoords({
        top: rect.bottom + 6,
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
    }, 40);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
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
  let cardGlow = 'shadow-[0_12px_32px_rgba(0,0,0,0.85)]';
  let progressGlow = 'from-emerald-500 to-teal-400';

  if (tier.id === 'TO_THE_MOON') {
    cardBorder = 'border-purple-500/50';
    cardGlow = 'shadow-[0_12px_32px_rgba(168,85,247,0.3)]';
    progressGlow = 'from-purple-500 via-indigo-400 to-cyan-400';
  } else if (tier.id === 'BUY_NOW') {
    cardBorder = 'border-emerald-500/50';
    cardGlow = 'shadow-[0_12px_32px_rgba(16,185,129,0.3)]';
    progressGlow = 'from-emerald-500 to-green-400';
  } else if (tier.id === 'BUY_ZONE') {
    cardBorder = 'border-cyan-500/50';
    cardGlow = 'shadow-[0_12px_32px_rgba(6,182,212,0.3)]';
    progressGlow = 'from-cyan-500 to-blue-400';
  } else if (tier.id === 'GET_READY') {
    cardBorder = 'border-amber-500/50';
    cardGlow = 'shadow-[0_12px_32px_rgba(245,158,11,0.3)]';
    progressGlow = 'from-amber-500 to-yellow-400';
  } else if (tier.id === 'MAYDAY_EXIT' || tier.id === 'SLOW_BLEED' || tier.id === 'DANGER') {
    cardBorder = 'border-rose-500/60';
    cardGlow = 'shadow-[0_12px_32px_rgba(244,63,94,0.35)]';
    progressGlow = 'from-rose-500 to-red-600';
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
          className={`transition-all duration-150 ${
            isOpen ? 'brightness-125 scale-[1.01]' : 'hover:brightness-110'
          }`}
        >
          {children}
        </div>
      </div>

      {/* Mini Compact Modern Elegance Preflight Card */}
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
          className={`w-[290px] sm:w-[305px] max-w-[92vw] rounded-xl bg-[#090D16]/98 backdrop-blur-2xl border ${cardBorder} ${cardGlow} transition-all duration-150 animate-in fade-in zoom-in-95 font-mono select-none overflow-hidden`}
        >
          {/* Top Indicator Pip (Arrow) */}
          <div className="absolute -top-1 left-5 w-2.5 h-2.5 bg-[#090D16] border-t border-l border-white/20 transform rotate-45 pointer-events-none" />

          {/* Compact Elegance Header */}
          <div className="px-3 py-2 border-b border-white/10 bg-white/[0.03] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`px-2 py-0.5 rounded text-xs font-black inline-flex items-center gap-1 shrink-0 ${tier.badgeClass}`}>
                <span>{tier.icon}</span>
                <span>{tier.label}</span>
              </span>
              <span className="text-xs font-bold text-slate-200 truncate">
                {badge ? `${badge} • S${scenario}` : `S${scenario}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-bold font-mono ${isPerfectPass ? 'text-emerald-300' : 'text-amber-300'}`}>
                {passedCount}/{totalCount}
              </span>
              <div className="w-10 h-1 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                <div 
                  className={`h-full rounded-full transition-all duration-200 bg-gradient-to-r ${progressGlow}`}
                  style={{ width: `${passPct}%` }}
                />
              </div>
              {isPinned && (
                <span className="text-xs text-amber-400" title="Pinned">📌</span>
              )}
            </div>
          </div>

          {/* Mini Checklist Rows */}
          <div className="p-2 space-y-1 max-h-[190px] overflow-y-auto scrollbar-none text-xs">
            {effectiveChecklist.map((item, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between px-2 py-1 rounded-md border transition-colors ${
                  item.pass 
                    ? 'bg-emerald-950/25 border-emerald-500/20 text-emerald-200' 
                    : 'bg-rose-950/25 border-rose-500/20 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`font-bold shrink-0 ${item.pass ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {item.pass ? '✓' : '✕'}
                  </span>
                  <span className="text-slate-300 truncate">
                    {item.label}
                  </span>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="font-bold font-mono text-slate-100">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Compact Directive Footer */}
          {reasonTh && (
            <div className="px-2.5 py-1.5 border-t border-white/10 bg-black/40 text-xs text-slate-200 flex items-start gap-1.5 leading-snug">
              <span className="text-amber-400 shrink-0 text-xs mt-[1px]">💡</span>
              <span className="line-clamp-2 text-slate-200">{reasonTh}</span>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
