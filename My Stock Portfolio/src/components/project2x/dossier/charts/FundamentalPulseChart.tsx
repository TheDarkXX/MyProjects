import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { QuarterlyFinancialItem } from '../../../../stores/dossierStore';

interface FundamentalPulseChartProps {
  symbol: string;
  data: QuarterlyFinancialItem[];
  className?: string;
}

export const FundamentalPulseChart: React.FC<FundamentalPulseChartProps> = ({
  symbol,
  data = [],
  className = ''
}) => {
  // Sort quarters chronologically (oldest -> newest) for display
  const chartData = [...data]
    .reverse()
    .map(item => {
      const isBeat = (item.eps_surprise_pct ?? 0) >= 0;
      return {
        quarter: item.fiscal_quarter,
        epsActual: item.eps_actual ?? 0,
        epsEstimate: item.eps_estimate ?? 0,
        surprisePct: item.eps_surprise_pct ?? 0,
        grossMargin: item.gross_margin_pct ?? 0,
        revenueB: item.revenue_usd ? Number((item.revenue_usd / 1e9).toFixed(2)) : 0,
        isBeat
      };
    });

  // Calculate streak of consecutive beats from latest backwards
  let beatStreak = 0;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].surprisePct > 0) {
      beatStreak++;
    } else {
      break;
    }
  }

  const latestMargin = chartData[chartData.length - 1]?.grossMargin || 0;

  return (
    <div className={`bg-[#12162B]/95 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col justify-between ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider">
            Fundamental Pulse ({symbol})
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md text-[13px] font-black bg-violet-600/20 border border-violet-500/40 text-violet-200">
            ⚡ Beat {beatStreak}Q ซ้อน
          </span>
          <span className="px-2.5 py-0.5 rounded-md text-[13px] font-black bg-orange-950/40 border border-orange-700/50 text-orange-200 font-mono">
            🛡️ Margin: {latestMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Recharts Chart */}
      <div className="w-full h-[250px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-200 text-[13px] font-bold">
            ไม่มีข้อมูลผลประกอบการ
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 15, bottom: 5, left: -10 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.7} />
              
              <XAxis 
                dataKey="quarter" 
                stroke="#64748B" 
                tick={{ fill: '#FFFFFF', fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }}
                axisLine={{ stroke: '#334155' }}
              />

              {/* Left Axis: EPS ($) */}
              <YAxis 
                yAxisId="left"
                stroke="#823AFD" 
                tick={{ fill: '#C090FF', fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }}
                axisLine={{ stroke: '#823AFD' }}
                tickFormatter={(val) => `$${val.toFixed(2)}`}
              />

              {/* Right Axis: Gross Margin (%) */}
              <YAxis 
                yAxisId="right" 
                orientation="right"
                domain={[0, 100]}
                stroke="#FD5514" 
                tick={{ fill: '#FF7844', fontSize: 13, fontFamily: 'monospace', fontWeight: 'bold' }}
                axisLine={{ stroke: '#FD5514' }}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip 
                contentStyle={{
                  backgroundColor: '#141430',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#F8FAFC',
                  fontSize: '13px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'Gross Margin %') return [`${Number(value).toFixed(1)}%`, name];
                  if (name === 'EPS Actual') return [`$${Number(value).toFixed(2)}`, name];
                  if (name === 'EPS Estimate') return [`$${Number(value).toFixed(2)}`, name];
                  return [value, name];
                }}
              />

              <Legend 
                verticalAlign="top" 
                height={30}
                wrapperStyle={{ fontSize: '13px', color: '#CBD5E1', paddingBottom: '4px' }}
              />

              {/* EPS Actual Bar (Electric Violet beat / Hot Pink miss) */}
              <Bar 
                yAxisId="left" 
                dataKey="epsActual" 
                name="EPS Actual" 
                radius={[4, 4, 0, 0]}
                barSize={24}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isBeat ? '#823AFD' : '#FC2D79'} 
                  />
                ))}
              </Bar>

              {/* EPS Estimate Bar (Subtle outline / ghost) */}
              <Bar 
                yAxisId="left" 
                dataKey="epsEstimate" 
                name="EPS Estimate" 
                fill="#1A1A3C" 
                stroke="#2D2D5E"
                opacity={0.6} 
                radius={[4, 4, 0, 0]}
                barSize={18}
              />

              {/* Gross Margin % Line on Right Y-Axis */}
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="grossMargin" 
                name="Gross Margin %" 
                stroke="#FD5514" 
                strokeWidth={3}
                dot={{ fill: '#FD5514', r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#FF7844' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Insights Footnote */}
      <div className="mt-2 pt-2.5 border-t border-white/10 flex items-center justify-between text-[13px] text-white">
        <div>
          ความสม่ำเสมอ: <span className="text-violet-300 font-black">Beat {beatStreak}Q ซ้อน</span>
        </div>
        <div>
          Gross Margin: <span className="text-orange-300 font-black font-mono">{latestMargin.toFixed(1)}%</span>
        </div>
        <div>
          Moat: <span className="text-white font-black">🛡️ แข็งแกร่ง</span>
        </div>
      </div>
    </div>
  );
};
