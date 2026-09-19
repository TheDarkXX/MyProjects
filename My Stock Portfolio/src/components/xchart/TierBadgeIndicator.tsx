import React from 'react';
import clsx from 'clsx';
import { RadarRow } from '../../stores/project2xStore';

// Deterministic gradient colors for fallback symbol badges (TradingView style)
const BADGE_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-600 to-red-600',
  'from-cyan-600 to-blue-600',
  'from-fuchsia-600 to-purple-600'
];

export function getSymbolBadgeGradient(sym: string): string {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % BADGE_GRADIENTS.length;
  return BADGE_GRADIENTS[idx];
}

export interface TierVisualInfo {
  tierId: string;
  icon: string;
  label: string;
  subLabel?: string;
  scenarioNum?: number;
  scenarioTitle?: string;
  reasonTh?: string;
  spineClass: string;
  badgeClass: string;
  textGlowClass?: string;
  isRecognized: boolean;
}

/**
 * Maps RadarRow or symbol into Cyber Action Matrix visual attributes (Hybrid 1 + 3)
 */
export function getTierVisualInfo(
  radarData?: RadarRow | null, 
  symbol: string = '', 
  isCurrency: boolean = false
): TierVisualInfo {
  if (isCurrency || symbol.includes('=X')) {
    return {
      tierId: 'CURRENCY',
      icon: '$',
      label: 'FX / Currency',
      spineClass: 'bg-gradient-to-b from-amber-500 to-yellow-600 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
      badgeClass: 'bg-amber-500/20 border border-amber-500/40 text-amber-300',
      isRecognized: true
    };
  }

  if (!radarData) {
    return {
      tierId: 'UNKNOWN',
      icon: symbol.slice(0, 1) || '•',
      label: 'Watchlist Asset',
      spineClass: 'bg-slate-700/40',
      badgeClass: clsx('bg-gradient-to-tr shadow-sm text-white font-bold', getSymbolBadgeGradient(symbol)),
      isRecognized: false
    };
  }

  const { traffic_light, badge = '', scenario, reason_th, reason } = radarData;
  const upperBadge = badge.toUpperCase();

  // Tier 1: BUY NOW!! 🔥
  if (traffic_light === 'BUY_NOW') {
    return {
      tierId: 'BUY_NOW',
      icon: '🔥',
      label: 'BUY NOW!!',
      subLabel: 'คอนเฟิร์มเข้าซื้อเต็มสูบ',
      scenarioNum: scenario,
      scenarioTitle: badge,
      reasonTh: reason_th || reason,
      spineClass: 'bg-gradient-to-b from-orange-500 via-red-500 to-rose-600 shadow-[0_0_10px_rgba(249,115,22,0.85)]',
      badgeClass: 'bg-red-500/20 border border-orange-500/60 text-orange-200 shadow-[0_0_8px_rgba(249,115,22,0.4)] animate-pulse',
      textGlowClass: 'text-orange-400 font-bold',
      isRecognized: true
    };
  }

  // Tier 2: TO THE MOON 🚀 / MOON (No Chase) ⛔
  if (traffic_light === 'TO_THE_MOON') {
    const isNoChase = upperBadge.includes('NO CHASE') || upperBadge.includes('⛔');
    return {
      tierId: 'TO_THE_MOON',
      icon: isNoChase ? '⛔' : '🚀',
      label: isNoChase ? 'MOON (No Chase)' : 'TO THE MOON',
      subLabel: isNoChase ? 'ยอดดอยห้ามไล่ราคา' : 'รันเทรนด์ปล่อยกำไรวิ่ง',
      scenarioNum: scenario,
      scenarioTitle: badge,
      reasonTh: reason_th || reason,
      spineClass: 'bg-gradient-to-b from-indigo-500 via-purple-500 to-violet-600 shadow-[0_0_10px_rgba(168,85,247,0.85)]',
      badgeClass: isNoChase 
        ? 'bg-purple-950/80 border border-purple-400/50 text-purple-200 shadow-[0_0_6px_rgba(168,85,247,0.4)]'
        : 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-violet-400/60 text-violet-200 shadow-[0_0_10px_rgba(168,85,247,0.5)]',
      textGlowClass: 'text-purple-300 font-bold',
      isRecognized: true
    };
  }

  // Tier 5: ON RADAR ➔ Split into RUNNER ⚡ vs DIP BUY 🧲
  if (traffic_light === 'ON_RADAR' || upperBadge.includes('RUNNER') || upperBadge.includes('DIP BUY')) {
    const isRunner = upperBadge.includes('RUNNER') || scenario === 15;
    if (isRunner) {
      return {
        tierId: 'RUNNER',
        icon: '⚡',
        label: 'RUNNER',
        subLabel: 'โต้คลื่นโมเมนตัมเหนือ EMA 9',
        scenarioNum: scenario,
        scenarioTitle: badge,
        reasonTh: reason_th || reason,
        spineClass: 'bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.85)]',
        badgeClass: 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)]',
        textGlowClass: 'text-cyan-300 font-semibold',
        isRecognized: true
      };
    } else {
      return {
        tierId: 'DIP_BUY',
        icon: '🧲',
        label: 'DIP BUY',
        subLabel: 'ทิ้งตัวหาแนวรับเตรียมกระสุน',
        scenarioNum: scenario,
        scenarioTitle: badge,
        reasonTh: reason_th || reason,
        spineClass: 'bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
        badgeClass: 'bg-orange-500/20 border border-orange-400/50 text-orange-200 shadow-[0_0_6px_rgba(249,115,22,0.35)]',
        textGlowClass: 'text-orange-300 font-semibold',
        isRecognized: true
      };
    }
  }

  // Tier 3: BUY ZONE 💰
  if (traffic_light === 'BUY_ZONE') {
    return {
      tierId: 'BUY_ZONE',
      icon: '💰',
      label: 'BUY ZONE',
      subLabel: 'โซนสะสมฐานไม้แรก DCA',
      scenarioNum: scenario,
      scenarioTitle: badge,
      reasonTh: reason_th || reason,
      spineClass: 'bg-gradient-to-b from-teal-400 via-emerald-500 to-teal-600 shadow-[0_0_8px_rgba(20,184,166,0.8)]',
      badgeClass: 'bg-teal-500/20 border border-teal-400/50 text-teal-200 shadow-[0_0_6px_rgba(20,184,166,0.35)]',
      textGlowClass: 'text-teal-300 font-semibold',
      isRecognized: true
    };
  }

  // Tier 4: GET READY ⏳
  if (traffic_light === 'GET_READY') {
    return {
      tierId: 'GET_READY',
      icon: '⏳',
      label: 'GET READY',
      subLabel: 'หมุนนาฬิกาทราย รอยืนเหนือ EMA 9',
      scenarioNum: scenario,
      scenarioTitle: badge,
      reasonTh: reason_th || reason,
      spineClass: 'bg-gradient-to-b from-yellow-400 via-amber-500 to-yellow-600 shadow-[0_0_8px_rgba(234,179,8,0.8)]',
      badgeClass: 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 shadow-[0_0_6px_rgba(234,179,8,0.35)]',
      textGlowClass: 'text-yellow-300 font-semibold',
      isRecognized: true
    };
  }

  // Tier 6: SLOW BLEED 🔪
  if (traffic_light === 'SLOW_BLEED') {
    return {
      tierId: 'SLOW_BLEED',
      icon: '🔪',
      label: 'SLOW BLEED',
      subLabel: 'ไหลซึมต่อเนื่อง ไร้สถาบัน ห้ามถัว',
      scenarioNum: scenario,
      scenarioTitle: badge,
      reasonTh: reason_th || reason,
      spineClass: 'bg-gradient-to-b from-pink-600 via-rose-600 to-red-600 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
      badgeClass: 'bg-rose-950/80 border border-rose-500/40 text-rose-300',
      textGlowClass: 'text-rose-400',
      isRecognized: true
    };
  }

  // Tier 7: FALLING KNIFE 🗡️ / MAYDAY EXIT ❌
  if (traffic_light === 'FALLING_KNIFE' || traffic_light === 'MAYDAY_EXIT' || traffic_light === 'DANGER') {
    const isMayday = traffic_light === 'MAYDAY_EXIT' || upperBadge.includes('MAYDAY');
    return {
      tierId: isMayday ? 'MAYDAY_EXIT' : 'FALLING_KNIFE',
      icon: isMayday ? '❌' : '🗡️',
      label: isMayday ? 'MAYDAY EXIT' : 'FALLING KNIFE',
      subLabel: isMayday ? 'สละเรือ คัทลอสรักษาเงินต้น' : 'ห้ามรับมีดเด็ดขาด ถือเงินสด 100%',
      scenarioNum: scenario,
      scenarioTitle: badge,
      reasonTh: reason_th || reason,
      spineClass: 'bg-gradient-to-b from-red-600 via-rose-700 to-red-800 shadow-[0_0_12px_rgba(239,68,68,0.95)] animate-pulse',
      badgeClass: 'bg-red-950 border border-red-500/70 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse',
      textGlowClass: 'text-red-400 font-bold',
      isRecognized: true
    };
  }

  // Default fallback
  return {
    tierId: 'WATCHLIST',
    icon: symbol.slice(0, 1) || '•',
    label: badge || 'Watchlist',
    spineClass: 'bg-slate-700/50',
    badgeClass: clsx('bg-gradient-to-tr shadow-sm text-white font-bold', getSymbolBadgeGradient(symbol)),
    isRecognized: false
  };
}

interface TierBadgeIndicatorProps {
  symbol: string;
  radarData?: RadarRow | null;
  isCurrency?: boolean;
  onHover?: (rect: DOMRect, info: TierVisualInfo) => void;
  onLeave?: () => void;
}

/**
 * Micro-Badge Capsule Component
 */
export const TierBadgeIndicator: React.FC<TierBadgeIndicatorProps> = ({
  symbol,
  radarData,
  isCurrency = false,
  onHover,
  onLeave,
}) => {
  const info = getTierVisualInfo(radarData, symbol, isCurrency);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onHover && info.isRecognized) {
      const rect = e.currentTarget.getBoundingClientRect();
      onHover(rect, info);
    }
  };

  if (!info.isRecognized) {
    // Elegant fallback circular badge
    return (
      <div
        className={clsx(
          'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-transform group-hover:scale-105',
          info.badgeClass
        )}
      >
        {info.icon}
      </div>
    );
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
      className={clsx(
        'w-[18px] h-[18px] rounded-md flex items-center justify-center text-[11px] shrink-0 cursor-help transition-all duration-150 group-hover:scale-110 select-none',
        info.badgeClass
      )}
      title={`${info.label}${info.scenarioTitle ? ` — ${info.scenarioTitle}` : ''}`}
    >
      <span className="leading-none">{info.icon}</span>
    </div>
  );
};

interface FloatingHUDProps {
  hovered: {
    rect: DOMRect;
    info: TierVisualInfo;
    symbol: string;
  } | null;
}

/**
 * Portal/Fixed Floating HUD Tooltip (Guarantees ZERO Clipping)
 */
export const TierFloatingHUD: React.FC<FloatingHUDProps> = ({ hovered }) => {
  if (!hovered || !hovered.info.isRecognized) return null;

  const { rect, info, symbol } = hovered;
  
  // Position the floating card smoothly to the left or right of the badge
  const top = Math.max(10, rect.top - 8);
  const left = Math.max(10, rect.left - 290);

  return (
    <div
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 w-72 bg-[#0B1220]/95 backdrop-blur-md border border-[#2A2E45] rounded-xl p-3 shadow-[0_12px_32px_rgba(0,0,0,0.8)] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base">{info.icon}</span>
          <div>
            <div className="text-[13px] font-bold text-white tracking-wide font-mono">
              {symbol} <span className={clsx('ml-1 text-xs', info.textGlowClass)}>{info.label}</span>
            </div>
            {info.subLabel && (
              <div className="text-[11px] text-slate-300 font-medium leading-tight">
                {info.subLabel}
              </div>
            )}
          </div>
        </div>
        {info.scenarioNum && (
          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
            S{info.scenarioNum}
          </span>
        )}
      </div>

      {/* Scenario / Technical Reason */}
      <div className="pt-2 space-y-1">
        {info.scenarioTitle && (
          <div className="text-xs font-semibold text-purple-300">
            {info.scenarioTitle}
          </div>
        )}
        {info.reasonTh && (
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {info.reasonTh}
          </p>
        )}
      </div>
    </div>
  );
};
