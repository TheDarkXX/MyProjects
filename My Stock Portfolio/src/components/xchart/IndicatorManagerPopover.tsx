import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  X,
  ChevronDown,
  Check,
  Layers,
  Zap,
  BarChart3,
  Activity,
} from 'lucide-react';
import { useIndicatorStore } from '../../stores/useIndicatorStore';
import {
  LineStyleOption,
  PresetType,
  EMALineConfig,
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
        <div className="absolute top-8 left-0 z-50 p-2.5 bg-[#0B101B] border border-slate-700 rounded-xl shadow-2xl grid grid-cols-4 gap-2 w-44 backdrop-blur-md">
          {TV_COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setIsOpen(false);
              }}
              className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
              style={{ backgroundColor: c }}
            >
              {color.toLowerCase() === c.toLowerCase() && (
                <Check className={`w-4 h-4 ${['#FFFFFF', '#FFE600', '#00E5FF', '#FFF176'].includes(c) ? 'text-slate-950' : 'text-white'}`} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface IndicatorManagerPopoverProps {
  onClose: () => void;
}

export const IndicatorManagerPopover: React.FC<IndicatorManagerPopoverProps> = ({ onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    config,
    updateEMA,
    toggleEMA,
    updateEnvelope,
    toggleEnvelope,
    updateSignals,
    toggleSignals,
    toggleSignalMarker,
    updateMCDX,
    toggleMCDX,
    updateVolume,
    toggleVolume,
    applyPreset,
    resetDefaults,
  } = useIndicatorStore();

  // Close on outside click (ignore if clicking the trigger button itself)
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('[data-indicator-trigger="true"]')) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const presets: { id: PresetType; label: string; icon: string }[] = [
    { id: 'full', label: 'Full 2X Suite', icon: '🔥' },
    { id: 'clean', label: 'Clean Price', icon: '🧹' },
    { id: 'banker', label: 'Banker Focus', icon: '🎯' },
    { id: 'triple_ema', label: 'Triple EMA', icon: '📐' },
  ];

  const lineStyles: LineStyleOption[] = ['Solid', 'Dashed', 'Dotted'];
  const emaLines: (keyof Pick<typeof config, 'ema1' | 'ema2' | 'ema3'>)[] = ['ema1', 'ema2', 'ema3'];

  return (
    <div
      ref={popoverRef}
      className="absolute top-12 right-0 z-[80] w-96 max-w-[95vw] max-h-[85vh] overflow-y-auto bg-[#0A0F1D]/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col divide-y divide-slate-800/80 text-slate-200 select-none transition-opacity duration-150"
    >
      {/* ----------------------------------------------------------- */}
      {/* HEADER                                                      */}
      {/* ----------------------------------------------------------- */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0D1424]/90 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-[14px] font-black tracking-wide text-slate-100">
            Indicators & Overlays
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 1-CLICK QUICK PRESETS                                       */}
      {/* ----------------------------------------------------------- */}
      <div className="p-3 bg-[#0B1120]/60 flex flex-col gap-1.5">
        <div className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">
          Quick Presets
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p) => {
            const isActive = config.activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-bold transition-all border cursor-pointer ${
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

      {/* ----------------------------------------------------------- */}
      {/* SECTION 1: EMA RIBBON                                       */}
      {/* ----------------------------------------------------------- */}
      <div className="p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-[14px] font-extrabold text-slate-100">
              EMA Ribbon
            </span>
          </div>
          <span className="text-[13px] text-slate-400">Inputs & Style</span>
        </div>

        <div className="flex flex-col gap-2">
          {emaLines.map((key) => {
            const line = config[key];
            return (
              <div
                key={key}
                className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                  line.visible
                    ? 'bg-slate-900/50 border-slate-700/60'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-50'
                }`}
              >
                {/* Eye Toggle & Label */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleEMA(key)}
                    className={`p-1 rounded-md transition-all cursor-pointer ${
                      line.visible
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-slate-500 hover:text-slate-400'
                    }`}
                    title={line.visible ? 'Hide EMA' : 'Show EMA'}
                  >
                    {line.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <span className="text-[13px] font-bold text-slate-200">
                    {line.name}
                  </span>
                </div>

                {/* Period Input */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[13px] text-slate-400 font-medium">Len:</label>
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
                    className="w-14 px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Color Swatch */}
                <ColorPickerDropdown
                  color={line.color}
                  onChange={(c) => updateEMA(key, { color: c })}
                  label={`${line.name} Color`}
                />

                {/* Width Selector: 1-4 */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800">
                  {[1, 2, 3, 4].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateEMA(key, { lineWidth: w })}
                      className={`w-5 h-5 rounded text-[13px] font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                        line.lineWidth === w
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>

                {/* Line Style Dropdown */}
                <select
                  value={line.lineStyle}
                  onChange={(e) => updateEMA(key, { lineStyle: e.target.value as LineStyleOption })}
                  className="bg-slate-950 border border-slate-700 rounded-md px-1.5 py-1 text-[13px] font-bold text-slate-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {lineStyles.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* SECTION 2: BEDROCK ENVELOPE                                 */}
      {/* ----------------------------------------------------------- */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleEnvelope}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                config.envelope.visible
                  ? 'text-purple-400 hover:text-purple-300'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {config.envelope.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              Bedrock Envelope Channel
            </span>
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
            config.envelope.visible
              ? 'bg-purple-950/30 border-purple-800/40'
              : 'bg-slate-950/40 border-slate-800/40 opacity-50'
          }`}
        >
          {/* Percent Input */}
          <div className="flex items-center gap-1.5">
            <label className="text-[13px] text-slate-300 font-bold">± Band:</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="15"
              value={config.envelope.percent}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0.5 && val <= 20) {
                  updateEnvelope({ percent: val });
                }
              }}
              className="w-14 px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-purple-400"
            />
            <span className="text-[13px] font-bold text-purple-300">%</span>
          </div>

          {/* Color Swatch */}
          <ColorPickerDropdown
            color={config.envelope.color}
            onChange={(c) => updateEnvelope({ color: c })}
            label="Envelope Color"
          />

          {/* Width Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800">
            {[1, 2, 3].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => updateEnvelope({ lineWidth: w })}
                className={`w-5 h-5 rounded text-[13px] font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                  config.envelope.lineWidth === w
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Line Style */}
          <select
            value={config.envelope.lineStyle}
            onChange={(e) => updateEnvelope({ lineStyle: e.target.value as LineStyleOption })}
            className="bg-slate-950 border border-slate-700 rounded-md px-1.5 py-1 text-[13px] font-bold text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            {lineStyles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* SECTION 3: SUPER MONEY SIGNALS                              */}
      {/* ----------------------------------------------------------- */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSignals}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                config.signals.visible
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {config.signals.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Super Money Action Signals
            </span>
          </div>
        </div>

        <div
          className={`grid grid-cols-2 gap-2 p-2.5 rounded-xl border transition-all ${
            config.signals.visible
              ? 'bg-amber-950/20 border-amber-800/40'
              : 'bg-slate-950/40 border-slate-800/40 opacity-50'
          }`}
        >
          {/* Rebound */}
          <label className="flex items-center gap-2 text-[13px] font-bold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.signals.markers.rebound}
              onChange={() => toggleSignalMarker('rebound')}
              className="rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-0 cursor-pointer"
            />
            <span className="text-amber-400">••• READY</span>
          </label>

          {/* Breakout */}
          <label className="flex items-center gap-2 text-[13px] font-bold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.signals.markers.breakout}
              onChange={() => toggleSignalMarker('breakout')}
              className="rounded bg-slate-950 border-slate-700 text-cyan-400 focus:ring-0 cursor-pointer"
            />
            <span className="text-cyan-400">▲ BUY</span>
          </label>

          {/* Golden Star */}
          <label className="flex items-center gap-2 text-[13px] font-bold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.signals.markers.goldenStar}
              onChange={() => toggleSignalMarker('goldenStar')}
              className="rounded bg-slate-950 border-slate-700 text-white focus:ring-0 cursor-pointer"
            />
            <span className="text-white">★ SUPER</span>
          </label>

          {/* Exit Pullback */}
          <label className="flex items-center gap-2 text-[13px] font-bold text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.signals.markers.pullback}
              onChange={() => toggleSignalMarker('pullback')}
              className="rounded bg-slate-950 border-slate-700 text-rose-400 focus:ring-0 cursor-pointer"
            />
            <span className="text-rose-400">▼ EXIT</span>
          </label>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* SECTION 4: BANKER MCDX SUB-PANE                             */}
      {/* ----------------------------------------------------------- */}
      <div className="p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMCDX}
              className={`p-1 rounded-md transition-all cursor-pointer ${
                config.mcdx.visible
                  ? 'text-rose-400 hover:text-rose-300'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              {config.mcdx.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <span className="text-[14px] font-extrabold text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-rose-400" />
              Banker MCDX Flow
            </span>
          </div>
        </div>

        <div
          className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
            config.mcdx.visible
              ? 'bg-slate-900/50 border-slate-700/60'
              : 'bg-slate-950/40 border-slate-800/40 opacity-50'
          }`}
        >
          {/* MA Period */}
          <div className="flex items-center gap-1.5">
            <label className="text-[13px] text-slate-300 font-bold">MA Len:</label>
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
              className="w-12 px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-center text-[13px] font-bold text-slate-100 focus:outline-none focus:border-rose-400"
            />
          </div>

          {/* MCDX Swatches */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-rose-400">B:</span>
              <ColorPickerDropdown
                color={config.mcdx.bankerColor}
                onChange={(c) => updateMCDX({ bankerColor: c })}
                label="Banker Color"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-[#FFE600]">H:</span>
              <ColorPickerDropdown
                color={config.mcdx.hotMoneyColor}
                onChange={(c) => updateMCDX({ hotMoneyColor: c })}
                label="Hot Money Color"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[13px] font-bold text-emerald-400">R:</span>
              <ColorPickerDropdown
                color={config.mcdx.retailColor}
                onChange={(c) => updateMCDX({ retailColor: c })}
                label="Retail Color"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* FOOTER: RESET TO DEFAULTS                                   */}
      {/* ----------------------------------------------------------- */}
      <div className="p-3 bg-[#080D18] flex items-center justify-between">
        <button
          type="button"
          onClick={resetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Defaults
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg text-[13px] font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all cursor-pointer font-extrabold"
        >
          Done
        </button>
      </div>
    </div>
  );
};
