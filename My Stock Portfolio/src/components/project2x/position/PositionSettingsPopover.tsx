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
  Palette,
  Target,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowUp,
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

const PROFIT_PRESETS = [
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Gold', hex: '#EAB308' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Orange', hex: '#FB923C' },
  { name: 'Lime', hex: '#84CC16' },
];

const BREAKEVEN_PRESETS = [
  { name: 'Slate (เทา มืด 70%)', hex: '#64748B' },
  { name: 'Slate 600', hex: '#475569' },
  { name: 'Zinc', hex: '#71717A' },
  { name: 'Cool Gray', hex: '#6B7280' },
  { name: 'Light Slate', hex: '#94A3B8' },
];

const LOSS_PRESETS = [
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Crimson', hex: '#DC2626' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
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

  const [dynamicTab, setDynamicTab] = useState<'profit' | 'breakeven' | 'loss'>('profit');
  const [customHex, setCustomHex] = useState(config.avgCostColor || '#F59E0B');
  const [profitHex, setProfitHex] = useState(config.avgCostProfitColor || '#F59E0B');
  const [breakEvenHex, setBreakEvenHex] = useState(config.avgCostBreakEvenColor || '#64748B');
  const [lossHex, setLossHex] = useState(config.avgCostLossColor || '#F43F5E');


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

            {/* Corner & Center Quick Snap Buttons */}
            <button
              onClick={() => snapToCorner('top-center')}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-[13px] font-medium transition-all cursor-pointer ${
                config.snapCorner === 'top-center' && !config.hudPosition
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-sm'
                  : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
              <span>ตรงกลางด้านบน ⬆ (Top-Center โล่งที่สุด / แนะนำ)</span>
            </button>

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
                <span>Top-Right ↗</span>
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
              <span>Recycle Position (รีไซเคิลกลับตรงกลางด้านบน)</span>
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
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Avg Cost Line Styling</span>
              <span className="text-xs font-mono text-slate-400">
                {(config.avgCostColorMode ?? 'dynamic') === 'dynamic' ? '3-State Dynamic' : 'Single Static'}
              </span>
            </div>

            {/* Color Mode Segmented Toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-slate-300 font-medium">โหมดเฉดสีของเส้น:</span>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
                <button
                  type="button"
                  onClick={() => updateConfig({ avgCostColorMode: 'dynamic' })}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-bold transition-all cursor-pointer ${
                    (config.avgCostColorMode ?? 'dynamic') === 'dynamic'
                      ? 'bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-rose-500/20 border border-amber-500/50 text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>ไดนามิก 3 สี P&L (แนะนำ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig({ avgCostColorMode: 'static' })}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 text-[13px] font-bold transition-all cursor-pointer ${
                    config.avgCostColorMode === 'static'
                      ? 'bg-slate-800 border border-slate-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-slate-300" />
                  <span>สีเดียวคงที่ (Static)</span>
                </button>
              </div>
            </div>

            {/* Sub-Panel: Dynamic 3-State Colors */}
            {(config.avgCostColorMode ?? 'dynamic') === 'dynamic' ? (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-3">
                {/* Real-time 3-State Mini Preview Bar */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[13px] font-mono font-bold">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: config.avgCostProfitColor || '#F59E0B' }}
                    />
                    <span className="text-amber-400">กำไร (+P&L)</span>
                  </div>
                  <span className="text-slate-700">──</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: config.avgCostBreakEvenColor || '#64748B' }}
                    />
                    <span className="text-slate-300">เท่าทุน (±0%)</span>
                  </div>
                  <span className="text-slate-700">──</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shadow-sm"
                      style={{ backgroundColor: config.avgCostLossColor || '#F43F5E' }}
                    />
                    <span className="text-rose-400">ขาดทุน (-P&L)</span>
                  </div>
                </div>

                {/* State Sub-Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-900/80 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDynamicTab('profit')}
                    className={`py-1.5 px-2 rounded-md text-center font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      dynamicTab === 'profit'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.avgCostProfitColor || '#F59E0B' }}
                    />
                    <span>🟡 กำไร</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDynamicTab('breakeven')}
                    className={`py-1.5 px-2 rounded-md text-center font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      dynamicTab === 'breakeven'
                        ? 'bg-slate-700/50 text-slate-200 border border-slate-500/60 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.avgCostBreakEvenColor || '#64748B' }}
                    />
                    <span>⚪ เท่าทุน</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDynamicTab('loss')}
                    className={`py-1.5 px-2 rounded-md text-center font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      dynamicTab === 'loss'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.avgCostLossColor || '#F43F5E' }}
                    />
                    <span>🔴 ขาดทุน</span>
                  </button>
                </div>

                {/* Tab Content: Presets & Custom Hex */}
                {dynamicTab === 'profit' && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] text-slate-300 font-medium">เฉดสีกำไร (Profit Color - สีเหลือง/ทอง):</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PROFIT_PRESETS.map((p) => {
                        const isSelected = (config.avgCostProfitColor || '#F59E0B').toLowerCase() === p.hex.toLowerCase();
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              updateConfig({ avgCostProfitColor: p.hex });
                              setProfitHex(p.hex);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-[13px] ${
                              isSelected
                                ? 'border-white bg-slate-800 text-white font-bold shadow-sm'
                                : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: p.hex }} />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-400 text-[13px]">Hex:</span>
                      <input
                        type="text"
                        value={profitHex}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfitHex(val);
                          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                            updateConfig({ avgCostProfitColor: val });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-[13px] w-28 focus:outline-none focus:border-amber-400"
                        placeholder="#F59E0B"
                        maxLength={7}
                      />
                      <span
                        className="w-6 h-6 rounded-md border border-slate-700"
                        style={{ backgroundColor: config.avgCostProfitColor || '#F59E0B' }}
                      />
                    </div>
                  </div>
                )}

                {dynamicTab === 'breakeven' && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] text-slate-300 font-medium">เฉดสีเท่าทุน (Break-Even Color - สีเทา / ขาวมืด 70%):</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {BREAKEVEN_PRESETS.map((p) => {
                        const isSelected = (config.avgCostBreakEvenColor || '#64748B').toLowerCase() === p.hex.toLowerCase();
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              updateConfig({ avgCostBreakEvenColor: p.hex });
                              setBreakEvenHex(p.hex);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-[13px] ${
                              isSelected
                                ? 'border-white bg-slate-800 text-white font-bold shadow-sm'
                                : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: p.hex }} />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-400 text-[13px]">Hex:</span>
                      <input
                        type="text"
                        value={breakEvenHex}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBreakEvenHex(val);
                          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                            updateConfig({ avgCostBreakEvenColor: val });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-[13px] w-28 focus:outline-none focus:border-slate-400"
                        placeholder="#64748B"
                        maxLength={7}
                      />
                      <span
                        className="w-6 h-6 rounded-md border border-slate-700"
                        style={{ backgroundColor: config.avgCostBreakEvenColor || '#64748B' }}
                      />
                    </div>
                  </div>
                )}


                {dynamicTab === 'loss' && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] text-slate-300 font-medium">เฉดสีขาดทุน (Loss Color):</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {LOSS_PRESETS.map((p) => {
                        const isSelected = (config.avgCostLossColor || '#F43F5E').toLowerCase() === p.hex.toLowerCase();
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => {
                              updateConfig({ avgCostLossColor: p.hex });
                              setLossHex(p.hex);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-[13px] ${
                              isSelected
                                ? 'border-white bg-slate-800 text-white font-bold shadow-sm'
                                : 'border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: p.hex }} />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-400 text-[13px]">Hex:</span>
                      <input
                        type="text"
                        value={lossHex}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLossHex(val);
                          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                            updateConfig({ avgCostLossColor: val });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-[13px] w-28 focus:outline-none focus:border-rose-400"
                        placeholder="#F43F5E"
                        maxLength={7}
                      />
                      <span
                        className="w-6 h-6 rounded-md border border-slate-700"
                        style={{ backgroundColor: config.avgCostLossColor || '#F43F5E' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Sub-Panel: Single Static Color */
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] text-slate-300 font-medium">Color Palette (Static):</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((p) => {
                    const isSelected = config.avgCostColor.toLowerCase() === p.hex.toLowerCase();
                    return (
                      <button
                        key={p.name}
                        type="button"
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
            )}

            {/* Line Width */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-slate-300 font-medium">Line Thickness:</span>
              <div className="grid grid-cols-4 gap-2">
                {LINE_WIDTHS.map((w) => (
                  <button
                    key={w}
                    type="button"
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
                    type="button"
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
