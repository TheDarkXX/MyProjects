import React from 'react';
import { 
  LayoutList, LayoutGrid, Columns2, FileText, List, ArrowUpDown, 
  ArrowUp, ArrowDown, Calendar, Tag, Flame, Zap, TrendingUp 
} from 'lucide-react';
import clsx from 'clsx';
import { ViewMode, SortKey, SortOrder } from './types';

interface NewsToolbarProps {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  sortKey: SortKey;
  onChangeSortKey: (key: SortKey) => void;
  sortOrder: SortOrder;
  onToggleSortOrder: () => void;
  totalCount: number;
}

export const NewsToolbar: React.FC<NewsToolbarProps> = ({
  viewMode,
  onChangeViewMode,
  sortKey,
  onChangeSortKey,
  sortOrder,
  onToggleSortOrder,
  totalCount,
}) => {
  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
      {/* Left: View Mode Switcher */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px] font-bold text-slate-300 hidden sm:inline-block mr-1">
          มุมมอง:
        </span>
        <div className="bg-[#0F111A] p-1 rounded-xl border border-[#1F2233] flex items-center gap-1">
          {/* List View (3 cols) - DEFAULT */}
          <button
            onClick={() => onChangeViewMode('list')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === 'list'
                ? "bg-[#823AFD] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
            title="List View (3 คอลัมน์) — กะทัดรัด โชว์เฉพาะหัวข้อ"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>List (3 Col)</span>
          </button>

          {/* Bullet Text View (16px) */}
          <button
            onClick={() => onChangeViewMode('text')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === 'text'
                ? "bg-[#823AFD] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
            title="Text View — สไตล์ Bullet List หัวข้อ 16px + Key Tags"
          >
            <List className="w-3.5 h-3.5" />
            <span>Text (16px)</span>
          </button>

          {/* Mini Card View (3-4 cols) */}
          <button
            onClick={() => onChangeViewMode('mini_card')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === 'mini_card'
                ? "bg-[#823AFD] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
            title="Mini Cards (3-4 คอลัมน์) — สไตล์ Dashboard จอใหญ่"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Mini (3-4 Col)</span>
          </button>

          {/* Big Card View (2 cols) */}
          <button
            onClick={() => onChangeViewMode('big_card')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === 'big_card'
                ? "bg-[#823AFD] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
            title="Big Cards (2 คอลัมน์) — ข้อมูลแน่น อ่านคู่ขนาน"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Big (2 Col)</span>
          </button>

          {/* Full View (1 col) */}
          <button
            onClick={() => onChangeViewMode('full')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              viewMode === 'full'
                ? "bg-[#823AFD] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
            title="Full View (1 คอลัมน์) — รายละเอียดครบทุกมิติ"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Full View</span>
          </button>
        </div>
      </div>

      {/* Right: Sorting System & Count */}
      <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-slate-300 mr-1 hidden lg:inline-block">
            เรียงตาม:
          </span>

          {/* Sort Key Selector */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => onChangeSortKey(e.target.value as SortKey)}
              className="bg-[#0F111A] border border-[#1F2233] hover:border-[#823AFD] text-[13px] font-bold text-slate-200 px-3 py-1.5 rounded-xl outline-none cursor-pointer pr-8 appearance-none transition-all"
            >
              <option value="date" className="bg-[#111418] text-white">📅 วันที่ (Date)</option>
              <option value="ticker" className="bg-[#111418] text-white">🔤 หุ้น A-Z (Ticker)</option>
              <option value="priority" className="bg-[#111418] text-white">🎯 ความสำคัญ (Priority)</option>
              <option value="score" className="bg-[#111418] text-white">⚡ คะแนน (Score)</option>
              <option value="sentiment" className="bg-[#111418] text-white">📈 อารมณ์ตลาด (Sentiment)</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Sort Direction Toggle Button */}
          <button
            onClick={onToggleSortOrder}
            className="px-2.5 py-1.5 rounded-xl bg-[#0F111A] hover:bg-[#1A1D2D] text-slate-200 hover:text-white border border-[#1F2233] hover:border-[#823AFD] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title={sortOrder === 'desc' ? "มากไปน้อย / ล่าสุด (DESC)" : "น้อยไปมาก / เก่าสุด (ASC)"}
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                <span>DESC</span>
              </>
            ) : (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>ASC</span>
              </>
            )}
          </button>
        </div>

        {/* Count Badge */}
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700">
          {totalCount} ข่าว
        </span>
      </div>
    </div>
  );
};
