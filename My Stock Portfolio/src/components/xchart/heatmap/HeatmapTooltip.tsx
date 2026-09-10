import React from 'react';
import { TooltipState } from './types';
import { StockLogo } from './StockLogo';
import { formatMarketCap, formatPrice, formatPercent } from './heatmapEngine';

interface HeatmapTooltipProps {
  tooltip: TooltipState;
  containerRect: DOMRect | null;
}

export const HeatmapTooltip: React.FC<HeatmapTooltipProps> = ({ tooltip, containerRect }) => {
  if (!tooltip.visible || !tooltip.item) return null;

  const { item, x, y, isPortfolio } = tooltip;
  const isPositive = item.percentChange >= 0;
  const changeColor = isPositive ? 'text-[#129955]' : 'text-[#F13948]';

  // Smart boundary collision detection
  const TOOLTIP_WIDTH = 260;
  const TOOLTIP_HEIGHT = isPortfolio ? 200 : 160;

  let posX = x + 16;
  let posY = y + 16;

  if (containerRect) {
    if (posX + TOOLTIP_WIDTH > containerRect.width - 12) {
      posX = x - TOOLTIP_WIDTH - 16;
    }
    if (posY + TOOLTIP_HEIGHT > containerRect.height - 12) {
      posY = y - TOOLTIP_HEIGHT - 16;
    }
  }

  return (
    <div
      className="absolute pointer-events-none z-50 rounded-xl bg-[#141414]/95 backdrop-blur-md border border-[#2A2A2A] shadow-2xl p-3.5 transition-transform duration-75 ease-out text-slate-200"
      style={{
        left: Math.max(8, posX),
        top: Math.max(8, posY),
        width: TOOLTIP_WIDTH
      }}
    >
      {/* Header: Logo + Symbol & Name */}
      <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-[#2A2E39]">
        <StockLogo symbol={item.symbol} domain={item.domain} size={28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[15px] text-white tracking-wide">{item.symbol}</span>
            <span className="text-[12px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium truncate max-w-[120px]">
              {item.sector}
            </span>
          </div>
          <p className="text-[13px] text-slate-300 truncate leading-tight mt-0.5">{item.name}</p>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="space-y-1.5 text-[13px]">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Price</span>
          <span className="font-semibold text-white">{formatPrice(item.price)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-400">Change (1D)</span>
          <span className={`font-semibold ${changeColor}`}>
            {formatPercent(item.percentChange)} ({item.change >= 0 ? '+' : ''}{item.change.toFixed(2)})
          </span>
        </div>

        {!isPortfolio && (
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Market Cap</span>
            <span className="font-semibold text-white">{formatMarketCap(item.marketCap)}</span>
          </div>
        )}

        {/* Portfolio Specific Extra Metrics */}
        {isPortfolio && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Holding Value</span>
              <span className="font-semibold text-white">
                ${(item.portfolioValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {item.portfolioWeight !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Portfolio Weight</span>
                <span className="font-semibold text-cyan-400">{item.portfolioWeight.toFixed(2)}%</span>
              </div>
            )}

            {item.totalReturnPercent !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Return</span>
                <span className={`font-semibold ${item.totalReturnPercent >= 0 ? 'text-[#129955]' : 'text-[#F13948]'}`}>
                  {formatPercent(item.totalReturnPercent)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-2.5 pt-2 border-t border-[#2A2E39]/60 text-[12px] text-slate-400 flex items-center justify-between">
        <span>Click tile to view chart</span>
        <span className="text-slate-500 font-mono">XChart</span>
      </div>
    </div>
  );
};
