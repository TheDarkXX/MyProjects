import React, { useEffect, useRef } from 'react';
import {
  Settings,
  Bell,
  BellOff,
  Copy,
  Lock,
  Unlock,
  Trash2,
} from 'lucide-react';
import { HorizontalLineDrawing } from '../../../types/drawingTypes';
import { useDrawingStore } from '../../../stores/drawingStore';

interface LineContextMenuProps {
  line: HorizontalLineDrawing;
  symbol: string;
  position: { x: number; y: number };
  onClose: () => void;
  onOpenSettings: (lineId: string) => void;
}

export const LineContextMenu: React.FC<LineContextMenuProps> = ({
  line,
  symbol,
  position,
  onClose,
  onOpenSettings,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { updateLine, deleteLine, cloneLine } = useDrawingStore();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Clamp within viewport
  const left = Math.min(window.innerWidth - 220, Math.max(10, position.x));
  const top = Math.min(window.innerHeight - 250, Math.max(10, position.y));

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-56 bg-[#1E222D] border border-slate-700/90 rounded-lg shadow-2xl p-1 text-[13px] text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800"
    >
      <div className="px-3 py-1.5 text-slate-400 font-mono text-[12px] flex items-center justify-between">
        <span>{line.text ? line.text : 'Horizontal Line'}</span>
        <span className="text-slate-300 font-semibold">{line.price.toFixed(2)}</span>
      </div>

      <div className="py-1">
        <button
          onClick={() => {
            onOpenSettings(line.id);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors text-left"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Settings & Coordinates...</span>
        </button>

        <button
          onClick={() => {
            updateLine(symbol, line.id, { alertEnabled: !line.alertEnabled });
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors text-left"
        >
          {line.alertEnabled ? (
            <Bell className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <BellOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{line.alertEnabled ? 'Turn Off Price Alert' : 'Add Price Alert'}</span>
        </button>
      </div>

      <div className="py-1">
        <button
          onClick={() => {
            cloneLine(symbol, line.id);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors text-left"
        >
          <Copy className="w-3.5 h-3.5 text-slate-400" />
          <span>Duplicate Line</span>
        </button>

        <button
          onClick={() => {
            updateLine(symbol, line.id, { locked: !line.locked });
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors text-left"
        >
          {line.locked ? (
            <Unlock className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>{line.locked ? 'Unlock Position' : 'Lock Position'}</span>
        </button>
      </div>

      <div className="py-1">
        <button
          onClick={() => {
            deleteLine(symbol, line.id);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors text-left"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Line</span>
        </button>
      </div>
    </div>
  );
};
