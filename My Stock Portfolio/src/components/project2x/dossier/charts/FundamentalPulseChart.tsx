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
    <div className={`bg-[#0B0F1A] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between ${className}`}>
      {/* Header with Vital Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Fundamental Pulse ({symbol})
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[13px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
            🟢 Beat {beatStreak}Q ติดต่อกัน
          </span>
          <span className="px-2.5 py-1 rounded-full text-[13px] font-bold bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
            🛡️ Gross Margin: {latestMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Subtitle / User Guidance */}
      <p className="text-[13px] text-slate-400 mb-2">
        แท่ง EPS Actual (เขียว = ชนะเป้า, ส้ม = พลาดเป้า) เทียบกับคาดการณ์ + เส้น Gross Margin ตรวจสอบคูเมือง
      </p>

      {/* Recharts Chart */}
      <div className="w-full h-[230px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
            ไม่มีข้อมูลผลประกอบการ
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.6} />
              
              <XAxis 
                dataKey="quarter" 
                stroke="#64748B" 
                tick={{ fill: '#CBD5E1', fontSize: 13, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
              />

              {/* Left Axis: EPS ($) */}
              <YAxis 
                yAxisId="left"
                stroke="#64748B" 
                tick={{ fill: '#CBD5E1', fontSize: 13, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `$${val.toFixed(2)}`}
              />

              {/* Right Axis: Gross Margin (%) */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke="#06B6D4" 
                tick={{ fill: '#22D3EE', fontSize: 13, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#0E7490' }}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip 
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
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

              {/* EPS Actual Bar (Colored dynamically based on Beat / Miss) */}
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
                    fill={entry.isBeat ? '#10B981' : '#F59E0B'} 
                  />
                ))}
              </Bar>

              {/* EPS Estimate Bar (Subtle outline / ghost) */}
              <Bar 
                yAxisId="left" 
                dataKey="epsEstimate" 
                name="EPS Estimate" 
                fill="#475569" 
                opacity={0.4}
                radius={[4, 4, 0, 0]}
                barSize={18}
              />

              {/* Gross Margin % Line on Right Y-Axis */}
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="grossMargin" 
                name="Gross Margin %" 
                stroke="#22D3EE" 
                strokeWidth={2.5}
                dot={{ fill: '#06B6D4', r: 4, stroke: '#F8FAFC', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#38BDF8' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Insights Footnote */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[13px] text-slate-300">
        <div>
          ความสม่ำเสมอ: <span className="text-emerald-400 font-bold">ชนะเป้า {beatStreak} ไตรมาสซ้อน</span>
        </div>
        <div>
          Gross Margin ล่าสุด: <span className="text-cyan-400 font-bold">{latestMargin.toFixed(1)}%</span>
        </div>
        <div>
          Moat สถานะ: <span className="text-slate-100 font-bold">🛡️ แข็งแกร่ง (Pricing Power)</span>
        </div>
      </div>
    </div>
  );
};
