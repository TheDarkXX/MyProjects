import React from 'react';

interface SectorGapChartProps {
  portfolioSectors: Record<string, number>;
}

const SP500_BENCHMARK: Record<string, number> = {
  'Technology': 32,
  'Financials': 13,
  'Healthcare': 13,
  'Consumer Cyclical': 11,
  'Industrials': 9,
  'Communication Services': 9,
  'Consumer Defensive': 6,
  'Energy': 4,
  'Real Estate': 2,
  'Materials': 2,
  'Utilities': 2
};

export const SectorGapChart: React.FC<SectorGapChartProps> = ({ portfolioSectors }) => {
  const allSectors = Array.from(new Set([...Object.keys(portfolioSectors), ...Object.keys(SP500_BENCHMARK)]));
  
  const data = allSectors.map(sector => {
    const port = portfolioSectors[sector] || 0;
    const bench = SP500_BENCHMARK[sector] || 0;
    const diff = port - bench;
    
    let status = 'OK';
    let color = 'bg-emerald-500';
    if (port === 0 && bench > 5) {
      status = 'Missing';
      color = 'bg-red-500';
    } else if (diff > 15) {
      status = 'Over';
      color = 'bg-amber-500';
    } else if (diff < -10) {
      status = 'Under';
      color = 'bg-rose-500';
    }

    return { sector, port, bench, diff, status, color };
  }).sort((a, b) => b.port - a.port); // sort by portfolio weight desc

  return (
    <div>
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        📊 Sector Exposure vs S&P 500
      </h3>
      <div className="space-y-3">
        {data.filter(d => d.port > 0 || d.bench > 5).map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 text-[13px] font-semibold text-slate-200 truncate" title={d.sector}>
              {d.sector}
            </div>
            <div className="flex-1 h-6 relative bg-slate-800/50 rounded overflow-hidden flex">
              {/* Benchmark background */}
              <div 
                className="absolute top-0 bottom-0 left-0 bg-slate-600/30" 
                style={{ width: `${d.bench}%` }}
              />
              {/* Portfolio foreground */}
              <div 
                className={`absolute top-1 bottom-1 left-0 rounded-r ${d.color} opacity-80`} 
                style={{ width: `${d.port}%` }}
              />
            </div>
            <div className="w-24 flex items-center justify-between text-[13px] font-bold">
              <span className="text-white">{d.port.toFixed(1)}%</span>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                d.status === 'OK' ? 'bg-emerald-500/20 text-emerald-400' :
                d.status === 'Over' ? 'bg-amber-500/20 text-amber-400' :
                'bg-rose-500/20 text-rose-400'
              }`}>
                {d.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[13px] text-slate-300 flex gap-4 justify-end">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-slate-600/50 rounded-sm"></span> S&P Benchmark
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm opacity-80"></span> Your Portfolio
        </span>
      </div>
    </div>
  );
};
