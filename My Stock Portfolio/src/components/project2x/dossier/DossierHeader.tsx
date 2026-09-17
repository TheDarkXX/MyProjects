import React from 'react';
import { RefreshCw, X, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useDossierStore } from '../../../stores/dossierStore';

interface DossierHeaderProps {
  onClose?: () => void;
}

export const DossierHeader: React.FC<DossierHeaderProps> = ({ onClose }) => {
  const { data, selectedSymbol, selectSymbol, refreshFinancials, isRefreshing, columnMode, setColumnMode } = useDossierStore();

  if (!data) return null;

  const currentPrice = data.currentPrice || 0;
  const change = data.liveQuote?.change || 0;
  const changePct = data.liveQuote?.percent_change || 0;
  const isUp = change >= 0;

  // 13 Stocks List
  const stocks = [
    { symbol: 'NVDA', tier: 'Core 👑' },
    { symbol: 'TSM', tier: 'Core 👑' },
    { symbol: 'AVGO', tier: 'Core 👑' },
    { symbol: 'VRT', tier: 'Core 👑' },
    { symbol: 'MELI', tier: 'Core 👑' },
    { symbol: 'APH', tier: 'Core 👑' },
    { symbol: 'KLAC', tier: 'Core 👑' },
    { symbol: 'ANET', tier: 'Core 👑' },
    { symbol: 'CRWD', tier: 'Core 👑' },
    { symbol: 'STRL', tier: 'Moonshot 🚀' },
    { symbol: 'ALAB', tier: 'Moonshot 🚀' },
    { symbol: 'PLTR', tier: 'Moonshot 🚀' },
    { symbol: 'CLS', tier: 'Moonshot 🚀' }
  ];

  // Verdict Styling
  const verdictConfig = {
    BUY_ADD: {
      bg: 'bg-gradient-to-r from-emerald-950/50 via-[#0B162C] to-[#070E1F] border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
      pill: 'bg-emerald-500 text-slate-950 font-black',
      title: '🟢 BUY ADD ZONE (สะสมเพิ่มได้)',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />
    },
    HOLD_RIDE: {
      bg: 'bg-gradient-to-r from-blue-950/50 via-[#0B162C] to-[#14081E] border-blue-500/60 shadow-[0_0_20px_rgba(56,189,248,0.2)]',
      pill: 'bg-cyan-500 text-slate-950 font-black',
      title: '🟡 HOLD & RIDE TREND (ถือทับมือ)',
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />
    },
    TRIM_SELL: {
      bg: 'bg-gradient-to-r from-rose-950/60 via-[#180814] to-[#0B162C] border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.3)]',
      pill: 'bg-rose-500 text-white font-black',
      title: '🔴 TRIM / SELL ALERT (แจ้งเตือนความเสี่ยง)',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />
    }
  }[data.verdict] || {
    bg: 'bg-[#0B1226] border-blue-900/50',
    pill: 'bg-slate-700 text-white font-bold',
    title: 'HOLD & RIDE',
    icon: null
  };

  return (
    <div className="flex flex-col gap-4 border-b border-blue-900/40 pb-4 mb-4">
      {/* Top Bar: Switcher Pills & Window Controls */}
      <div className="flex items-center justify-between gap-4">
        {/* Horizontal Quick Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {stocks.map((s) => {
            const isActive = s.symbol === selectedSymbol;
            return (
              <button
                key={s.symbol}
                onClick={() => selectSymbol(s.symbol)}
                className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 text-white font-black shadow-[0_0_18px_rgba(244,63,94,0.35)] scale-105 border border-white/30'
                    : 'bg-[#0B1226]/90 text-white hover:text-white hover:bg-[#131D38] border border-blue-900/40'
                }`}
              >
                <span className="text-white font-bold">{s.symbol}</span>
                <span className="text-[13px]">
                  {s.symbol === 'NVDA' || s.symbol === 'TSM' || s.symbol === 'AVGO' ? '👑' : s.tier.includes('Moonshot') ? '🚀' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Column Layout Mode + Refresh + Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Ultra-Wide Column Switcher (2, 3, 4 Cols) */}
          <div className="flex items-center bg-[#060A16] p-1 rounded-xl border border-blue-900/60 shadow-inner">
            <button
              onClick={() => setColumnMode(2)}
              className={`px-2.5 py-1 rounded-lg text-[13px] font-black transition-all cursor-pointer ${
                columnMode === 2
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                  : 'text-slate-200 hover:text-white hover:bg-blue-950/40'
              }`}
              title="แสดง 2 คอลัมน์"
            >
              2 Col
            </button>
            <button
              onClick={() => setColumnMode(3)}
              className={`px-2.5 py-1 rounded-lg text-[13px] font-black transition-all cursor-pointer ${
                columnMode === 3
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]'
                  : 'text-slate-200 hover:text-white hover:bg-blue-950/40'
              }`}
              title="แสดง 3 คอลัมน์ (แนะนำสำหรับ Ultra-Wide)"
            >
              3 Col ⭐
            </button>
            <button
              onClick={() => setColumnMode(4)}
              className={`px-2.5 py-1 rounded-lg text-[13px] font-black transition-all cursor-pointer ${
                columnMode === 4
                  ? 'bg-gradient-to-r from-indigo-600 to-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'text-slate-200 hover:text-white hover:bg-blue-950/40'
              }`}
              title="แสดง 4 คอลัมน์ (แบบกว้างพาโนรามา Ultra-Wide)"
            >
              4 Col ⚡
            </button>
          </div>

          <button
            onClick={() => refreshFinancials()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-bold bg-[#0B1226] border border-blue-900/50 hover:border-cyan-500/60 text-white hover:text-cyan-300 transition-colors cursor-pointer"
            title="ดึงงบการเงินล่าสุดจาก Yahoo Finance เข้า SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-white'}`} />
            <span className="hidden sm:inline">อัปเดตงบ</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0B1226] hover:bg-rose-950/40 text-white border border-blue-900/50 hover:border-rose-500/50 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Header Strip: Stock Profile + Executive Verdict Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Col: Symbol, Category, Live Price */}
        <div className="lg:col-span-4 flex items-center gap-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
                {data.symbol}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                data.category === 'Core'
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
              }`}>
                {data.category === 'Core' ? 'Core 👑' : 'Moonshot 🚀'}
              </span>
            </div>
            <p className="text-[12px] text-slate-300 font-normal mt-0.5">
              {data.name}
            </p>
          </div>

          {/* Price Box */}
          <div className="border-l border-blue-900/40 pl-4">
            <div className="text-3xl font-bold text-white font-mono tracking-tight">
              ${currentPrice.toFixed(2)}
            </div>
            <div className={`flex items-center gap-1 text-[12px] font-medium font-mono mt-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* Center/Right Col: The 3-Way Executive Verdict Bar */}
        <div className={`lg:col-span-8 p-3 rounded-2xl border ${verdictConfig.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {verdictConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium tracking-wide text-slate-100">
                  {verdictConfig.title}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#060A16] border border-blue-800/50 text-cyan-200 font-mono font-medium">
                  Scenario {data.radar?.scenario || 1}
                </span>
              </div>
              <p className="text-[12px] text-slate-300 mt-0.5 font-normal leading-snug">
                {data.verdictReason}
              </p>
            </div>
          </div>

          {/* Doubler Progress Mini Bar */}
          <div className="flex-shrink-0 w-full sm:w-52 bg-[#060A16]/90 p-2.5 rounded-xl border border-blue-900/50">
            <div className="flex items-center justify-between text-[13px] mb-1">
              <span className="text-slate-200 font-semibold">เป้า 1 เด้ง</span>
              <span className="text-emerald-300 font-black font-mono text-sm">${data.targetPrice3Y.toFixed(0)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                style={{ width: `${data.doublerProgressPct}%` }}
              />
            </div>
            <div className="text-right text-[13px] font-black text-cyan-200 font-mono mt-0.5">
              {data.doublerProgressPct}% สู่เป้าหมาย
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
