import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { QuarterlyFinancialItem } from '../../../../stores/dossierStore';

interface EpsBeatPulseChartProps {
  symbol: string;
  data: QuarterlyFinancialItem[];
  className?: string;
}

export const EpsBeatPulseChart: React.FC<EpsBeatPulseChartProps> = ({
  symbol,
  data = [],
  className = ''
}) => {
  const chartData = [...data]
    .reverse()
    .map((item) => {
      const isBeat = (item.eps_surprise_pct ?? 0) >= 0;
      return {
        quarter: item.fiscal_quarter,
        epsActual: item.eps_actual ?? 0,
        epsEstimate: item.eps_estimate ?? 0,
        surprisePct: item.eps_surprise_pct ?? 0,
        isBeat
      };
    });

  // Consecutive beats count from latest backwards
  let beatStreak = 0;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].surprisePct > 0) {
      beatStreak++;
    } else {
      break;
    }
  }

  const latestBeat = chartData[chartData.length - 1];

  return (
    <div className={`bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <h4 className="text-[13px] font-medium text-slate-200 tracking-wide uppercase">
            EPS Beat & Consensus ({symbol})
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            Beat {beatStreak}Q ซ้อน
          </span>
          {latestBeat && (
            <span className="text-[11px] font-mono text-cyan-200">
              Surprise +{latestBeat.surprisePct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[180px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-[13px] font-normal">
            ไม่มีข้อมูลผลประกอบการ
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.6} />

              <XAxis
                dataKey="quarter"
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 11, fontFamily: 'monospace', fontWeight: 500 }}
                axisLine={{ stroke: '#1E293B' }}
              />

              <YAxis
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 11, fontFamily: 'monospace', fontWeight: 500 }}
                axisLine={{ stroke: '#1E293B' }}
                tickFormatter={(val) => `$${val.toFixed(2)}`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A1022',
                  borderColor: '#1E293B',
                  borderRadius: '10px',
                  color: '#CBD5E1',
                  fontSize: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'EPS Actual') return [`$${Number(value).toFixed(2)}`, name];
                  if (name === 'EPS Estimate') return [`$${Number(value).toFixed(2)}`, name];
                  return [value, name];
                }}
              />

              {/* EPS Actual Bar (Green beat / Red miss) */}
              <Bar dataKey="epsActual" name="EPS Actual" radius={[4, 4, 0, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isBeat ? '#10B981' : '#F43F5E'} />
                ))}
              </Bar>

              {/* EPS Estimate Bar (Faint ghost bar) */}
              <Bar dataKey="epsEstimate" name="EPS Estimate" fill="#334155" opacity={0.5} radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subtle Legend */}
      <div className="mt-1 pt-1.5 border-t border-blue-900/30 flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-2.5 h-2.5 bg-[#10B981] rounded-sm inline-block" /> Actual (ชนะ)
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-2.5 bg-[#334155] rounded-sm inline-block" /> Estimate
          </span>
        </div>
        <span>สถาบันดันราคาเมื่อ Beat ต่อเนื่อง</span>
      </div>
    </div>
  );
};
