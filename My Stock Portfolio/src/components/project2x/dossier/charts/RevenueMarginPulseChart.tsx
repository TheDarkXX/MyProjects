import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { QuarterlyFinancialItem } from '../../../../stores/dossierStore';

interface RevenueMarginPulseChartProps {
  symbol: string;
  data: QuarterlyFinancialItem[];
  className?: string;
}

export const RevenueMarginPulseChart: React.FC<RevenueMarginPulseChartProps> = ({
  symbol,
  data = [],
  className = ''
}) => {
  const chartData = [...data]
    .reverse()
    .map(item => ({
      quarter: item.fiscal_quarter,
      revenueB: item.revenue_usd ? Number((item.revenue_usd / 1e9).toFixed(2)) : 0,
      grossMargin: item.gross_margin_pct ?? 0
    }));

  const latest = chartData[chartData.length - 1];
  const latestRev = latest?.revenueB || 0;
  const latestMargin = latest?.grossMargin || 0;

  return (
    <div className={`bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-3.5 shadow-lg backdrop-blur-md flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <h4 className="text-[15px] font-medium text-slate-200 tracking-wide uppercase">
            Revenue & Gross Margin ({symbol})
          </h4>
        </div>

        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-slate-300 font-medium">ล่าสุด:</span>
          <span className="text-cyan-300 font-mono font-semibold">${latestRev.toFixed(1)}B</span>
          <span className="text-emerald-300 font-mono font-medium">({latestMargin.toFixed(1)}% Moat)</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[180px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-[14px] font-normal">
            ไม่มีข้อมูลงบการเงิน
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.6} />

              <XAxis
                dataKey="quarter"
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}
                axisLine={{ stroke: '#1E293B' }}
              />

              {/* Left Y-Axis: Revenue ($B) */}
              <YAxis
                yAxisId="left"
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}
                axisLine={{ stroke: '#1E293B' }}
                tickFormatter={(val) => `$${val}B`}
              />

              {/* Right Y-Axis: Gross Margin % */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke="#38BDF8"
                tick={{ fill: '#38BDF8', fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}
                axisLine={{ stroke: '#0284C7' }}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A1022',
                  borderColor: '#1E293B',
                  borderRadius: '10px',
                  color: '#CBD5E1',
                  fontSize: '13px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'Gross Margin %') return [`${Number(value).toFixed(1)}%`, name];
                  if (name === 'Revenue ($B)') return [`$${Number(value).toFixed(2)}B`, name];
                  return [value, name];
                }}
              />

              {/* Revenue Bar */}
              <Bar
                yAxisId="left"
                dataKey="revenueB"
                name="Revenue ($B)"
                fill="#0284C7"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />

              {/* Gross Margin % Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="grossMargin"
                name="Gross Margin %"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={{ fill: '#0A1022', r: 3, stroke: '#38BDF8', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#38BDF8' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subtle Legend */}
      <div className="mt-1 pt-1.5 border-t border-blue-900/30 flex items-center justify-between text-[13px] text-slate-300">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-[#0284C7] rounded-sm inline-block" /> ยอดขาย ($B)
          </span>
          <span className="flex items-center gap-1 text-cyan-300">
            <span className="w-2.5 h-1 bg-[#38BDF8] inline-block" /> Gross Margin %
          </span>
        </div>
        <span>คูเมืองสะท้อนผ่านมาร์จิ้นสูงต่อเนื่อง</span>
      </div>
    </div>
  );
};
