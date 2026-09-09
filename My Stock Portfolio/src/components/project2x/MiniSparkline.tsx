import React from 'react';

interface MiniSparklineProps {
  closes: number[];
  ema150?: (number | null)[];
  ema200?: (number | null)[];
  width?: number | string;
  height?: number;
  showEma?: boolean;
  className?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  closes,
  ema150 = [],
  ema200 = [],
  width = '100%',
  height = 40,
  showEma = false,
  className = ''
}) => {
  if (!closes || closes.length < 2) {
    return <div className={`h-[${height}px] bg-transparent ${className}`} />;
  }

  // Calculate min and max for scaling
  let allVals: number[] = [...closes];
  if (showEma) {
    ema150.forEach(v => { if (v !== null && v !== undefined) allVals.push(v); });
    ema200.forEach(v => { if (v !== null && v !== undefined) allVals.push(v); });
  }

  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  // ViewBox dimensions
  const vbWidth = 100;
  const vbHeight = 40;
  const padding = 3;

  const getY = (val: number) => {
    const norm = (val - min) / range;
    return (vbHeight - padding) - norm * (vbHeight - padding * 2);
  };

  const getX = (idx: number, total: number) => {
    return padding + (idx / (total - 1)) * (vbWidth - padding * 2);
  };

  // Build Price Path
  const pricePoints = closes.map((c, i) => `${getX(i, closes.length)},${getY(c)}`);
  const pricePath = `M ${pricePoints.join(' L ')}`;

  // Area fill under price line
  const areaPath = `M ${getX(0, closes.length)},${vbHeight} L ${pricePoints.join(' L ')} L ${getX(closes.length - 1, closes.length)},${vbHeight} Z`;

  // Color determination: Bullish or Bearish over the sparkline period
  const isUp = closes[closes.length - 1] >= closes[0];
  const priceColor = isUp ? '#26A69A' : '#EF5350'; // TradingView Up/Down
  const fillColor = isUp ? 'rgba(38, 166, 154, 0.15)' : 'rgba(239, 83, 80, 0.15)';

  // Build EMA paths if requested
  let ema150Path = '';
  if (showEma && ema150.length === closes.length) {
    const pts: string[] = [];
    ema150.forEach((val, i) => {
      if (val !== null && val !== undefined) {
        pts.push(`${getX(i, closes.length)},${getY(val)}`);
      }
    });
    if (pts.length > 1) ema150Path = `M ${pts.join(' L ')}`;
  }

  let ema200Path = '';
  if (showEma && ema200.length === closes.length) {
    const pts: string[] = [];
    ema200.forEach((val, i) => {
      if (val !== null && val !== undefined) {
        pts.push(`${getX(i, closes.length)},${getY(val)}`);
      }
    });
    if (pts.length > 1) ema200Path = `M ${pts.join(' L ')}`;
  }

  return (
    <div className={`overflow-hidden ${className}`} style={{ width, height }}>
      <svg
        viewBox={`0 0 ${vbWidth} ${vbHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={`grad-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={priceColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={priceColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill area */}
        <path d={areaPath} fill={`url(#grad-${isUp ? 'up' : 'down'})`} />

        {/* EMA 200 line (TradingView Yellow) */}
        {ema200Path && (
          <path
            d={ema200Path}
            fill="none"
            stroke="#FFD740"
            strokeWidth="1"
            strokeDasharray="2 1"
            opacity="0.8"
          />
        )}

        {/* EMA 150 line (TradingView Blue) */}
        {ema150Path && (
          <path
            d={ema150Path}
            fill="none"
            stroke="#2962FF"
            strokeWidth="1.2"
            opacity="0.9"
          />
        )}

        {/* Main Price line */}
        <path
          d={pricePath}
          fill="none"
          stroke={priceColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
