import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Briefcase,
  Pin,
  PinOff,
  RotateCcw,
  Sliders,
  Info,
  GripHorizontal,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { usePositionOverlayStore } from '../../../stores/usePositionOverlayStore';
import { PositionSettingsPopover } from './PositionSettingsPopover';
import { Holding } from '../../../hooks/useHoldings';
import { BlueprintEntry } from '../../../stores/blueprintStore';
import { formatPriceVal } from '../../xchart/myport/types';

interface ChartPositionHUDProps {
  symbol: string;
  holding: Holding;
  blueprint?: BlueprintEntry | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpenHoldingDrawer?: () => void;
  currency?: 'USD' | 'THB';
  exchangeRate?: number;
}

export const ChartPositionHUD: React.FC<ChartPositionHUDProps> = ({
  symbol,
  holding,
  containerRef,
  onOpenHoldingDrawer,
  currency = 'USD',
  exchangeRate = 34.5,
}) => {
  const {
    config,
    togglePin,
    resetPosition,
    setHudPosition,
  } = usePositionOverlayStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hudCardRef = useRef<HTMLDivElement>(null);

  // Dragging state refs for high-frequency 60-120fps direct DOM manipulation
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hudStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Clear manual inline styles when snapCorner or resetPosition is triggered (hudPosition is null)
  useEffect(() => {
    if (!config.hudPosition && hudCardRef.current) {
      hudCardRef.current.style.left = '';
      hudCardRef.current.style.top = '';
      hudCardRef.current.style.right = '';
      hudCardRef.current.style.bottom = '';
      hudCardRef.current.style.transform = '';
    }
  }, [config.hudPosition, config.snapCorner]);

  // Handle Drag Pointer Down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (config.isPinned) return;

      // Ignore interactive controls
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('a')) {
        return;
      }

      // Only respond to primary click / touch / stylus
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const card = hudCardRef.current;
      const cont = containerRef.current;
      if (!card || !cont) return;

      try {
        card.setPointerCapture(e.pointerId);
      } catch (_) {}

      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };

      const cardRect = card.getBoundingClientRect();
      const contRect = cont.getBoundingClientRect();

      const startX = cardRect.left - contRect.left;
      const startY = cardRect.top - contRect.top;
      hudStartPosRef.current = { x: startX, y: startY };

      // Transition smoothly from transform/snap classes to pixel coordinates
      card.style.left = `${startX}px`;
      card.style.top = `${startY}px`;
      card.style.right = 'auto';
      card.style.bottom = 'auto';
      card.style.transform = 'none';
    },
    [config.isPinned, containerRef]
  );

  // Handle Drag Pointer Move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const card = hudCardRef.current;
      const cont = containerRef.current;
      if (!card || !cont) return;

      const deltaX = e.clientX - dragStartPosRef.current.x;
      const deltaY = e.clientY - dragStartPosRef.current.y;

      const contRect = cont.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      const rawX = hudStartPosRef.current.x + deltaX;
      const rawY = hudStartPosRef.current.y + deltaY;

      // Clamp boundaries within chart canvas (with 6px safe margin)
      const maxX = Math.max(0, contRect.width - cardRect.width);
      const maxY = Math.max(0, contRect.height - cardRect.height);

      const clampedX = Math.min(Math.max(6, rawX), maxX - 6);
      const clampedY = Math.min(Math.max(6, rawY), maxY - 6);

      card.style.left = `${clampedX}px`;
      card.style.top = `${clampedY}px`;
      card.style.right = 'auto';
      card.style.bottom = 'auto';
      card.style.transform = 'none';
    },
    [containerRef]
  );

  // Handle Drag Pointer Up / Drop
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      const card = hudCardRef.current;
      const cont = containerRef.current;
      if (card) {
        try {
          card.releasePointerCapture(e.pointerId);
        } catch (_) {}

        if (cont) {
          const contRect = cont.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const finalX = Math.round(cardRect.left - contRect.left);
          const finalY = Math.round(cardRect.top - contRect.top);
          setHudPosition({ x: finalX, y: finalY }, 'custom');
        }
      }
    },
    [containerRef, setHudPosition]
  );

  // Handle Drag Pointer Cancel
  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      const card = hudCardRef.current;
      if (card) {
        try {
          card.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    },
    []
  );

  // Position calculation based on stored position or snap corner
  const getPositionClassesOrStyle = () => {
    if (config.hudPosition) {
      return {
        style: {
          left: `${config.hudPosition.x}px`,
          top: `${config.hudPosition.y}px`,
          right: 'auto',
          bottom: 'auto',
          transform: 'none',
        },
        className: 'absolute z-[40]',
      };
    }

    switch (config.snapCorner) {
      case 'top-left':
        return { style: {}, className: 'absolute top-10 left-3 z-[40]' };
      case 'top-right':
        return { style: {}, className: 'absolute top-2.5 right-16 z-[40]' };
      case 'bottom-left':
        return { style: {}, className: 'absolute bottom-8 left-14 z-[40]' };
      case 'bottom-right':
        return { style: {}, className: 'absolute bottom-8 right-16 z-[40]' };
      case 'top-center':
      default:
        return { style: {}, className: 'absolute top-2.5 left-1/2 -translate-x-1/2 z-[40]' };
    }
  };

  const posConfig = getPositionClassesOrStyle();

  // 3-State P&L Calculation with Deadband (±0.05%)
  const pnlPct = holding.totalReturnPercent ?? 0;
  const pnlState: 'profit' | 'breakeven' | 'loss' =
    pnlPct > 0.05 ? 'profit' : pnlPct < -0.05 ? 'loss' : 'breakeven';

  const isProfit = pnlState === 'profit';
  const pnlPrefix = pnlPct > 0 ? '+' : '';
  const pnlSign = pnlPct > 0 ? '+' : '';

  // Dynamic Glow Styles for Container and Card
  const glowHoverShadow =
    pnlState === 'profit'
      ? 'hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]'
      : pnlState === 'loss'
      ? 'hover:shadow-[0_0_24px_rgba(244,63,94,0.35)]'
      : 'hover:shadow-[0_0_20px_rgba(100,116,139,0.2)]';

  const cardBorderAndShadow = isDragging
    ? pnlState === 'profit'
      ? 'border-amber-400 bg-slate-950/95 shadow-[0_12px_32px_rgba(245,158,11,0.45)] scale-[1.02]'
      : pnlState === 'loss'
      ? 'border-rose-400 bg-slate-950/95 shadow-[0_12px_32px_rgba(244,63,94,0.45)] scale-[1.02]'
      : 'border-slate-500 bg-slate-950/95 shadow-[0_12px_32px_rgba(100,116,139,0.3)] scale-[1.02]'
    : pnlState === 'profit'
    ? 'border-amber-500/50 hover:border-amber-400/90 hover:bg-slate-950/90 shadow-[0_4px_20px_rgba(245,158,11,0.2)]'
    : pnlState === 'loss'
    ? 'border-rose-500/50 hover:border-rose-400/90 hover:bg-slate-950/90 shadow-[0_4px_20px_rgba(244,63,94,0.2)]'
    : 'border-slate-700/80 hover:border-slate-500/80 hover:bg-slate-950/90 shadow-[0_4px_16px_rgba(0,0,0,0.3)]';

  // If user disabled HUD in settings, don't render
  if (!config.enabled || !config.showHUD) return null;

  return (
    <>
      <div
        ref={hudCardRef}
        style={posConfig.style}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`${posConfig.className} select-none touch-none ${
          config.isPinned
            ? 'cursor-default'
            : isDragging
            ? 'cursor-grabbing z-[50]'
            : `cursor-grab ${glowHoverShadow}`
        }`}
      >
        {/* ================= BLOOMBERG NANO-HUD STRIP (30% Footprint) ================= */}
        <div
          className={`w-[248px] sm:w-[264px] rounded-xl bg-slate-950/75 backdrop-blur-md border shadow-xl overflow-hidden flex flex-col px-2.5 py-1.5 transition-all ${cardBorderAndShadow}`}
        >
          {/* Line 1: Cost Basis & Micro-Tools Toolbar */}
          <div className="flex items-center justify-between gap-1.5 leading-tight">
            <div
              className="flex items-center gap-1.5 min-w-0"
              title={config.isPinned ? 'ปักหมุดล็อคตำแหน่งอยู่' : 'คลิกลากย้ายตำแหน่งได้อิสระ (Drag to move)'}
            >
              {!config.isPinned && (
                <GripHorizontal
                  className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                    isDragging ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
              )}

              {/* Dynamic P&L Status LED Dot (Profit: Yellow, Break-Even: Dark Slate Gray, Loss: Red) */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 transition-all ${
                  pnlState === 'profit'
                    ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse'
                    : pnlState === 'loss'
                    ? 'bg-rose-400 shadow-[0_0_8px_#F43F5E] animate-pulse'
                    : 'bg-slate-500 shadow-[0_0_6px_rgba(100,116,139,0.7)]'
                }`}
                title={`สถานะพอร์ต: ${
                  pnlState === 'profit'
                    ? `กำไร (+${pnlPct.toFixed(2)}%)`
                    : pnlState === 'loss'
                    ? `ขาดทุน (${pnlPct.toFixed(2)}%)`
                    : `เท่าทุน (${pnlPct.toFixed(2)}%)`
                }`}
              />



              <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1 font-bold text-white text-[13px] font-mono truncate">
                <span>{holding.quantity.toLocaleString()} shs</span>
                <span className="text-slate-400 text-xs font-normal">@</span>
                <span className="text-amber-300">${holding.avgCost.toFixed(2)}</span>
              </div>
            </div>


            {/* Micro Action Buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Pin / Unpin Button */}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin();
                }}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  config.isPinned
                    ? 'text-amber-400 hover:bg-slate-800'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={config.isPinned ? 'Pinned (คลิกเพื่อปลดล็อคให้ลากได้)' : 'Draggable (คลิกเพื่อปักหมุดล็อค)'}
              >
                {config.isPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
              </button>

              {/* Settings Popover */}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSettingsOpen(true);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Position Settings (Color, Width, Style, Snap)"
              >
                <Sliders className="w-3 h-3" />
              </button>

              {/* Inspect Drawer */}
              {onOpenHoldingDrawer && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenHoldingDrawer();
                  }}
                  className="p-1 rounded text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Inspect Trade Lots & Blueprint"
                >
                  <Info className="w-3 h-3" />
                </button>
              )}

              {/* Recycle to Top-Center */}
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  resetPosition();
                }}
                className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Recycle Position to Top-Center (รีไซเคิลกลับตรงกลางด้านบน)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Line 2: Unrealized P&L & Total Position Value */}
          <div className="flex items-center justify-between gap-1 mt-1 text-[13px] font-mono leading-tight">
            <span
              className={`font-bold flex items-center gap-1 ${
                pnlState === 'profit'
                  ? 'text-amber-400'
                  : pnlState === 'loss'
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {pnlState === 'profit' ? (
                <TrendingUp className="w-3 h-3 text-amber-400" />
              ) : pnlState === 'loss' ? (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block mr-0.5" />
              )}

              <span>
                {pnlPrefix}
                {formatPriceVal(holding.totalReturn, currency, exchangeRate)}
              </span>
              <span className="text-xs font-medium opacity-90">
                ({pnlSign}{holding.totalReturnPercent.toFixed(2)}%)
              </span>
            </span>

            <span className="text-slate-300 text-xs font-normal">
              ≈ {formatPriceVal(holding.currentValue, currency, exchangeRate)}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Popover Modal */}
      {isSettingsOpen && (
        <PositionSettingsPopover onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
};
