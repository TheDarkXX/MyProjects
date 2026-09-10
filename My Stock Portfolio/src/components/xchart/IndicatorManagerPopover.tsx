import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  X,
  Check,
  Layers,
  Zap,
  BarChart3,
  Activity,
  Plus,
  Type,
  ArrowLeft,
  Settings,
  Volume2,
  Minus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useIndicatorStore } from '../../stores/useIndicatorStore';
import {
  LineStyleOption,
  PresetType,
} from '../../types/indicatorConfig';

// Curated 12-color TradingView-inspired palette
const TV_COLOR_PALETTE = [
  '#FFFFFF', // White
  '#FFE600', // Yellow
  '#FFB300', // Amber Gold
  '#FF6D00', // Deep Orange
  '#EF4444', // Red
  '#C62828', // Crimson
  '#C084FC', // Purple/Violet
  '#2962FF', // Royal Blue
  '#00E5FF', // Cyan
  '#10B981', // Emerald
  '#94A3B8', // Slate Gray
  '#EC4899', // Pink
];

interface ColorPickerDropdownProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const ColorPickerDropdown: React.FC<ColorPickerDropdownProps> = ({ color, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPickingRef = useRef(false);
  const customColors = useIndicatorStore((s) => s.config.customColors) || [];
  const addCustomColor = useIndicatorStore((s) => s.addCustomColor);

  useEffect(() => {
    setHexInput(color.toUpperCase());
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isPickingRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleApplyHex = () => {
    let val = hexInput.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      const upper = val.toUpperCase();
      onChange(upper);
      addCustomColor(upper);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={label || 'Change Color'}
        className="w-6 h-6 rounded-md border border-slate-600 shadow-sm flex items-center justify-center p-0.5 hover:scale-105 transition-all cursor-pointer"
        style={{ backgroundColor: color }}
      >
        <span className="sr-only">Choose Color</span>
      </button>

      {isOpen && (
        <div className="absolute top-8 right-0 z-50 p-3 bg-[#0B101B]/98 border border-slate-700 rounded-xl shadow-2xl w-60 backdrop-blur-md flex flex-col gap-2.5 animate-in fade-in duration-100">
          {/* Section 1: Standard 12 Colors */}
          <div>
            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
              Standard Palette
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {TV_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                  className="w-7 h-7 rounded-lg border border-slate-700/80 flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-sm"
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <Check className={`w-3.5 h-3.5 ${['#FFFFFF', '#FFE600', '#00E5FF', '#FFF176'].includes(c) ? 'text-slate-950' : 'text-white'}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* Section 2: Custom Saved Swatches (5 Slots) + Native Picker (+) */}
          <div>
            <div className="flex items-center justify-between text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
              <span>Custom Swatches</span>
              <span className="text-cyan-400 font-normal">5 Slots</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {customColors.map((c, idx) => (
                <button
                  key={`custom-${idx}-${c}`}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setIsOpen(false);
                  }}
                  className="w-7 h-7 rounded-lg border border-slate-600 flex items-center justify-center transition-all hover:scale-110 cursor-pointer shadow-sm relative"
                  style={{ backgroundColor: c }}
                  title={`Custom ${c}`}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <Check className={`w-3.5 h-3.5 ${['#FFFFFF', '#FFE600', '#00E5FF', '#FFF176'].includes(c) ? 'text-slate-950' : 'text-white'}`} />
                  )}
                </button>
              ))}

              {/* Add Custom Color Native Picker Button (+) */}
              <div className="relative w-7 h-7 rounded-lg border-2 border-dashed border-cyan-500/60 bg-cyan-950/20 hover:bg-cyan-900/40 hover:border-cyan-400 flex items-center justify-center transition-all cursor-pointer group">
                <Plus className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform pointer-events-none" />
                <input
                  type="color"
                  value={color.startsWith('#') && color.length === 7 ? color : '#00E5FF'}
                  onFocus={() => { isPickingRef.current = true; }}
                  onBlur={() => {
                    setTimeout(() => { isPickingRef.current = false; }, 250);
                  }}
                  onInput={(e) => {
                    const chosen = (e.target as HTMLInputElement).value.toUpperCase();
                    onChange(chosen);
                    setHexInput(chosen);
                  }}
                  onChange={(e) => {
                    const chosen = (e.target as HTMLInputElement).value.toUpperCase();
                    onChange(chosen);
                    setHexInput(chosen);
                    addCustomColor(chosen);
                    setTimeout(() => { isPickingRef.current = false; }, 250);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick Custom Color"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800" />

          {/* Section 3: Direct HEX Code Input */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-6 rounded-md border border-slate-700 shrink-0"
              style={{ backgroundColor: hexInput.length === 7 ? hexInput : color }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyHex();
              }}
              placeholder="#FFFFFF"
              maxLength={7}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-[13px] font-mono text-slate-100 uppercase focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyHex}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-[13px] font-bold cursor-pointer transition-all shrink-0"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

type ActiveView = 'list' | 'ema' | 'envelope' | 'signals' | 'mcdx' | 'ultimateRsi';

interface IndicatorManagerPopoverProps {
  onClose: () => void;
  /** If provided, start on this view instead of 'list' */
  initialView?: ActiveView;
}

export const IndicatorManagerPopover: React.FC<IndicatorManagerPopoverProps> = ({ onClose, initialView }) => {
  const modalCardRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<ActiveView>(initialView || 'list');

  const {
    config,
    updateEMA,
    toggleEMA,
    updateEnvelope,
    toggleEnvelope,
    updateSignals,
    updateSignalColor,
    toggleSignals,
    toggleSignalMarker,
    updateMCDX,
    toggleMCDX,
    updateVolume,
    toggleVolume,
    updateUltimateRSI,
    toggleUltimateRSI,
    toggleUltimateRSISignal,
    assignIndicatorPane,
    moveIndicatorUp,
    moveIndicatorDown,
    applyPreset,
    resetDefaults,
  } = useIndicatorStore();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeView !== 'list') {
          setActiveView('list');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, onClose]);

  const presets: { id: PresetType; label: string; icon: string }[] = [
    { id: 'full', label: 'Full 2X Suite', icon: '🔥' },
    { id: 'clean', label: 'Clean Price', icon: '🧹' },
    { id: 'banker', label: 'Banker Focus', icon: '🎯' },
    { id: 'triple_ema', label: 'Triple EMA', icon: '📐' },
  ];

  const lineStyles: LineStyleOption[] = ['Solid', 'Dashed', 'Dotted'];
  const emaLines: (keyof Pick<typeof config, 'ema1' | 'ema2' | 'ema3'>)[] = ['ema1', 'ema2', 'ema3'];
  const sigColors = config.signals.colors || {
    rebound: '#FBBF24',
    breakout: '#FFE600',
    goldenStar: '#FFFFFF',
    pullback: '#FF1744',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={modalCardRef}
        className="bg-[#0B101B] border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg md:max-w-xl max-h-[88vh] flex flex-col overflow-hidden text-slate-200 select-none animate-in zoom-in-95 duration-150"
      >
        {/* ========================================================= */}
        {/* VIEW 1: MASTER INDICATORS LIST                            */}
        {/* ========================================================= */}
        {activeView === 'list' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0E1526] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="text-[15px] font-black tracking-wide text-slate-100">
                  Indicators & Overlays
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                title="Close (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets Strip */}
            <div className="p-3.5 bg-[#090D18] border-b border-slate-800/80 flex flex-col gap-2">
              <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
                Quick Presets
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {presets.map((p) => {
                  const isActive = config.activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-extrabold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Indicator Items List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 divide-y divide-slate-800/40">
              {/* Item 1: EMA Ribbon */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const anyVisible = config.ema1.visible || config.ema2.visible || config.ema3.visible;
                      toggleEMA('ema1');
                      if (anyVisible) {
                        if (config.ema2.visible) toggleEMA('ema2');
                        if (config.ema3.visible) toggleEMA('ema3');
                      } else {
                        if (!config.ema2.visible) toggleEMA('ema2');
                        if (!config.ema3.visible) toggleEMA('ema3');
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      config.ema1.visible || config.ema2.visible || config.ema3.visible
                        ? 'text-cyan-400 bg-cyan-950/30 hover:bg-cyan-950/60'
                        : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                    }`}
                    title="Toggle EMA Ribbon"
                  >
                    {config.ema1.visible || config.ema2.visible || config.ema3.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      EMA Ribbon
                    </span>
                    <span className="text-[13px] text-slate-400">
                      Length {config.ema1.period}, {config.ema2.period}, {config.ema3.period}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Swatch dots preview */}
                  <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ema1.color }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ema2.color }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ema3.color }} />
                  </div>

                  {/* Settings Gear */}
                  <button
                    type="button"
                    onClick={() => setActiveView('ema')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                    <span>Config</span>
                  </button>
                </div>
              </div>

              {/* Item 2: Bedrock Envelope Channel */}
              <div className="flex items-center justify-between p-3 pt-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleEnvelope}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      config.envelope.visible
                        ? 'text-purple-400 bg-purple-950/30 hover:bg-purple-950/60'
                        : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                    }`}
                    title="Toggle Bedrock Envelope"
                  >
                    {config.envelope.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Bedrock Envelope
                    </span>
                    <span className="text-[13px] text-slate-400">
                      Channel Band ± {config.envelope.percent}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.envelope.color }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView('envelope')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors" />
                    <span>Config</span>
                  </button>
                </div>
              </div>

              {/* Item 3: Super Money Action Signals */}
              <div className="flex items-center justify-between p-3 pt-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSignals}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      config.signals.visible
                        ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/60'
                        : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                    }`}
                    title="Toggle Action Signals"
                  >
                    {config.signals.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Super Money Signals
                    </span>
                    <span className="text-[13px] text-slate-400">
                      ● ● ● READY, ▲ BUY, ★ SUPER, ▼ EXIT
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sigColors.rebound }} title="READY" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sigColors.breakout }} title="BUY" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sigColors.goldenStar }} title="SUPER" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sigColors.pullback }} title="EXIT" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView('signals')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-[13px] font-bold transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-amber-400" />
                    <span>Config</span>
                  </button>
                </div>
              </div>

              {/* Item 4: Banker MCDX Momentum */}
              <div className="flex items-center justify-between p-3 pt-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleMCDX}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      config.mcdx.visible
                        ? 'text-rose-400 bg-rose-950/30 hover:bg-rose-950/60'
                        : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                    }`}
                    title="Toggle Banker MCDX"
                  >
                    {config.mcdx.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
                      Banker MCDX Flow
                      <span className="text-[12px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50 font-bold">
                        PANE {config.paneLayout?.assignments?.mcdx ?? 1}
                      </span>
                    </span>
                    <span className="text-[13px] text-slate-400">
                      Banker, Hot Money, Retail (MA {config.mcdx.maPeriod})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Slot Reorder Controls */}
                  <div className="flex items-center gap-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-[12px] font-bold text-slate-400">Pane</span>
                    <select
                      value={config.paneLayout?.assignments?.mcdx ?? 1}
                      onChange={(e) => assignIndicatorPane('mcdx', Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[13px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-rose-500 cursor-pointer"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveIndicatorUp('mcdx')}
                        disabled={(config.paneLayout?.assignments?.mcdx ?? 1) <= 1}
                        title="Move Pane Up"
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveIndicatorDown('mcdx')}
                        disabled={(config.paneLayout?.assignments?.mcdx ?? 1) >= 2}
                        title="Move Pane Down"
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.mcdx.bankerColor }} title="Banker" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.mcdx.hotMoneyColor }} title="Hot Money" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.mcdx.retailColor }} title="Retail" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView('mcdx')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
                    <span>Config</span>
                  </button>
                </div>
              </div>

              {/* Item 5: Volume Overlay */}
              <div className="flex items-center justify-between p-3 pt-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleVolume}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      config.volume.visible
                        ? 'text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/60'
                        : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                    }`}
                    title="Toggle Volume"
                  >
                    {config.volume.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      Volume Overlay
                    </span>
                    <span className="text-[13px] text-slate-400">
                      Volume Bars Indicator
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                    {config.volume.visible ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Item 6: My Ultimate RSI (DoctorBank ARSI) */}
              <div className="flex items-center justify-between p-3 pt-4 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleUltimateRSI}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      config.ultimateRsi.visible
                        ? 'text-teal-400 bg-teal-950/30 hover:bg-teal-950/60'
                        : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                    }`}
                    title="Toggle Ultimate RSI"
                  >
                    {config.ultimateRsi.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      My Ultimate RSI
                      <span className="text-[12px] px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-800/50 font-bold">
                        PANE {config.paneLayout?.assignments?.ultimateRsi ?? 2}
                      </span>
                    </span>
                    <span className="text-[13px] text-slate-400">
                      ARSI {config.ultimateRsi.length} ({config.ultimateRsi.smoType1}) + Sig {config.ultimateRsi.smooth} ({config.ultimateRsi.smoType2}) • OB {config.ultimateRsi.obValue} / OS {config.ultimateRsi.osValue}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Slot Reorder Controls */}
                  <div className="flex items-center gap-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-[12px] font-bold text-slate-400">Pane</span>
                    <select
                      value={config.paneLayout?.assignments?.ultimateRsi ?? 2}
                      onChange={(e) => assignIndicatorPane('ultimateRsi', Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[13px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveIndicatorUp('ultimateRsi')}
                        disabled={(config.paneLayout?.assignments?.ultimateRsi ?? 2) <= 1}
                        title="Move Pane Up"
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveIndicatorDown('ultimateRsi')}
                        disabled={(config.paneLayout?.assignments?.ultimateRsi ?? 2) >= 2}
                        title="Move Pane Down"
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ultimateRsi.obColor }} title="Overbought" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ultimateRsi.signalColor }} title="Signal Line" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ultimateRsi.osColor }} title="Oversold" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView('ultimateRsi')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-400 transition-colors" />
                    <span>Config</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={resetDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: SUPER MONEY SIGNALS CONFIG                        */}
        {/* ========================================================= */}
        {activeView === 'signals' && (
          <>
            {/* Sub-Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0E1526] border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Back</span>
              </button>
              <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Super Money Signals
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Section 1: Signal Toggles & Custom Colors */}
              <div className="flex flex-col gap-2 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
                  Signal Rules & Individual Colors
                </div>

                <div className="flex flex-col gap-2">
                  {/* READY */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <label className="flex items-center gap-2.5 text-[13px] font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.signals.markers.rebound}
                        onChange={() => toggleSignalMarker('rebound')}
                        className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-extrabold" style={{ color: sigColors.rebound }}>
                        ● ● ● READY
                      </span>
                      <span className="text-[12px] font-normal text-slate-400 hidden sm:inline">
                        (Rebound Setup)
                      </span>
                    </label>
                    <ColorPickerDropdown
                      color={sigColors.rebound}
                      onChange={(c) => updateSignalColor('rebound', c)}
                      label="READY Signal Color"
                    />
                  </div>

                  {/* BUY */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <label className="flex items-center gap-2.5 text-[13px] font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.signals.markers.breakout}
                        onChange={() => toggleSignalMarker('breakout')}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-400 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-extrabold" style={{ color: sigColors.breakout }}>
                        ▲ BUY
                      </span>
                      <span className="text-[12px] font-normal text-slate-400 hidden sm:inline">
                        (Breakout Entry)
                      </span>
                    </label>
                    <ColorPickerDropdown
                      color={sigColors.breakout}
                      onChange={(c) => updateSignalColor('breakout', c)}
                      label="BUY Signal Color"
                    />
                  </div>

                  {/* SUPER */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <label className="flex items-center gap-2.5 text-[13px] font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.signals.markers.goldenStar}
                        onChange={() => toggleSignalMarker('goldenStar')}
                        className="rounded bg-slate-900 border-slate-700 text-white focus:ring-0 cursor-pointer"
                      />
                      <span className="font-extrabold" style={{ color: sigColors.goldenStar }}>
                        ★ SUPER
                      </span>
                      <span className="text-[12px] font-normal text-slate-400 hidden sm:inline">
                        (Banker Strike &ge; 10)
                      </span>
                    </label>
                    <ColorPickerDropdown
                      color={sigColors.goldenStar}
                      onChange={(c) => updateSignalColor('goldenStar', c)}
                      label="SUPER Signal Color"
                    />
                  </div>

                  {/* EXIT */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <label className="flex items-center gap-2.5 text-[13px] font-bold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.signals.markers.pullback}
                        onChange={() => toggleSignalMarker('pullback')}
                        className="rounded bg-slate-900 border-slate-700 text-rose-400 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-extrabold" style={{ color: sigColors.pullback }}>
                        ▼ EXIT
                      </span>
                      <span className="text-[12px] font-normal text-slate-400 hidden sm:inline">
                        (Danger / Stop Loss)
                      </span>
                    </label>
                    <ColorPickerDropdown
                      color={sigColors.pullback}
                      onChange={(c) => updateSignalColor('pullback', c)}
                      label="EXIT Signal Color"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Display Styling Options */}
              <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
                  Display & Positioning
                </div>

                {/* Text Labels Switch */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-amber-400" />
                    <span className="text-[13px] font-bold text-slate-200">
                      Show Text Labels (•••, ▲, ★, ▼)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSignals({ showText: !config.signals.showText })}
                    className={`px-3 py-1 rounded-md text-[13px] font-extrabold transition-all cursor-pointer border ${
                      config.signals.showText
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {config.signals.showText ? 'SHOW' : 'HIDE'}
                  </button>
                </div>

                {/* Marker Size */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[13px] font-bold text-slate-200">
                    Marker Size Scale:
                  </span>
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                    {[
                      { label: 'S', val: 0.9 },
                      { label: 'M', val: 1.2 },
                      { label: 'L', val: 1.5 },
                      { label: 'XL', val: 2.0 },
                    ].map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => updateSignals({ size: s.val })}
                        className={`px-2.5 py-1 rounded text-[13px] font-bold transition-all cursor-pointer ${
                          config.signals.size === s.val
                            ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spacing / Padding (Custom Numeric px Input) */}
                <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-slate-200">
                      Vertical Spacing (Padding):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = config.signals.padding ?? 0;
                          updateSignals({ padding: Math.max(0, cur - 2) });
                        }}
                        className="w-7 h-7 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                        title="Decrease Padding"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-md px-2 py-0.5">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={config.signals.padding ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0 && val <= 50) {
                              updateSignals({ padding: val });
                            }
                          }}
                          className="w-10 bg-transparent text-center text-[13px] font-bold text-slate-100 focus:outline-none"
                        />
                        <span className="text-[12px] font-bold text-cyan-400">px</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const cur = config.signals.padding ?? 0;
                          updateSignals({ padding: Math.min(50, cur + 2) });
                        }}
                        className="w-7 h-7 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                        title="Increase Padding"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Padding Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { label: 'Snug (0px)', val: 0 },
                      { label: '8px', val: 8 },
                      { label: '14px', val: 14 },
                      { label: '20px', val: 20 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => updateSignals({ padding: btn.val })}
                        className={`px-2 py-0.5 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                          config.signals.padding === btn.val
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-Footer */}
            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                Back to Indicators
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: EMA RIBBON CONFIG                                 */}
        {/* ========================================================= */}
        {activeView === 'ema' && (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0E1526] border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span>Back</span>
              </button>
              <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                EMA Ribbon Settings
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {emaLines.map((key) => {
                const line = config[key];
                return (
                  <div
                    key={key}
                    className={`flex flex-col gap-2.5 p-3 rounded-xl border transition-all ${
                      line.visible
                        ? 'bg-slate-900/60 border-slate-700/70'
                        : 'bg-slate-950/40 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEMA(key)}
                          className={`p-1 rounded-md transition-all cursor-pointer ${
                            line.visible ? 'text-amber-400 hover:text-amber-300' : 'text-slate-500'
                          }`}
                        >
                          {line.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <span className="text-[14px] font-extrabold text-slate-200">
                          {line.name}
                        </span>
                      </div>

                      <ColorPickerDropdown
                        color={line.color}
                        onChange={(c) => updateEMA(key, { color: c })}
                        label={`${line.name} Color`}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                      {/* Period */}
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                        <label className="text-[12px] text-slate-400 font-bold">Len:</label>
                        <input
                          type="number"
                          min="5"
                          max="500"
                          value={line.period}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 5 && val <= 500) {
                              updateEMA(key, { period: val });
                            }
                          }}
                          className="w-full bg-transparent text-center text-[13px] font-bold text-slate-100 focus:outline-none"
                        />
                      </div>

                      {/* Line Width */}
                      <div className="flex items-center justify-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        {[1, 2, 3, 4].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateEMA(key, { lineWidth: w })}
                            className={`flex-1 py-0.5 rounded text-[12px] font-extrabold transition-all cursor-pointer ${
                              line.lineWidth === w
                                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>

                      {/* Style */}
                      <select
                        value={line.lineStyle}
                        onChange={(e) => updateEMA(key, { lineStyle: e.target.value as LineStyleOption })}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {lineStyles.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                Back to Indicators
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: BEDROCK ENVELOPE CONFIG                           */}
        {/* ========================================================= */}
        {activeView === 'envelope' && (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0E1526] border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60"
              >
                <ArrowLeft className="w-4 h-4 text-purple-400" />
                <span>Back</span>
              </button>
              <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Bedrock Envelope Settings
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleEnvelope}
                      className={`p-1 rounded-md transition-all cursor-pointer ${
                        config.envelope.visible ? 'text-purple-400 hover:text-purple-300' : 'text-slate-500'
                      }`}
                    >
                      {config.envelope.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <span className="text-[14px] font-extrabold text-slate-200">
                      Channel Upper & Lower Bands
                    </span>
                  </div>

                  <ColorPickerDropdown
                    color={config.envelope.color}
                    onChange={(c) => updateEnvelope({ color: c })}
                    label="Envelope Color"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  {/* Percent */}
                  <div className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    <label className="text-[13px] text-slate-300 font-bold">± Band %:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="20"
                      value={config.envelope.percent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0.5 && val <= 20) {
                          updateEnvelope({ percent: val });
                        }
                      }}
                      className="w-14 bg-transparent text-center text-[13px] font-bold text-slate-100 focus:outline-none"
                    />
                  </div>

                  {/* Line Style */}
                  <select
                    value={config.envelope.lineStyle}
                    onChange={(e) => updateEnvelope({ lineStyle: e.target.value as LineStyleOption })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[13px] font-bold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {lineStyles.map((s) => (
                      <option key={s} value={s}>
                        {s} Line
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                Back to Indicators
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: BANKER MCDX CONFIG                                */}
        {/* ========================================================= */}
        {activeView === 'mcdx' && (
          <>
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0E1526] border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60"
              >
                <ArrowLeft className="w-4 h-4 text-rose-400" />
                <span>Back</span>
              </button>
              <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-400" />
                Banker MCDX Settings
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/70">
                <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
                  Component Colors
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Banker */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[13px] font-bold text-rose-400">Banker:</span>
                    <ColorPickerDropdown
                      color={config.mcdx.bankerColor}
                      onChange={(c) => updateMCDX({ bankerColor: c })}
                      label="Banker Color"
                    />
                  </div>

                  {/* Hot Money */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[13px] font-bold text-[#FFE600]">Hot Money:</span>
                    <ColorPickerDropdown
                      color={config.mcdx.hotMoneyColor}
                      onChange={(c) => updateMCDX({ hotMoneyColor: c })}
                      label="Hot Money Color"
                    />
                  </div>

                  {/* Retail */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[13px] font-bold text-emerald-400">Retail:</span>
                    <ColorPickerDropdown
                      color={config.mcdx.retailColor}
                      onChange={(c) => updateMCDX({ retailColor: c })}
                      label="Retail Color"
                    />
                  </div>
                </div>

                <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-0.5 pt-2 border-t border-slate-800">
                  Moving Average Line
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <label className="text-[13px] text-slate-300 font-bold">MA Length:</label>
                    <input
                      type="number"
                      min="3"
                      max="50"
                      value={config.mcdx.maPeriod}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 3 && val <= 50) {
                          updateMCDX({ maPeriod: val });
                        }
                      }}
                      className="w-14 px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-center text-[13px] font-bold text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-slate-400">Color:</span>
                    <ColorPickerDropdown
                      color={config.mcdx.maColor}
                      onChange={(c) => updateMCDX({ maColor: c })}
                      label="MA Line Color"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                Back to Indicators
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: MY ULTIMATE RSI CONFIG (DOCTORBANK)               */}
        {/* ========================================================= */}
        {activeView === 'ultimateRsi' && (
          <>
            {/* Sub-Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0E1526] border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Back</span>
              </button>
              <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                My Ultimate RSI Settings
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Section 1: ARSI Core Calculation */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                <div className="text-[13px] font-extrabold text-teal-300 uppercase tracking-wider">
                  ARSI Calculation
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400">ARSI Length</label>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={config.ultimateRsi.length}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 2 && val <= 100) {
                          updateUltimateRSI({ length: val });
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400">Smoothing Method</label>
                    <select
                      value={config.ultimateRsi.smoType1}
                      onChange={(e) => updateUltimateRSI({ smoType1: e.target.value as any })}
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="RMA">RMA (Wilder's)</option>
                      <option value="EMA">EMA</option>
                      <option value="SMA">SMA</option>
                      <option value="TMA">TMA (Triangular)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400">Source</label>
                    <select
                      value={config.ultimateRsi.source}
                      onChange={(e) => updateUltimateRSI({ source: e.target.value as any })}
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-teal-500 cursor-pointer"
                    >
                      <option value="close">Close</option>
                      <option value="hl2">HL2 ((High+Low)/2)</option>
                      <option value="hlc3">HLC3 ((H+L+C)/3)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Signal Line */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                <div className="text-[13px] font-extrabold text-orange-400 uppercase tracking-wider">
                  Signal Line
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400">Signal Length</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={config.ultimateRsi.smooth}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= 100) {
                          updateUltimateRSI({ smooth: val });
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400">Signal Method</label>
                    <select
                      value={config.ultimateRsi.smoType2}
                      onChange={(e) => updateUltimateRSI({ smoType2: e.target.value as any })}
                      className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="EMA">EMA</option>
                      <option value="SMA">SMA</option>
                      <option value="RMA">RMA</option>
                      <option value="TMA">TMA</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400">Signal Color</label>
                    <div className="flex items-center gap-2 pt-1">
                      <ColorPickerDropdown
                        color={config.ultimateRsi.signalColor}
                        onChange={(c) => updateUltimateRSI({ signalColor: c })}
                        label="Signal Color"
                      />
                      <span className="text-[13px] font-mono text-slate-300">
                        {config.ultimateRsi.signalColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Overbought & Oversold Levels */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                <div className="text-[13px] font-extrabold text-slate-200 uppercase tracking-wider">
                  Overbought / Oversold Levels & Colors
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Overbought */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-emerald-900/40 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-bold text-emerald-400">Overbought Level</span>
                      <input
                        type="number"
                        min="50"
                        max="99"
                        value={config.ultimateRsi.obValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 50 && val <= 99) {
                            updateUltimateRSI({ obValue: val });
                          }
                        }}
                        className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none"
                      />
                    </div>
                    <ColorPickerDropdown
                      color={config.ultimateRsi.obColor}
                      onChange={(c) => updateUltimateRSI({ obColor: c })}
                      label="Overbought Color"
                    />
                  </div>

                  {/* Oversold */}
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-rose-900/40 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-bold text-rose-400">Oversold Level</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={config.ultimateRsi.osValue}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 1 && val <= 50) {
                            updateUltimateRSI({ osValue: val });
                          }
                        }}
                        className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none"
                      />
                    </div>
                    <ColorPickerDropdown
                      color={config.ultimateRsi.osColor}
                      onChange={(c) => updateUltimateRSI({ osColor: c })}
                      label="Oversold Color"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Buy Signals & Markers */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                <div className="text-[13px] font-extrabold text-amber-400 uppercase tracking-wider">
                  Sniper Buy Signals & Markers
                </div>

                <div className="flex flex-col gap-2.5">
                  {/* Signal 1: Buy Cross */}
                  <div
                    onClick={() => toggleUltimateRSISignal('buyCross')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded flex items-center justify-center bg-white text-slate-950 text-[11px] font-black">
                        BUY
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-200">
                          1. Momentum Buy Cross
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ARSI crosses over Signal line below 30
                        </span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${config.ultimateRsi.signals.buyCross ? 'bg-teal-500 border-teal-400 text-slate-950' : 'border-slate-600'}`}>
                      {config.ultimateRsi.signals.buyCross && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Signal 2: Bullish Reversal */}
                  <div
                    onClick={() => toggleUltimateRSISignal('reversal')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#FFE600]" />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-200">
                          2. Bullish Reversal Dot
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ARSI & Signal recover from &lt; 20 into 20–30 zone
                        </span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${config.ultimateRsi.signals.reversal ? 'bg-teal-500 border-teal-400 text-slate-950' : 'border-slate-600'}`}>
                      {config.ultimateRsi.signals.reversal && <Check className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Signal 3: Buy Zone */}
                  <div
                    onClick={() => toggleUltimateRSISignal('buyZone')}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-sm bg-[#D0FF00]" />
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-slate-200">
                          3. Buy Zone Accumulation
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Within 10 bars after cross, both ARSI & Signal in 20–40 zone
                        </span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${config.ultimateRsi.signals.buyZone ? 'bg-teal-500 border-teal-400 text-slate-950' : 'border-slate-600'}`}>
                      {config.ultimateRsi.signals.buyZone && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                Back to Indicators
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
