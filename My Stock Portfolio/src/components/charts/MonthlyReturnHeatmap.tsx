import React, { useMemo } from 'react';
import { HistoricalDataPoint } from '../../types';
import { Calendar, TrendingUp, Info } from 'lucide-react';
import clsx from 'clsx';

interface MonthlyReturnHeatmapProps {
  historicalData?: HistoricalDataPoint[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MonthlyReturnHeatmap: React.FC<MonthlyReturnHeatmapProps> = ({ historicalData = [] }) => {
  // Compute monthly returns grouped by year
  const matrix = useMemo(() => {
    if (!historicalData || historicalData.length === 0) return [];

    // 1. Group points by date
    const sorted = [...historicalData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length === 0) return [];

    // Map by year and month
    const yearMap: Record<number, Record<number, { first: number; last: number }>> = {};

    sorted.forEach(pt => {
      const d = new Date(pt.date);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth(); // 0 to 11

      if (!yearMap[y]) yearMap[y] = {};
      if (!yearMap[y][m]) {
        yearMap[y][m] = { first: pt.portfolioValue, last: pt.portfolioValue };
      } else {
        yearMap[y][m].last = pt.portfolioValue;
      }
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const years = Object.keys(yearMap).map(Number).sort((a, b) => b - a);

    // If no years found or only 1, ensure at least 2025, 2026
    const allYears = years.length > 0 ? years : [2026, 2025, 2024];

    return allYears.map(year => {
      const monthData = yearMap[year] || {};
      const monthlyReturns: (number | null)[] = [];
      let yearFirstFactor: number | null = null;
      let yearLastFactor: number | null = null;

      for (let m = 0; m < 12; m++) {
        // If in future for current year, return null
        if (year === currentYear && m > currentMonth) {
          monthlyReturns.push(null);
          continue;
        }

        const dataForMonth = monthData[m];
        if (dataForMonth !== undefined) {
          // Convert cumulative percentage to compounding factor: (1 + pct / 100)
          const startFactor = 1 + (dataForMonth.first / 100);
          const endFactor = 1 + (dataForMonth.last / 100);

          if (yearFirstFactor === null) yearFirstFactor = startFactor;
          yearLastFactor = endFactor;

          if (startFactor > 0.001) {
            const pct = ((endFactor / startFactor) - 1) * 100;
            monthlyReturns.push(pct);
          } else {
            monthlyReturns.push(0);
          }
        } else {
          // If past month but no data, record 0 or null
          monthlyReturns.push(year === currentYear && m > currentMonth ? null : 0);
        }
      }

      // Year-to-date or full year return
      let ytdReturn: number | null = null;
      if (yearFirstFactor !== null && yearLastFactor !== null && yearFirstFactor > 0.001) {
        ytdReturn = ((yearLastFactor / yearFirstFactor) - 1) * 100;
      }

      return {
        year,
        months: monthlyReturns,
        ytd: ytdReturn,
      };
    });
  }, [historicalData]);

  // Color generator for return percentage
  const getCellColor = (val: number | null) => {
    if (val === null) return 'bg-white/[0.02] text-gray-600 border-transparent';
    if (val > 8) return 'bg-emerald-500/80 text-white font-black border-emerald-400/40 shadow-sm';
    if (val > 4) return 'bg-emerald-500/45 text-emerald-100 font-bold border-emerald-500/30';
    if (val > 0.1) return 'bg-emerald-500/20 text-emerald-300 font-semibold border-emerald-500/20';
    if (val < -8) return 'bg-rose-500/80 text-white font-black border-rose-400/40 shadow-sm';
    if (val < -4) return 'bg-rose-500/45 text-rose-100 font-bold border-rose-500/30';
    if (val < -0.1) return 'bg-rose-500/20 text-rose-300 font-semibold border-rose-500/20';
    return 'bg-[#1A1D2D]/60 text-gray-400 font-medium border-[#2A2E45]/40';
  };

  const formatPct = (val: number | null) => {
    if (val === null) return '—';
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#823AFD] to-[#FC2D79] flex items-center justify-center shadow-[0_4px_12px_rgba(130,58,253,0.3)]">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Monthly Return Heatmap
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-[#9898C8] font-semibold">
                Calendar Matrix
              </span>
            </h3>
            <p className="text-xs text-[#9898C8]">
              Monthly performance breakdown across 12 calendar months with year-to-date velocity
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[11px] text-[#9898C8] self-start sm:self-auto bg-[#1A1D2D] px-3 py-1.5 rounded-xl border border-[#2A2E45]">
          <span className="text-rose-400 font-bold">-8%</span>
          <div className="w-16 h-2 rounded-full bg-gradient-to-r from-rose-500 via-gray-600 to-emerald-500" />
          <span className="text-emerald-400 font-bold">+8%</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto custom-scrollbar pt-2">
        <table className="w-full text-center border-separate border-spacing-1.5 min-w-[700px]">
          <thead>
            <tr>
              <th className="text-left font-bold text-xs text-[#9898C8] px-3 py-2 w-16">Year</th>
              {MONTHS.map(m => (
                <th key={m} className="font-bold text-xs text-[#9898C8] py-2">
                  {m}
                </th>
              ))}
              <th className="font-extrabold text-xs text-white py-2 px-3 bg-[#1A1D2D] rounded-xl border border-[#2A2E45]">
                YTD
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.year}>
                <td className="text-left font-black text-sm text-white px-3 py-3">
                  {row.year}
                </td>
                {row.months.map((val, idx) => (
                  <td
                    key={idx}
                    className={clsx(
                      "py-3 px-1 rounded-xl text-xs border tabular-nums transition-transform hover:scale-105 select-none",
                      getCellColor(val)
                    )}
                    title={`${row.year} ${MONTHS[idx]}: ${formatPct(val)}`}
                  >
                    {formatPct(val)}
                  </td>
                ))}
                <td
                  className={clsx(
                    "py-3 px-3 rounded-xl text-xs font-black border tabular-nums shadow-md select-none",
                    getCellColor(row.ytd)
                  )}
                  title={`${row.year} Total YTD: ${formatPct(row.ytd)}`}
                >
                  {formatPct(row.ytd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
