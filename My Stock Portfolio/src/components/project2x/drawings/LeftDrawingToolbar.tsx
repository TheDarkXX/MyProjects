import React, { useState } from 'react';
import {
  MousePointer2,
  Minus,
  Magnet,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useDrawingStore } from '../../../stores/drawingStore';
import { DrawingTool } from '../../../types/drawingTypes';

interface LeftDrawingToolbarProps {
  symbol: string;
  bars?: any[];
}

export const LeftDrawingToolbar: React.FC<LeftDrawingToolbarProps> = ({ symbol, bars = [] }) => {
  const {
    activeTool,
    setActiveTool,
    magnetMode,
    toggleMagnetMode,
    globalDrawingsVisible,
    toggleGlobalVisibility,
    isToolbarCollapsed,
    toggleToolbarCollapsed,
    clearLines,
    autoDetectSRLevels,
    getDrawings,
  } = useDrawingStore();

  const [confirmClear, setConfirmClear] = useState(false);
  const drawings = getDrawings(symbol);
  const activeCount = drawings.length;

  const handleToolClick = (tool: DrawingTool) => {
    if (activeTool === tool) {
      setActiveTool('cursor');
    } else {
      setActiveTool(tool);
    }
  };

  const handleClearClick = () => {
    if (activeCount === 0) return;
    if (confirmClear) {
      clearLines(symbol);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
    }
  };

  const handleAutoSR = () => {
    if (bars && bars.length > 0) {
      autoDetectSRLevels(symbol, bars);
    }
  };

  if (isToolbarCollapsed) {
    return (
      <div className="absolute left-0 top-12 z-20">
        <button
          onClick={toggleToolbarCollapsed}
          title="Expand Drawing Tools"
          className="flex items-center justify-center w-5 h-8 bg-[#131722]/90 hover:bg-[#1E222D] text-slate-300 hover:text-white border-y border-r border-slate-700/70 rounded-r shadow-md transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-20 flex flex-col items-center justify-between w-[44px] h-full bg-[#131722] border-r border-slate-800/80 select-none py-2 shrink-0">
      {/* Top Group: Drawing & Navigation Tools */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* Cursor Mode */}
        <button
          onClick={() => handleToolClick('cursor')}
          title="Cursor / Select (Esc)"
          className={`relative group flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            activeTool === 'cursor'
              ? 'bg-[#2962FF]/20 text-[#2962FF] font-medium'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MousePointer2 className="w-4 h-4" />
          <span className="pointer-events-none absolute left-10 ml-1.5 px-2 py-1 bg-[#1E222D] text-slate-200 text-[13px] rounded shadow-lg border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Cursor (Esc)
          </span>
        </button>

        {/* Horizontal Line */}
        <button
          onClick={() => handleToolClick('horizontalLine')}
          title="Horizontal Line (Alt+H)"
          className={`relative group flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            activeTool === 'horizontalLine'
              ? 'bg-[#2962FF] text-white shadow-lg shadow-[#2962FF]/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center justify-center w-4 h-4">
            <div className="w-4 h-[2.5px] bg-current rounded-full" />
          </div>
          <span className="pointer-events-none absolute left-10 ml-1.5 px-2 py-1 bg-[#1E222D] text-slate-200 text-[13px] rounded shadow-lg border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Horizontal Line (Alt+H)
          </span>
        </button>

        {/* Divider */}
        <div className="w-6 h-[1px] bg-slate-800 my-1" />

        {/* Magnet Snapping */}
        <button
          onClick={toggleMagnetMode}
          title={magnetMode ? 'Magnet Snap: ON (OHLC)' : 'Magnet Snap: OFF'}
          className={`relative group flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            magnetMode
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Magnet className="w-4 h-4" />
          <span className="pointer-events-none absolute left-10 ml-1.5 px-2 py-1 bg-[#1E222D] text-slate-200 text-[13px] rounded shadow-lg border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {magnetMode ? 'Magnet Snap: ON' : 'Magnet Snap: OFF'}
          </span>
        </button>

        {/* Auto S/R */}
        <button
          onClick={handleAutoSR}
          title="Auto Support & Resistance"
          className="relative group flex items-center justify-center w-8 h-8 rounded-md text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span className="pointer-events-none absolute left-10 ml-1.5 px-2 py-1 bg-[#1E222D] text-slate-200 text-[13px] rounded shadow-lg border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Auto S/R Detection
          </span>
        </button>

        {/* Global Visibility */}
        <button
          onClick={toggleGlobalVisibility}
          title={globalDrawingsVisible ? 'Hide All Drawings' : 'Show All Drawings'}
          className={`relative group flex items-center justify-center w-8 h-8 rounded-md transition-all ${
            !globalDrawingsVisible
              ? 'bg-rose-500/20 text-rose-400'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          {globalDrawingsVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="pointer-events-none absolute left-10 ml-1.5 px-2 py-1 bg-[#1E222D] text-slate-200 text-[13px] rounded shadow-lg border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {globalDrawingsVisible ? 'Hide All Lines' : 'Show All Lines'}
          </span>
        </button>
      </div>

      {/* Bottom Group: Clear & Collapse */}
      <div className="flex flex-col items-center gap-1.5 w-full pb-1">
        {/* Delete All Lines */}
        {activeCount > 0 && (
          <button
            onClick={handleClearClick}
            title={confirmClear ? 'Click again to confirm delete' : `Clear all (${activeCount})`}
            className={`relative group flex items-center justify-center w-8 h-8 rounded-md transition-all ${
              confirmClear
                ? 'bg-red-500 text-white animate-pulse'
                : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="pointer-events-none absolute left-10 ml-1.5 px-2 py-1 bg-[#1E222D] text-slate-200 text-[13px] rounded shadow-lg border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {confirmClear ? 'Confirm Delete All?' : `Clear All Lines (${activeCount})`}
            </span>
          </button>
        )}

        {/* Collapse Button */}
        <button
          onClick={toggleToolbarCollapsed}
          title="Collapse Toolbar"
          className="flex items-center justify-center w-8 h-6 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
