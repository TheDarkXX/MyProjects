import React, { useState, useMemo } from 'react';
import { PortfolioSliceItem } from './types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  ExternalLink, 
  Eye, 
  Target, 
  Wallet, 
  BarChart2, 
  Scale 
} from 'lucide-react';
import clsx from 'clsx';

interface MyPortTableViewProps {
  slices: PortfolioSliceItem[];
  exchangeRate: number;
  hoveredSymbol: string | null;
  onHoverSymbol: (symbol: string | null) => void;
  onSelectSymbol: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
}

type SortField = 'weight' | 'pnl' | 'drift' | 'price' | 'value' | 'symbol';

export const MyPortTableView: React.FC<MyPortTableViewProps> = ({
  slices,
  exchangeRate,
  hoveredSymbol,
  onHoverSymbol,
  onSelectSymbol,
  onOpenChart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'winners' | 'losers' | 'overweight' | 'underweight'>('all');
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortAsc, setSortAsc] = useState(false);

  // Handle column header sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Filter & Sort Logic
  const filteredSlices = useMemo(() => {
    let list = [...slices];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter((s) => s.symbol.toUpperCase().includes(q) || s.category.toUpperCase().includes(q));
    }

    // Quick category filters
    if (filterMode === 'winners') {
      list = list.filter((s) => !s.isCash && s.totalReturnPercent > 0);
    } else if (filterMode === 'losers') {
      list = list.filter((s) => !s.isCash && s.totalReturnPercent < 0);
    } else if (filterMode === 'overweight') {
      list = list.filter((s) => s.targetWeight > 0 && s.drift > 0.5);
    } else if (filterMode === 'underweight') {
      list = list.filter((s) => s.targetWeight > 0 && s.drift < -0.5);
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'pnl':
          comparison = a.totalReturnPercent - b.totalReturnPercent;
          break;
        case 'drift':
          comparison = a.drift - b.drift;
          break;
        case 'price':
          comparison = a.lastPrice - b.lastPrice;
          break;
        case 'value':
          comparison = a.currentValue - b.currentValue;
          break;
        case 'weight':
        default:
          comparison = a.actualWeight - b.actualWeight;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [slices, searchQuery, filterMode, sortField, sortAsc]);

  const winnersCount = useMemo(() => slices.filter((s) => !s.isCash && s.totalReturnPercent > 0).length, [slices]);
  const losersCount = useMemo(() => slices.filter((s) => !s.isCash && s.totalReturnPercent < 0).length, [slices]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B1220] border-l border-slate-800/80 select-none overflow-hidden min-h-0">
      {/* Top Filter and Search Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-[#0D1017] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Search Box */}
        <div className="relative min-w-[240px] max-w-[320px] flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาหุ้น หรือ หมวดหมู่ (Search)..."
            className="w-full bg-[#141824] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
          <button
            onClick={() => setFilterMode('all')}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-[13px] font-semibold transition-all shrink-0',
              filterMode === 'all'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            ทั้งหมด ({slices.length})
          </button>
          <button
            onClick={() => setFilterMode('winners')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-semibold transition-all shrink-0',
              filterMode === 'winners'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>กำไร ({winnersCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('losers')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-semibold transition-all shrink-0',
              filterMode === 'losers'
                ? 'bg-rose-600/30 text-rose-300 border border-rose-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>ขาดทุน ({losersCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('overweight')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-semibold transition-all shrink-0',
              filterMode === 'overweight'
                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <Scale className="w-3.5 h-3.5 text-blue-400" />
            <span>Overweight</span>
          </button>
          <button
            onClick={() => setFilterMode('underweight')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-semibold transition-all shrink-0',
              filterMode === 'underweight'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Underweight</span>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse text-left text-sm">
          {/* Table Header */}
          <thead className="bg-[#121622] text-slate-300 sticky top-0 z-10 border-b border-slate-800 text-[13px] font-bold">
            <tr>
              <th
                onClick={() => handleSort('symbol')}
                className="py-2.5 px-3.5 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>สินทรัพย์ (Symbol)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('weight')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>สัดส่วน Actual vs Target</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('price')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>ราคาตลาด / 24h</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-2.5 px-3 text-right">
                <span>ต้นทุน / จำนวนหุ้น</span>
              </th>

              <th
                onClick={() => handleSort('value')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>มูลค่าถือครอง ($)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('pnl')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>กำไร/ขาดทุน (P/L)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-2.5 px-3 text-center">
                <span>เป้าหมาย Blueprint</span>
              </th>

              <th className="py-2.5 px-3 text-center">
                <span>คำสั่ง (Actions)</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60">
            {filteredSlices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-300 text-sm">
                  {searchQuery ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ไม่มีรายการสินทรัพย์ในหมวดหมู่นี้'}
                </td>
              </tr>
            ) : (
              filteredSlices.map((slice) => {
                const isHovered = hoveredSymbol?.toUpperCase() === slice.symbol.toUpperCase();
                const isProfit = slice.totalReturn >= 0;
                const isDayProfit = slice.dayChangePercent >= 0;
                const valueTHB = slice.currentValue * (exchangeRate || 34.5);

                // Blueprint progress calculation
                let bpDistancePercent: number | null = null;
                if (slice.blueprintTargetPrice && slice.lastPrice > 0) {
                  bpDistancePercent = ((slice.blueprintTargetPrice - slice.lastPrice) / slice.lastPrice) * 100;
                }

                return (
                  <tr
                    key={slice.symbol}
                    onMouseEnter={() => onHoverSymbol(slice.symbol)}
                    onMouseLeave={() => onHoverSymbol(null)}
                    className={clsx(
                      'transition-all cursor-pointer group',
                      isHovered
                        ? 'bg-[#1C2337] border-l-4 border-l-purple-500 shadow-sm'
                        : 'bg-transparent border-l-4 border-l-transparent hover:bg-slate-800/30'
                    )}
                  >
                    {/* 1. Symbol & Category */}
                    <td className="py-2.5 px-3.5" onClick={() => onSelectSymbol(slice.symbol)}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: slice.color }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-white font-heading">
                              {slice.symbol}
                            </span>
                            <span className="text-[13px] px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-300 font-medium border border-slate-700/60">
                              {slice.category}
                            </span>
                          </div>
                          {slice.isCash && (
                            <span className="text-[13px] text-emerald-400 font-medium">เงินสดสำรองสภาพคล่อง</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Slices Weight (Actual vs Target) */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white font-mono">
                            {slice.actualWeight.toFixed(1)}%
                          </span>
                          {slice.targetWeight > 0 && (
                            <span className="text-[13px] text-slate-400 font-medium">
                              (เป้า {slice.targetWeight.toFixed(1)}%)
                            </span>
                          )}
                        </div>

                        {/* Drift Badge */}
                        {slice.targetWeight > 0 && (
                          <div className="mt-0.5">
                            <span
                              className={clsx(
                                'text-[13px] font-bold px-1.5 py-0.2 rounded-full',
                                slice.drift >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                              )}
                            >
                              {slice.drift >= 0 ? `+${slice.drift.toFixed(1)}% Overweight` : `${slice.drift.toFixed(1)}% Underweight`}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 3. Market Price & 24h Change */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      {!slice.isCash ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-slate-100 font-mono">
                            ${(slice.lastPrice ?? 0).toFixed(2)}
                          </span>
                          <span
                            className={clsx(
                              'text-[13px] font-semibold flex items-center gap-0.5',
                              isDayProfit ? 'text-emerald-400' : 'text-rose-400'
                            )}
                          >
                            {isDayProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isDayProfit ? '+' : ''}
                            {(slice.dayChangePercent ?? 0).toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">--</span>
                      )}
                    </td>

                    {/* 4. Cost Basis & Quantity */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      {!slice.isCash ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-semibold text-slate-200 font-mono">
                            ${(slice.avgCost ?? 0).toFixed(2)}
                          </span>
                          <span className="text-[13px] text-slate-300 font-medium">
                            {slice.quantity.toLocaleString()} หุ้น
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">--</span>
                      )}
                    </td>

                    {/* 5. Holding Value */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-extrabold text-white font-mono">
                          ${(slice.currentValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[13px] text-slate-300 font-medium">
                          ≈ ฿{valueTHB.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </td>

                    {/* 6. Total Unrealized Return */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      {!slice.isCash ? (
                        <div className="flex flex-col items-end">
                          <span
                            className={clsx(
                              'text-sm font-bold font-mono',
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            )}
                          >
                            {isProfit ? '+' : ''}$
                            {slice.totalReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span
                            className={clsx(
                              'text-[13px] font-semibold px-1.5 py-0.2 rounded',
                              isProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            )}
                          >
                            {isProfit ? '+' : ''}
                            {slice.totalReturnPercent.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-300">--</span>
                      )}
                    </td>

                    {/* 7. Blueprint Milestone */}
                    <td className="py-2.5 px-3 text-center" onClick={() => onSelectSymbol(slice.symbol)}>
                      {slice.blueprintTargetPrice ? (
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-purple-300 font-mono">
                            ${slice.blueprintTargetPrice.toFixed(2)}
                          </span>
                          {bpDistancePercent !== null && (
                            <span
                              className={clsx(
                                'text-[13px] font-medium',
                                bpDistancePercent <= 0 ? 'text-emerald-400 font-bold' : 'text-slate-300'
                              )}
                            >
                              {bpDistancePercent <= 0 ? '🎯 ถึงเป้าแล้ว!' : `เหลืออีก ${bpDistancePercent.toFixed(1)}%`}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[13px] text-slate-400">ยังไม่ตั้งเป้า</span>
                      )}
                    </td>

                    {/* 8. Action Buttons */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(slice.symbol);
                          }}
                          title="เปิดดูรายละเอียดเชิงลึก (Quick Inspect)"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/80"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!slice.isCash && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChart(slice.symbol);
                            }}
                            title="เปิดดูกราฟแท่งเทียนตัวเต็มใน X-Chart (Launch Chart)"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 hover:text-white transition-all border border-purple-500/40 text-[13px] font-bold shadow-sm"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>กราฟ</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
