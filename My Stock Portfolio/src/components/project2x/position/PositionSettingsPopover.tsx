import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  Pin,
  PinOff,
  Cloud,
  Layers,
  Sliders,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowDownLeft,
  Check,
} from 'lucide-react';
import { usePositionOverlayStore } from '../../../stores/usePositionOverlayStore';
import { LineStyleOption } from '../../../types/indicatorConfig';
import { CornerSnap } from '../../../types/positionOverlayConfig';

const COLOR_PRESETS = [
  { name: 'Gold', hex: '#F59E0B' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'White', hex: '#F8FAFC' },
];

const LINE_STYLES: LineStyleOption[] = ['Solid', 'Dashed', 'Dotted'];
const LINE_WIDTHS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

interface PositionSettingsPopoverProps {
  onClose: () => void;
}

export const PositionSettingsPopover: React.FC<PositionSettingsPopoverProps> = ({ onClose }) => {
  const {
    config,
    updateConfig,
    toggleEnabled,
    toggleAvgCostLine,
    toggleHUD,
    togglePin,
    snapToCorner,
    resetPosition,
    resetToDefaults,
  } = usePositionOverlayStore();

  const [customHex, setCustomHex] = useState(config.avgCostColor);

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      updateConfig({ avgCostColor: val });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 select-none bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0D111A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-[#121724]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Position Overlay & HUD Settings
              </h3>
              <div className="flex items-center gap-1.5 text-[13px] text-slate-300 font-medium">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cloud Synced across all devices</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content (Scrollable) */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5 text-[13px] text-slate-200">
          {/* Section 1: HUD Position, Snapping & Pinning */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">HUD Position & Snapping</span>
              <button
                onClick={togglePin}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-bold border transition-all cursor-pointer ${
                  config.isPinned
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title={config.isPinned ? 'HUD is Locked' : 'HUD is Draggable'}
              >
                {config.isPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                <span>{config.isPinned ? 'Pinned (Locked)' : 'Draggable'}</span>
              </button>
            </div>

            {/* 4 Corner Quick Snap Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => snapToCorner('top-left')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-[13px] font-medium transition-all cursor-pointer ${
                  config.snapCorner === 'top-left' && !config.hudPosition
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ArrowUpLeft className="w-3.5 h-3.5" />
                <span>Top-Left ↖</span>
              </button>
              <button
                onClick={() => snapToCorner('top-right')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-[13px] font-medium transition-all cursor-pointer ${
                  config.snapCorner === 'top-right' && !config.hudPosition
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Top-Right ↗ (Default)</span>
              </button>
              <button
                onClick={() => snapToCorner('bottom-left')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-[13px] font-medium transition-all cursor-pointer ${
                  config.snapCorner === 'bottom-left' && !config.hudPosition
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Bottom-Left ↙</span>
              </button>
              <button
                onClick={() => snapToCorner('bottom-right')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-[13px] font-medium transition-all cursor-pointer ${
                  config.snapCorner === 'bottom-right' && !config.hudPosition
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Bottom-Right ↘</span>
              </button>
            </div>

            {/* Recycle Button */}
            <button
              onClick={resetPosition}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white transition-all cursor-pointer text-[13px] font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Recycle Position (รีไซเคิลกลับมุมบนขวา)</span>
            </button>
          </div>

          {/* Section 2: Component Toggles */}
          <div className="flex flex-col gap-2.5">
            <span className="font-bold text-white text-sm">Display Toggles</span>

            {/* Master Enabled */}
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
              <span className="font-bold text-slate-100">Enable Position Overlay</span>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={toggleEnabled}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            {/* Avg Cost Line */}
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
              <span>Show Avg Cost Price Line</span>
              <input
                type="checkbox"
                checked={config.showAvgCostLine}
                onChange={toggleAvgCostLine}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            {/* Floating HUD */}
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
              <span>Show Floating Position HUD</span>
              <input
                type="checkbox"
                checked={config.showHUD}
                onChange={toggleHUD}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
            </label>

            {/* Buy Markers */}
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
              <span>Show Buy Execution Markers (BUY Arrows)</span>
              <input
                type="checkbox"
                checked={config.showBuyMarkers}
                onChange={() => updateConfig({ showBuyMarkers: !config.showBuyMarkers })}
                className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
              />
            </label>

            {/* Blueprint Target */}
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
              <span>Show Blueprint Target Line</span>
              <input
                type="checkbox"
                checked={config.showBlueprintTarget}
                onChange={() => updateConfig({ showBlueprintTarget: !config.showBlueprintTarget })}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </label>
          </div>

          {/* Section 3: Avg Cost Line Styling */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-3.5">
            <span className="font-bold text-white text-sm">Avg Cost Line Styling</span>

            {/* Color Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-slate-300 font-medium">Color Palette:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {COLOR_PRESETS.map((p) => {
                  const isSelected = config.avgCostColor.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.name}
                      onClick={() => {
                        updateConfig({ avgCostColor: p.hex });
                        setCustomHex(p.hex);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-[13px] ${
                        isSelected
                          ? 'border-white bg-slate-800 text-white font-bold shadow-sm'
                          : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/30"
                        style={{ backgroundColor: p.hex }}
                      />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400 text-[13px]">Hex:</span>
                <input
                  type="text"
                  value={customHex}
                  onChange={handleCustomHexChange}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-[13px] w-28 focus:outline-none focus:border-amber-400"
                  placeholder="#F59E0B"
                  maxLength={7}
                />
                <span
                  className="w-6 h-6 rounded-md border border-slate-700"
                  style={{ backgroundColor: config.avgCostColor }}
                />
              </div>
            </div>

            {/* Line Width */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-slate-300 font-medium">Line Thickness:</span>
              <div className="grid grid-cols-4 gap-2">
                {LINE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => updateConfig({ avgCostWidth: w })}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer text-[13px] font-bold ${
                      config.avgCostWidth === w
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>

            {/* Line Style */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-slate-300 font-medium">Line Pattern:</span>
              <div className="grid grid-cols-3 gap-2">
                {LINE_STYLES.map((st) => (
                  <button
                    key={st}
                    onClick={() => updateConfig({ avgCostStyle: st })}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer text-[13px] font-bold ${
                      config.avgCostStyle === st
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {st === 'Solid' ? 'Solid ──' : st === 'Dashed' ? 'Dashed ╌╌' : 'Dotted ····'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/80 bg-[#121724]">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors text-[13px] font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Factory Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[13px] font-bold shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
