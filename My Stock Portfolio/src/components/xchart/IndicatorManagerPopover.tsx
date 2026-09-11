import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Flame,
  Calendar,
  Clock,
} from 'lucide-react';
import { useIndicatorStore } from '../../stores/useIndicatorStore';
import {
  LineStyleOption,
  PresetType,
  RSIMarkerShape,
  RSIMarkerLocation,
  DEFAULT_INDICATOR_SETTINGS,
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

// Rich Symbol Catalog for Overlay Markers
const RICH_SYMBOL_OPTIONS = [
  {
    group: 'Arrows & Pointers',
    items: [
      { value: 'arrowUp', label: '▲ Arrow Up' },
      { value: 'arrowDown', label: '▼ Arrow Down' },
      { value: 'arrowRight', label: '► Pointer Right' },
      { value: 'arrowDoubleUp', label: '⇈ Double Up' },
    ],
  },
  {
    group: 'Classic Shapes',
    items: [
      { value: 'circle', label: '● Circle (Solid)' },
      { value: 'circleOutline', label: '○ Circle (Hollow)' },
      { value: 'square', label: '■ Square (Solid)' },
      { value: 'squareOutline', label: '□ Square (Hollow)' },
      { value: 'diamond', label: '◆ Diamond (Solid)' },
      { value: 'diamondOutline', label: '◇ Diamond (Hollow)' },
      { value: 'triangle', label: '▲ Triangle (Solid)' },
      { value: 'triangleOutline', label: '△ Triangle (Hollow)' },
      { value: 'triangleDown', label: '▼ Triangle Down' },
      { value: 'hexagon', label: '⬡ Hexagon' },
    ],
  },
  {
    group: 'Stars & Sparkles',
    items: [
      { value: 'star', label: '★ Star (Solid)' },
      { value: 'starOutline', label: '☆ Star (Hollow)' },
      { value: 'sparkle', label: '✦ Sparkle Star' },
    ],
  },
  {
    group: 'Badges & Indicators',
    items: [
      { value: 'cross', label: '✚ Plus Cross' },
      { value: 'xMark', label: '✖ Multiply / X' },
      { value: 'check', label: '✔ Checkmark' },
      { value: 'bolt', label: '⚡ Lightning Bolt' },
      { value: 'target', label: '🎯 Target' },
      { value: 'fire', label: '🔥 Momentum Fire' },
      { value: 'flag', label: '⚑ Flag Marker' },
      { value: 'dollar', label: '💲 Dollar Flow' },
    ],
  },
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

const SHAPE_OPTIONS: { id: RSIMarkerShape; label: string; icon: string }[] = [
  { id: 'diamond', label: 'Diamond', icon: '◇' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'cross', label: 'Cross', icon: '+' },
  { id: 'square', label: 'Square', icon: '□' },
  { id: 'arrowUp', label: 'Arrow Up', icon: '▲' },
  { id: 'arrowDown', label: 'Arrow Down', icon: '▼' },
];

interface ShapePickerDropdownProps {
  shape: RSIMarkerShape;
  color: string;
  onShapeChange: (shape: RSIMarkerShape) => void;
  onColorChange: (color: string) => void;
}

const ShapePickerDropdown: React.FC<ShapePickerDropdownProps> = ({
  shape,
  color,
  onShapeChange,
  onColorChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentShapeObj = SHAPE_OPTIONS.find((s) => s.id === shape) || SHAPE_OPTIONS[0];

  return (
    <div className="relative inline-flex items-center gap-1.5" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 flex items-center justify-center transition-all cursor-pointer shadow-sm group"
        title={`Shape: ${currentShapeObj.label} (Click to change)`}
      >
        <span
          className="text-[17px] font-black group-hover:scale-110 transition-transform select-none"
          style={{ color }}
        >
          {currentShapeObj.icon}
        </span>
      </button>

      {/* Direct color picker swatch beside the shape */}
      <ColorPickerDropdown
        color={color}
        onChange={onColorChange}
        label="Signal Color"
      />

      {isOpen && (
        <div className="absolute top-10 left-0 z-50 p-2.5 bg-[#0B101B]/98 border border-slate-700 rounded-xl shadow-2xl w-44 backdrop-blur-md flex flex-col gap-1 animate-in fade-in duration-100">
          <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Marker Shape
          </div>
          <div className="flex flex-col gap-0.5">
            {SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onShapeChange(opt.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer text-left ${
                  shape === opt.id
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="w-5 text-center text-[15px] font-bold select-none" style={{ color }}>
                  {opt.icon}
                </span>
                <span>{opt.label}</span>
                {shape === opt.id && <Check className="w-3.5 h-3.5 ml-auto text-cyan-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface LocationDropdownProps {
  location: RSIMarkerLocation;
  onChange: (loc: RSIMarkerLocation) => void;
}

const LocationDropdown: React.FC<LocationDropdownProps> = ({ location, onChange }) => {
  return (
    <div className="relative">
      <select
        value={location}
        onChange={(e) => onChange(e.target.value as RSIMarkerLocation)}
        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[13px] font-bold text-slate-200 hover:border-slate-500 focus:outline-none focus:border-cyan-500 cursor-pointer transition-all"
      >
        <option value="bottom">Bottom</option>
        <option value="onCurve">On Curve</option>
      </select>
    </div>
  );
};

type ActiveView = 'list' | 'ema' | 'envelope' | 'signals' | 'mcdx' | 'ultimateRsi' | 'trendSpeed' | 'smcLite' | 'anchoredVwap' | 'superMoneySignal' | 'volumeProfile';

interface IndicatorManagerPopoverProps {
  onClose: () => void;
  /** If provided, start on this view instead of 'list' */
  initialView?: ActiveView;
}

export const IndicatorManagerPopover: React.FC<IndicatorManagerPopoverProps> = ({ onClose, initialView }) => {
  const modalCardRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<ActiveView>(initialView || 'list');
  const [rsiTab, setRsiTab] = useState<'inputs' | 'style'>('style');
  const [trendSpeedTab, setTrendSpeedTab] = useState<'inputs' | 'style'>('inputs');
  const [smcTab, setSmcTab] = useState<'inputs' | 'style'>('inputs');
  const [anchoredVwapTab, setAnchoredVwapTab] = useState<'inputs' | 'style'>('inputs');
  const [superMoneySignalTab, setSuperMoneySignalTab] = useState<'inputs' | 'style'>('inputs');
  const [volumeProfileTab, setVolumeProfileTab] = useState<'inputs' | 'style'>('inputs');

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
    updateUltimateRSISignals,
    updateTrendSpeed,
    toggleTrendSpeed,
    updateSMCLite,
    toggleSMCLite,
    updateAnchoredVWAP,
    toggleAnchoredVWAP,
    updateSuperMoneySignal,
    toggleSuperMoneySignal,
    updateVolumeProfile,
    toggleVolumeProfile,
    assignIndicatorPane,
    moveIndicatorUp,
    moveIndicatorDown,
    toggleAxisLabels,
    applyPreset,
    resetDefaults,
    addCustomColor,
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

  // Dynamic Auto-Sorting: 1. Active first -> 2. Pane order (0 -> 1 -> 2 -> 3) -> 3. Alphabetical (A-Z)
  const sortedIndicators = useMemo(() => {
    const items = [
      {
        id: 'ema',
        name: 'EMA Ribbon',
        pane: 0,
        isActive: Boolean(config.ema1.visible || config.ema2.visible || config.ema3.visible),
        renderRow: () => (
          <div key="ema" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
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
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-bold border bg-cyan-950/80 text-cyan-300 border-cyan-800/60">
                    Pane 0 Overlay
                  </span>
                </span>
                <span className="text-[13px] text-slate-400">
                  Length {config.ema1.period}, {config.ema2.period}, {config.ema3.period}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ema1.color }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ema2.color }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.ema3.color }} />
              </div>

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
        ),
      },
      {
        id: 'envelope',
        name: 'Bedrock Envelope',
        pane: 0,
        isActive: Boolean(config.envelope.visible),
        renderRow: () => (
          <div key="envelope" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
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
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-bold border bg-purple-950/80 text-purple-300 border-purple-800/60">
                    Pane 0 Overlay
                  </span>
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
        ),
      },
      {
        id: 'signals',
        name: 'Super Money Signals',
        pane: 0,
        isActive: Boolean(config.signals.visible),
        renderRow: () => (
          <div key="signals" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
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
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-bold border bg-amber-950/80 text-amber-300 border-amber-800/60">
                    Pane 0 Overlay
                  </span>
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
        ),
      },
      {
        id: 'smcLite',
        name: 'FluidTrades - SMC Lite',
        pane: 0,
        isActive: Boolean(config.smcLite?.visible),
        renderRow: () => (
          <div key="smcLite" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSMCLite}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  config.smcLite?.visible
                    ? 'text-sky-400 bg-sky-950/30 hover:bg-sky-950/60'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                }`}
                title="Toggle FluidTrades SMC Lite"
              >
                {config.smcLite?.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <div className="flex flex-col">
                <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  FluidTrades - SMC Lite
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-bold border bg-sky-950/80 text-sky-300 border-sky-800/60">
                    Pane 0 Overlay
                  </span>
                </span>
                <span className="text-[13px] text-slate-400">
                  Supply/Demand Zones, BOS, Dual SMA, Signals
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.smcLite?.supplyColor ?? '#1e3a5f' }} title="Supply" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.smcLite?.demandColor ?? '#5c4a18' }} title="Demand" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.smcLite?.slowSMAColor ?? '#F59E0B' }} title="Slow SMA" />
              </div>

              <button
                type="button"
                onClick={() => setActiveView('smcLite')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors" />
                <span>Config</span>
              </button>
            </div>
          </div>
        ),
      },
      {
        id: 'anchoredVwap',
        name: 'Anchored VWAP',
        pane: 0,
        isActive: Boolean(config.anchoredVwap?.visible),
        renderRow: () => (
          <div key="anchoredVwap" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAnchoredVWAP}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  config.anchoredVwap?.visible
                    ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/60'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                }`}
                title="Toggle Anchored VWAP"
              >
                {config.anchoredVwap?.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <div className="flex flex-col">
                <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Anchored VWAP
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-bold border bg-amber-950/80 text-amber-300 border-amber-800/60">
                    Pane 0 Overlay
                  </span>
                </span>
                <span className="text-[13px] text-slate-400">
                  Volume Weighted Average Price & StDev Bands
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.anchoredVwap?.vwapColor ?? '#FFFFFF' }} title="VWAP" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.anchoredVwap?.upperBandColor ?? '#94A3B8' }} title="Upper Band" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.anchoredVwap?.lowerBandColor ?? '#94A3B8' }} title="Lower Band" />
              </div>

              <button
                type="button"
                onClick={() => setActiveView('anchoredVwap')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                <span>Config</span>
              </button>
            </div>
          </div>
        ),
      },
      {
        id: 'superMoneySignal',
        name: 'Super Money Signal V3',
        pane: 0,
        isActive: Boolean(config.superMoneySignal?.visible),
        renderRow: () => (
          <div key="superMoneySignal" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSuperMoneySignal}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  config.superMoneySignal?.visible
                    ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/60'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                }`}
                title="Toggle Super Money Signal V3"
              >
                {config.superMoneySignal?.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <div className="flex flex-col">
                <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Super Money Signal V3
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-bold border bg-amber-950/80 text-amber-300 border-amber-800/60">
                    Pane 0 Overlay
                  </span>
                </span>
                <span className="text-[13px] text-slate-400">
                  2-Stage Institutional Entry System (Ready & Buy)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.superMoneySignal?.readySignalColor ?? '#FFFFFF' }} title="Ready (White)" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.superMoneySignal?.buySignalColor ?? '#FFE600' }} title="Buy (Yellow)" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.superMoneySignal?.bankerColor ?? '#ff0000' }} title="Banker (Red)" />
              </div>

              <button
                type="button"
                onClick={() => setActiveView('superMoneySignal')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                <span>Config</span>
              </button>
            </div>
          </div>
        ),
      },
      {
        id: 'volumeProfile',
        name: 'Volume Profile (VPVR)',
        pane: 0,
        isActive: Boolean(config.volumeProfile?.visible),
        renderRow: () => (
          <div key="volumeProfile" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleVolumeProfile}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  config.volumeProfile?.visible
                    ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/60'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                }`}
                title="Toggle Volume Profile (VPVR)"
              >
                {config.volumeProfile?.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <div className="flex flex-col">
                <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                  Volume Profile (VPVR)
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-bold border bg-amber-950/80 text-amber-300 border-amber-800/60">
                    Pane 0 Overlay
                  </span>
                </span>
                <span className="text-[13px] text-slate-400">
                  Row Size {config.volumeProfile?.rowSize ?? 50} • Width {config.volumeProfile?.widthPercent ?? 30}% • {config.volumeProfile?.placement ?? 'right'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.volumeProfile?.upColor ?? '#00E5FF' }} title="Up Volume" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.volumeProfile?.downColor ?? '#FF3B69' }} title="Down Volume" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.volumeProfile?.pocColor ?? '#FFE600' }} title="POC Line" />
              </div>

              <button
                type="button"
                onClick={() => setActiveView('volumeProfile')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                <span>Config</span>
              </button>
            </div>
          </div>
        ),
      },
      {
        id: 'volume',
        name: 'Volume Overlay',
        pane: 0,
        isActive: Boolean(config.volume.visible),
        renderRow: () => (
          <div key="volume" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
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
        ),
      },
      {
        id: 'mcdx',
        name: 'Banker MCDX Momentum',
        pane: config.paneLayout?.assignments?.mcdx ?? 1,
        isActive: Boolean(config.mcdx.visible),
        renderRow: () => (
          <div key="mcdx" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
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
                  Banker MCDX Momentum
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
              <div className="flex items-center gap-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[13px] font-bold text-slate-300">Pane</span>
                <select
                  value={config.paneLayout?.assignments?.mcdx ?? 1}
                  onChange={(e) => assignIndicatorPane('mcdx', Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[13px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
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
                    disabled={(config.paneLayout?.assignments?.mcdx ?? 1) >= 3}
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
        ),
      },
      {
        id: 'ultimateRsi',
        name: 'My Ultimate RSI',
        pane: config.paneLayout?.assignments?.ultimateRsi ?? 2,
        isActive: Boolean(config.ultimateRsi.visible),
        renderRow: () => (
          <div key="ultimateRsi" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
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
                  ARSI {config.ultimateRsi.length} ({config.ultimateRsi.smoType1}) + Sig {config.ultimateRsi.smooth} • OB {config.ultimateRsi.obValue} / OS {config.ultimateRsi.osValue}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[13px] font-bold text-slate-300">Pane</span>
                <select
                  value={config.paneLayout?.assignments?.ultimateRsi ?? 2}
                  onChange={(e) => assignIndicatorPane('ultimateRsi', Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[13px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
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
                    disabled={(config.paneLayout?.assignments?.ultimateRsi ?? 2) >= 3}
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
        ),
      },
      {
        id: 'trendSpeed',
        name: 'Trend Speed Analyzer',
        pane: config.paneLayout?.assignments?.trendSpeed ?? 3,
        isActive: Boolean(config.trendSpeed?.visible),
        renderRow: () => (
          <div key="trendSpeed" className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/80 transition-all group">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTrendSpeed}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  config.trendSpeed?.visible
                    ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/60'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                }`}
                title="Toggle Trend Speed Analyzer"
              >
                {config.trendSpeed?.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <div className="flex flex-col">
                <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Trend Speed Analyzer
                  <span className="text-[12px] px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50 font-bold">
                    PANE {config.paneLayout?.assignments?.trendSpeed ?? 3}
                  </span>
                </span>
                <span className="text-[13px] text-slate-400">
                  Dyn EMA {config.trendSpeed?.maxLength ?? 50} • Speed HMA(5) • Dominance Wave Ratio
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[13px] font-bold text-slate-300">Pane</span>
                <select
                  value={config.paneLayout?.assignments?.trendSpeed ?? 3}
                  onChange={(e) => assignIndicatorPane('trendSpeed', Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[13px] font-bold rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveIndicatorUp('trendSpeed')}
                    disabled={(config.paneLayout?.assignments?.trendSpeed ?? 3) <= 1}
                    title="Move Pane Up"
                    className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveIndicatorDown('trendSpeed')}
                    disabled={(config.paneLayout?.assignments?.trendSpeed ?? 3) >= 3}
                    title="Move Pane Down"
                    className="p-0.5 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed hover:bg-slate-800 rounded transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.trendSpeed?.upHistColor1 ?? '#F7D02C' }} title="Speed Up 1" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.trendSpeed?.dnHistColor1 ?? '#9E2A2B' }} title="Speed Dn 1" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.trendSpeed?.upTrendColor ?? '#F7D02C' }} title="Dyn Trend" />
              </div>

              <button
                type="button"
                onClick={() => setActiveView('trendSpeed')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-[13px] font-bold transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                <span>Config</span>
              </button>
            </div>
          </div>
        ),
      },
    ];

    return items.sort((a, b) => {
      // 1. Active first (true before false)
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      // 2. Pane order (0 -> 1 -> 2 -> 3)
      if (a.pane !== b.pane) {
        return a.pane - b.pane;
      }
      // 3. Alphabetical A-Z
      return a.name.localeCompare(b.name);
    });
  }, [config, sigColors]);

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

            {/* Indicator Items List - Auto-sorted by Active first -> Pane -> A-Z */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 divide-y divide-slate-800/40">
              {sortedIndicators.map((item) => item.renderRow())}

              {/* Item 7: Global Display - Right Price Axis Labels */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 transition-all">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAxisLabels}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      config.showAxisLabels
                        ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/60'
                        : 'text-slate-500 hover:text-slate-400 bg-slate-950'
                    }`}
                    title="Toggle Price Axis Labels"
                  >
                    {config.showAxisLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                      Right Price Axis Labels
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-bold border ${
                        config.showAxisLabels
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {config.showAxisLabels ? 'ON' : 'OFF (CLEAN)'}
                      </span>
                    </span>
                    <span className="text-[13px] text-slate-400">
                      แสดงป้ายชื่ออินดิเคเตอร์และระดับ Threshold บนแกนราคาขวา (ค่าเริ่มต้น: ปิดเพื่อความสะอาดตา)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleAxisLabels}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                    config.showAxisLabels ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.showAxisLabels ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
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
                    <span className="text-[13px] font-bold" style={{ color: config.mcdx.bankerColor || '#F87171' }}>Banker:</span>
                    <ColorPickerDropdown
                      color={config.mcdx.bankerColor}
                      onChange={(c) => updateMCDX({ bankerColor: c })}
                      label="Banker Color"
                    />
                  </div>

                  {/* Hot Money */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[13px] font-bold" style={{ color: config.mcdx.hotMoneyColor || '#FFE600' }}>Hot Money:</span>
                    <ColorPickerDropdown
                      color={config.mcdx.hotMoneyColor}
                      onChange={(c) => updateMCDX({ hotMoneyColor: c })}
                      label="Hot Money Color"
                    />
                  </div>

                  {/* Retail */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[13px] font-bold" style={{ color: config.mcdx.retailColor || '#34D399' }}>Retail:</span>
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
        {/* VIEW 6: MY ULTIMATE RSI CONFIG (TRADINGVIEW STYLE 1:1)    */}
        {/* ========================================================= */}
        {activeView === 'ultimateRsi' && (
          <>
            {/* Header with Title & Back Button */}
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
                My Ultimate RSI
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TradingView Top Tabs (Inputs vs Style) */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-[#0B101B]">
              <button
                type="button"
                onClick={() => setRsiTab('inputs')}
                className={`pb-2 px-2 text-[14px] font-extrabold border-b-2 transition-all cursor-pointer ${
                  rsiTab === 'inputs'
                    ? 'border-teal-400 text-teal-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Inputs
              </button>
              <button
                type="button"
                onClick={() => setRsiTab('style')}
                className={`pb-2 px-2 text-[14px] font-extrabold border-b-2 transition-all cursor-pointer ${
                  rsiTab === 'style'
                    ? 'border-teal-400 text-teal-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Style
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* TAB 1: STYLE (MATCHING TRADINGVIEW 1:1) */}
              {rsiTab === 'style' && (
                <div className="flex flex-col gap-1">
                  {/* Row 1: Ultimate RSI Line */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.rsiVisible !== false}
                        onChange={() =>
                          updateUltimateRSI({
                            rsiVisible: config.ultimateRsi.rsiVisible === false,
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Ultimate RSI
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-1 rounded-full shrink-0"
                        style={{ backgroundColor: config.ultimateRsi.rsiColor }}
                      />
                      <ColorPickerDropdown
                        color={config.ultimateRsi.rsiColor}
                        onChange={(c) => updateUltimateRSI({ rsiColor: c })}
                        label="ARSI Color"
                      />
                    </div>
                  </div>

                  {/* Sub-options: Extremes Only & Cloud Gradient */}
                  {config.ultimateRsi.rsiVisible !== false && (
                    <div className="ml-7 flex flex-col gap-1.5 py-1">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none text-[13px] text-slate-300 hover:text-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={config.ultimateRsi.autoColor !== false}
                          onChange={() =>
                            updateUltimateRSI({
                              autoColor: config.ultimateRsi.autoColor === false,
                            })
                          }
                          className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                        />
                        <span>โชว์เฉพาะช่วง Overbought/Oversold (&gt;{config.ultimateRsi.obValue} / &lt;{config.ultimateRsi.osValue})</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none text-[13px] text-slate-300 hover:text-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={config.ultimateRsi.showArea !== false}
                          onChange={() =>
                            updateUltimateRSI({
                              showArea: config.ultimateRsi.showArea === false,
                            })
                          }
                          className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                        />
                        <span>แถบสีเมฆ Extreme Cloud Gradient</span>
                      </label>
                    </div>
                  )}

                  {/* Row 2: Signal Line */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.signalVisible !== false}
                        onChange={() =>
                          updateUltimateRSI({
                            signalVisible: config.ultimateRsi.signalVisible === false,
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Signal Line
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-1 rounded-full shrink-0"
                        style={{ backgroundColor: config.ultimateRsi.signalColor }}
                      />
                      <ColorPickerDropdown
                        color={config.ultimateRsi.signalColor}
                        onChange={(c) => updateUltimateRSI({ signalColor: c })}
                        label="Signal Color"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 my-1" />

                  {/* Row 3: Buy Signal (Cross) */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.signals.buyCross}
                        onChange={() => toggleUltimateRSISignal('buyCross')}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Buy Signal
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <ShapePickerDropdown
                        shape={config.ultimateRsi.signals.buyCrossShape || 'diamond'}
                        color={config.ultimateRsi.signals.buyCrossColor || '#FFFFFF'}
                        onShapeChange={(s) => updateUltimateRSISignals({ buyCrossShape: s })}
                        onColorChange={(c) => updateUltimateRSISignals({ buyCrossColor: c })}
                      />
                      <LocationDropdown
                        location={config.ultimateRsi.signals.buyCrossLocation || 'bottom'}
                        onChange={(loc) => updateUltimateRSISignals({ buyCrossLocation: loc })}
                      />
                    </div>
                  </div>

                  {/* Row 4: Bullish Reversal */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.signals.reversal}
                        onChange={() => toggleUltimateRSISignal('reversal')}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Bullish Reversal
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <ShapePickerDropdown
                        shape={config.ultimateRsi.signals.reversalShape || 'circle'}
                        color={config.ultimateRsi.signals.reversalColor || '#FFE600'}
                        onShapeChange={(s) => updateUltimateRSISignals({ reversalShape: s })}
                        onColorChange={(c) => updateUltimateRSISignals({ reversalColor: c })}
                      />
                      <LocationDropdown
                        location={config.ultimateRsi.signals.reversalLocation || 'bottom'}
                        onChange={(loc) => updateUltimateRSISignals({ reversalLocation: loc })}
                      />
                    </div>
                  </div>

                  {/* Row 5: Buy Zone */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.signals.buyZone}
                        onChange={() => toggleUltimateRSISignal('buyZone')}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Buy Zone
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <ShapePickerDropdown
                        shape={config.ultimateRsi.signals.buyZoneShape || 'cross'}
                        color={config.ultimateRsi.signals.buyZoneColor || '#22c55e'}
                        onShapeChange={(s) => updateUltimateRSISignals({ buyZoneShape: s })}
                        onColorChange={(c) => updateUltimateRSISignals({ buyZoneColor: c })}
                      />
                      <LocationDropdown
                        location={config.ultimateRsi.signals.buyZoneLocation || 'bottom'}
                        onChange={(loc) => updateUltimateRSISignals({ buyZoneLocation: loc })}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 my-1" />

                  {/* Row 6: Overbought Level */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.obVisible !== false}
                        onChange={() =>
                          updateUltimateRSI({
                            obVisible: config.ultimateRsi.obVisible === false,
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Overbought
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <ColorPickerDropdown
                        color={config.ultimateRsi.obColor}
                        onChange={(c) => updateUltimateRSI({ obColor: c })}
                        label="Overbought Color"
                      />
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
                        className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[13px] font-bold text-slate-100 text-center focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Row 7: Midline Level */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.midVisible !== false}
                        onChange={() =>
                          updateUltimateRSI({
                            midVisible: config.ultimateRsi.midVisible === false,
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Midline
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <ColorPickerDropdown
                        color={config.ultimateRsi.midColor || '#787B86'}
                        onChange={(c) => updateUltimateRSI({ midColor: c })}
                        label="Midline Color"
                      />
                      <input
                        type="number"
                        min="30"
                        max="70"
                        value={config.ultimateRsi.midValue ?? 50}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 30 && val <= 70) {
                            updateUltimateRSI({ midValue: val });
                          }
                        }}
                        className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[13px] font-bold text-slate-100 text-center focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Row 8: Oversold Level */}
                  <div className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.ultimateRsi.osVisible !== false}
                        onChange={() =>
                          updateUltimateRSI({
                            osVisible: config.ultimateRsi.osVisible === false,
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-semibold text-slate-200">
                        Oversold
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <ColorPickerDropdown
                        color={config.ultimateRsi.osColor}
                        onChange={(c) => updateUltimateRSI({ osColor: c })}
                        label="Oversold Color"
                      />
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
                        className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[13px] font-bold text-slate-100 text-center focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INPUTS */}
              {rsiTab === 'inputs' && (
                <div className="flex flex-col gap-4">
                  {/* ARSI Core Calculation */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                    <div className="text-[13px] font-extrabold text-teal-300 uppercase tracking-wider">
                      ARSI Calculation
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[12px] font-bold text-slate-400">Length</label>
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

                  {/* Signal Line */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                    <div className="text-[13px] font-extrabold text-orange-400 uppercase tracking-wider">
                      Signal Line Calculation
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </div>
                  </div>
                </div>
              )}
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

        {/* ========================================================= */}
        {/* VIEW 7: TREND SPEED ANALYZER CONFIG (ZEIIERMAN 1:1)       */}
        {/* ========================================================= */}
        {activeView === 'trendSpeed' && (
          <>
            {/* Header with Title & Back Button */}
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
                <Flame className="w-4 h-4 text-amber-400" />
                Trend Speed Analyzer (Zeiierman)
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TradingView Top Tabs (Inputs vs Style) */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-[#0B101B]">
              <button
                type="button"
                onClick={() => setTrendSpeedTab('inputs')}
                className={`pb-2 px-2 text-[14px] font-extrabold border-b-2 transition-all cursor-pointer ${
                  trendSpeedTab === 'inputs'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Inputs
              </button>
              <button
                type="button"
                onClick={() => setTrendSpeedTab('style')}
                className={`pb-2 px-2 text-[14px] font-extrabold border-b-2 transition-all cursor-pointer ${
                  trendSpeedTab === 'style'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Style
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* TAB 1: INPUTS (MATCHING TRADINGVIEW 1:1) */}
              {trendSpeedTab === 'inputs' && (
                <div className="flex flex-col gap-4">
                  {/* Section 1: Dynamic Moving Average */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                    <div className="text-[13px] font-extrabold text-amber-300 uppercase tracking-wider">
                      Dynamic Moving Average
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-bold text-slate-300" title="Maximum Length: Upper limit for number of bars considered in dynamic moving average">
                          Maximum Length
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="200"
                          value={config.trendSpeed?.maxLength ?? 50}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 5 && val <= 200) {
                              updateTrendSpeed({ maxLength: val });
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-bold text-slate-300" title="Accelerator Multiplier: Adjusts responsiveness to price changes">
                          Accelerator Multiplier
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="0.1"
                          value={config.trendSpeed?.accelMultiplier ?? 0.01}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0 && val <= 1) {
                              updateTrendSpeed({ accelMultiplier: val });
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Wave Analysis */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                    <div className="text-[13px] font-extrabold text-cyan-300 uppercase tracking-wider">
                      Wave Analysis
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.trendSpeed?.enableTable ?? true}
                          onChange={() =>
                            updateTrendSpeed({
                              enableTable: !(config.trendSpeed?.enableTable ?? true),
                            })
                          }
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[13px] font-bold text-slate-200">
                          Enable Table
                        </span>
                      </label>

                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-bold text-slate-300">Lookback Period</label>
                        <input
                          type="number"
                          min="10"
                          max="500"
                          value={config.trendSpeed?.lookbackPeriod ?? 150}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 10 && val <= 500) {
                              updateTrendSpeed({ lookbackPeriod: val });
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Trend Visualization */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                    <div className="text-[13px] font-extrabold text-emerald-300 uppercase tracking-wider">
                      Trend Visualization
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.trendSpeed?.enableCandles ?? true}
                          onChange={() =>
                            updateTrendSpeed({
                              enableCandles: !(config.trendSpeed?.enableCandles ?? true),
                            })
                          }
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[13px] font-bold text-slate-200">
                          Enable Candles
                        </span>
                      </label>

                      <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-bold text-slate-300">Collection Period</label>
                        <input
                          type="number"
                          min="10"
                          max="500"
                          value={config.trendSpeed?.collectionPeriod ?? 100}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 10 && val <= 500) {
                              updateTrendSpeed({ collectionPeriod: val });
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Color Settings (Inputs Palette Matching Screenshot) */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
                    <div className="text-[13px] font-extrabold text-amber-300 uppercase tracking-wider">
                      Color Settings (Gradient Palettes)
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Dynamic Trend Colors */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-[13px] font-bold text-slate-200">Dynamic Trend</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-slate-400">Up</span>
                            <ColorPickerDropdown
                              color={config.trendSpeed?.upTrendColor ?? '#F7D02C'}
                              onChange={(c) => updateTrendSpeed({ upTrendColor: c })}
                              label="Up Trend Line"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-slate-400">Dn</span>
                            <ColorPickerDropdown
                              color={config.trendSpeed?.dnTrendColor ?? '#FFF8DB'}
                              onChange={(c) => updateTrendSpeed({ dnTrendColor: c })}
                              label="Down Trend Line"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trend Speed Up Gradient Colors */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                        <span className="text-[13px] font-bold text-slate-200">Trend Speed Up</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-slate-400">1</span>
                            <ColorPickerDropdown
                              color={config.trendSpeed?.upHistColor1 ?? '#F7D02C'}
                              onChange={(c) => updateTrendSpeed({ upHistColor1: c })}
                              label="Speed Up 1"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-slate-400">2</span>
                            <ColorPickerDropdown
                              color={config.trendSpeed?.upHistColor2 ?? '#FFE600'}
                              onChange={(c) => updateTrendSpeed({ upHistColor2: c })}
                              label="Speed Up 2"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trend Speed Dn Gradient Colors */}
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[13px] font-bold text-slate-200">Trend Speed Dn</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-slate-400">1</span>
                            <ColorPickerDropdown
                              color={config.trendSpeed?.dnHistColor1 ?? '#9E2A2B'}
                              onChange={(c) => updateTrendSpeed({ dnHistColor1: c })}
                              label="Speed Dn 1"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] text-slate-400">2</span>
                            <ColorPickerDropdown
                              color={config.trendSpeed?.dnHistColor2 ?? '#C83337'}
                              onChange={(c) => updateTrendSpeed({ dnHistColor2: c })}
                              label="Speed Dn 2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STYLE (MATCHING TRADINGVIEW 1:1) */}
              {trendSpeedTab === 'style' && (
                <div className="flex flex-col gap-2">
                  {/* Row 1: Dynamic Trend */}
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.trendSpeed?.dynamicTrendVisible ?? true}
                        onChange={() =>
                          updateTrendSpeed({
                            dynamicTrendVisible: !(config.trendSpeed?.dynamicTrendVisible ?? true),
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-bold text-slate-200">
                        Dynamic Trend
                      </span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <ColorPickerDropdown
                        color={config.trendSpeed?.upTrendColor ?? '#F7D02C'}
                        onChange={(c) => updateTrendSpeed({ upTrendColor: c })}
                        label="Dynamic Trend Color"
                      />
                      <select
                        value={config.trendSpeed?.dynamicTrendLineWidth ?? 2}
                        onChange={(e) => updateTrendSpeed({ dynamicTrendLineWidth: Number(e.target.value) })}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[13px] font-bold text-slate-200 cursor-pointer focus:outline-none focus:border-amber-500"
                      >
                        <option value={1}>1px</option>
                        <option value={2}>2px</option>
                        <option value={3}>3px</option>
                        <option value={4}>4px</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Trend Speed */}
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.trendSpeed?.trendSpeedVisible ?? true}
                        onChange={() =>
                          updateTrendSpeed({
                            trendSpeedVisible: !(config.trendSpeed?.trendSpeedVisible ?? true),
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-bold text-slate-200">
                        Trend Speed
                      </span>
                    </label>
                    <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                      <span className="text-[12px] font-extrabold text-amber-400">HISTOGRAM</span>
                    </div>
                  </div>

                  {/* Row 3: PlotCandle */}
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.trendSpeed?.plotCandleVisible ?? true}
                        onChange={() =>
                          updateTrendSpeed({
                            plotCandleVisible: !(config.trendSpeed?.plotCandleVisible ?? true),
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-bold text-slate-200">
                        PlotCandle (Recolor Candles by Speed)
                      </span>
                    </label>
                    <span className="text-[12px] font-semibold text-slate-400">
                      {config.trendSpeed?.plotCandleVisible ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* Row 4: Tables */}
                  <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-900/50 border border-transparent hover:border-slate-800/60 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.trendSpeed?.tableVisible ?? true}
                        onChange={() =>
                          updateTrendSpeed({
                            tableVisible: !(config.trendSpeed?.tableVisible ?? true),
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] font-bold text-slate-200">
                        Tables (Dominance Wave Stats)
                      </span>
                    </label>
                    <span className="text-[12px] font-semibold text-slate-400">
                      {config.trendSpeed?.tableVisible ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              )}
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

        {/* VIEW: FluidTrades - SMC Lite Dedicated Config */}
        {activeView === 'smcLite' && (
          <>
            {/* Header with Title & Back Button */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#0E1526] border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60"
              >
                <ArrowLeft className="w-4 h-4 text-sky-400" />
                <span>Back</span>
              </button>
              <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                FluidTrades - SMC Lite
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TradingView-Style Tabs */}
            <div className="flex border-b border-slate-800 px-5 pt-2 bg-[#090D16]">
              <button
                type="button"
                onClick={() => setSmcTab('inputs')}
                className={`pb-2.5 px-4 text-[13px] font-bold transition-all relative cursor-pointer ${
                  smcTab === 'inputs'
                    ? 'text-sky-400 border-b-2 border-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inputs
              </button>
              <button
                type="button"
                onClick={() => setSmcTab('style')}
                className={`pb-2.5 px-4 text-[13px] font-bold transition-all relative cursor-pointer ${
                  smcTab === 'style'
                    ? 'text-sky-400 border-b-2 border-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Style
              </button>
              <div className="pb-2.5 px-4 text-[13px] font-bold text-slate-600 select-none">
                Visibility
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-5 max-h-[480px] overflow-y-auto space-y-6 bg-[#090D16]">
              {smcTab === 'inputs' ? (
                <div className="space-y-6">
                  {/* SETTINGS */}
                  <div className="space-y-3">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Settings
                    </div>

                    {/* Swing High/Low Length */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Swing High/Low Length</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={config.smcLite?.swingLength ?? 10}
                        onChange={(e) => updateSMCLite({ swingLength: Math.max(1, Math.min(50, Number(e.target.value) || 10)) })}
                        className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-[14px] text-slate-100 text-center font-bold focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    {/* Supply/Demand Box Width */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Supply/Demand Box Width</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={config.smcLite?.boxWidth ?? 2.5}
                        onChange={(e) => updateSMCLite({ boxWidth: Math.max(0.5, Math.min(10, Number(e.target.value) || 2.5)) })}
                        className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-[14px] text-slate-100 text-center font-bold focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    {/* History To Keep */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">History To Keep</span>
                      <input
                        type="number"
                        min={5}
                        max={50}
                        value={config.smcLite?.historyToKeep ?? 20}
                        onChange={(e) => updateSMCLite({ historyToKeep: Math.max(5, Math.min(50, Number(e.target.value) || 20)) })}
                        className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-[14px] text-slate-100 text-center font-bold focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  {/* VISUAL SETTINGS */}
                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Visual Settings
                    </div>

                    {/* Show Zig Zag */}
                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showZigzag ?? false}
                        onChange={(e) => updateSMCLite({ showZigzag: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Show Zig Zag</span>
                    </label>

                    {/* Show Price Action Labels */}
                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showPriceActionLabels ?? false}
                        onChange={(e) => updateSMCLite({ showPriceActionLabels: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Show Price Action Labels</span>
                    </label>

                    {/* Supply & Outline */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Supply</span>
                      <div className="flex items-center gap-4">
                        <ColorPickerDropdown
                          color={config.smcLite?.supplyColor ?? '#1e3a5f'}
                          onChange={(c) => updateSMCLite({ supplyColor: c })}
                          label="Supply Color"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-slate-400">Outline</span>
                          <ColorPickerDropdown
                            color={config.smcLite?.supplyOutlineColor ?? '#ffffff'}
                            onChange={(c) => updateSMCLite({ supplyOutlineColor: c })}
                            label="Supply Outline Color"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Demand & Outline */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Demand</span>
                      <div className="flex items-center gap-4">
                        <ColorPickerDropdown
                          color={config.smcLite?.demandColor ?? '#5c4a18'}
                          onChange={(c) => updateSMCLite({ demandColor: c })}
                          label="Demand Color"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-slate-400">Outline</span>
                          <ColorPickerDropdown
                            color={config.smcLite?.demandOutlineColor ?? '#ffffff'}
                            onChange={(c) => updateSMCLite({ demandOutlineColor: c })}
                            label="Demand Outline Color"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BOS Label */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">BOS Label</span>
                      <ColorPickerDropdown
                        color={config.smcLite?.bosLabelColor ?? '#FFFFFF'}
                        onChange={(c) => updateSMCLite({ bosLabelColor: c })}
                        label="BOS Label Color"
                      />
                    </div>

                    {/* POI Label */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">POI Label</span>
                      <ColorPickerDropdown
                        color={config.smcLite?.poiLabelColor ?? '#FFFFFF'}
                        onChange={(c) => updateSMCLite({ poiLabelColor: c })}
                        label="POI Label Color"
                      />
                    </div>

                    {/* Price Action Label */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Price Action Label</span>
                      <ColorPickerDropdown
                        color={config.smcLite?.swingTypeColor ?? '#94A3B8'}
                        onChange={(c) => updateSMCLite({ swingTypeColor: c })}
                        label="Price Action Label Color"
                      />
                    </div>

                    {/* Zig Zag */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Zig Zag</span>
                      <ColorPickerDropdown
                        color={config.smcLite?.zigzagColor ?? '#EAB308'}
                        onChange={(c) => updateSMCLite({ zigzagColor: c })}
                        label="Zig Zag Color"
                      />
                    </div>
                  </div>

                  {/* DISPLAY OPTIONS */}
                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Display Options
                    </div>

                    {/* Show SMA Lines */}
                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showSMA ?? true}
                        onChange={(e) => updateSMCLite({ showSMA: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Show SMA Lines</span>
                    </label>

                    {/* Show Signal Arrows */}
                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showArrows ?? true}
                        onChange={(e) => updateSMCLite({ showArrows: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Show Signal Arrows</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Fast SMA */}
                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showFastSMA ?? false}
                        onChange={(e) => updateSMCLite({ showFastSMA: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Fast SMA ({config.smcLite?.smaFastLen ?? 15})</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.smcLite?.fastSMAColor ?? '#3B82F6'}
                        onChange={(c) => updateSMCLite({ fastSMAColor: c })}
                        label="Fast SMA Color"
                      />
                      <select
                        value={config.smcLite?.fastLineWidth ?? 1}
                        onChange={(e) => updateSMCLite({ fastLineWidth: Number(e.target.value) })}
                        className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[13px] text-slate-200 font-bold focus:outline-none"
                      >
                        <option value={1}>1px</option>
                        <option value={2}>2px</option>
                        <option value={3}>3px</option>
                      </select>
                    </div>
                  </div>

                  {/* Slow SMA */}
                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showSlowSMA ?? true}
                        onChange={(e) => updateSMCLite({ showSlowSMA: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Slow SMA ({config.smcLite?.smaSlowLen ?? 200})</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.smcLite?.slowSMAColor ?? '#F59E0B'}
                        onChange={(c) => updateSMCLite({ slowSMAColor: c })}
                        label="Slow SMA Color"
                      />
                      <select
                        value={config.smcLite?.slowLineWidth ?? 2}
                        onChange={(e) => updateSMCLite({ slowLineWidth: Number(e.target.value) })}
                        className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-[13px] text-slate-200 font-bold focus:outline-none"
                      >
                        <option value={1}>1px</option>
                        <option value={2}>2px</option>
                        <option value={3}>3px</option>
                      </select>
                    </div>
                  </div>

                  {/* Buy Signal */}
                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showBuySignal ?? false}
                        onChange={(e) => updateSMCLite({ showBuySignal: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold flex items-center gap-2">
                        <span className="text-emerald-400">▲</span> Buy Signal
                      </span>
                    </label>
                    <span className="text-[12px] font-semibold text-slate-400">Below Bar</span>
                  </div>

                  {/* Sell Signal */}
                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showSellSignal ?? false}
                        onChange={(e) => updateSMCLite({ showSellSignal: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold flex items-center gap-2">
                        <span className="text-rose-400">▼</span> Sell Signal
                      </span>
                    </label>
                    <span className="text-[12px] font-semibold text-slate-400">Above Bar</span>
                  </div>

                  {/* GRAPHIC OBJECTS */}
                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Graphic Objects
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showBoxes ?? true}
                        onChange={(e) => updateSMCLite({ showBoxes: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Boxes (Supply & Demand)</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showPaneLabels ?? false}
                        onChange={(e) => updateSMCLite({ showPaneLabels: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Pane labels</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.smcLite?.showLines ?? true}
                        onChange={(e) => updateSMCLite({ showLines: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Lines (POI Midline & BOS)</span>
                    </label>
                  </div>
                </div>
              )}
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
                className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-sky-400 text-slate-950 hover:bg-sky-300 shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 9: ANCHORED VWAP CONFIG (Inputs & Style 1:1)          */}
        {/* ========================================================= */}
        {activeView === 'anchoredVwap' && (
          <>
            {/* Sub-Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0E1526] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60 mr-1"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>Back</span>
                </button>
                <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Anchored VWAP
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TradingView-style Tab Navigation */}
            <div className="flex items-center gap-6 px-5 border-b border-slate-800 bg-[#0B101B] text-[14px] font-bold">
              <button
                type="button"
                onClick={() => setAnchoredVwapTab('inputs')}
                className={`py-2.5 relative transition-colors cursor-pointer ${
                  anchoredVwapTab === 'inputs' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inputs
                {anchoredVwapTab === 'inputs' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setAnchoredVwapTab('style')}
                className={`py-2.5 relative transition-colors cursor-pointer ${
                  anchoredVwapTab === 'style' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Style
                {anchoredVwapTab === 'style' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                )}
              </button>

              <button
                type="button"
                disabled
                className="py-2.5 text-slate-600 cursor-not-allowed opacity-60"
                title="Visible on all chart resolutions"
              >
                Visibility
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* TAB 1: INPUTS */}
              {anchoredVwapTab === 'inputs' && (
                <div className="flex flex-col gap-5">
                  {/* Source */}
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-slate-200">Source</span>
                    <select
                      value={config.anchoredVwap?.source ?? 'hlc3'}
                      onChange={(e) => updateAnchoredVWAP({ source: e.target.value as any })}
                      className="bg-[#131722] border border-slate-700/80 rounded-lg px-3 py-1.5 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer min-w-[140px]"
                    >
                      <option value="hlc3">(H + L + C) / 3</option>
                      <option value="close">Close</option>
                      <option value="hl2">(H + L) / 2</option>
                      <option value="ohlc4">(O + H + L + C) / 4</option>
                      <option value="open">Open</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Anchor Calculation Mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-slate-200">Auto Anchor Rule</span>
                      <span className="text-[12px] text-slate-400">เกณฑ์เลือกจุด Anchor เริ่มต้นอัตโนมัติ</span>
                    </div>
                    <select
                      value={config.anchoredVwap?.anchorMode ?? (config.anchoredVwap?.startDate ? 'manual' : 'majorLow10M')}
                      onChange={(e) => {
                        const m = e.target.value as 'majorLow10M' | 'ytd' | 'swingLow60D' | 'manual';
                        if (m === 'manual') {
                          updateAnchoredVWAP({ anchorMode: 'manual' });
                        } else {
                          updateAnchoredVWAP({ anchorMode: m, startDate: '' });
                        }
                      }}
                      className="bg-[#131722] border border-slate-700/80 rounded-lg px-3 py-1.5 text-[13px] font-bold text-amber-400 focus:outline-none focus:border-amber-400 cursor-pointer min-w-[190px]"
                    >
                      <option value="majorLow10M">10-11M Major Low (~240 bars)</option>
                      <option value="ytd">Year-to-Date (YTD Low)</option>
                      <option value="swingLow60D">60-Bar Swing Low</option>
                      <option value="manual">Manual Specific Date</option>
                    </select>
                  </div>

                  {/* Start Calculation (Custom Date/Time) */}
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-semibold text-slate-200">Custom Date Anchor</span>
                        <span className="text-[12px] text-slate-400">ระบุวันที่แบบ Manual (override auto)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Date Picker */}
                        <div className="relative flex items-center">
                          <input
                            type="date"
                            value={config.anchoredVwap?.startDate || ''}
                            onChange={(e) => updateAnchoredVWAP({ startDate: e.target.value, anchorMode: 'manual' })}
                            className="bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                          />
                        </div>
                        {/* Time Picker */}
                        <div className="relative flex items-center">
                          <input
                            type="time"
                            value={config.anchoredVwap?.startTime || '00:00'}
                            onChange={(e) => updateAnchoredVWAP({ startTime: e.target.value, anchorMode: 'manual' })}
                            className="bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Anchor Presets */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60 flex-wrap">
                      <span className="text-[12px] text-slate-400 mr-1">Presets:</span>
                      <button
                        type="button"
                        onClick={() => updateAnchoredVWAP({ startDate: '', startTime: '00:00', anchorMode: 'majorLow10M' })}
                        className={`px-2 py-0.5 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                          (config.anchoredVwap?.anchorMode ?? 'majorLow10M') === 'majorLow10M' && !config.anchoredVwap?.startDate
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                        title="Auto-anchor to major lowest low in 10-11 months (~240 bars)"
                      >
                        10-11M Major Low
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnchoredVWAP({ startDate: '', startTime: '00:00', anchorMode: 'ytd' })}
                        className={`px-2 py-0.5 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                          config.anchoredVwap?.anchorMode === 'ytd' && !config.anchoredVwap?.startDate
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                        title="Auto-anchor to Year-to-Date lowest low"
                      >
                        YTD Low
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAnchoredVWAP({ startDate: '', startTime: '00:00', anchorMode: 'swingLow60D' })}
                        className={`px-2 py-0.5 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                          config.anchoredVwap?.anchorMode === 'swingLow60D' && !config.anchoredVwap?.startDate
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                        title="Auto-anchor to swing low in last 60 bars"
                      >
                        60D Swing Low
                      </button>
                    </div>
                  </div>

                  {/* Show Bands */}
                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.anchoredVwap?.showBands ?? true}
                        onChange={(e) => updateAnchoredVWAP({ showBands: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-semibold">Show Bands</span>
                    </label>
                  </div>

                  {/* Band Multiplier */}
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-slate-200">Band Multiplier</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={config.anchoredVwap?.bandMultiplier ?? 0.5}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateAnchoredVWAP({ bandMultiplier: val });
                          }
                        }}
                        className="w-20 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex items-center gap-1">
                        {[0.5, 1.0, 1.5, 2.0].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => updateAnchoredVWAP({ bandMultiplier: m })}
                            className={`px-1.5 py-1 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                              config.anchoredVwap?.bandMultiplier === m
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {m}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STYLE */}
              {anchoredVwapTab === 'style' && (
                <div className="flex flex-col gap-4">
                  {/* VWAP */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.anchoredVwap?.vwapVisible ?? true}
                        onChange={(e) => updateAnchoredVWAP({ vwapVisible: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-white focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">VWAP</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.anchoredVwap?.vwapColor ?? '#FFFFFF'}
                        onChange={(c) => updateAnchoredVWAP({ vwapColor: c })}
                        label="VWAP Line Color"
                      />

                      {/* Line Width */}
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        {[1, 2, 3, 4].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateAnchoredVWAP({ vwapLineWidth: w })}
                            className={`w-6 py-0.5 rounded text-[12px] font-extrabold transition-all cursor-pointer ${
                              (config.anchoredVwap?.vwapLineWidth ?? 3) === w
                                ? 'bg-white text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>

                      {/* Line Style */}
                      <select
                        value={config.anchoredVwap?.vwapLineStyle ?? 'Solid'}
                        onChange={(e) => updateAnchoredVWAP({ vwapLineStyle: e.target.value as LineStyleOption })}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {lineStyles.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Upper Band */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.anchoredVwap?.upperBandVisible ?? false}
                        onChange={(e) => updateAnchoredVWAP({ upperBandVisible: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-slate-400 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Upper Band</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.anchoredVwap?.upperBandColor ?? '#94A3B8'}
                        onChange={(c) => updateAnchoredVWAP({ upperBandColor: c })}
                        label="Upper Band Color"
                      />

                      {/* Line Width */}
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        {[1, 2, 3, 4].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateAnchoredVWAP({ upperBandLineWidth: w })}
                            className={`w-6 py-0.5 rounded text-[12px] font-extrabold transition-all cursor-pointer ${
                              (config.anchoredVwap?.upperBandLineWidth ?? 2) === w
                                ? 'bg-slate-300 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>

                      {/* Line Style */}
                      <select
                        value={config.anchoredVwap?.upperBandLineStyle ?? 'Dashed'}
                        onChange={(e) => updateAnchoredVWAP({ upperBandLineStyle: e.target.value as LineStyleOption })}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {lineStyles.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Lower Band */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.anchoredVwap?.lowerBandVisible ?? false}
                        onChange={(e) => updateAnchoredVWAP({ lowerBandVisible: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-slate-400 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Lower Band</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.anchoredVwap?.lowerBandColor ?? '#94A3B8'}
                        onChange={(c) => updateAnchoredVWAP({ lowerBandColor: c })}
                        label="Lower Band Color"
                      />

                      {/* Line Width */}
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        {[1, 2, 3, 4].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateAnchoredVWAP({ lowerBandLineWidth: w })}
                            className={`w-6 py-0.5 rounded text-[12px] font-extrabold transition-all cursor-pointer ${
                              (config.anchoredVwap?.lowerBandLineWidth ?? 2) === w
                                ? 'bg-slate-300 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>

                      {/* Line Style */}
                      <select
                        value={config.anchoredVwap?.lowerBandLineStyle ?? 'Dashed'}
                        onChange={(e) => updateAnchoredVWAP({ lowerBandLineStyle: e.target.value as LineStyleOption })}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {lineStyles.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Section: OUTPUT VALUES */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Output Values
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Precision</span>
                      <select
                        disabled
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[13px] font-bold text-slate-300 opacity-80"
                      >
                        <option>Default</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.showAxisLabels}
                        onChange={toggleAxisLabels}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Labels on price scale</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Values in status line</span>
                    </label>
                  </div>

                  {/* Section: INPUT VALUES */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Input Values
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Inputs in status line</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer matching TradingView [Defaults v] [Cancel] [Ok] */}
            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => updateAnchoredVWAP(DEFAULT_INDICATOR_SETTINGS.anchoredVwap)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="px-4 py-1.5 rounded-lg text-[13px] font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-white text-slate-950 hover:bg-slate-100 shadow-md transition-all cursor-pointer"
                >
                  Ok
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 10: SUPER MONEY SIGNAL V3 CONFIG (Inputs & Style 1:1) */}
        {/* ========================================================= */}
        {activeView === 'superMoneySignal' && (
          <>
            {/* Sub-Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0E1526] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60 mr-1"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>Back</span>
                </button>
                <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Super Money Signal V3
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TradingView-style Tab Navigation */}
            <div className="flex items-center gap-6 px-5 border-b border-slate-800 bg-[#0B101B] text-[14px] font-bold">
              <button
                type="button"
                onClick={() => setSuperMoneySignalTab('inputs')}
                className={`py-2.5 relative transition-colors cursor-pointer ${
                  superMoneySignalTab === 'inputs' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inputs
                {superMoneySignalTab === 'inputs' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setSuperMoneySignalTab('style')}
                className={`py-2.5 relative transition-colors cursor-pointer ${
                  superMoneySignalTab === 'style' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Style
                {superMoneySignalTab === 'style' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                )}
              </button>

              <button
                type="button"
                disabled
                className="py-2.5 text-slate-600 cursor-not-allowed opacity-60"
                title="Visible on all chart resolutions"
              >
                Visibility
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* TAB 1: INPUTS */}
              {superMoneySignalTab === 'inputs' && (
                <div className="space-y-6">
                  {/* Group: SUPER MONEY */}
                  <div className="space-y-3.5">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Super Money
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Banker Base</span>
                      <input
                        type="number"
                        value={config.superMoneySignal?.bankerBase ?? 50}
                        onChange={(e) => updateSuperMoneySignal({ bankerBase: parseInt(e.target.value, 10) || 50 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Banker RSI Period</span>
                      <input
                        type="number"
                        value={config.superMoneySignal?.bankerRsiPeriod ?? 50}
                        onChange={(e) => updateSuperMoneySignal({ bankerRsiPeriod: parseInt(e.target.value, 10) || 50 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Hot Money RSI Base</span>
                      <input
                        type="number"
                        value={config.superMoneySignal?.hotMoneyRsiBase ?? 30}
                        onChange={(e) => updateSuperMoneySignal({ hotMoneyRsiBase: parseInt(e.target.value, 10) || 30 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Hot Money RSI Period</span>
                      <input
                        type="number"
                        value={config.superMoneySignal?.hotMoneyRsiPeriod ?? 40}
                        onChange={(e) => updateSuperMoneySignal({ hotMoneyRsiPeriod: parseInt(e.target.value, 10) || 40 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Sensitivity Banker</span>
                      <input
                        type="number"
                        step="0.1"
                        value={config.superMoneySignal?.sensitivityBanker ?? 1.5}
                        onChange={(e) => updateSuperMoneySignal({ sensitivityBanker: parseFloat(e.target.value) || 1.5 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Sensitivity Hot Money</span>
                      <input
                        type="number"
                        step="0.1"
                        value={config.superMoneySignal?.sensitivityHotMoney ?? 0.7}
                        onChange={(e) => updateSuperMoneySignal({ sensitivityHotMoney: parseFloat(e.target.value) || 0.7 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.superMoneySignal?.hideRsi ?? true}
                        onChange={(e) => updateSuperMoneySignal({ hideRsi: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">
                        Hide RSI Graphs, Lines, Bars, and Labels
                      </span>
                    </label>
                  </div>

                  {/* Group: TRIGGER SETTINGS */}
                  <div className="space-y-3.5 pt-4 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Trigger Settings
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Days for Ready Signal</span>
                      <input
                        type="number"
                        min="1"
                        value={config.superMoneySignal?.readyDays ?? 3}
                        onChange={(e) => updateSuperMoneySignal({ readyDays: parseInt(e.target.value, 10) || 3 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Days for Buy Signal</span>
                      <input
                        type="number"
                        min="1"
                        value={config.superMoneySignal?.buyDays ?? 5}
                        onChange={(e) => updateSuperMoneySignal({ buyDays: parseInt(e.target.value, 10) || 5 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-slate-200">Days for No Signal</span>
                      <input
                        type="number"
                        min="1"
                        value={config.superMoneySignal?.noSignalDays ?? 3}
                        onChange={(e) => updateSuperMoneySignal({ noSignalDays: parseInt(e.target.value, 10) || 3 })}
                        className="w-24 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Group: ALERTS */}
                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Alerts
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.superMoneySignal?.alertReady ?? true}
                        onChange={(e) => updateSuperMoneySignal({ alertReady: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Alert on Ready Signal</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.superMoneySignal?.alertBuy ?? true}
                        onChange={(e) => updateSuperMoneySignal({ alertBuy: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Alert on Buy Signal</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: STYLE */}
              {superMoneySignalTab === 'style' && (
                <div className="space-y-3.5">
                  {/* Retailer */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[14px] font-medium text-slate-200">Retailer</span>
                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.superMoneySignal?.retailerColor ?? '#005e07'}
                        onChange={(c) => updateSuperMoneySignal({ retailerColor: c })}
                        label="Retailer Color"
                      />
                      <span className="text-[12px] font-semibold text-slate-400">Columns</span>
                    </div>
                  </div>

                  {/* Hot Money */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[14px] font-medium text-slate-200">Hot Money</span>
                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.superMoneySignal?.hotMoneyColor ?? '#d8c200'}
                        onChange={(c) => updateSuperMoneySignal({ hotMoneyColor: c })}
                        label="Hot Money Color"
                      />
                      <span className="text-[12px] font-semibold text-slate-400">Columns</span>
                    </div>
                  </div>

                  {/* Banker */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[14px] font-medium text-slate-200">Banker</span>
                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.superMoneySignal?.bankerColor ?? '#ff0000'}
                        onChange={(c) => updateSuperMoneySignal({ bankerColor: c })}
                        label="Banker Color"
                      />
                      <span className="text-[12px] font-semibold text-slate-400">Columns</span>
                    </div>
                  </div>

                  {/* Super Money */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[14px] font-medium text-slate-200">Super Money</span>
                    <ColorPickerDropdown
                      color={config.superMoneySignal?.superMoneyColor ?? '#00E5FF'}
                      onChange={(c) => updateSuperMoneySignal({ superMoneyColor: c })}
                      label="Super Money Line Color"
                    />
                  </div>

                  {/* Banker MA */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[14px] font-medium text-slate-200">Banker MA</span>
                    <ColorPickerDropdown
                      color={config.superMoneySignal?.bankerMaColor ?? '#0DAABF'}
                      onChange={(c) => updateSuperMoneySignal({ bankerMaColor: c })}
                      label="Banker MA Line Color"
                    />
                  </div>

                  <div className="border-t border-slate-800/80 my-2" />

                  {/* Ready Signal */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.superMoneySignal?.showReadySignal ?? true}
                        onChange={(e) => updateSuperMoneySignal({ showReadySignal: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-white focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Ready Signal</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.superMoneySignal?.readySignalColor ?? '#FFFFFF'}
                        onChange={(c) => updateSuperMoneySignal({ readySignalColor: c })}
                        label="Ready Signal Color"
                      />
                      <select
                        value={config.superMoneySignal?.readySignalShape ?? 'arrowUp'}
                        onChange={(e) => updateSuperMoneySignal({ readySignalShape: e.target.value as any })}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-200 focus:outline-none cursor-pointer max-w-[150px]"
                        title="Symbol Shape"
                      >
                        {RICH_SYMBOL_OPTIONS.map((grp) => (
                          <optgroup key={grp.group} label={grp.group} className="bg-slate-900 text-amber-400 font-bold">
                            {grp.items.map((item) => (
                              <option key={item.value} value={item.value} className="bg-slate-950 text-slate-200 font-medium">
                                {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Buy Signal */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.superMoneySignal?.showBuySignal ?? true}
                        onChange={(e) => updateSuperMoneySignal({ showBuySignal: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Buy Signal</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.superMoneySignal?.buySignalColor ?? '#FFE600'}
                        onChange={(c) => updateSuperMoneySignal({ buySignalColor: c })}
                        label="Buy Signal Color"
                      />
                      <select
                        value={config.superMoneySignal?.buySignalShape ?? 'arrowUp'}
                        onChange={(e) => updateSuperMoneySignal({ buySignalShape: e.target.value as any })}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-200 focus:outline-none cursor-pointer max-w-[150px]"
                        title="Symbol Shape"
                      >
                        {RICH_SYMBOL_OPTIONS.map((grp) => (
                          <optgroup key={grp.group} label={grp.group} className="bg-slate-900 text-amber-400 font-bold">
                            {grp.items.map((item) => (
                              <option key={item.value} value={item.value} className="bg-slate-950 text-slate-200 font-medium">
                                {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* No Signal */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.superMoneySignal?.showNoSignal ?? false}
                        onChange={(e) => updateSuperMoneySignal({ showNoSignal: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">No Signal</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.superMoneySignal?.noSignalColor ?? '#800000'}
                        onChange={(c) => updateSuperMoneySignal({ noSignalColor: c })}
                        label="No Signal Color"
                      />
                      <select
                        value={config.superMoneySignal?.noSignalShape ?? 'arrowDown'}
                        onChange={(e) => updateSuperMoneySignal({ noSignalShape: e.target.value as any })}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-[12px] font-bold text-slate-200 focus:outline-none cursor-pointer max-w-[150px]"
                        title="Symbol Shape"
                      >
                        {RICH_SYMBOL_OPTIONS.map((grp) => (
                          <optgroup key={grp.group} label={grp.group} className="bg-slate-900 text-amber-400 font-bold">
                            {grp.items.map((item) => (
                              <option key={item.value} value={item.value} className="bg-slate-950 text-slate-200 font-medium">
                                {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Display & Positioning (V1 Parity) */}
                  <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl mt-2">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
                      Display & Positioning
                    </div>

                    {/* Text Labels Switch */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-amber-400" />
                        <span className="text-[13px] font-bold text-slate-200">
                          Show Signal Text Labels (READY, BUY, NO SIGNAL)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSuperMoneySignal({ showText: !(config.superMoneySignal?.showText ?? true) })}
                        className={`px-3 py-1 rounded-md text-[13px] font-extrabold transition-all cursor-pointer border ${
                          (config.superMoneySignal?.showText ?? true)
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {(config.superMoneySignal?.showText ?? true) ? 'SHOW' : 'HIDE'}
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
                            onClick={() => updateSuperMoneySignal({ size: s.val })}
                            className={`px-2.5 py-1 rounded text-[13px] font-bold transition-all cursor-pointer ${
                              (config.superMoneySignal?.size ?? 1.2) === s.val
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
                              const cur = config.superMoneySignal?.padding ?? 0;
                              updateSuperMoneySignal({ padding: Math.max(0, cur - 2) });
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
                              value={config.superMoneySignal?.padding ?? 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 0 && val <= 50) {
                                  updateSuperMoneySignal({ padding: val });
                                }
                              }}
                              className="w-10 bg-transparent text-center text-[13px] font-bold text-slate-100 focus:outline-none"
                            />
                            <span className="text-[12px] font-bold text-cyan-400">px</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const cur = config.superMoneySignal?.padding ?? 0;
                              updateSuperMoneySignal({ padding: Math.min(50, cur + 2) });
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
                            onClick={() => updateSuperMoneySignal({ padding: btn.val })}
                            className={`px-2 py-0.5 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                              (config.superMoneySignal?.padding ?? 0) === btn.val
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

                  {/* Group: GRAPHIC OBJECTS */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Graphic Objects
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.superMoneySignal?.showPaneLabels ?? true}
                        onChange={(e) => updateSuperMoneySignal({ showPaneLabels: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Pane labels (Screener status)</span>
                    </label>
                  </div>

                  {/* Group: OUTPUT VALUES */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Output Values
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-[14px] font-medium text-slate-200">Precision</span>
                      <select
                        disabled
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-[13px] font-bold text-slate-300 opacity-80"
                      >
                        <option>Default</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={config.showAxisLabels}
                        onChange={toggleAxisLabels}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Labels on price scale</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Values in status line</span>
                    </label>
                  </div>

                  {/* Group: INPUT VALUES */}
                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                      Input Values
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-medium">Inputs in status line</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer matching TradingView [Defaults v] [Cancel] [Ok] */}
            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => updateSuperMoneySignal(DEFAULT_INDICATOR_SETTINGS.superMoneySignal)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="px-4 py-1.5 rounded-lg text-[13px] font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-white text-slate-950 hover:bg-slate-100 shadow-md transition-all cursor-pointer"
                >
                  Ok
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* VIEW 11: VOLUME PROFILE (VPVR) CONFIG                     */}
        {/* ========================================================= */}
        {activeView === 'volumeProfile' && (
          <>
            {/* Sub-Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0E1526] border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[13px] font-bold transition-all cursor-pointer border border-slate-700/60 mr-1"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>Back</span>
                </button>
                <span className="text-[15px] font-black tracking-wide text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Volume Profile (VPVR)
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TradingView Tabs */}
            <div className="flex items-center gap-6 px-5 border-b border-slate-800 bg-[#0B101B] text-[14px] font-bold">
              <button
                type="button"
                onClick={() => setVolumeProfileTab('inputs')}
                className={`py-2.5 relative transition-colors cursor-pointer ${
                  volumeProfileTab === 'inputs' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Inputs
                {volumeProfileTab === 'inputs' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setVolumeProfileTab('style')}
                className={`py-2.5 relative transition-colors cursor-pointer ${
                  volumeProfileTab === 'style' ? 'text-white font-extrabold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Style
                {volumeProfileTab === 'style' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                )}
              </button>

              <button
                type="button"
                disabled
                className="py-2.5 text-slate-600 cursor-not-allowed opacity-60"
                title="Visible on visible chart range"
              >
                Visibility
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* TAB 1: INPUTS */}
              {volumeProfileTab === 'inputs' && (
                <div className="flex flex-col gap-5">
                  {/* Row Size (Bins) */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-slate-200">Row Size (Bins)</span>
                      <span className="text-[12px] text-slate-400">จำนวนแถบความละเอียดของราคา</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="10"
                        max="200"
                        step="5"
                        value={config.volumeProfile?.rowSize ?? 50}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 10 && val <= 200) {
                            updateVolumeProfile({ rowSize: val });
                          }
                        }}
                        className="w-20 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex items-center gap-1">
                        {[24, 50, 70, 100].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => updateVolumeProfile({ rowSize: b })}
                            className={`px-2 py-1 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                              (config.volumeProfile?.rowSize ?? 50) === b
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Width % */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-slate-200">Profile Width</span>
                      <span className="text-[12px] text-slate-400">ความกว้างแถบ (% ของหน้าจอชาร์ต)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="10"
                        max="60"
                        step="5"
                        value={config.volumeProfile?.widthPercent ?? 30}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 10 && val <= 60) {
                            updateVolumeProfile({ widthPercent: val });
                          }
                        }}
                        className="w-20 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex items-center gap-1">
                        {[20, 30, 40, 50].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateVolumeProfile({ widthPercent: w })}
                            className={`px-2 py-1 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                              (config.volumeProfile?.widthPercent ?? 30) === w
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {w}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Placement */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-slate-200">Placement</span>
                      <span className="text-[12px] text-slate-400">ตำแหน่งการแสดงผล Profile</span>
                    </div>
                    <select
                      value={config.volumeProfile?.placement ?? 'right'}
                      onChange={(e) => updateVolumeProfile({ placement: e.target.value as 'left' | 'right' })}
                      className="bg-[#131722] border border-slate-700/80 rounded-lg px-3 py-1.5 text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400 cursor-pointer min-w-[140px]"
                    >
                      <option value="right">Right Side (ชิดขวา)</option>
                      <option value="left">Left Side (ชิดซ้าย)</option>
                    </select>
                  </div>

                  {/* Value Area Volume % */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-semibold text-slate-200">Value Area Volume</span>
                      <span className="text-[12px] text-slate-400">สัดส่วนปริมาณการซื้อขายใน Value Area</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="30"
                        max="100"
                        step="5"
                        value={config.volumeProfile?.valueAreaPercent ?? 70}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 30 && val <= 100) {
                            updateVolumeProfile({ valueAreaPercent: val });
                          }
                        }}
                        className="w-20 bg-[#131722] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex items-center gap-1">
                        {[68, 70, 80].map((va) => (
                          <button
                            key={va}
                            type="button"
                            onClick={() => updateVolumeProfile({ valueAreaPercent: va })}
                            className={`px-2 py-1 rounded text-[12px] font-semibold border transition-all cursor-pointer ${
                              (config.volumeProfile?.valueAreaPercent ?? 70) === va
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {va}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STYLE */}
              {volumeProfileTab === 'style' && (
                <div className="flex flex-col gap-4">
                  {/* Up Volume Color */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <span className="text-[14px] text-slate-200 font-bold">Up Volume (Buy)</span>
                    <ColorPickerDropdown
                      color={config.volumeProfile?.upColor ?? '#00E5FF'}
                      onChange={(c) => updateVolumeProfile({ upColor: c })}
                      label="Up Volume Color"
                    />
                  </div>

                  {/* Down Volume Color */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <span className="text-[14px] text-slate-200 font-bold">Down Volume (Sell)</span>
                    <ColorPickerDropdown
                      color={config.volumeProfile?.downColor ?? '#FF3B69'}
                      onChange={(c) => updateVolumeProfile({ downColor: c })}
                      label="Down Volume Color"
                    />
                  </div>

                  {/* Show Value Area */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.volumeProfile?.showVA ?? true}
                        onChange={(e) => updateVolumeProfile({ showVA: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Highlight Value Area (VAH / VAL)</span>
                    </label>
                  </div>

                  {/* Show POC Line */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.volumeProfile?.showPOC ?? true}
                        onChange={(e) => updateVolumeProfile({ showPOC: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-[14px] text-slate-200 font-bold">Point of Control (POC Line)</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <ColorPickerDropdown
                        color={config.volumeProfile?.pocColor ?? '#FFE600'}
                        onChange={(c) => updateVolumeProfile({ pocColor: c })}
                        label="POC Line Color"
                      />

                      {/* Line Width */}
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                        {[1, 2, 3].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateVolumeProfile({ pocLineWidth: w })}
                            className={`w-6 py-0.5 rounded text-[12px] font-extrabold transition-all cursor-pointer ${
                              (config.volumeProfile?.pocLineWidth ?? 2) === w
                                ? 'bg-amber-400 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer matching TradingView */}
            <div className="p-3.5 bg-[#080D18] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => updateVolumeProfile(DEFAULT_INDICATOR_SETTINGS.volumeProfile)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Defaults</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="px-4 py-1.5 rounded-lg text-[13px] font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 border border-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-1.5 rounded-lg text-[13px] font-extrabold bg-white text-slate-950 hover:bg-slate-100 shadow-md transition-all cursor-pointer"
                >
                  Ok
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
