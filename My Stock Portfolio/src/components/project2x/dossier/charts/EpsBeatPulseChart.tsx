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

import { DossierTooltip } from '../shared/DossierTooltip';

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
    <div className={`bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-4 shadow-lg backdrop-blur-md flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <h4 className="text-base font-bold text-slate-100 tracking-wide uppercase">
            EPS Beat & Consensus ({symbol})
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            Beat {beatStreak}Q ซ้อน
          </span>
          {latestBeat && (
            <span className="text-sm font-mono font-semibold text-cyan-300">
              Surprise +{latestBeat.surprisePct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[190px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm font-normal">
            ไม่มีข้อมูลผลประกอบการ
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.6} />

              <XAxis
                dataKey="quarter"
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: '#1E293B' }}
              />

              <YAxis
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: '#1E293B' }}
                tickFormatter={(val) => `$${val.toFixed(2)}`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  return (
                    <DossierTooltip
                      active={active}
                      title={`ไตรมาส ${label}`}
                      customRows={[
                        { label: 'EPS จริง (Actual):', value: `$${item.epsActual.toFixed(2)}`, color: item.isBeat ? '#10B981' : '#F43F5E' },
                        { label: 'EPS คาดการณ์ (Est):', value: `$${item.epsEstimate.toFixed(2)}`, color: '#64748B' },
                        { label: 'Surprise:', value: `${item.surprisePct >= 0 ? '+' : ''}${item.surprisePct.toFixed(1)}%`, color: item.isBeat ? '#34D399' : '#FB7185' }
                      ]}
                    />
                  );
                }}
              />

              {/* EPS Actual Bar (Green beat / Red miss) */}
              <Bar
                dataKey="epsActual"
                name="EPS Actual"
                radius={[5, 5, 0, 0]}
                barSize={18}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isBeat ? '#10B981' : '#F43F5E'}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>

              {/* EPS Estimate Bar (Faint ghost bar) */}
              <Bar
                dataKey="epsEstimate"
                name="EPS Estimate"
                fill="#334155"
                opacity={0.6}
                radius={[5, 5, 0, 0]}
                barSize={14}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subtle Legend */}
      <div className="mt-2 pt-2 border-t border-blue-900/30 flex items-center justify-between text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
            <span className="w-2.5 h-2.5 bg-[#10B981] rounded-sm inline-block shadow-sm" /> Actual (ชนะเป้า)
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <span className="w-2.5 h-2.5 bg-[#334155] rounded-sm inline-block" /> Estimate (เป้าคาด)
          </span>
        </div>
        <span className="text-xs text-slate-400">สถาบันดันราคาเมื่อ Beat ต่อเนื่อง</span>
      </div>
    </div>
  );
};
