import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  Lock,
  Unlock,
  Copy,
  Settings,
  Type,
  Check,
  Bell,
  BellOff,
  Flame,
} from 'lucide-react';
import { HorizontalLineDrawing, LineStyleOption } from '../../../types/drawingTypes';
import { useDrawingStore } from '../../../stores/drawingStore';

const TV_COLORS = [
  '#26A69A', // Green
  '#EF5350', // Red
  '#42A5F5', // Blue
  '#FFEE58', // Yellow
  '#AB47BC', // Purple
  '#FF7043', // Orange
  '#FFFFFF', // White
  '#78909C', // Slate
];

interface LineFloatingToolbarProps {
  line: HorizontalLineDrawing;
  symbol: string;
  yPosition: number;
  onOpenSettings: (lineId: string) => void;
  touchCount?: number;
}

export const LineFloatingToolbar: React.FC<LineFloatingToolbarProps> = ({
  line,
  symbol,
  yPosition,
  onOpenSettings,
  touchCount = 0,
}) => {
  const { updateLine, deleteLine, cloneLine } = useDrawingStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextPrompt, setShowTextPrompt] = useState(false);
  const [inputText, setInputText] = useState(line.text || '');

  // Clamp toolbar position so it stays inside chart viewport
  const clampedTop = Math.max(10, Math.min(window.innerHeight - 150, yPosition - 46));

  const handleColorSelect = (color: string) => {
    updateLine(symbol, line.id, { color });
    setShowColorPicker(false);
  };

  const handleWidthChange = (width: 1 | 2 | 3 | 4) => {
    updateLine(symbol, line.id, { lineWidth: width });
  };

  const handleStyleChange = (style: LineStyleOption) => {
    updateLine(symbol, line.id, { lineStyle: style });
  };

  const handleToggleLock = () => {
    updateLine(symbol, line.id, { locked: !line.locked });
  };

  const handleToggleAlert = () => {
    updateLine(symbol, line.id, { alertEnabled: !line.alertEnabled });
  };

  const handleSaveText = (e: React.FormEvent) => {
    e.preventDefault();
    updateLine(symbol, line.id, { text: inputText.trim() });
    setShowTextPrompt(false);
  };

  return (
    <div
      style={{ top: `${clampedTop}px`, left: '50%', transform: 'translateX(-50%)' }}
      className="absolute z-30 flex items-center gap-1 px-2.5 py-1.5 bg-[#1E222D]/95 border border-slate-700/90 rounded-lg shadow-2xl backdrop-blur-md text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* 1. Color Picker Button */}
      <div className="relative">
        <button
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowTextPrompt(false);
          }}
          title="Change Color"
          className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-slate-800 transition-colors p-0.5"
        >
          <div
            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
            style={{ backgroundColor: line.color }}
          />
        </button>

        {showColorPicker && (
          <div className="absolute top-8 left-0 z-40 p-2 bg-[#1E222D] border border-slate-700 rounded-lg shadow-2xl grid grid-cols-4 gap-1.5 w-36">
            {TV_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorSelect(c)}
                className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform flex items-center justify-center shadow"
                style={{ backgroundColor: c }}
              >
                {line.color.toLowerCase() === c.toLowerCase() && (
                  <Check className="w-3.5 h-3.5 text-black drop-shadow" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

      {/* 2. Line Width Selector */}
      <div className="flex items-center gap-0.5">
        {([1, 2, 3, 4] as const).map((w) => (
          <button
            key={w}
            onClick={() => handleWidthChange(w)}
            title={`Line Width ${w}px`}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              line.lineWidth === w
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <div
              className="bg-current rounded-full"
              style={{
                width: `${w * 2 + 3}px`,
                height: `${w * 1.2 + 1}px`,
              }}
            />
          </button>
        ))}
      </div>

      <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

      {/* 3. Line Style Selector */}
      <div className="flex items-center gap-0.5">
        {(['Solid', 'Dashed', 'Dotted'] as const).map((st) => (
          <button
            key={st}
            onClick={() => handleStyleChange(st)}
            title={`Style: ${st}`}
            className={`px-1.5 h-6 text-[13px] rounded font-mono transition-colors ${
              line.lineStyle === st
                ? 'bg-slate-700 text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {st === 'Solid' ? '—' : st === 'Dashed' ? '--' : '··'}
          </button>
        ))}
      </div>

      <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

      {/* 4. Text Note Button */}
      <div className="relative">
        <button
          onClick={() => {
            setShowTextPrompt(!showTextPrompt);
            setShowColorPicker(false);
          }}
          title={line.text ? `Label: "${line.text}"` : 'Add Text Label'}
          className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
            line.text ? 'text-sky-400 bg-sky-500/10' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
        </button>

        {showTextPrompt && (
          <form
            onSubmit={handleSaveText}
            className="absolute top-8 left-0 z-40 p-2 bg-[#1E222D] border border-slate-700 rounded-lg shadow-2xl flex items-center gap-1.5 w-60"
          >
            <input
              type="text"
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Resistance 1, TP..."
              className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-[13px] focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[13px] font-medium rounded transition-colors"
            >
              Set
            </button>
          </form>
        )}
      </div>

      {/* 5. Alert Toggle */}
      <button
        onClick={handleToggleAlert}
        title={line.alertEnabled ? '🔔 Price Alert: ON (Will chime & flash when crossed)' : '🔔 Price Alert: OFF (Click to enable)'}
        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
          line.alertEnabled
            ? 'text-amber-400 bg-amber-500/20 shadow-sm shadow-amber-500/30 ring-1 ring-amber-400/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
      >
        {line.alertEnabled ? <Bell className="w-3.5 h-3.5 animate-bounce" /> : <BellOff className="w-3.5 h-3.5" />}
      </button>

      {/* 6. Touch Count Strength Badge */}
      {touchCount > 0 && (
        <div
          title={
            touchCount >= 5
              ? `Rock Solid Level: Tested ${touchCount} times in chart history`
              : touchCount >= 3
              ? `Moderate Level: Tested ${touchCount} times in chart history`
              : `Minor Level: Tested ${touchCount} times in chart history`
          }
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[13px] font-semibold tracking-tight shadow-sm ${
            touchCount >= 5
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
              : touchCount >= 3
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
              : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'
          }`}
        >
          <Flame className={`w-3 h-3 ${touchCount >= 5 ? 'text-emerald-400 fill-emerald-400/40' : 'text-amber-400'}`} />
          <span>{touchCount >= 5 ? `Solid ${touchCount}x` : `${touchCount}x`}</span>
        </div>
      )}

      {/* 7. Settings Gear (Open Modal) */}
      <button
        onClick={() => onOpenSettings(line.id)}
        title="Settings & Exact Coordinates"
        className="flex items-center justify-center w-6 h-6 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {/* 8. Lock Toggle */}
      <button
        onClick={handleToggleLock}
        title={
          line.locked
            ? '🔒 Locked: Click to unlock and enable Drag & Drop'
            : '🔓 Unlocked: Click and drag anywhere along the line to adjust price'
        }
        className={`flex items-center gap-1 px-1.5 h-6 rounded text-[11px] font-bold transition-all ${
          line.locked
            ? 'text-amber-300 bg-amber-500/20 border border-amber-500/50 shadow-sm'
            : 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25'
        }`}
      >
        {line.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        <span>{line.locked ? 'Unlock' : 'Drag Ready'}</span>
      </button>

      {/* 9. Clone */}
      <button
        onClick={() => cloneLine(symbol, line.id)}
        title="Clone Line (Ctrl+Drag)"
        className="flex items-center justify-center w-6 h-6 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

      {/* 10. Delete */}
      <button
        onClick={() => deleteLine(symbol, line.id)}
        title="Delete (Del / Backspace)"
        className="flex items-center justify-center w-6 h-6 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
