import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface IdealBlueprintItem {
  symbol: string;
  role?: string;
  currentPercent: number;
  idealPercent: number;
  change?: number;
}

interface BeforeAfterDonutProps {
  items: IdealBlueprintItem[];
}

const PALETTE = [
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#38BDF8', // Sky
  '#34D399', // Emerald
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#10B981', // Green
  '#64748B', // Slate (for Cash/Other)
  '#EAB308', // Yellow
];

const parsePercent = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const cleaned = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return isNaN(cleaned) ? 0 : cleaned;
  }
  return 0;
};

export const BeforeAfterDonut: React.FC<BeforeAfterDonutProps> = ({ items }) => {
  // Map consistent colors by symbol
  const symbolColors = useMemo(() => {
    const map: Record<string, string> = {};
    items.forEach((item, idx) => {
      const sym = item.symbol.toUpperCase();
      if (sym === 'CASH') {
        map[sym] = '#64748B'; // Slate
      } else {
        map[sym] = PALETTE[idx % PALETTE.length];
      }
    });
    return map;
  }, [items]);

  // Current data for left pie
  const currentData = useMemo(() => {
    return items
      .map(it => ({
        name: it.symbol,
        value: parsePercent(it.currentPercent),
        role: it.role,
        color: symbolColors[it.symbol.toUpperCase()] || '#6366F1'
      }))
      .filter(it => it.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [items, symbolColors]);

  // Ideal data for right pie
  const idealData = useMemo(() => {
    return items
      .map(it => ({
        name: it.symbol,
        value: parsePercent(it.idealPercent),
        role: it.role,
        isNew: parsePercent(it.currentPercent) === 0,
        color: symbolColors[it.symbol.toUpperCase()] || '#6366F1'
      }))
      .filter(it => it.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [items, symbolColors]);

  // Identify newly introduced assets
  const newAssets = useMemo(() => {
    return items.filter(it => parsePercent(it.currentPercent) === 0 && parsePercent(it.idealPercent) > 0);
  }, [items]);

  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#181B2A] border border-[#2A2E45] rounded-lg p-2.5 shadow-xl text-[13px]">
          <div className="flex items-center gap-2 font-bold text-white mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
            {data.isNew && (
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                ✨ NEW
              </span>
            )}
          </div>
          <div className="text-slate-200">
            สัดส่วน: <b className="text-white font-bold">{data.value}%</b>
          </div>
          {data.role && (
            <div className="text-slate-400 text-xs mt-0.5">
              {data.role}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#12141F] border border-[#232738] rounded-xl p-4 md:p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
        <div>
          <h4 className="text-white font-bold text-sm flex items-center gap-2">
            <span>🍩</span> สัดส่วนพอร์ตเปรียบเทียบ (Before vs After Allocation)
          </h4>
          <p className="text-[13px] text-slate-300 mt-0.5">
            เห็นการเปลี่ยนผ่านจากพอร์ตปัจจุบันสู่พอร์ตในอุดมคติอย่างชัดเจน
          </p>
        </div>
        {newAssets.length > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold text-amber-300">
            <span>✨</span>
            <span>แนะนำเพิ่มสินทรัพย์ใหม่: {newAssets.map(a => a.symbol).join(', ')}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left: Current Allocation */}
        <div className="flex flex-col items-center bg-[#181B2A]/60 rounded-xl p-4 border border-[#232738]">
          <div className="text-[13px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>พอร์ตปัจจุบัน (Current)</span>
          </div>
          <div className="w-full h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                >
                  {currentData.map((entry, idx) => (
                    <Cell key={`cell-curr-${idx}`} fill={entry.color} stroke="#181B2A" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-400 font-semibold uppercase">สินทรัพย์</span>
              <span className="text-xl font-black text-white">{currentData.length} ตัว</span>
            </div>
          </div>
        </div>

        {/* Right: Ideal Allocation */}
        <div className="flex flex-col items-center bg-[#181B2A]/60 rounded-xl p-4 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
          <div className="text-[13px] font-bold text-amber-300 mb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <span>พอร์ตแนะนำ (AI Strategist Ideal)</span>
          </div>
          <div className="w-full h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={idealData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={2}
                >
                  {idealData.map((entry, idx) => (
                    <Cell key={`cell-ideal-${idx}`} fill={entry.color} stroke="#181B2A" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-amber-400/80 font-semibold uppercase">พิมพ์เขียว</span>
              <span className="text-xl font-black text-amber-300">{idealData.length} ตัว</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Legend of Assets */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-4 mt-2 border-t border-[#232738]/80 text-[13px]">
        {items.map((item, idx) => {
          const sym = item.symbol.toUpperCase();
          const color = symbolColors[sym] || '#6366F1';
          const isNew = (item.currentPercent || 0) === 0 && item.idealPercent > 0;
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181B2A] border border-[#2A2E45] text-slate-200"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="font-bold text-white">{item.symbol}</span>
              <span className="text-slate-400 text-xs">{item.currentPercent}% ➔ {item.idealPercent}%</span>
              {isNew && <span className="text-amber-400 font-bold text-xs">✨NEW</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
};
