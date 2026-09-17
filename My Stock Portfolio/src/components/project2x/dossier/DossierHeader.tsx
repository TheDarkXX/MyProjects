import React from 'react';
import { 
  RefreshCw, X, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle, 
  LayoutDashboard, LineChart, BrainCircuit, PanelLeftClose, PanelLeftOpen, 
  PanelTopClose, PanelTopOpen, Maximize2 
} from 'lucide-react';
import clsx from 'clsx';
import { useDossierStore } from '../../../stores/dossierStore';
import { useUiStore } from '../../../stores/uiStore';
import { DoublerPowerTube } from './DoublerPowerTube';

interface DossierHeaderProps {
  onClose?: () => void;
}

export const DossierHeader: React.FC<DossierHeaderProps> = ({ onClose }) => {
  const {
    data,
    selectedSymbol,
    selectSymbol,
    refreshFinancials,
    isRefreshing,
    columnMode,
    setColumnMode,
    activeSubTab,
    setActiveSubTab
  } = useDossierStore();

  const { sidebarMode, toggleSidebarMode, xchartHideHeader, toggleXChartHeader, setActiveTab } = useUiStore();
  const collapsed = sidebarMode === 'compact';

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
      bg: 'bg-gradient-to-r from-violet-950/80 via-[#16122C] to-[#0A0E1A] border-violet-500/60 shadow-[0_0_20px_rgba(130,58,253,0.25)]',
      pill: 'bg-[#823AFD] text-white',
      title: '🟣 BUY ADD ZONE (สะสมเพิ่มได้)',
      icon: <ShieldCheck className="w-5 h-5 text-violet-400" />
    },
    HOLD_RIDE: {
      bg: 'bg-gradient-to-r from-[#12162B]/80 via-[#161A34] to-[#141430] border-slate-700/60 shadow-[0_0_20px_rgba(152,152,200,0.1)]',
      pill: 'bg-slate-700 text-white',
      title: '⚪ HOLD & RIDE TREND (ถือทับมือ)',
      icon: <ShieldCheck className="w-5 h-5 text-slate-300" />
    },
    TRIM_SELL: {
      bg: 'bg-gradient-to-r from-pink-950/80 via-[#261020] to-[#0A0E1A] border-[#FC2D79]/60 shadow-[0_0_25px_rgba(252,45,121,0.25)]',
      pill: 'bg-[#FC2D79] text-white',
      title: '🔴 TRIM / SELL ALERT (แจ้งเตือนความเสี่ยง)',
      icon: <AlertTriangle className="w-5 h-5 text-[#FC2D79]" />
    }
  }[data.verdict] || {
    bg: 'bg-[#12162B] border-white/10',
    pill: 'bg-slate-700 text-white',
    title: 'HOLD & RIDE',
    icon: null
  };

  return (
    <div className="flex flex-col gap-3.5 border-b border-white/10 pb-3.5 mb-3.5">
      {/* Row 1: Switcher Pills & Window / Layout Controls */}
      <div className="flex items-center justify-between gap-3">
        {/* Horizontal Quick Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {stocks.map((s) => {
            const isActive = s.symbol === selectedSymbol;
            return (
              <button
                key={s.symbol}
                onClick={() => selectSymbol(s.symbol)}
                className={`px-3 py-1.5 rounded-xl text-[14px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-700 via-indigo-600 to-violet-600 text-white shadow-[0_0_16px_rgba(130,58,253,0.4)] scale-105 border border-violet-400/40 font-semibold'
                    : 'bg-[#12162B]/90 text-slate-300 hover:text-white hover:bg-[#1A1D36] border border-white/5'
                }`}
              >
                <span className={isActive ? 'font-semibold text-white' : 'text-slate-200'}>{s.symbol}</span>
                <span className="text-[13px]">
                  {s.symbol === 'NVDA' || s.symbol === 'TSM' || s.symbol === 'AVGO' ? '👑' : s.tier.includes('Moonshot') ? '🚀' : ''}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Column Layout Mode + Refresh + Close */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Ultra-Wide Column Switcher: Only show on multi-column tabs (Cockpit & Financials) */}
          {activeSubTab !== 'thesis' && (
            <div className="flex items-center bg-[#0A0E1A] p-1 rounded-xl border border-white/10 shadow-inner">
              <button
                onClick={() => setColumnMode(2)}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  columnMode === 2
                    ? 'bg-violet-600 text-white shadow-[0_0_10px_rgba(130,58,253,0.5)] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
                }`}
                title="แสดง 2 คอลัมน์"
              >
                2 Col
              </button>
              <button
                onClick={() => setColumnMode(3)}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  columnMode === 3
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(130,58,253,0.6)] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
                }`}
                title="แสดง 3 คอลัมน์ (แนะนำสำหรับ Ultra-Wide)"
              >
                3 Col ⭐
              </button>
              <button
                onClick={() => setColumnMode(4)}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  columnMode === 4
                    ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white shadow-[0_0_12px_rgba(252,45,121,0.5)] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
                }`}
                title="แสดง 4 คอลัมน์ (Ultra-Wide พาโนรามา)"
              >
                4 Col ⚡
              </button>
            </div>
          )}

          {/* Toggle Sidebar Button */}
          <button
            onClick={toggleSidebarMode}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[13px] font-medium transition-all cursor-pointer",
              collapsed
                ? "bg-violet-950/70 border-violet-500/50 text-violet-300 shadow-[0_0_10px_rgba(130,58,253,0.25)] hover:bg-violet-900/60 font-semibold"
                : "bg-[#12162B] border-white/10 text-slate-300 hover:text-white hover:bg-[#1A1D36]"
            )}
            title={collapsed ? "กาง Sidebar ด้านซ้าย (Expand Sidebar)" : "ย่อ Sidebar ด้านซ้าย (Collapse Sidebar)"}
          >
            {collapsed ? (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden xl:inline">กาง Sidebar</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden xl:inline">ย่อ Sidebar</span>
              </>
            )}
          </button>

          {/* Toggle Top Bar Header Button */}
          <button
            onClick={toggleXChartHeader}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[13px] font-medium transition-all cursor-pointer",
              xchartHideHeader
                ? "bg-pink-950/70 border-[#FC2D79]/50 text-pink-300 shadow-[0_0_10px_rgba(252,45,121,0.25)] hover:bg-pink-900/60 font-semibold"
                : "bg-[#12162B] border-white/10 text-slate-300 hover:text-white hover:bg-[#1A1D36]"
            )}
            title={xchartHideHeader ? "แสดง Header ด้านบน (Show Header)" : "ซ่อน Header ด้านบนเพื่อขยายพื้นที่ (Hide Header)"}
          >
            {xchartHideHeader ? (
              <>
                <PanelTopOpen className="w-3.5 h-3.5 text-[#FC2D79]" />
                <span className="hidden xl:inline">แสดง Header</span>
              </>
            ) : (
              <>
                <PanelTopClose className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden xl:inline">ซ่อน Header</span>
              </>
            )}
          </button>

          <button
            onClick={() => refreshFinancials()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[14px] font-medium bg-[#12162B] border border-white/10 hover:border-violet-500/60 text-slate-200 hover:text-violet-300 transition-colors cursor-pointer"
            title="ดึงงบการเงินล่าสุดจาก Yahoo Finance เข้า SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-violet-400' : 'text-violet-400'}`} />
            <span className="hidden sm:inline">อัปเดตงบ</span>
          </button>

          {onClose && (
            <>
              <button
                onClick={() => {
                onClose();
                setActiveTab('xray');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[13px] font-medium bg-[#12162B] border border-white/10 hover:border-violet-500/60 text-slate-300 hover:text-violet-300 transition-colors cursor-pointer"
              title="เปิดในแท็บ Stock X-Ray เต็มหน้าจอ (Open as Full Page)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-violet-400" />
              <span className="hidden sm:inline">เปิดเต็มหน้า</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#12162B] hover:bg-pink-950/40 text-slate-300 hover:text-white border border-white/10 hover:border-pink-500/50 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>

    {/* Row 2: Profile + Live Quote + 2X Power Tube */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
      {/* Left Col (4 cols): Symbol, Category, Price */}
      <div className="lg:col-span-4 flex items-center justify-between sm:justify-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
              {data.symbol}
            </h2>
            <span className={`px-2.5 py-0.5 rounded text-[12px] font-medium ${
              data.category === 'Core'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
            }`}>
              {data.category === 'Core' ? 'Core 👑' : 'Moonshot 🚀'}
            </span>
          </div>
          <p className="text-[14px] text-slate-300 font-normal mt-0.5 truncate max-w-[220px]">
            {data.name}
          </p>
        </div>

        {/* Price Box */}
        <div className="border-l border-white/10 pl-4 flex-shrink-0">
          <div className="text-3xl font-bold text-white font-mono tracking-tight">
            ${currentPrice.toFixed(2)}
          </div>
          <div className={`flex items-center gap-1 text-[14px] font-medium font-mono mt-0.5 ${isUp ? 'text-emerald-400' : 'text-[#FC2D79]'}`}>
            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* Right Col (8 cols): 2X Power Tube */}
      <div className="lg:col-span-8 w-full">
        <DoublerPowerTube
          currentPrice={currentPrice}
          avgCost={data.holding?.avgCost || 0}
          targetPrice3Y={data.targetPrice3Y}
          marketCap={data.marketCap}
          doublerProgressPct={data.doublerProgressPct}
          unrealizedPnlPct={data.holding?.unrealizedPnlPct || 0}
        />
      </div>
    </div>

    {/* Row 3: Executive Verdict Ribbon */}
    <div className={`p-3 rounded-2xl border ${verdictConfig.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {verdictConfig.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium tracking-wide text-slate-200">
              {verdictConfig.title}
            </span>
            <span className="text-[12px] px-2 py-0.5 rounded bg-[#0A0E1A] border border-white/10 text-violet-300 font-mono font-medium">
              Scenario {data.radar?.scenario || 1}
            </span>
          </div>
          <p className="text-[14px] text-slate-300 mt-0.5 font-normal leading-snug">
            {data.verdictReason}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <span className="text-[14px] text-slate-300 font-normal">โควตา:</span>
        <span className="text-[14px] font-medium font-mono text-violet-300">
          {data.holding?.shares || 0} / {data.holding?.targetShares || 0} หุ้น ({data.holding?.quotaProgressPct || 0}%)
        </span>
      </div>
    </div>

    {/* Row 4: 3-Subtab Navigation Switcher */}
    <div className="flex items-center gap-2 bg-[#0A0E1A]/90 p-1.5 rounded-2xl border border-white/10 shadow-inner">
      <button
        onClick={() => setActiveSubTab('cockpit')}
        className={`flex-1 py-2.5 px-4 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
          activeSubTab === 'cockpit'
            ? 'bg-gradient-to-r from-violet-800 via-violet-700 to-indigo-700 text-white font-semibold shadow-[0_0_16px_rgba(130,58,253,0.4)] border border-violet-400/30'
            : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
        }`}
      >
        <LayoutDashboard className="w-4 h-4 text-violet-300" />
        <span>1. Mission Control (ค็อกพิทสั่งการ)</span>
      </button>

      <button
        onClick={() => setActiveSubTab('financials')}
        className={`flex-1 py-2.5 px-4 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
          activeSubTab === 'financials'
            ? 'bg-gradient-to-r from-indigo-800 via-blue-700 to-violet-700 text-white font-semibold shadow-[0_0_16px_rgba(37,99,235,0.4)] border border-blue-400/30'
            : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
        }`}
      >
        <LineChart className="w-4 h-4 text-blue-300" />
        <span>2. Financial Pulse (ตรวจงบ 8Q & กระแสเงินสด)</span>
      </button>

      <button
        onClick={() => setActiveSubTab('thesis')}
        className={`flex-1 py-2.5 px-4 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
          activeSubTab === 'thesis'
            ? 'bg-gradient-to-r from-violet-900 via-pink-900 to-orange-900 text-white font-semibold shadow-[0_0_16px_rgba(253,85,20,0.35)] border border-orange-500/30'
            : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
        }`}
      >
        <BrainCircuit className="w-4 h-4 text-orange-300" />
        <span>3. 2X Thesis & Moat (เรื่องเล่า & คาดการณ์กี่เด้ง)</span>
      </button>
      </div>
    </div>
  );
};

