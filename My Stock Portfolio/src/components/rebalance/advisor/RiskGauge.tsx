import React from 'react';

interface RiskGaugeProps {
  score: number; // 0 to 100
  beta: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, beta }) => {
  // Map score 0-100 to angle 0-180 for semi-circle gauge
  // 0 = left (low risk, green), 180 = right (high risk, red)
  const angle = Math.min(Math.max(score, 0), 100) * 1.8;
  
  // Calculate rotation for the needle
  const needleRotation = angle - 90; // -90 to +90 degrees

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h3 className="text-white font-bold mb-6">Risk Meter</h3>
      
      <div className="relative w-48 h-24 overflow-hidden mb-2">
        {/* Gauge Background (Semi-circle) */}
        <div 
          className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-transparent"
          style={{ 
            borderTopColor: '#f43f5e', // rose-500
            borderRightColor: '#f43f5e',
            borderBottomColor: '#10b981', // emerald-500
            borderLeftColor: '#10b981',
            transform: 'rotate(-45deg)'
          }}
        />
        <div 
          className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-transparent"
          style={{ 
            borderTopColor: '#f59e0b', // amber-500
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: 'rotate(45deg)'
          }}
        />

        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-1 h-20 bg-white origin-bottom rounded-t-full shadow-lg transition-transform duration-1000 ease-out"
          style={{ 
            transform: `translateX(-50%) rotate(${needleRotation}deg)`,
            transformOrigin: 'bottom center'
          }}
        >
          {/* Center Pivot */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-[#181B2A]" />
        </div>
      </div>
      
      <div className="flex justify-between w-full text-[13px] font-bold text-slate-300 px-4 mt-1">
        <span>LOW</span>
        <span>MED</span>
        <span>HIGH</span>
      </div>

      <div className="mt-4 text-center">
        <div className="text-2xl font-black text-white">
          {score}/100
        </div>
        <div className="text-[13px] text-slate-300 mt-1">
          Avg Beta: <span className={beta > 1.2 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>{beta.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
