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
import { DollarSign } from 'lucide-react';

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
    .map((item) => ({
      quarter: item.fiscal_quarter,
      revenueB: item.revenue_usd ? Number((item.revenue_usd / 1e9).toFixed(2)) : 0,
      grossMargin: item.gross_margin_pct ?? 0,
      yoyRevGrowth: item.yoy_revenue_growth_pct ?? null
    }));

  const latest = chartData[chartData.length - 1];
  const latestRev = latest?.revenueB || 0;
  const latestMargin = latest?.grossMargin || 0;

  return (
    <div className={`bg-[#12162B]/95 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-950/60 border border-violet-700/50">
            <DollarSign className="w-4 h-4 text-violet-400" />
          </div>
          <h4 className="text-base font-bold text-slate-100 tracking-wide uppercase">
            Revenue & Gross Margin ({symbol})
          </h4>
        </div>

        <div className="flex items-center gap-2.5 text-sm">
          <span className="text-slate-400 font-medium">ล่าสุด:</span>
          <span className="text-violet-300 font-mono font-bold text-base">${latestRev.toFixed(1)}B</span>
          <span className="text-orange-300 font-mono font-bold bg-orange-950/40 px-2.5 py-0.5 rounded-md border border-orange-700/50">
            {latestMargin.toFixed(1)}% Moat
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[190px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-normal">
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

              {/* Left Y-Axis: Revenue in Billions (Electric Violet) */}
              <YAxis
                yAxisId="left"
                stroke="#823AFD"
                tick={{ fill: '#C090FF', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: '#823AFD' }}
                tickFormatter={(val) => `$${val}B`}
              />

              {/* Right Y-Axis: Gross Margin % (Burnt Orange) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke="#FD5514"
                tick={{ fill: '#FF7844', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}
                axisLine={{ stroke: '#FD5514' }}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  const customRows = [
                    { label: 'ยอดขาย (Revenue):', value: `$${item.revenueB.toFixed(2)}B`, color: '#823AFD' },
                    { label: 'Gross Margin:', value: `${item.grossMargin.toFixed(1)}%`, color: '#FD5514' }
                  ];
                  if (item.yoyRevGrowth != null) {
                    customRows.push({
                      label: 'YoY Growth:',
                      value: `${item.yoyRevGrowth >= 0 ? '+' : ''}${item.yoyRevGrowth.toFixed(1)}%`,
                      color: item.yoyRevGrowth >= 25 ? '#823AFD' : item.yoyRevGrowth >= 0 ? '#C090FF' : '#FC2D79'
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

              {/* Revenue Bar (Electric Violet) */}
              <Bar
                yAxisId="left"
                dataKey="revenueB"
                name="Revenue ($B)"
                fill="#823AFD"
                radius={[5, 5, 0, 0]}
                barSize={20}
                animationDuration={800}
                animationEasing="ease-out"
                className="hover:opacity-85 transition-opacity cursor-pointer"
              />

              {/* Gross Margin % Line (Burnt Orange line with crisp nodes) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="grossMargin"
                name="Gross Margin (%)"
                stroke="#FD5514"
                strokeWidth={2.8}
                dot={{ r: 4, fill: '#FD5514', stroke: '#12162B', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#FF7844', stroke: '#FFFFFF', strokeWidth: 2 }}
                animationDuration={900}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subtle Legend */}
      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-violet-300 font-medium">
            <span className="w-2.5 h-2.5 bg-[#823AFD] rounded-sm inline-block shadow-sm" /> Revenue ($B)
          </span>
          <span className="flex items-center gap-1.5 text-orange-300 font-medium">
            <span className="w-2.5 h-2.5 bg-[#FD5514] rounded-full inline-block shadow-[0_0_6px_rgba(253,85,20,0.6)]" /> Gross Margin (%)
          </span>
        </div>
        <span className="text-xs text-slate-400">Moat แกร่งเมื่อ Margin ยืนเหนือ 50%</span>
      </div>
    </div>
  );
};
