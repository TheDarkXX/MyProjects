import React from 'react';
import {
  Eye,
  EyeOff,
  Settings,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';

export interface SubPaneHeaderToolbarProps {
  /** Pane index (1 or 2) */
  paneIndex: number;
  /** Label e.g. "MCDX" or "Ultimate RSI" */
  title: string;
  /** Absolute Y offset from the top of the chart container */
  top: number;
  /** Whether this pane is currently visible */
  isVisible: boolean;
  /** Whether this pane is currently maximized */
  isMaximized: boolean;
  /** Live values to display, keyed by label. e.g. { "Banker": 12.3, "HotMoney": 5.1 } */
  liveValues: Record<string, { value: string; color: string }>;

  onToggleVisibility: () => void;
  onOpenSettings: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleMaximize: () => void;
  onRemove: () => void;
}

export const SubPaneHeaderToolbar: React.FC<SubPaneHeaderToolbarProps> = ({
  paneIndex,
  title,
  top,
  isVisible,
  isMaximized,
  liveValues,
  onToggleVisibility,
  onOpenSettings,
  onMoveUp,
  onMoveDown,
  onToggleMaximize,
  onRemove,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div
        className="pointer-events-auto inline-flex items-center gap-1 mx-1 mt-1 px-2 py-1 rounded-lg"
        style={{
          background: 'rgba(13, 19, 34, 0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.12)',
        }}
      >
        {/* Title + Pane Badge */}
        <span className="text-[13px] font-extrabold text-slate-200 tracking-wide mr-1.5">
          {title}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-slate-700/80 text-[11px] font-bold text-cyan-300 leading-none mr-2">
          P{paneIndex}
        </span>

        {/* Live Values */}
        <div className="flex items-center gap-2 mr-2">
          {Object.entries(liveValues).map(([label, { value, color }]) => (
            <span key={label} className="text-[13px] text-slate-400">
              {label}:{' '}
              <strong className="font-bold" style={{ color }}>
                {value}
              </strong>
            </span>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-slate-700/60 mx-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5">
          {/* Toggle Visibility */}
          <button
            onClick={onToggleVisibility}
            title={isVisible ? 'Hide Pane' : 'Show Pane'}
            className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Config */}
          <button
            onClick={onOpenSettings}
            title="Open Settings"
            className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Move Up */}
          <button
            onClick={onMoveUp}
            title="Move Pane Up"
            className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Move Down */}
          <button
            onClick={onMoveDown}
            title="Move Pane Down"
            className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Maximize/Restore */}
          <button
            onClick={onToggleMaximize}
            title={isMaximized ? 'Restore Pane' : 'Maximize Pane'}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isMaximized
                ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                : 'hover:bg-slate-700/60 text-slate-400 hover:text-slate-100'
            }`}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Remove/Hide Pane */}
          <button
            onClick={onRemove}
            title="Close Pane"
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
