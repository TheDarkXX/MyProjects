import React, { useState, useRef, useCallback } from 'react';
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
  const hudCardRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hudStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle Drag Start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (config.isPinned) return;
      // Prevent drag if clicking interactive buttons
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('a')) {
        return;
      }

      e.preventDefault();
      isDraggingRef.current = true;
      dragStartPosRef.current = { x: e.clientX, y: e.clientY };

      const cardRect = hudCardRef.current?.getBoundingClientRect();
      const contRect = containerRef.current?.getBoundingClientRect();

      if (cardRect && contRect) {
        hudStartPosRef.current = {
          x: cardRect.left - contRect.left,
          y: cardRect.top - contRect.top,
        };
      }

      const handleMouseMove = (moveEvt: MouseEvent) => {
        if (!isDraggingRef.current || !containerRef.current || !hudCardRef.current) return;

        const deltaX = moveEvt.clientX - dragStartPosRef.current.x;
        const deltaY = moveEvt.clientY - dragStartPosRef.current.y;

        const contRect = containerRef.current.getBoundingClientRect();
        const cardRect = hudCardRef.current.getBoundingClientRect();

        const rawX = hudStartPosRef.current.x + deltaX;
        const rawY = hudStartPosRef.current.y + deltaY;

        // Clamp boundaries within chart canvas
        const maxX = Math.max(0, contRect.width - cardRect.width);
        const maxY = Math.max(0, contRect.height - cardRect.height);

        const clampedX = Math.min(Math.max(4, rawX), maxX - 4);
        const clampedY = Math.min(Math.max(4, rawY), maxY - 4);

        if (hudCardRef.current) {
          hudCardRef.current.style.left = `${clampedX}px`;
          hudCardRef.current.style.top = `${clampedY}px`;
          hudCardRef.current.style.right = 'auto';
          hudCardRef.current.style.bottom = 'auto';
          hudCardRef.current.style.transform = 'none';
        }
      };

      const handleMouseUp = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        if (hudCardRef.current && containerRef.current) {
          const contRect = containerRef.current.getBoundingClientRect();
          const cardRect = hudCardRef.current.getBoundingClientRect();
          const finalX = Math.round(cardRect.left - contRect.left);
          const finalY = Math.round(cardRect.top - contRect.top);
          setHudPosition({ x: finalX, y: finalY });
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [config.isPinned, containerRef, setHudPosition]
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

  // Metrics
  const isProfit = holding.totalReturn >= 0;
  const pnlPrefix = isProfit ? '+' : '';
  const pnlSign = isProfit ? '+' : '';

  // If user disabled HUD in settings, don't render
  if (!config.enabled || !config.showHUD) return null;

  return (
    <>
      <div
        ref={hudCardRef}
        style={posConfig.style}
        className={`${posConfig.className} select-none transition-shadow ${
          config.isPinned ? '' : 'hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]'
        }`}
      >
        {/* ================= BLOOMBERG NANO-HUD STRIP (30% Footprint) ================= */}
        <div
          onMouseDown={handleMouseDown}
          className={`w-[248px] sm:w-[264px] rounded-xl bg-slate-950/75 hover:bg-slate-950/90 backdrop-blur-md border border-slate-700/70 hover:border-slate-500 shadow-xl overflow-hidden flex flex-col px-2.5 py-1.5 transition-all ${
            config.isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          {/* Line 1: Cost Basis & Micro-Tools Toolbar */}
          <div className="flex items-center justify-between gap-1.5 leading-tight">
            <div className="flex items-center gap-1.5 min-w-0">
              {!config.isPinned && (
                <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
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
                onClick={togglePin}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  config.isPinned
                    ? 'text-amber-400 hover:bg-slate-800'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={config.isPinned ? 'Pinned (Locked)' : 'Draggable (Click to Lock)'}
              >
                {config.isPinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
              </button>

              {/* Settings Popover */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Position Settings (Color, Width, Style, Snap)"
              >
                <Sliders className="w-3 h-3" />
              </button>

              {/* Inspect Drawer */}
              {onOpenHoldingDrawer && (
                <button
                  onClick={onOpenHoldingDrawer}
                  className="p-1 rounded text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Inspect Trade Lots & Blueprint"
                >
                  <Info className="w-3 h-3" />
                </button>
              )}

              {/* Recycle to Top-Center */}
              <button
                onClick={resetPosition}
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
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
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
