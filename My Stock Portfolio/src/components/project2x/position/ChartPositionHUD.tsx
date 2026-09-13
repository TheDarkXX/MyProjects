import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Pin,
  PinOff,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  GripHorizontal,
  Target,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { usePositionOverlayStore } from '../../../stores/usePositionOverlayStore';
import { PositionSettingsPopover } from './PositionSettingsPopover';
import { Holding } from '../../../hooks/useHoldings';
import { BlueprintEntry } from '../../../stores/blueprintStore';
import { formatPriceVal, formatSecondaryPriceVal } from '../../xchart/myport/types';

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
  blueprint,
  containerRef,
  onOpenHoldingDrawer,
  currency = 'USD',
  exchangeRate = 34.5,
}) => {
  const {
    config,
    togglePin,
    toggleHudMode,
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
        },
        className: 'absolute z-[40]',
      };
    }

    switch (config.snapCorner) {
      case 'top-left':
        return { style: {}, className: 'absolute top-10 left-3 z-[40]' };
      case 'bottom-left':
        return { style: {}, className: 'absolute bottom-8 left-14 z-[40]' };
      case 'bottom-right':
        return { style: {}, className: 'absolute bottom-8 right-16 z-[40]' };
      case 'top-right':
      default:
        return { style: {}, className: 'absolute top-2.5 right-16 z-[40]' };
    }
  };

  const posConfig = getPositionClassesOrStyle();

  // Metrics
  const isProfit = holding.totalReturn >= 0;
  const pnlPrefix = isProfit ? '+' : '';
  const pnlSign = isProfit ? '+' : '';

  // Blueprint target distance
  let bpTargetText: string | null = null;
  if (blueprint?.target_price && holding.lastPrice > 0) {
    const diff = ((blueprint.target_price - holding.lastPrice) / holding.lastPrice) * 100;
    bpTargetText = `Target: $${blueprint.target_price.toFixed(2)} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)`;
  }

  // If user disabled HUD in settings, don't render
  if (!config.enabled || !config.showHUD) return null;

  return (
    <>
      <div
        ref={hudCardRef}
        style={posConfig.style}
        className={`${posConfig.className} select-none transition-shadow ${
          config.isPinned ? '' : 'hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
        }`}
      >
        {config.hudMode === 'compact' ? (
          /* ================= COMPACT MINI PILL ================= */
          <div
            onMouseDown={handleMouseDown}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-[13px] ${
              config.isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            {!config.isPinned && (
              <GripHorizontal className="w-3.5 h-3.5 text-slate-400 -mr-1" />
            )}
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>{symbol}</span>
            </div>
            <span className="text-slate-300 font-medium">
              {holding.quantity.toLocaleString()} shs
            </span>
            <span
              className={`font-bold font-mono px-1.5 py-0.5 rounded text-xs ${
                isProfit
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
              }`}
            >
              {pnlSign}
              {holding.totalReturnPercent.toFixed(2)}%
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                title="Position Settings"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                onClick={toggleHudMode}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                title="Expand Position Card"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* ================= EXPANDED GLASSMORPHIC CARD ================= */
          <div
            className={`w-[320px] rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col ${
              config.isPinned ? '' : ''
            }`}
          >
            {/* Header (Draggable Handle) */}
            <div
              onMouseDown={handleMouseDown}
              className={`flex items-center justify-between px-3.5 py-2.5 bg-[#121624]/90 border-b border-slate-800/80 ${
                config.isPinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <div className="flex items-center gap-2">
                {!config.isPinned && (
                  <GripHorizontal className="w-4 h-4 text-slate-400 mr-0.5" />
                )}
                <Briefcase className="w-4 h-4 text-amber-400" />
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white tracking-wide font-heading">
                    {symbol}
                  </span>
                  {holding.stockType && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                      {holding.stockType}
                    </span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1">
                {/* Pin / Unpin Button */}
                <button
                  onClick={togglePin}
                  className={`p-1 rounded-md transition-all cursor-pointer ${
                    config.isPinned
                      ? 'text-amber-400 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={config.isPinned ? 'HUD is Pinned (Click to Unpin & Drag)' : 'HUD is Draggable (Click to Pin)'}
                >
                  {config.isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                </button>

                {/* Recycle Position */}
                <button
                  onClick={resetPosition}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  title="Recycle / Reset to Top-Right Corner"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                </button>

                {/* Settings */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  title="Customization Settings"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-200" />
                </button>

                {/* Minimize */}
                <button
                  onClick={toggleHudMode}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  title="Collapse to Mini Pill"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metrics Body */}
            <div className="p-3.5 flex flex-col gap-2.5 text-[13px]">
              {/* Row 1: Shares & Avg Cost */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Holdings & Avg Cost</span>
                <div className="text-right">
                  <span className="font-bold text-white">
                    {holding.quantity.toLocaleString()} shs
                  </span>
                  <span className="text-slate-300 ml-1.5 font-mono">
                    Avg ${holding.avgCost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Row 2: Holding Value */}
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Current Position Value</span>
                <div className="text-right">
                  <span className="font-bold font-mono text-slate-100">
                    {formatPriceVal(holding.currentValue, currency, exchangeRate)}
                  </span>
                  <span className="text-slate-400 text-xs ml-1.5">
                    {formatSecondaryPriceVal(holding.currentValue, currency, exchangeRate)}
                  </span>
                </div>
              </div>

              {/* Row 3: Unrealized P&L */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 font-medium">Unrealized P&L</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold font-mono text-sm ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pnlPrefix}
                    {formatPriceVal(holding.totalReturn, currency, exchangeRate)}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold font-mono ${
                      isProfit
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {pnlSign}
                    {holding.totalReturnPercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Row 4: Weight & Target */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Weight: <strong className="text-slate-200">{holding.weightPercent.toFixed(1)}%</strong> of Port</span>
                {bpTargetText && (
                  <span className="flex items-center gap-1 text-cyan-300 font-medium">
                    <Target className="w-3 h-3" />
                    <span>{bpTargetText}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Footer Action: Inspect Drawer */}
            {onOpenHoldingDrawer && (
              <div className="px-3.5 py-2.5 border-t border-slate-800/80 bg-slate-900/30 flex items-center justify-between">
                <button
                  onClick={onOpenHoldingDrawer}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inspect Trade Lots & Blueprint</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Popover Modal */}
      {isSettingsOpen && (
        <PositionSettingsPopover onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
};
