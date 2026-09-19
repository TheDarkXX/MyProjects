import React, { useState } from 'react';
import { 
  RefreshCw, X, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle, 
  LayoutDashboard, LineChart, BrainCircuit, PanelLeftClose, PanelLeftOpen, 
  PanelTopClose, PanelTopOpen, Maximize2, Zap, Dna 
} from 'lucide-react';
import clsx from 'clsx';
import { useDossierStore } from '../../../stores/dossierStore';
import { useUiStore } from '../../../stores/uiStore';
import { DoublerPowerTube } from './DoublerPowerTube';
import { DossierStrategyCard } from './DossierStrategyCard';
import { DossierHoldingProfile } from './DossierHoldingProfile';
import { getTierMetadata } from '../../../utils/tierConfig';
import { PullbackDnaModal } from '../PullbackDnaModal';

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
  const [showDnaModal, setShowDnaModal] = useState(false);

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
          {/* Ultra-Wide Column Switcher: Available on all tabs */}
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

    {/* Row 2: 3 Independent Modular Pods (Profile & Holding | Strategy & Wall St | 2X Runway) */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
      {/* Pod 1: Stock Identity & Portfolio Holding */}
      <div className="lg:col-span-4 2xl:col-span-3 w-full">
        <DossierHoldingProfile data={data} />
      </div>

      {/* Pod 2: Strategy Verdict & Wall Street Intelligence */}
      <div className="lg:col-span-4 2xl:col-span-4 w-full">
        <DossierStrategyCard data={data} />
      </div>

      {/* Pod 3: 2X Institutional Horizon Runway */}
      <div className="lg:col-span-4 2xl:col-span-5 w-full">
        <DoublerPowerTube
          currentPrice={currentPrice}
          avgCost={data.holding?.avgCost || 0}
          targetPrice3Y={data.targetPrice3Y}
          marketCap={data.marketCap}
          doublerProgressPct={data.doublerProgressPct}
          unrealizedPnlPct={data.holding?.unrealizedPnlPct || 0}
          data={data}
        />
      </div>
    </div>

    {/* Row 3: Cyber Quant Command HUD */}
    {(() => {
      const tier = getTierMetadata(data.radar?.trafficLight);
      const isAboveEma9 = data.radar?.isAboveEma9 ?? (data.radar?.ema9 ? currentPrice >= data.radar.ema9 : true);
      const hasDivergence = !!data.radar?.hasRsiDivergence;
      const isBullRegime = data.radar?.ema50 && data.radar?.ema150 && data.radar?.ema200 && data.radar.ema50 > data.radar.ema150 && data.radar.ema150 > data.radar.ema200;

      return (
        <div className={`p-3.5 rounded-2xl border bg-gradient-to-r ${tier.bgGradient} ${tier.borderClass} ${tier.glowClass} flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 backdrop-blur-md transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 flex-1 min-w-0">
            {/* Primary Action Badge */}
            <div className={`px-3.5 py-2 rounded-xl flex items-center gap-2.5 flex-shrink-0 ${tier.badgeClass} shadow-lg border border-white/20`}>
              <span className={`text-xl ${tier.animClass}`}>
                {tier.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-[14px] font-black tracking-wider uppercase leading-none">
                  {tier.label}
                </span>
                <span className="text-[11px] opacity-90 font-mono tracking-tight font-medium mt-0.5">
                  {data.radar?.badge ? `${data.radar.badge} • Scen ${data.radar.scenario || 1}` : `Scenario ${data.radar?.scenario || 1}`}
                </span>
              </div>
            </div>

            {/* Tactical Sensors & Reason Text */}
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {/* Preflight Sensor Matrix */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* EMA 9 Trigger Chip */}
                <span className={`px-2 py-0.5 rounded-md text-[12px] font-mono font-semibold flex items-center gap-1 border ${
                  isAboveEma9 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  <Zap className="w-3 h-3" />
                  <span>EMA 9: {isAboveEma9 ? 'Above (Unlocked)' : 'Below (Locked)'}</span>
                </span>

                {/* Banker Flow Chip */}
                <span className="px-2 py-0.5 rounded-md text-[12px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <span>Banker:</span>
                  <strong>{data.radar?.bankerFlow != null ? Number(data.radar.bankerFlow).toFixed(1) : '0.0'}/20</strong>
                </span>

                {/* Regime Chip */}
                <span className={`px-2 py-0.5 rounded-md text-[12px] font-mono font-semibold border ${
                  data.radar?.regime === 'BULL' || isBullRegime
                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                    : data.radar?.regime === 'BEAR'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-slate-800 text-slate-300 border-white/10'
                }`}>
                  {data.radar?.regime === 'BULL' || isBullRegime ? 'BULL Regime 👑' : (data.radar?.regime === 'BEAR' ? 'BEAR Regime ⚠️' : 'NEUTRAL Regime')}
                </span>

                {/* RSI Divergence Chip */}
                {hasDivergence && (
                  <span className="px-2 py-0.5 rounded-md text-[12px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse flex items-center gap-1">
                    <span>⚡ Bullish Divergence</span>
                  </span>
                )}
              </div>

              {/* Action Description */}
              <p className="text-[13px] text-slate-200 font-normal leading-snug">
                {data.radar?.reason_th || data.verdictReason || tier.descriptionTh}
              </p>
            </div>
          </div>

          {/* Right Side: Pullback DNA Button & Quota Progress */}
          <div className="flex flex-wrap items-center gap-3 self-end lg:self-center flex-shrink-0">
            {/* Pullback DNA Button */}
            <button
              onClick={() => setShowDnaModal(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600/30 to-indigo-600/30 hover:from-violet-600/50 hover:to-indigo-600/50 text-violet-200 hover:text-white border border-violet-400/30 hover:border-violet-400/60 shadow-md text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="สแกน 10-Year Pullback & Bedrock DNA"
            >
              <Dna className="w-3.5 h-3.5 text-violet-300" />
              <span>Pullback DNA</span>
            </button>

            {/* Quota Tracker */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-[13px]">
              <span className="text-slate-400">โควตา:</span>
              <span className="font-semibold font-mono text-violet-300">
                {data.holding?.shares || 0} / {data.holding?.targetShares || 0} หุ้น ({data.holding?.quotaProgressPct || 0}%)
              </span>
            </div>
          </div>
        </div>
      );
    })()}

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
            ? 'bg-gradient-to-r from-violet-800 via-fuchsia-700 to-violet-900 text-white font-semibold shadow-[0_0_16px_rgba(130,58,253,0.4)] border border-violet-400/40'
            : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
        }`}
      >
        <LineChart className="w-4 h-4 text-violet-300" />
        <span>2. Financial Pulse (ตรวจงบ 8Q & กระแสเงินสด)</span>
      </button>

      <button
        onClick={() => setActiveSubTab('thesis')}
        className={`flex-1 py-2.5 px-4 rounded-xl text-[15px] font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
          activeSubTab === 'thesis'
            ? 'bg-gradient-to-r from-violet-800 via-purple-700 to-pink-700 text-white font-semibold shadow-[0_0_16px_rgba(130,58,253,0.4)] border border-violet-400/40'
            : 'text-slate-300 hover:text-white hover:bg-violet-950/40'
        }`}
      >
        <BrainCircuit className="w-4 h-4 text-violet-300" />
        <span>3. 2X Thesis & Moat (เรื่องเล่า & คาดการณ์กี่เด้ง)</span>
      </button>
      </div>

      {/* Pullback DNA Modal */}
      <PullbackDnaModal
        isOpen={showDnaModal}
        onClose={() => setShowDnaModal(false)}
        symbol={data.symbol}
      />
    </div>
  );
};

