import React, { useEffect, useState } from 'react';
import {
  Rocket,
  Target,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Flame,
  ChevronDown,
  ChevronUp,
  Settings,
  DollarSign,
  Wallet,
  ArrowUpRight,
  Plus,
  X,
  Info,
  Layers,
  TrendingUp,
  TrendingDown,
  Coins,
  Landmark,
  Calendar,
  Zap,
  Activity,
  Award,
  Crown,
  Search,
  ExternalLink
} from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useProject2xStore, MilestoneItem } from '../../stores/project2xStore';
import { useUiStore } from '../../stores/uiStore';
import { ProgressRing } from './ProgressRing';
import { MiniSparkline } from './MiniSparkline';
import { TradingViewChart } from './TradingViewChart';

export const Project2xPage: React.FC = () => {
  const { activePortfolioId } = usePortfolioStore();
  const { currency } = useUiStore();
  const {
    selectedTab,
    setSelectedTab,
    dashboard,
    quotas,
    radar,
    recommendation,
    config,
    isLoadingDashboard,
    isLoadingQuotas,
    isLoadingRadar,
    isLoadingRecommendation,
    isSavingConfig,
    calculateRecommendation,
    updateConfig,
    resetQuotas,
    refreshAll
  } = useProject2xStore();

  const [selectedBand, setSelectedBand] = useState<'Conservative' | 'Base' | 'Bull' | 'Auto'>('Base');
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>('NVDA');
  const [watchlistFilter, setWatchlistFilter] = useState<'ALL' | 'Core' | 'Moonshot'>('ALL');
  const [inflowAmountInput, setInflowAmountInput] = useState<string>('35000');
  const [expandedRadarRow, setExpandedRadarRow] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [showSimPanel, setShowSimPanel] = useState<boolean>(false);
  const [simThbInput, setSimThbInput] = useState<string>('35000');

  // Config modal state
  const [cfgGoalThb, setCfgGoalThb] = useState<number>(10000000);
  const [cfgInflowThb, setCfgInflowThb] = useState<number>(35000);
  const [cfgCagr, setCfgCagr] = useState<number>(0.26);
  const [cfgCeiling, setCfgCeiling] = useState<number>(30);
  const [cfgFcdApy, setCfgFcdApy] = useState<number>(4.5);

  useEffect(() => {
    if (activePortfolioId) {
      refreshAll(activePortfolioId);
    }
  }, [activePortfolioId]);

  useEffect(() => {
    if (config) {
      setCfgGoalThb(config.goal_amount_thb);
      setCfgInflowThb(config.monthly_inflow_thb);
      setCfgCagr(config.target_cagr);
      setCfgCeiling(config.max_stock_ceiling_pct);
      setCfgFcdApy(config.fcd_yield_pct);
      setInflowAmountInput(String(config.monthly_inflow_thb || 35000));
    }
  }, [config]);

  // Set default selected stock to first Golden Setup or Buy Zone stock if available
  useEffect(() => {
    if (radar?.rows && radar.rows.length > 0) {
      const buyZoneStock = radar.rows.find(r => r.traffic_light === 'BUY_ZONE');
      if (buyZoneStock && !selectedStockSymbol) {
        setSelectedStockSymbol(buyZoneStock.symbol);
      } else if (!selectedStockSymbol) {
        setSelectedStockSymbol(radar.rows[0].symbol);
      }
    }
  }, [radar]);

  const handleRefresh = () => {
    if (activePortfolioId) {
      refreshAll(activePortfolioId);
    }
  };

  const handleSaveConfig = async () => {
    if (!activePortfolioId) return;
    await updateConfig(activePortfolioId, {
      goal_amount_thb: cfgGoalThb,
      monthly_inflow_thb: cfgInflowThb,
      target_cagr: cfgCagr,
      max_stock_ceiling_pct: cfgCeiling,
      fcd_yield_pct: cfgFcdApy
    });
    setIsConfigModalOpen(false);
  };

  const handleRunInflowCalc = () => {
    if (!activePortfolioId) return;
    const thb = Number(inflowAmountInput) || 35000;
    calculateRecommendation(activePortfolioId, thb);
  };

  const fxRate = dashboard?.fx_rate || 35.0;
  const numInput = parseFloat(inflowAmountInput);
  const inputUsdEquivalent = (!isNaN(numInput) && fxRate > 0) ? numInput / fxRate : 0;

  // Selected stock row for large TradingView chart
  const activeStockRow = radar?.rows.find(r => r.symbol === selectedStockSymbol) || radar?.rows[0];

  // Milestones
  const defaultMilestones: MilestoneItem[] = [
    { year: 1, level: 1, icon: '🥚', name: 'Baby Sprout', thTitle: 'เมล็ดพันธุ์ก้าวแรก', target_thb: 539000, target_usd: Math.round(539000 / fxRate), is_unlocked: false, is_current: true },
    { year: 2, level: 2, icon: '🐣', name: 'Sky Falcon', thTitle: 'เหยี่ยวเวหาติดปีก', target_thb: 1410000, target_usd: Math.round(1410000 / fxRate), is_unlocked: false, is_current: false },
    { year: 3, level: 3, icon: '🦊', name: 'Cyber Fox', thTitle: 'จิ้งจอกสายฟ้าทบต้น', target_thb: 3100000, target_usd: Math.round(3100000 / fxRate), is_unlocked: false, is_current: false },
    { year: 4, level: 4, icon: '🐉', name: 'Star Dragon', thTitle: 'มังกรทะยานฟ้า', target_thb: 5960000, target_usd: Math.round(5960000 / fxRate), is_unlocked: false, is_current: false },
    { year: 5, level: 5, icon: '👑', name: 'Titan King', thTitle: 'ราชาพอร์ตสิบล้าน', target_thb: 10000000, target_usd: Math.round(10000000 / fxRate), is_unlocked: false, is_current: false },
  ];

  const milestones = (dashboard?.milestones && dashboard.milestones.length > 0)
    ? dashboard.milestones
    : defaultMilestones;

  // Current active milestone
  const currentMilestone = milestones.find(m => m.is_current) || milestones[0];
  const prevMilestoneTarget = currentMilestone.level > 1
    ? (milestones[currentMilestone.level - 2]?.target_thb || 0)
    : 0;

  const currentValThb = dashboard?.total_val_thb || 0;
  const currentLevelRange = Math.max(1, currentMilestone.target_thb - prevMilestoneTarget);
  const currentLevelProgress = Math.max(0, Math.min(100, ((currentValThb - prevMilestoneTarget) / currentLevelRange) * 100));

  // Dynamic ETA resolution based on selected band
  const realizedCagr = dashboard?.realized_cagr;
  let activeEtaYears = 4.8;
  let activeEtaDate = 'Dec 2030';
  let activeCagrDisplay = '26%';

  if (selectedBand === 'Auto' && realizedCagr) {
    activeCagrDisplay = `${realizedCagr.cagr_pct}%`;
    const r = Math.max(0.01, realizedCagr.cagr) / 12;
    const pmt = dashboard?.monthly_inflow_thb || 35000;
    const fv = dashboard?.goal_val_thb || 10000000;
    const pv = currentValThb;
    const n = Math.log((fv + pmt / r) / (pv + pmt / r)) / Math.log(1 + r);
    const months = Math.max(1, Math.round(n));
    activeEtaYears = Number((months / 12).toFixed(1));
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);
    const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    activeEtaDate = `${mNames[futureDate.getMonth()]} ${futureDate.getFullYear()}`;
  } else {
    const bandKey = selectedBand === 'Auto' ? 'Base' : selectedBand;
    const etaObj = dashboard?.eta?.[bandKey];
    if (etaObj) {
      activeEtaYears = etaObj.years;
      activeEtaDate = etaObj.targetDate;
      activeCagrDisplay = `${((etaObj.cagr || 0.26) * 100).toFixed(0)}%`;
    }
  }

  const coreQuotas = quotas.filter(q => q.category === 'Core');
  const moonshotQuotas = quotas.filter(q => q.category === 'Moonshot');

  // Filtered watchlist for right panel
  const watchlistRows = (radar?.rows || []).filter(r => {
    if (watchlistFilter === 'ALL') return true;
    return r.category === watchlistFilter;
  });

  return (
    <div className="w-full space-y-8 animate-fade-in-up pb-24 selection:bg-[#00E5FF] selection:text-slate-950 font-sans">
      
      {/* ============================================================ */}
      {/* 1. TOP TITLE & ACTION BAR */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#00E5FF] via-[#2962FF] to-[#823AFD] flex items-center justify-center shadow-[0_8px_30px_rgba(0,229,255,0.3)]">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                Project 2X Autonomous Engine
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Live Quest
              </span>
            </div>
            <p className="text-[13px] text-slate-300 mt-1">
              {currency === 'THB'
                ? `ภารกิจมุ่งเป้า ฿${(dashboard?.goal_val_thb || 10000000).toLocaleString()} (CAGR ${activeCagrDisplay}) • กฎสะสมของเล่น 12 แม่ทัพ • Dime! Ecosystem`
                : `ภารกิจมุ่งเป้า $${Math.round((dashboard?.goal_val_thb || 10000000) / fxRate).toLocaleString()} (CAGR ${activeCagrDisplay}) • กฎสะสมของเล่น 12 แม่ทัพ • Dime! Ecosystem`
              }
            </p>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            className="px-4 py-2.5 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-white/10 text-slate-200 text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer hover:border-cyan-400/50"
            title="Sync Latest Market Data"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isLoadingDashboard || isLoadingRadar ? 'animate-spin' : ''}`} />
            <span>Sync Live</span>
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-white/10 text-slate-200 text-[13px] font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer hover:border-purple-400/50"
            title="Engine Configuration"
          >
            <Settings className="w-4 h-4 text-purple-400" />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. THE GRAND QUEST JOURNEY HERO BANNER */}
      {/* ============================================================ */}
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-[#1A2744]/90 via-[#131722] to-[#1E1730]/90 p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-2xl">
        {/* Glow ambient spots */}
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] bg-cyan-500/20 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] bg-purple-500/20 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          
          {/* Hero Header & Level Progression Status */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Level-Up Journey Progression</span>
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Level {currentMilestone.level}: {currentMilestone.icon} {currentMilestone.name}
                </h2>
                <span className="text-sm font-semibold text-slate-300">
                  ({currentMilestone.thTitle})
                </span>
              </div>
              <p className="text-[13px] text-slate-300 mt-1">
                พอร์ตปัจจุบัน:{' '}
                <strong className="text-white">
                  {currency === 'THB' ? `฿${currentValThb.toLocaleString()}` : `$${(dashboard?.total_val_usd || 0).toLocaleString()}`}
                </strong>{' '}
                · เป้าด่านนี้:{' '}
                <strong className="text-cyan-300">
                  {currency === 'THB' ? `฿${currentMilestone.target_thb.toLocaleString()}` : `$${currentMilestone.target_usd.toLocaleString()}`}
                </strong>{' '}
                · (เหลืออีก ฿{Math.max(0, currentMilestone.target_thb - currentValThb).toLocaleString()} เพื่อปลดล็อกเลเวลถัดไป!)
              </p>
            </div>

            {/* Compound Pace Band Switcher */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0E121B] border border-white/10 self-start lg:self-auto flex-wrap">
              {realizedCagr && (
                <button
                  onClick={() => setSelectedBand('Auto')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedBand === 'Auto'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={`คำนวณจากผลตอบแทนพอร์ตจริง (${realizedCagr.years_investing} ปี, ทุนสุทธิ $${realizedCagr.net_invested_usd})`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ Auto: {realizedCagr.cagr_pct}% (จริง)</span>
                </button>
              )}
              {(['Base', 'Bull', 'Conservative'] as const).map((band) => (
                <button
                  key={band}
                  onClick={() => setSelectedBand(band)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedBand === band
                      ? 'bg-blue-600 text-white shadow-md font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {band === 'Base' ? 'Base 26%' : band === 'Bull' ? 'Bull 32%' : 'Con 20%'}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Progress Energy Capsule Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>ด่านที่ {currentMilestone.level} Progress</span>
                <span className="text-cyan-400 font-extrabold">{currentLevelProgress.toFixed(1)}%</span>
              </span>
              <span>
                รวมทั้งสิ้น: <strong className="text-amber-300">{(dashboard?.progress_percent || 0).toFixed(1)}%</strong> ของเป้า 10M
              </span>
            </div>

            {/* Glowing Energy Capsule */}
            <div className="w-full h-4 rounded-full bg-slate-900/80 p-0.5 border border-white/10 shadow-inner overflow-hidden relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_16px_rgba(0,229,255,0.6)] transition-all duration-1000 relative"
                style={{ width: `${currentLevelProgress}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-pulse" />
              </div>
            </div>
          </div>

          {/* 5-Level Evolution Milestone Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
            {milestones.map((m) => {
              const isDone = m.is_unlocked;
              const isCurrent = m.is_current;

              return (
                <div
                  key={m.year}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                    isCurrent
                      ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_20px_rgba(0,229,255,0.25)] scale-[1.02]'
                      : isDone
                      ? 'bg-amber-500/10 border-amber-400/40'
                      : 'bg-slate-900/40 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{m.icon}</span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      isCurrent
                        ? 'bg-cyan-400 text-slate-950'
                        : isDone
                        ? 'bg-amber-400/20 text-amber-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isDone ? 'COMPLETED' : isCurrent ? '🔥 NOW' : 'LOCKED'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-300">
                      Lv {m.level}: {m.name}
                    </div>
                    <div className="text-base font-black text-white tabular-nums mt-0.5">
                      {currency === 'THB'
                        ? `฿${(m.target_thb / 1000).toFixed(0)}K`
                        : `$${(m.target_usd / 1000).toFixed(1)}K`
                      }
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {m.thTitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key Metrics Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block mb-0.5">Net Worth ({currency})</span>
              <span className="text-base font-black text-white tabular-nums">
                {currency === 'USD'
                  ? `$${(dashboard?.total_val_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : `฿${(dashboard?.total_val_thb || 0).toLocaleString()}`
                }
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-slate-400">Monthly Inflow</span>
                {dashboard?.auto_inflow_thb && (
                  <button
                    onClick={() => setInflowAmountInput(String(dashboard.auto_inflow_thb))}
                    className="text-[11px] font-bold text-cyan-300 hover:underline"
                    title="คลิกเพื่อใช้ค่าที่ตรวจพบจากประวัติฝากจริง"
                  >
                    ใช้ค่าจริง
                  </button>
                )}
              </div>
              <span className="text-base font-black text-cyan-300 tabular-nums">
                ฿{(dashboard?.monthly_inflow_thb || 35000).toLocaleString()}/mo
              </span>
              {dashboard?.auto_inflow_thb && (
                <span className="text-[11px] text-slate-400 block truncate">
                  ⚡ ประวัติจริง: ฿{dashboard.auto_inflow_thb.toLocaleString()}/mo
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block mb-0.5">Dime! Cash / FCD</span>
              <span className="text-base font-black text-amber-300 tabular-nums">
                ${(dashboard?.dime_cash_usd || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-emerald-400 block">
                ~{config?.fcd_yield_pct || 4.5}% APY Earned
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block mb-0.5">Projected ETA ({activeCagrDisplay})</span>
              <span className="text-base font-black text-white tabular-nums">
                {activeEtaYears} Years
              </span>
              <span className="text-[11px] text-cyan-300 block">
                🎯 {activeEtaDate}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PROMINENT VIEW SWITCHER */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-[#1A1D2D] p-1.5 rounded-2xl border border-white/10 overflow-x-auto max-w-full">
          
          {/* Tab 1: Quest Overview */}
          <button
            onClick={() => setSelectedTab('radar')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'radar'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Target className="w-4 h-4 text-cyan-300" />
            <span>🏠 Quest Overview (ภารกิจ & กราฟสด)</span>
            {(dashboard?.active_sell_alerts_count || 0) > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-rose-500 text-white font-black animate-pulse">
                {dashboard?.active_sell_alerts_count} ALERTS
              </span>
            )}
          </button>

          {/* Tab 2: Sticker Album */}
          <button
            onClick={() => setSelectedTab('vault')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'vault'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🧸</span>
            <span>Sticker Album (อัลบั้มสติ๊กเกอร์สะสม 12 ตัว)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-black/40 text-slate-200 font-bold">
              {quotas.length}
            </span>
          </button>

          {/* Tab 3: Inflow Slip */}
          <button
            onClick={() => setSelectedTab('inflow')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'inflow'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>⚡</span>
            <span>Inflow Slip (สลิปคำนวณเติมเงิน Dime)</span>
          </button>

          {/* Tab 4: All-In-One Cockpit */}
          <button
            onClick={() => setSelectedTab('all')}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'all'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 font-black'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-300" />
            <span>📊 All-In-One Cockpit (ดูทั้งหมด)</span>
          </button>
        </div>

        {/* Legend Indicator with Electric Cyan */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-slate-300 font-medium bg-[#1A1D2D] px-4 py-2 rounded-xl border border-white/10">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
            <span className="font-bold text-cyan-300">🔷 BUY ZONE (Cyan)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-amber-300">🟡 WAIT</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-rose-400">🔴 DANGER</span>
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. QUEST OVERVIEW: LARGE TRADINGVIEW CHART (LEFT) + WATCHLIST (RIGHT) */}
      {/* ============================================================ */}
      {(selectedTab === 'radar' || selectedTab === 'all') && (
        <div className="space-y-6">
          
          {/* Sell Alert Banners (if any) */}
          {radar?.sellAlerts && radar.sellAlerts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {radar.sellAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-3 shadow-lg hover:border-rose-500/70 transition-all"
                >
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-rose-400 text-sm">
                        [{alert.layer}] {alert.symbol}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-500 text-white uppercase tracking-wider">
                        Action Required
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-200 mt-1 font-medium leading-snug">
                      {alert.message}
                    </p>
                    <p className="text-[13px] text-slate-300 mt-0.5 leading-snug">
                      (ไทย: {alert.message_th})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2-Panel Layout: Chart on LEFT (65%), Watchlist on RIGHT (35%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT PANEL: Large TradingView Chart */}
            <div className="lg:col-span-8 space-y-4">
              {activeStockRow ? (
                <>
                  <TradingViewChart
                    symbol={activeStockRow.symbol}
                    closes={activeStockRow.sparkline?.closes || []}
                    ema150={activeStockRow.sparkline?.ema150 || []}
                    ema200={activeStockRow.sparkline?.ema200 || []}
                    banker={activeStockRow.banker}
                    currentPrice={activeStockRow.currentPrice}
                    scenario={activeStockRow.scenario}
                    badge={activeStockRow.badge}
                    trafficLight={activeStockRow.traffic_light}
                    distEma150={activeStockRow.distEma150}
                    distEma200={activeStockRow.distEma200}
                    height={380}
                    onAddInflow={() => {
                      setSelectedTab('inflow');
                      if (activePortfolioId) {
                        calculateRecommendation(activePortfolioId, Number(inflowAmountInput) || 35000);
                      }
                    }}
                  />

                  {/* Tactical Rationale under chart */}
                  <div className="p-4 rounded-2xl bg-[#1E222D] border border-white/10 text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-cyan-300">
                      <Info className="w-4 h-4" />
                      <span>คำแนะนำเชิงยุทธวิธีสำหรับ {activeStockRow.symbol}:</span>
                    </div>
                    <p className="text-slate-200 font-medium leading-relaxed">
                      {activeStockRow.reason}
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      (ไทย: {activeStockRow.reason_th})
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-12 rounded-3xl bg-[#1E222D] border border-white/10 text-center text-slate-400">
                  กำลังโหลดข้อมูลกราฟ...
                </div>
              )}
            </div>

            {/* RIGHT PANEL: Interactive Stock Watchlist */}
            <div className="lg:col-span-4 rounded-3xl border border-white/10 bg-[#1A1D2D] p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white text-sm">📋 12 Commanders Watchlist</span>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  {(['ALL', 'Core', 'Moonshot'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setWatchlistFilter(cat)}
                      className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                        watchlistFilter === cat
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Watchlist List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {watchlistRows.map((row) => {
                  const isSelected = selectedStockSymbol === row.symbol;
                  const isBuyZone = row.traffic_light === 'BUY_ZONE';
                  const hasAlert = radar?.sellAlerts.some(a => a.symbol === row.symbol);

                  return (
                    <div
                      key={row.symbol}
                      onClick={() => setSelectedStockSymbol(row.symbol)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-blue-600/20 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                          : 'bg-[#131722]/80 border-white/5 hover:border-white/20 hover:bg-[#1E222D]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base">{row.symbol}</span>
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            row.category === 'Core' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {row.category}
                          </span>
                          {hasAlert && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                              ALERT
                            </span>
                          )}
                        </div>

                        {/* Traffic Light Indicator */}
                        <div className="flex items-center gap-1 text-xs font-bold">
                          {isBuyZone ? (
                            <span className="flex items-center gap-1 text-cyan-300 font-extrabold bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                              <span>🔷</span>
                              <span>BUY</span>
                            </span>
                          ) : row.traffic_light === 'WAIT' ? (
                            <span className="flex items-center gap-1 text-amber-300 font-extrabold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              <span>🟡</span>
                              <span>WAIT</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 font-extrabold bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                              <span>🔴</span>
                              <span>DANGER</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price & Progress Bar */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-slate-200 tabular-nums">
                          ${row.currentPrice.toFixed(2)}
                        </span>
                        <span className="text-slate-400 font-medium">
                          สะสมแล้ว: <strong className="text-white">{row.progress_percent}%</strong>
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            row.progress_percent >= 100
                              ? 'bg-amber-400'
                              : isBuyZone
                              ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, row.progress_percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. STICKER ALBUM (KID-FRIENDLY HOLOGRAPHIC CARD COLLECTION) */}
      {/* ============================================================ */}
      {(selectedTab === 'vault' || selectedTab === 'all') && (
        <div className="space-y-8 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-[#1E222D] border border-white/10 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧸</span>
              <div>
                <h2 className="text-lg font-black text-white">
                  Holographic Sticker Album (อัลบั้มสะสมของเล่น 12 ตัว)
                </h2>
                <p className="text-[13px] text-slate-300 mt-0.5">
                  สะสมสติ๊กเกอร์ของเล่น 12 ชิ้นให้เต็มการ์ด • การ์ดที่เต็ม 100% จะเรืองแสงทองคำสายรุ้ง 🏆
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  if (activePortfolioId && confirm('Reset quotas to standard 12 Project 2X Commander stocks?')) {
                    resetQuotas(activePortfolioId);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#2A2E39] hover:bg-[#363A45] text-slate-200 text-[13px] font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reset to 12 Commanders</span>
              </button>
            </div>
          </div>

          {/* Core Commanders Album */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm uppercase tracking-wider">
              <Crown className="w-4 h-4" />
              <span>CORE COMMANDERS (ทัพหลวงผูกขาดโลก 83%)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {coreQuotas.map((q) => {
                const radarMatch = radar?.rows.find(r => r.symbol === q.symbol);
                const isBuyZone = radarMatch?.traffic_light === 'BUY_ZONE';
                const isLocked = q.progress_percent >= 100 || q.status === 'LOCKED';

                return (
                  <div
                    key={q.id}
                    className={`group relative rounded-3xl p-5 transition-all duration-300 border flex flex-col justify-between overflow-hidden shadow-xl hover:-translate-y-1 ${
                      isLocked
                        ? 'bg-gradient-to-br from-amber-500/20 via-[#1E222D] to-amber-600/20 border-amber-400/60 shadow-[0_0_24px_rgba(255,215,64,0.3)]'
                        : isBuyZone
                        ? 'bg-[#1E222D] border-cyan-400/50 shadow-[0_0_16px_rgba(0,229,255,0.15)]'
                        : 'bg-[#1E222D] border-white/10 hover:border-white/30'
                    }`}
                  >
                    {/* Shimmer overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

                    {/* Card Top */}
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white tracking-tight">
                            {q.symbol}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-white/10 text-slate-200">
                            {q.target_percent}%
                          </span>
                        </div>
                        <span className="text-[13px] text-slate-400 mt-0.5 block">
                          ราคาตลาด: <strong className="text-slate-200">${(radarMatch?.currentPrice || q.base_price).toFixed(2)}</strong>
                        </span>
                      </div>

                      {/* Badge */}
                      <div>
                        {isLocked ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-md shadow-amber-400/40 animate-pulse">
                            <Trophy className="w-3.5 h-3.5" />
                            <span>FULL! 🏆</span>
                          </span>
                        ) : isBuyZone ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 animate-pulse">
                            <span>🔷</span>
                            <span>BUY ZONE</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            🟡 WAIT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Center: Energy Capsule Progress */}
                    <div className="my-5 space-y-2 relative z-10">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">ความคืบหน้าสะสม</span>
                        <span className="text-base font-black text-white tabular-nums">
                          {q.progress_percent.toFixed(1)}%
                        </span>
                      </div>

                      {/* Capsule bar */}
                      <div className="w-full h-3.5 rounded-full bg-slate-900 p-0.5 border border-white/10 overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isLocked
                              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(255,215,64,0.8)]'
                              : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, q.progress_percent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Footer: Tooltip with share details */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 relative z-10">
                      <span>
                        สะสมแล้ว: <strong className="text-white">{q.owned_shares.toFixed(1)}</strong> / {q.target_shares} หุ้น
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTab('inflow');
                          if (activePortfolioId) {
                            calculateRecommendation(activePortfolioId, Number(inflowAmountInput) || 35000);
                          }
                        }}
                        className="text-cyan-400 font-bold hover:underline cursor-pointer"
                      >
                        + เติมเงิน →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Moonshots Album */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm uppercase tracking-wider">
              <Rocket className="w-4 h-4" />
              <span>MOONSHOT ROCKETS (จรวดตัวคูณ 11%)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {moonshotQuotas.map((q) => {
                const radarMatch = radar?.rows.find(r => r.symbol === q.symbol);
                const isBuyZone = radarMatch?.traffic_light === 'BUY_ZONE';
                const isLocked = q.progress_percent >= 100 || q.status === 'LOCKED';

                return (
                  <div
                    key={q.id}
                    className={`group relative rounded-3xl p-5 transition-all duration-300 border flex flex-col justify-between overflow-hidden shadow-xl hover:-translate-y-1 ${
                      isLocked
                        ? 'bg-gradient-to-br from-purple-500/20 via-[#1E222D] to-amber-500/20 border-purple-400/60 shadow-[0_0_24px_rgba(130,58,253,0.3)]'
                        : isBuyZone
                        ? 'bg-[#1E222D] border-cyan-400/50 shadow-[0_0_16px_rgba(0,229,255,0.15)]'
                        : 'bg-[#1E222D] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white tracking-tight">
                            🚀 {q.symbol}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-purple-500/20 text-purple-300">
                            {q.target_percent}%
                          </span>
                        </div>
                        <span className="text-[13px] text-slate-400 mt-0.5 block">
                          ราคาตลาด: <strong className="text-slate-200">${(radarMatch?.currentPrice || q.base_price).toFixed(2)}</strong>
                        </span>
                      </div>

                      {isLocked ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950">
                          FULL! 🏆
                        </span>
                      ) : isBuyZone ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          🔷 BUY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300">
                          🟡 WAIT
                        </span>
                      )}
                    </div>

                    <div className="my-5 space-y-2 relative z-10">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">ความคืบหน้า</span>
                        <span className="text-base font-black text-white tabular-nums">
                          {q.progress_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-3.5 rounded-full bg-slate-900 p-0.5 border border-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
                          style={{ width: `${Math.min(100, q.progress_percent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 relative z-10">
                      <span>{q.owned_shares.toFixed(1)} / {q.target_shares} หุ้น</span>
                      <button
                        onClick={() => {
                          setSelectedTab('inflow');
                          if (activePortfolioId) {
                            calculateRecommendation(activePortfolioId, Number(inflowAmountInput) || 35000);
                          }
                        }}
                        className="text-purple-300 font-bold hover:underline cursor-pointer"
                      >
                        + เติมเงิน →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. INFLOW SLIP & CASH SWEEP */}
      {/* ============================================================ */}
      {(selectedTab === 'inflow' || selectedTab === 'all') && (
        <div className="max-w-4xl mx-auto space-y-6 pt-4">
          <div className="p-6 rounded-3xl bg-[#1E222D] border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                ⚡
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  Dime! Inflow Slip & FCD Cash Sweep
                </h2>
                <p className="text-[13px] text-slate-300">
                  ใส่ยอดเงินที่ต้องการเติมเข้าพอร์ตวันนี้ → ระบบจะสแกนหาตัวที่เข้าจุดช้อนซื้อที่ดีที่สุด หรือสั่งพักเงินใน Dime FCD
                </p>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[13px] font-bold text-slate-300">
                  Deposit Inflow Amount (THB):
                </label>
                {dashboard?.auto_inflow_thb && (
                  <button
                    onClick={() => setInflowAmountInput(String(dashboard.auto_inflow_thb))}
                    className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>⚡ ใช้ประวัติจริง: ฿{dashboard.auto_inflow_thb.toLocaleString()}</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">
                  ฿
                </span>
                <input
                  type="number"
                  value={inflowAmountInput}
                  onChange={(e) => setInflowAmountInput(e.target.value)}
                  placeholder="35000"
                  className="w-full pl-12 pr-4 py-3.5 bg-[#131722] border border-white/10 focus:border-cyan-400 rounded-2xl text-2xl font-black text-white focus:outline-none transition-all tabular-nums"
                />
              </div>

              <div className="flex items-center justify-between text-[13px] text-slate-300 pt-1.5 flex-wrap gap-2">
                <span className="font-semibold">≈ ${inputUsdEquivalent.toFixed(2)} USD (at ฿{fxRate.toFixed(2)} / USD)</span>
                <div className="flex items-center gap-1.5">
                  {[10000, 20000, 35000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setInflowAmountInput(String(amt))}
                      className="px-2.5 py-1 rounded-lg bg-[#2A2E39] hover:bg-[#363A45] text-slate-200 hover:text-white text-[13px] font-bold transition-colors cursor-pointer"
                    >
                      ฿{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleRunInflowCalc}
              disabled={isLoadingRecommendation}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black text-base shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoadingRecommendation ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Analyzing Technical Radar & Quotas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span>Calculate Optimal Inflow Mission</span>
                </>
              )}
            </button>
          </div>

          {/* RECOMMENDATION RESULT CARD */}
          {recommendation && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              
              {/* Golden Setup */}
              {recommendation.type === 'GOLDEN_SETUP' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1E222D] to-[#131722] border-2 border-cyan-400 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-cyan-400 text-slate-950 font-black text-[13px] rounded-bl-xl uppercase tracking-wider">
                    🎯 Prime Golden Setup
                  </div>

                  <div className="text-[13px] font-black uppercase tracking-wider text-cyan-400 mb-1">
                    TODAY'S MISSION RECOMMENDATION
                  </div>

                  <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2 flex-wrap">
                    <span>BUY {recommendation.shares_to_buy} SHARES OF</span>
                    <span className="text-cyan-400 underline decoration-4 underline-offset-4">
                      {recommendation.symbol}
                    </span>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-[#131722] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                    <div>
                      <span className="text-slate-400">Order Price:</span>
                      <div className="text-base font-black text-slate-100 tabular-nums mt-0.5">
                        ${recommendation.price_per_share?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total USD:</span>
                      <div className="text-base font-black text-cyan-300 tabular-nums mt-0.5">
                        ${recommendation.total_usd?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total THB:</span>
                      <div className="text-base font-black text-slate-100 tabular-nums mt-0.5">
                        ฿{recommendation.total_thb?.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Quota Jump:</span>
                      <div className="text-base font-black text-amber-300 tabular-nums mt-0.5">
                        {recommendation.current_progress}% → {recommendation.projected_progress}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5 text-[13px]">
                    <div className="font-bold text-cyan-300">Execution Rationale:</div>
                    <p className="text-slate-200 font-medium">{recommendation.reason}</p>
                    <p className="text-slate-300">(ไทย: {recommendation.reason_th})</p>
                  </div>

                  <div className="mt-4 text-[13px] text-slate-300 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <span>Execute directly on Dime! app via Fractional Shares order ($1 minimum).</span>
                  </div>
                </div>
              )}

              {/* Early Bird */}
              {recommendation.type === 'EARLY_BIRD' && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1E222D] to-[#131722] border-2 border-blue-500 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-blue-600 text-white font-black text-[13px] rounded-bl-xl uppercase tracking-wider">
                    🦅 Early Bird Split
                  </div>

                  <div className="text-[13px] font-black uppercase tracking-wider text-blue-400 mb-1">
                    2-STAGE EARLY BIRD STRATEGY
                  </div>

                  <div className="text-2xl font-black text-white">
                    BUY 25% ({recommendation.shares_to_buy} {recommendation.symbol}) + PARK 75% IN FCD
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-[#131722] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
                    <div>
                      <span className="text-slate-400">Buy Tranche (25%):</span>
                      <div className="text-base font-black text-blue-400 tabular-nums mt-0.5">
                        ${recommendation.buy_usd?.toFixed(2)} ({recommendation.shares_to_buy} shares)
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Park in Dime FCD (75%):</span>
                      <div className="text-base font-black text-amber-300 tabular-nums mt-0.5">
                        ${recommendation.park_fcd_usd?.toFixed(2)} (~{recommendation.fcd_yield_pct}% APY)
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Quota Jump:</span>
                      <div className="text-base font-black text-slate-100 tabular-nums mt-0.5">
                        {recommendation.current_progress}% → {recommendation.projected_progress}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-1.5 text-[13px]">
                    <div className="font-bold text-blue-400">Execution Rationale:</div>
                    <p className="text-slate-200 font-medium">{recommendation.reason}</p>
                    <p className="text-slate-300">(ไทย: {recommendation.reason_th})</p>
                  </div>
                </div>
              )}

              {/* Cash Sweep */}
              {recommendation.type === 'CASH_SWEEP' && (
                <div className="p-6 rounded-3xl bg-[#1E222D] border-2 border-amber-400/40 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-3.5 mb-3">
                    <span className="text-3xl">💤</span>
                    <div>
                      <h3 className="text-xl font-black text-white">
                        No Golden Setup Today — Dime! Cash Sweep
                      </h3>
                      <p className="text-[13px] text-slate-300">
                        หุ้นทุกตัวยังไม่เข้าเงื่อนไขแนวรับ EMA 150/200 • ห้ามไล่ราคาเด็ดขาด
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131722] border border-white/10 my-4">
                    <div className="text-[13px] text-slate-400 font-medium">Recommended Action:</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1 tabular-nums">
                      Park ${recommendation.total_usd?.toFixed(2)} (฿{recommendation.total_thb?.toLocaleString()}) in Dime! FCD
                    </div>
                    <div className="text-[13px] text-slate-300 mt-1">
                      Earn ~{recommendation.fcd_yield_pct}% APY while sitting on your hands and waiting for the market to give a discount.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[13px] text-slate-200 leading-relaxed">
                    (ไทย: {recommendation.reason_th})
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. ALL-IN-ONE COCKPIT: RADAR SCANNER TABLE + SIMULATOR */}
      {/* ============================================================ */}
      {selectedTab === 'all' && (
        <div className="space-y-8 pt-6 border-t border-white/10">
          
          {/* Section: Radar Screener Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1E222D] border border-white/10">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>🎯 Full Technical Radar Matrix Table</span>
              </h2>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  🔷 BUY ZONE
                </span>
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  🟡 WAIT
                </span>
                <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  🔴 DANGER
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#1E222D] shadow-2xl">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-white/10 bg-[#131722] text-slate-300 font-bold uppercase tracking-wider">
                    <th className="p-4">Symbol</th>
                    <th className="p-4">Price</th>
                    <th className="p-4 min-w-[200px]">30-Day Trend (EMA 150/200)</th>
                    <th className="p-4">vs EMA 150</th>
                    <th className="p-4">vs EMA 200</th>
                    <th className="p-4 min-w-[140px]">Banker Flow (0-20)</th>
                    <th className="p-4">Signal & Scenario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {radar?.rows.map((row) => (
                    <tr
                      key={row.symbol}
                      onClick={() => {
                        setSelectedStockSymbol(row.symbol);
                        setSelectedTab('radar');
                      }}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base">{row.symbol}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            row.category === 'Core' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {row.category}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-black text-slate-100 tabular-nums">
                        ${row.currentPrice.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <div className="w-[180px]">
                          <MiniSparkline
                            closes={row.sparkline?.closes || []}
                            ema150={row.sparkline?.ema150 || []}
                            ema200={row.sparkline?.ema200 || []}
                            height={40}
                            showEma={true}
                          />
                        </div>
                      </td>
                      <td className={`p-4 font-bold tabular-nums ${row.distEma150 >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                        {row.distEma150 >= 0 ? `+${row.distEma150}%` : `${row.distEma150}%`}
                      </td>
                      <td className={`p-4 font-bold tabular-nums ${row.distEma200 >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                        {row.distEma200 >= 0 ? `+${row.distEma200}%` : `${row.distEma200}%`}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-amber-300">{row.banker.toFixed(1)}</span>
                        <span className="text-slate-400 text-xs">/20</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                          row.traffic_light === 'BUY_ZONE'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                            : row.traffic_light === 'WAIT'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                        }`}>
                          <span>{row.traffic_light === 'BUY_ZONE' ? '🔷' : row.traffic_light === 'WAIT' ? '🟡' : '🔴'}</span>
                          <span>{row.traffic_light}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Simulator Panel */}
          <div className="p-6 rounded-3xl bg-[#1E222D] border border-white/10 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  🧪 Share Collection Simulator & Rules Explainer
                </h3>
              </div>
              <button
                onClick={() => setShowSimPanel(!showSimPanel)}
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200"
              >
                {showSimPanel ? 'ซ่อนการจำลอง' : 'เปิดการจำลอง'}
              </button>
            </div>

            {showSimPanel && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#131722] border border-white/5">
                    <div className="text-amber-300 font-bold text-sm mb-1">{'1. ล็อกจำนวนหุ้น (P_base)'}</div>
                    <p className="text-[13px] text-slate-300">
                      จำนวนหุ้นเป้าหมายล็อกไว้ตั้งแต่แรก ทำให้ไม่ต้องกังวลเรื่องราคาผันผวน มุ่งมั่นสะสมให้เต็มตู้
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#131722] border border-white/5">
                    <div className="text-cyan-300 font-bold text-sm mb-1">2. ยิงซื้อเฉพาะตัวเซลล์ (Radar)</div>
                    <p className="text-[13px] text-slate-300">
                      เงินเติมใหม่จะถูกปันไปซื้อตัวที่ติดไฟ 🔷 BUY ZONE ก่อนเสมอ ทำให้ได้ต้นทุนต่ำสุด
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#131722] border border-white/5">
                    <div className="text-purple-300 font-bold text-sm mb-1">3. สะสมครบ 100% = LOCKED 🏆</div>
                    <p className="text-[13px] text-slate-300">
                      ตัวที่ครบโควต้าจะหยุดซื้อทันที เงินจะหมุนไปเติมตัวที่ยังขาดจนครบทั้ง 12 ตัว!
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#131722] border border-white/5 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-sm font-bold text-white">ทดสอบจำลองเงินเติม:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm">฿</span>
                    <input
                      type="number"
                      value={simThbInput}
                      onChange={(e) => setSimThbInput(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-xl bg-[#1E222D] border border-white/10 text-white font-bold text-sm"
                      step={5000}
                    />
                    <span className="text-cyan-300 font-bold text-sm">
                      ≈ ${( (Number(simThbInput) || 0) / fxRate ).toFixed(0)} USD
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 8. CONFIG SETTINGS MODAL */}
      {/* ============================================================ */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#1E222D] border border-white/10 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <span>Project 2X Engine Configuration</span>
              </h3>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-[13px]">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Goal Amount (THB):
                </label>
                <input
                  type="number"
                  value={cfgGoalThb}
                  onChange={(e) => setCfgGoalThb(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#131722] border border-white/10 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-bold">
                    Monthly Inflow (THB):
                  </label>
                  {dashboard?.auto_inflow_thb && (
                    <button
                      type="button"
                      onClick={() => setCfgInflowThb(dashboard.auto_inflow_thb!)}
                      className="text-xs font-bold text-cyan-400 hover:underline"
                    >
                      ⚡ ประวัติจริง: ฿{dashboard.auto_inflow_thb.toLocaleString()}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={cfgInflowThb}
                  onChange={(e) => setCfgInflowThb(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#131722] border border-white/10 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Target CAGR (e.g. 0.26 for 26%):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cfgCagr}
                    onChange={(e) => setCfgCagr(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#131722] border border-white/10 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Max Stock Ceiling %:
                  </label>
                  <input
                    type="number"
                    value={cfgCeiling}
                    onChange={(e) => setCfgCeiling(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#131722] border border-white/10 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Dime! FCD Interest Yield (% APY):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cfgFcdApy}
                  onChange={(e) => setCfgFcdApy(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#131722] border border-white/10 rounded-xl text-white font-bold focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[13px] font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-bold transition-all shadow-lg cursor-pointer"
              >
                {isSavingConfig ? 'Saving...' : 'Save & Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
