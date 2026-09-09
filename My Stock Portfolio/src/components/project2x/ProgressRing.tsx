import React from 'react';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
  showPercentText?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 64,
  strokeWidth = 6,
  color = '#26A69A', // TradingView Green
  bgColor = '#2A2E39', // TradingView Border
  children,
  showPercentText = false
}) => {
  const validPercent = typeof percent === 'number' && !isNaN(percent) ? percent : 0;
  const clampedPercent = Math.min(100, Math.max(0, validPercent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Value Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center Label or Children */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {children ? (
          children
        ) : showPercentText ? (
          <span className="text-[13px] font-bold text-slate-200">
            {clampedPercent.toFixed(0)}%
          </span>
        ) : null}
      </div>
    </div>
  );
};
