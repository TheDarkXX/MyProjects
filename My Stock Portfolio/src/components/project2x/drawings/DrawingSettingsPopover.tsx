import React from 'react';
import { X, RotateCcw, Sliders, Check } from 'lucide-react';
import { useDrawingStore } from '../../../stores/drawingStore';
import { LineStyleOption, DEFAULT_DRAWING_SETTINGS } from '../../../types/drawingTypes';

const PRESET_COLORS = [
  '#EF5350', // Bright Red
  '#F87171', // Coral Red
  '#26A69A', // Emerald Teal
  '#10B981', // Green
  '#2962FF', // TV Blue
  '#38BDF8', // Sky Blue
  '#F59E0B', // Amber
  '#FFF176', // Light Yellow
  '#AB47BC', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
  '#94A3B8', // Slate Gray
];

const LINE_STYLES: LineStyleOption[] = ['Solid', 'Dashed', 'Dotted'];
const LINE_WIDTHS: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

interface DrawingSettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrawingSettingsPopover: React.FC<DrawingSettingsPopoverProps> = ({ isOpen, onClose }) => {
  const { drawingSettings, updateDrawingSettings } = useDrawingStore();

  if (!isOpen) return null;

  const handleReset = () => {
    updateDrawingSettings(DEFAULT_DRAWING_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-[#1E222D] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#131722] border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 tracking-wide">
              Drawing & Label Configuration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          {/* Section 1: In-Canvas Label Size (4 Levels) */}
          <div className="flex flex-col gap-2.5 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Right-Side Label Size (4 Levels)
                </span>
                <p className="text-[13px] text-slate-400 mt-0.5">
                  Compact badges rendered inside canvas edge (Price Scale stays clean)
                </p>
              </div>
            </div>

            {/* 4 Level Radio / Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { level: 1, label: 'Micro', sub: '-4 lvl', font: '10px' },
                { level: 2, label: 'Compact', sub: '-3 lvl', font: '11px' },
                { level: 3, label: 'Small', sub: '-2 lvl', font: '12px' },
                { level: 4, label: 'Normal', sub: '-1 lvl', font: '13px' },
              ].map((lvl) => {
                const isSelected = drawingSettings.labelSizeLevel === lvl.level;
                return (
                  <button
                    key={lvl.level}
                    type="button"
                    onClick={() => updateDrawingSettings({ labelSizeLevel: lvl.level as any })}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md font-bold'
                        : 'bg-[#131722] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-[13px] font-bold">{lvl.label}</span>
                    <span className="text-[11px] opacity-70 font-mono">({lvl.sub})</span>
                  </button>
                );
              })}
            </div>

            {/* Live Preview of In-Canvas Badge */}
            <div className="mt-2 p-2.5 bg-[#131722] rounded-lg border border-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-[13px] text-slate-400">Badge Preview:</span>
              <div className="flex items-center gap-2">
                {/* Support Badge Preview */}
                <div
                  style={{
                    backgroundColor: `${drawingSettings.supportColor}26`,
                    borderColor: drawingSettings.supportColor,
                    color: drawingSettings.supportColor,
                    fontSize:
                      drawingSettings.labelSizeLevel === 1
                        ? '10px'
                        : drawingSettings.labelSizeLevel === 2
                        ? '11px'
                        : drawingSettings.labelSizeLevel === 3
                        ? '12px'
                        : '13px',
                    padding:
                      drawingSettings.labelSizeLevel === 1
                        ? '1px 4px'
                        : drawingSettings.labelSizeLevel === 2
                        ? '2px 6px'
                        : drawingSettings.labelSizeLevel === 3
                        ? '2px 8px'
                        : '4px 10px',
                  }}
                  className="rounded font-mono font-bold border shadow-sm"
                >
                  S1 145.00
                </div>

                {/* Resistance Badge Preview */}
                <div
                  style={{
                    backgroundColor: `${drawingSettings.resistanceColor}26`,
                    borderColor: drawingSettings.resistanceColor,
                    color: drawingSettings.resistanceColor,
                    fontSize:
                      drawingSettings.labelSizeLevel === 1
                        ? '10px'
                        : drawingSettings.labelSizeLevel === 2
                        ? '11px'
                        : drawingSettings.labelSizeLevel === 3
                        ? '12px'
                        : '13px',
                    padding:
                      drawingSettings.labelSizeLevel === 1
                        ? '1px 4px'
                        : drawingSettings.labelSizeLevel === 2
                        ? '2px 6px'
                        : drawingSettings.labelSizeLevel === 3
                        ? '2px 8px'
                        : '4px 10px',
                  }}
                  className="rounded font-mono font-bold border shadow-sm"
                >
                  R1 160.00
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Auto S/R Resistance (Red) */}
          <div className="flex flex-col gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: drawingSettings.resistanceColor }}
                />
                Auto Resistance Lines (R1, R2...)
              </span>
            </div>

            {/* Colors */}
            <div>
              <label className="text-[13px] text-slate-400 mb-1.5 block">Line Color</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateDrawingSettings({ resistanceColor: c })}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                      drawingSettings.resistanceColor.toLowerCase() === c.toLowerCase()
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {drawingSettings.resistanceColor.toLowerCase() === c.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-black drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Thickness & Style */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Width */}
              <div>
                <label className="text-[13px] text-slate-400 mb-1.5 block">Line Width</label>
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-slate-800">
                  {LINE_WIDTHS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateDrawingSettings({ resistanceWidth: w })}
                      className={`flex-1 flex items-center justify-center h-7 rounded transition-all ${
                        drawingSettings.resistanceWidth === w
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`${w}px`}
                    >
                      <div
                        className="bg-current rounded-full"
                        style={{ height: `${w}px`, width: '16px' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div>
                <label className="text-[13px] text-slate-400 mb-1.5 block">Line Style</label>
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-slate-800">
                  {LINE_STYLES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateDrawingSettings({ resistanceStyle: st })}
                      className={`flex-1 py-1 text-center rounded text-[11px] font-bold transition-all ${
                        drawingSettings.resistanceStyle === st
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Auto S/R Support (Green) */}
          <div className="flex flex-col gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: drawingSettings.supportColor }}
                />
                Auto Support Lines (S1, S2...)
              </span>
            </div>

            {/* Colors */}
            <div>
              <label className="text-[13px] text-slate-400 mb-1.5 block">Line Color</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateDrawingSettings({ supportColor: c })}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                      drawingSettings.supportColor.toLowerCase() === c.toLowerCase()
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {drawingSettings.supportColor.toLowerCase() === c.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-black drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Thickness & Style */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Width */}
              <div>
                <label className="text-[13px] text-slate-400 mb-1.5 block">Line Width</label>
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-slate-800">
                  {LINE_WIDTHS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateDrawingSettings({ supportWidth: w })}
                      className={`flex-1 flex items-center justify-center h-7 rounded transition-all ${
                        drawingSettings.supportWidth === w
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`${w}px`}
                    >
                      <div
                        className="bg-current rounded-full"
                        style={{ height: `${w}px`, width: '16px' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div>
                <label className="text-[13px] text-slate-400 mb-1.5 block">Line Style</label>
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-slate-800">
                  {LINE_STYLES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateDrawingSettings({ supportStyle: st })}
                      className={`flex-1 py-1 text-center rounded text-[11px] font-bold transition-all ${
                        drawingSettings.supportStyle === st
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Default Manual Line (Alt+H) */}
          <div className="flex flex-col gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: drawingSettings.defaultLineColor }}
                />
                Default Manual Line (Alt+H)
              </span>
            </div>

            {/* Colors */}
            <div>
              <label className="text-[13px] text-slate-400 mb-1.5 block">Line Color</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateDrawingSettings({ defaultLineColor: c })}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                      drawingSettings.defaultLineColor.toLowerCase() === c.toLowerCase()
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {drawingSettings.defaultLineColor.toLowerCase() === c.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-black drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Thickness & Style */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[13px] text-slate-400 mb-1.5 block">Line Width</label>
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-slate-800">
                  {LINE_WIDTHS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateDrawingSettings({ defaultLineWidth: w })}
                      className={`flex-1 flex items-center justify-center h-7 rounded transition-all ${
                        drawingSettings.defaultLineWidth === w
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`${w}px`}
                    >
                      <div
                        className="bg-current rounded-full"
                        style={{ height: `${w}px`, width: '16px' }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] text-slate-400 mb-1.5 block">Line Style</label>
                <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-slate-800">
                  {LINE_STYLES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateDrawingSettings({ defaultLineStyle: st })}
                      className={`flex-1 py-1 text-center rounded text-[11px] font-bold transition-all ${
                        drawingSettings.defaultLineStyle === st
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#131722] border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2962FF] hover:bg-[#1E4BD8] text-white text-xs font-bold rounded-lg shadow transition-colors"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
