import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { HorizontalLineDrawing, LineStyleOption } from '../../../types/drawingTypes';
import { useDrawingStore } from '../../../stores/drawingStore';

const TV_COLORS = [
  '#26A69A', '#EF5350', '#42A5F5', '#FFEE58',
  '#AB47BC', '#FF7043', '#FFFFFF', '#78909C',
  '#00E676', '#FF1744', '#2979FF', '#FFD600',
];

interface LinePropertiesDialogProps {
  line: HorizontalLineDrawing;
  symbol: string;
  onClose: () => void;
}

export const LinePropertiesDialog: React.FC<LinePropertiesDialogProps> = ({
  line,
  symbol,
  onClose,
}) => {
  const { updateLine } = useDrawingStore();
  const [activeTab, setActiveTab] = useState<'style' | 'coordinates' | 'visibility'>('coordinates');

  // Form states
  const [color, setColor] = useState(line.color);
  const [lineWidth, setLineWidth] = useState<1 | 2 | 3 | 4>(line.lineWidth);
  const [lineStyle, setLineStyle] = useState<LineStyleOption>(line.lineStyle);
  const [text, setText] = useState(line.text || '');
  const [showPriceLabel, setShowPriceLabel] = useState(line.showPriceLabel);
  const [priceStr, setPriceStr] = useState(line.price.toString());
  const [visibleOn, setVisibleOn] = useState(line.visibleOn || 'all');

  const handleSave = () => {
    const parsedPrice = parseFloat(priceStr);
    const validPrice = !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : line.price;

    updateLine(symbol, line.id, {
      color,
      lineWidth,
      lineStyle,
      text: text.trim(),
      showPriceLabel,
      price: validPrice,
      visibleOn,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-[420px] bg-[#1E222D] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-[#171B26]">
          <h3 className="text-slate-100 font-semibold text-[15px]">Horizontal Line Properties</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700/60 bg-[#131722]/50 px-4 pt-1">
          <button
            onClick={() => setActiveTab('coordinates')}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-all ${
              activeTab === 'coordinates'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Coordinates (Price)
          </button>
          <button
            onClick={() => setActiveTab('style')}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-all ${
              activeTab === 'style'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Style
          </button>
          <button
            onClick={() => setActiveTab('visibility')}
            className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-all ${
              activeTab === 'visibility'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Visibility
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 flex-1 space-y-4">
          {/* TAB 1: COORDINATES */}
          {activeTab === 'coordinates' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-[13px] font-medium mb-1.5">
                  Exact Price Level
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-[14px] font-mono focus:outline-none focus:border-sky-500"
                    placeholder="Enter price..."
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-[13px]">THB / USD</span>
                </div>
                <p className="text-slate-400 text-[13px] mt-1.5">
                  Enter exact level to position the line with pinpoint accuracy.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="showPriceOnScale"
                  checked={showPriceLabel}
                  onChange={(e) => setShowPriceLabel(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                />
                <label htmlFor="showPriceOnScale" className="text-slate-200 text-[13px] cursor-pointer">
                  Show price label on vertical price scale
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: STYLE */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Color Grid */}
              <div>
                <label className="block text-slate-300 text-[13px] font-medium mb-1.5">Line Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {TV_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full border border-white/20 hover:scale-105 transition-transform flex items-center justify-center shadow"
                      style={{ backgroundColor: c }}
                    >
                      {color.toLowerCase() === c.toLowerCase() && (
                        <Check className="w-4 h-4 text-black drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Width & Style */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 text-[13px] font-medium mb-1.5">Line Width</label>
                  <select
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value) as any)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-[13px] focus:outline-none focus:border-sky-500"
                  >
                    <option value={1}>1 px</option>
                    <option value={2}>2 px</option>
                    <option value={3}>3 px</option>
                    <option value={4}>4 px</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 text-[13px] font-medium mb-1.5">Line Style</label>
                  <select
                    value={lineStyle}
                    onChange={(e) => setLineStyle(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-[13px] focus:outline-none focus:border-sky-500"
                  >
                    <option value="Solid">Solid (—)</option>
                    <option value="Dashed">Dashed (--)</option>
                    <option value="Dotted">Dotted (··)</option>
                  </select>
                </div>
              </div>

              {/* Text Note */}
              <div>
                <label className="block text-slate-300 text-[13px] font-medium mb-1.5">Label / Note</label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Major Resistance, Stop Loss..."
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-[13px] focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: VISIBILITY */}
          {activeTab === 'visibility' && (
            <div className="space-y-3">
              <label className="block text-slate-300 text-[13px] font-medium mb-1">
                Display on Timeframes:
              </label>
              {[
                { id: 'all', label: 'All Timeframes (1D, 1W, Intraday)' },
                { id: '1D', label: 'Daily (1D) Only' },
                { id: '1W', label: 'Weekly (1W) Only' },
                { id: '4H', label: 'Intraday (4H / Hourly) Only' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer text-slate-200 text-[13px]"
                >
                  <input
                    type="radio"
                    name="visOption"
                    value={opt.id}
                    checked={visibleOn === opt.id}
                    onChange={() => setVisibleOn(opt.id as any)}
                    className="w-4 h-4 text-sky-500 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700/60 bg-[#171B26]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 text-[13px] font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-[#2962FF] hover:bg-[#1E4BD8] text-white text-[13px] font-medium rounded-md shadow-md transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
