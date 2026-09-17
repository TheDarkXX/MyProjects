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

import { DossierTooltip } from '../shared/DossierTooltip';

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
      grossMargin: item.gross_margin_pct ?? 0,
      yoyRevGrowth: item.yoy_revenue_growth_pct ?? null
    }));

  const latest = chartData[chartData.length - 1];
  const latestRev = latest?.revenueB || 0;
  const latestMargin = latest?.grossMargin || 0;

  return (
    <div className={`bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-4 shadow-lg backdrop-blur-md flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <h4 className="text-base font-bold text-slate-100 tracking-wide uppercase">
            Revenue & Gross Margin ({symbol})
          </h4>
        </div>

        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-slate-400 font-medium">ล่าสุด:</span>
          <span className="text-cyan-300 font-mono font-bold text-base">${latestRev.toFixed(1)}B</span>
          <span className="text-emerald-300 font-mono font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
            {latestMargin.toFixed(1)}% Moat
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[190px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm font-normal">
            ไม่มีข้อมูลงบการเงิน
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.6} />

              <XAxis
                dataKey="quarter"
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: '#1E293B' }}
              />

              {/* Left Y-Axis: Revenue ($B) */}
              <YAxis
                yAxisId="left"
                stroke="#64748B"
                tick={{ fill: '#CBD5E1', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: '#1E293B' }}
                tickFormatter={(val) => `$${val}B`}
              />

              {/* Right Y-Axis: Gross Margin % */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke="#38BDF8"
                tick={{ fill: '#38BDF8', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: '#0284C7' }}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  const customRows = [
                    { label: 'ยอดขาย (Revenue):', value: `$${item.revenueB.toFixed(2)}B`, color: '#0284C7' },
                    { label: 'Gross Margin:', value: `${item.grossMargin.toFixed(1)}%`, color: '#38BDF8' }
                  ];
                  if (item.yoyRevGrowth != null) {
                    customRows.push({
                      label: 'YoY Growth:',
                      value: `${item.yoyRevGrowth >= 0 ? '+' : ''}${item.yoyRevGrowth.toFixed(1)}%`,
                      color: item.yoyRevGrowth >= 20 ? '#10B981' : '#F59E0B'
                    });
                  }
                  return (
                    <DossierTooltip
                      active={active}
                      title={`ไตรมาส ${label}`}
                      customRows={customRows}
                    />
                  );
                }}
              />

              {/* Revenue Bar */}
              <Bar
                yAxisId="left"
                dataKey="revenueB"
                name="Revenue ($B)"
                fill="#1D4ED8"
                radius={[5, 5, 0, 0]}
                barSize={20}
                animationDuration={800}
                animationEasing="ease-out"
                className="hover:opacity-85 transition-opacity cursor-pointer"
              />

              {/* Gross Margin % Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="grossMargin"
                name="Gross Margin %"
                stroke="#38BDF8"
                strokeWidth={2.5}
                dot={{ fill: '#0A1022', r: 3.5, stroke: '#38BDF8', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#38BDF8', stroke: '#FFFFFF', strokeWidth: 2 }}
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subtle Legend */}
      <div className="mt-2 pt-2 border-t border-blue-900/30 flex items-center justify-between text-sm text-slate-300">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 bg-[#1D4ED8] rounded-sm inline-block shadow-sm" /> ยอดขาย ($B)
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <span className="w-3 h-1 bg-[#38BDF8] inline-block rounded-full" /> Gross Margin %
          </span>
        </div>
        <span className="text-xs text-slate-400">คูเมืองสะท้อนผ่านมาร์จิ้นสูงต่อเนื่อง</span>
      </div>
    </div>
  );
};
