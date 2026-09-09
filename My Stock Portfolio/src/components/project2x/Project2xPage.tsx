import React, { useEffect, useState, useMemo } from 'react';
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
  ExternalLink,
  ArrowDownUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useProject2xStore, MilestoneItem, RadarRow } from '../../stores/project2xStore';
import { useUiStore } from '../../stores/uiStore';
import { ProgressRing } from './ProgressRing';
import { MiniSparkline } from './MiniSparkline';
import { TradingViewChart } from './TradingViewChart';

type SortKey = 'STATUS' | 'PROGRESS' | 'VALUE' | 'WEIGHT' | 'NAME';
type SortOrder = 'ASC' | 'DESC';
type TableSortColumn = 'SYMBOL' | 'PRICE' | 'WEIGHT' | 'EMA150' | 'EMA200' | 'BANKER' | 'PE' | 'PEG' | 'CAGR' | 'BEAT' | 'STATUS';

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
    backfillStatus,
    isBackfilling,
    fundamentals,
    isLoadingDashboard,
    isLoadingQuotas,
    isLoadingRadar,
    isLoadingRecommendation,
    isSavingConfig,
    calculateRecommendation,
    updateConfig,
    resetQuotas,
    triggerBackfill,
    checkBackfillStatus,
    fetchFundamentalsList,
    updateFundamentalItem,
    refreshAll
  } = useProject2xStore();

  // Default to Auto band (calculated via actual MWRR / Safety Guard)
  const [selectedBand, setSelectedBand] = useState<'Conservative' | 'Base' | 'Bull' | 'Auto'>('Auto');
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>('NVDA');
  const [watchlistFilter, setWatchlistFilter] = useState<'ALL' | 'Core' | 'Moonshot'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('STATUS');
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC');

  // Matrix Table Sorting & Detail Modal
  const [tableSortKey, setTableSortKey] = useState<TableSortColumn>('WEIGHT');
  const [tableSortOrder, setTableSortOrder] = useState<SortOrder>('DESC');
  const [detailModalStock, setDetailModalStock] = useState<RadarRow | null>(null);
  const [stockCagrInputs, setStockCagrInputs] = useState<Record<string, number>>({});

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
    // Save any custom 3Y CAGR overrides for the 12 commander stocks
    for (const [sym, cagr] of Object.entries(stockCagrInputs)) {
      await updateFundamentalItem(activePortfolioId, sym, { expected_cagr_3y: cagr });
    }
    await refreshAll(activePortfolioId);
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
    { year: 1, level: 1, icon: '🥚', name: 'Baby Sprout', thTitle: 'เมล็ดพันธุ์ก้าวแรก', target_thb: 603000, target_usd: Math.round(603000 / fxRate), is_unlocked: false, is_current: true },
    { year: 2, level: 2, icon: '🐣', name: 'Sky Falcon', thTitle: 'เหยี่ยวเวหาติดปีก', target_thb: 1254000, target_usd: Math.round(1254000 / fxRate), is_unlocked: false, is_current: false },
    { year: 3, level: 3, icon: '🦊', name: 'Cyber Fox', thTitle: 'จิ้งจอกสายฟ้าทบต้น', target_thb: 2095000, target_usd: Math.round(2095000 / fxRate), is_unlocked: false, is_current: false },
    { year: 4, level: 4, icon: '🐉', name: 'Star Dragon', thTitle: 'มังกรทะยานฟ้า', target_thb: 3184000, target_usd: Math.round(3184000 / fxRate), is_unlocked: false, is_current: false },
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
  const currentValUsd = dashboard?.total_val_usd || 0;
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

  // Sorted and filtered watchlist rows
  const sortedWatchlistRows = useMemo(() => {
    const list = (radar?.rows || []).filter(r => {
      if (watchlistFilter === 'ALL') return true;
      return r.category === watchlistFilter;
    });

    list.sort((a, b) => {
      let comp = 0;
      if (sortKey === 'STATUS') {
        const rank = (tl: string) => tl === 'BUY_ZONE' ? 1 : tl === 'WAIT' ? 2 : 3;
        comp = rank(a.traffic_light) - rank(b.traffic_light);
        if (comp === 0) comp = b.progress_percent - a.progress_percent;
      } else if (sortKey === 'PROGRESS') {
        comp = b.progress_percent - a.progress_percent;
      } else if (sortKey === 'VALUE') {
        const valA = (a.owned_shares || 0) * a.currentPrice;
        const valB = (b.owned_shares || 0) * b.currentPrice;
        comp = valB - valA;
      } else if (sortKey === 'WEIGHT') {
        comp = b.target_percent - a.target_percent;
      } else if (sortKey === 'NAME') {
        comp = a.symbol.localeCompare(b.symbol);
      }
      return sortOrder === 'ASC' ? comp : -comp;
    });

    return list;
  }, [radar?.rows, watchlistFilter, sortKey, sortOrder]);

  // Sorted Radar Rows for the Inflow Slip & Full Matrix Table
  const sortedRadarRows = useMemo(() => {
    const list = [...(radar?.rows || [])];
    list.sort((a, b) => {
      let comp = 0;
      switch (tableSortKey) {
        case 'SYMBOL':
          comp = a.symbol.localeCompare(b.symbol);
          break;
        case 'PRICE':
          comp = a.currentPrice - b.currentPrice;
          break;
        case 'WEIGHT':
          comp = (a.weight_pct || 0) - (b.weight_pct || 0);
          break;
        case 'EMA150':
          comp = a.distEma150 - b.distEma150;
          break;
        case 'EMA200':
          comp = a.distEma200 - b.distEma200;
          break;
        case 'BANKER':
          comp = a.banker - b.banker;
          break;
        case 'PE': {
          const peA = a.pe_trailing ?? a.pe_forward ?? 999;
          const peB = b.pe_trailing ?? b.pe_forward ?? 999;
          comp = peA - peB;
          break;
        }
        case 'PEG':
          comp = (a.peg_ratio ?? 999) - (b.peg_ratio ?? 999);
          break;
        case 'CAGR':
          comp = (a.expected_cagr ?? 26) - (b.expected_cagr ?? 26);
          break;
        case 'BEAT':
          comp = (a.consecutive_eps_qs ?? 0) - (b.consecutive_eps_qs ?? 0);
          break;
        case 'STATUS': {
          const rank = (tl: string) => tl === 'BUY_ZONE' ? 1 : tl === 'WAIT' ? 2 : 3;
          comp = rank(a.traffic_light) - rank(b.traffic_light);
          break;
        }
      }
      return tableSortOrder === 'ASC' ? comp : -comp;
    });
    return list;
  }, [radar?.rows, tableSortKey, tableSortOrder]);

  // Backfill Polling Effect
  useEffect(() => {
    let interval: any;
    if (isBackfilling && activePortfolioId) {
      interval = setInterval(() => {
        checkBackfillStatus(activePortfolioId);
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBackfilling, activePortfolioId]);

  // Sync initial fundamentals cagr overrides
  useEffect(() => {
    if (fundamentals && fundamentals.length > 0) {
      const map: Record<string, number> = {};
      fundamentals.forEach(f => {
        map[f.symbol] = f.expected_cagr_3y ?? 26.0;
      });
      setStockCagrInputs(prev => ({ ...map, ...prev }));
    }
  }, [fundamentals]);

  const toggleTableSort = (col: TableSortColumn) => {
    if (tableSortKey === col) {
      setTableSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setTableSortKey(col);
      setTableSortOrder(col === 'SYMBOL' ? 'ASC' : 'DESC');
    }
  };

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
                ? `Quest to ฿${(dashboard?.goal_val_thb || 10000000).toLocaleString()} (CAGR ${activeCagrDisplay}) • 12 Commander Stocks • Dime! Ecosystem`
                : `Quest to $${Math.round((dashboard?.goal_val_thb || 10000000) / fxRate).toLocaleString()} (CAGR ${activeCagrDisplay}) • 12 Commander Stocks • Dime! Ecosystem`
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
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] bg-cyan-500/20 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full blur-[100px] bg-purple-500/20 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          
          {/* Level Header & Status */}
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
                Current Net Worth:{' '}
                <strong className="text-white">
                  {currency === 'THB' ? `฿${currentValThb.toLocaleString()}` : `$${currentValUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </strong>{' '}
                · Target:{' '}
                <strong className="text-cyan-300">
                  {currency === 'THB' ? `฿${currentMilestone.target_thb.toLocaleString()}` : `$${currentMilestone.target_usd.toLocaleString()}`}
                </strong>{' '}
                · (Remaining {currency === 'THB' ? `฿${Math.max(0, currentMilestone.target_thb - currentValThb).toLocaleString()}` : `$${Math.max(0, Math.round((currentMilestone.target_thb - currentValThb) / fxRate)).toLocaleString()}`} to Evolution)
              </p>
            </div>

            {/* CAGR Band Selector */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0E121B] border border-white/10 self-start lg:self-auto flex-wrap">
              {realizedCagr && (
                <button
                  onClick={() => setSelectedBand('Auto')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedBand === 'Auto'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={`Actual Portfolio Return (${realizedCagr.years_investing} Yrs, Net Invested $${realizedCagr.net_invested_usd})`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ Auto: {realizedCagr.cagr_pct}% (Actual)</span>
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
                <span>Level {currentMilestone.level} Progress</span>
                <span className="text-cyan-400 font-extrabold">{currentLevelProgress.toFixed(1)}%</span>
              </span>
              <span>
                Total Goal Progress: <strong className="text-amber-300">{(dashboard?.progress_percent || 0).toFixed(1)}%</strong> of 10M
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

          {/* 5-Level Evolution Milestone Cards with Individual XP Bars */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-2">
            {milestones.map((m, idx) => {
              const isDone = m.is_unlocked;
              const isCurrent = m.is_current;
              const prevTgtThb = m.prev_target_thb !== undefined ? m.prev_target_thb : (idx > 0 ? milestones[idx - 1].target_thb : 0);
              const prevTgtUsd = m.prev_target_usd !== undefined ? m.prev_target_usd : Math.round(prevTgtThb / fxRate);
              const rangeThb = Math.max(1, m.target_thb - prevTgtThb);
              const cardXp = isDone ? 100 : currentValThb <= prevTgtThb ? 0 : Math.min(100, ((currentValThb - prevTgtThb) / rangeThb) * 100);

              const remainingThb = Math.max(0, m.target_thb - currentValThb);
              const remainingUsd = Math.max(0, m.target_usd - currentValUsd);

              const targetDisplay = currency === 'THB'
                ? `฿${(m.target_thb / 1000).toFixed(0)}K`
                : `$${(m.target_usd / 1000).toFixed(1)}K`;

              const accumulatedDisplay = currency === 'THB'
                ? `฿${(Math.min(m.target_thb, currentValThb) / 1000).toFixed(1)}K / ฿${(m.target_thb / 1000).toFixed(0)}K`
                : `$${(Math.min(m.target_usd, currentValUsd) / 1000).toFixed(1)}K / $${(m.target_usd / 1000).toFixed(1)}K`;

              const remainingDisplay = currency === 'THB'
                ? `฿${(remainingThb / 1000).toFixed(1)}K`
                : `$${(remainingUsd / 1000).toFixed(1)}K`;

              const nextLevelName = idx < milestones.length - 1 ? milestones[idx + 1].name : 'Titan King';

              return (
                <div
                  key={m.year}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
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
                      isDone
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                        : isCurrent
                        ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isDone ? '🏆 EVOLVED' : isCurrent ? '🔥 IN PROGRESS' : '🔒 LOCKED'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-bold text-slate-300">
                      Lv {m.level}: {m.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold">
                      Goal Target: <span className="text-white font-bold">{targetDisplay}</span>
                    </div>
                    <div className="text-[11px] text-cyan-300 font-bold tabular-nums">
                      Accumulated: {accumulatedDisplay}
                    </div>
                  </div>

                  {/* Individual Evolution XP Bar */}
                  <div className="mt-3 pt-2 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400">XP</span>
                      <span className={isCurrent ? 'text-cyan-300 font-black' : isDone ? 'text-amber-300' : 'text-slate-400'}>
                        {cardXp.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isDone
                            ? 'bg-amber-400'
                            : isCurrent
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(0,229,255,0.8)]'
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${cardXp}%` }}
                      />
                    </div>
                    {isCurrent && remainingThb > 0 && (
                      <p className="text-[10px] text-cyan-300 font-medium leading-tight pt-0.5">
                        ขาดอีก {remainingDisplay} → แปลงร่างเป็น Lv {m.level + 1} ({nextLevelName})!
                      </p>
                    )}
                    {isDone && (
                      <p className="text-[10px] text-amber-300 font-medium leading-tight pt-0.5">
                        สำเร็จแล้ว! เลเวลอัปเรียบร้อย 👑
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key Metrics Pill Bar (Dynamic Currency Toggle) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block mb-0.5">Net Worth ({currency})</span>
              <span className="text-base font-black text-white tabular-nums">
                {currency === 'USD'
                  ? `$${currentValUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `฿${currentValThb.toLocaleString()}`
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
                    title="Use detected average monthly deposit"
                  >
                    Use Auto
                  </button>
                )}
              </div>
              <span className="text-base font-black text-cyan-300 tabular-nums">
                {currency === 'USD'
                  ? `$${Math.round((dashboard?.monthly_inflow_thb || 35000) / fxRate).toLocaleString()}/mo`
                  : `฿${(dashboard?.monthly_inflow_thb || 35000).toLocaleString()}/mo`
                }
              </span>
              {dashboard?.auto_inflow_thb && (
                <span className="text-[11px] text-slate-400 block truncate">
                  ⚡ Auto: {currency === 'USD' ? `$${Math.round(dashboard.auto_inflow_thb / fxRate)}/mo` : `฿${dashboard.auto_inflow_thb.toLocaleString()}/mo`}
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block mb-0.5">Dime! Cash / FCD ({currency})</span>
              <span className="text-base font-black text-amber-300 tabular-nums">
                {currency === 'USD'
                  ? `$${(dashboard?.dime_cash_usd || 0).toFixed(2)}`
                  : `฿${Math.round((dashboard?.dime_cash_usd || 0) * fxRate).toLocaleString()}`
                }
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
            <span>Sticker Album (อัลบั้มสะสมของเล่น 12 ตัว)</span>
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
            <span className="font-bold text-cyan-300">🔷 BUY ZONE</span>
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
      {/* 4. QUEST OVERVIEW: LARGE TRADINGVIEW CHART (LEFT) + COMPACT WATCHLIST (RIGHT) */}
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
            
            {/* LEFT PANEL: Upgraded TradingView Chart with Dates & Banker Sub-Pane */}
            <div className="lg:col-span-8 space-y-4">
              {activeStockRow ? (
                <>
                  <TradingViewChart
                    symbol={activeStockRow.symbol}
                    dates={activeStockRow.sparkline?.dates || []}
                    closes={activeStockRow.sparkline?.closes || []}
                    opens={activeStockRow.sparkline?.opens || []}
                    highs={activeStockRow.sparkline?.highs || []}
                    lows={activeStockRow.sparkline?.lows || []}
                    volumes={activeStockRow.sparkline?.volumes || []}
                    ema50={activeStockRow.sparkline?.ema50 || []}
                    ema150={activeStockRow.sparkline?.ema150 || []}
                    ema200={activeStockRow.sparkline?.ema200 || []}
                    bankerSeries={activeStockRow.sparkline?.bankerSeries || []}
                    hotMoneySeries={activeStockRow.sparkline?.hotMoneySeries || []}
                    retailSeries={activeStockRow.sparkline?.retailSeries || []}
                    bankerMaSeries={activeStockRow.sparkline?.bankerMaSeries || []}
                    banker={activeStockRow.banker}
                    currentPrice={activeStockRow.currentPrice}
                    scenario={activeStockRow.scenario}
                    badge={activeStockRow.badge}
                    trafficLight={activeStockRow.traffic_light}
                    distEma150={activeStockRow.distEma150}
                    distEma200={activeStockRow.distEma200}
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
                      <span>Tactical Playbook for {activeStockRow.symbol}:</span>
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
                  Loading chart data...
                </div>
              )}
            </div>

            {/* RIGHT PANEL: Compact Single-Row Watchlist + Multi-Sorting Bar */}
            <div className="lg:col-span-4 rounded-3xl border border-white/10 bg-[#1A1D2D] p-4 shadow-xl space-y-3">
              
              {/* Header with Title and Category Filter */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 flex-wrap gap-2">
                <span className="font-black text-white text-sm">📋 12 Commanders</span>

                {/* Category Filter Tabs */}
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

              {/* Multi-Sorting Control Bar */}
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[#131722] border border-white/5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Sort:</span>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="bg-[#1E222D] text-slate-200 rounded-lg px-2 py-1 border border-white/10 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="STATUS">Signal Status (Buy first)</option>
                    <option value="PROGRESS">% Progress</option>
                    <option value="VALUE">Market Value</option>
                    <option value="WEIGHT">Target Weight %</option>
                    <option value="NAME">Symbol Name</option>
                  </select>
                </div>

                {/* ASC / DESC Toggle */}
                <button
                  onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                  className="px-2 py-1 rounded-lg bg-[#1E222D] hover:bg-white/10 text-cyan-300 border border-white/10 font-bold flex items-center gap-1 cursor-pointer"
                  title="Toggle Ascending / Descending"
                >
                  {sortOrder === 'ASC' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span>{sortOrder}</span>
                </button>
              </div>

              {/* Single-Row Compact Watchlist Items */}
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {sortedWatchlistRows.map((row) => {
                  const isSelected = selectedStockSymbol === row.symbol;
                  const isBuyZone = row.traffic_light === 'BUY_ZONE';
                  const hasAlert = radar?.sellAlerts.some(a => a.symbol === row.symbol);
                  const ownedVal = (row.owned_shares || 0) * row.currentPrice;

                  return (
                    <div
                      key={row.symbol}
                      onClick={() => setSelectedStockSymbol(row.symbol)}
                      className={`h-12 px-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-blue-600/20 border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                          : 'bg-[#131722]/80 border-white/5 hover:border-white/20 hover:bg-[#1E222D]'
                      }`}
                    >
                      {/* Left: Signal Badge + Symbol + Category */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs" title={row.traffic_light}>
                          {isBuyZone ? '🔷' : row.traffic_light === 'WAIT' ? '🟡' : '🔴'}
                        </span>
                        <span className="font-black text-white text-sm tracking-tight">{row.symbol}</span>
                        <span className={`text-[10px] font-bold px-1 py-0.2 rounded ${
                          row.category === 'Core' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {row.category[0]}
                        </span>
                        {hasAlert && (
                          <span className="text-[9px] font-black px-1 py-0.2 rounded bg-rose-500 text-white animate-pulse">
                            !
                          </span>
                        )}
                      </div>

                      {/* Middle: Progress Bar with % */}
                      <div className="flex-1 max-w-[120px] hidden sm:flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{row.owned_shares.toFixed(1)} sh</span>
                          <span className="font-bold text-white">{row.progress_percent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
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

                      {/* Right: Price & Distance vs EMA */}
                      <div className="text-right flex flex-col items-end">
                        <span className="font-black text-slate-100 text-xs tabular-nums">
                          ${row.currentPrice.toFixed(1)}
                        </span>
                        <span className={`text-[10px] font-semibold tabular-nums ${row.distEma150 >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                          {row.distEma150 >= 0 ? `+${row.distEma150}%` : `${row.distEma150}%`}
                        </span>
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
      {/* 5. STICKER ALBUM (HOLOGRAPHIC CARD COLLECTION) */}
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
                  Collect all 12 toy cards to 100% quota • 100% completed cards glow with Rainbow Gold Shimmer 🏆
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
              <span>CORE COMMANDERS (83% of Portfolio)</span>
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
                          Market: <strong className="text-slate-200">${(radarMatch?.currentPrice || q.base_price).toFixed(2)}</strong>
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
                        <span className="text-slate-300">Progress</span>
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

                    {/* Card Footer: Share details */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 relative z-10">
                      <span>
                        Owned: <strong className="text-white">{q.owned_shares.toFixed(1)}</strong> / {q.target_shares} sh
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
                        + Inflow →
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
              <span>MOONSHOT ROCKETS (11% of Portfolio)</span>
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
                          Market: <strong className="text-slate-200">${(radarMatch?.currentPrice || q.base_price).toFixed(2)}</strong>
                        </span>
                      </div>

                      {isLocked ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-slate-950">
                          FULL! 🏆
                        </span>
                      ) : isBuyZone ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          🔷 BUY
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300">
                          🟡 WAIT
                        </span>
                      )}
                    </div>

                    <div className="my-5 space-y-2 relative z-10">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-300">Progress</span>
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
                      <span>{q.owned_shares.toFixed(1)} / {q.target_shares} sh</span>
                      <button
                        onClick={() => {
                          setSelectedTab('inflow');
                          if (activePortfolioId) {
                            calculateRecommendation(activePortfolioId, Number(inflowAmountInput) || 35000);
                          }
                        }}
                        className="text-purple-300 font-bold hover:underline cursor-pointer"
                      >
                        + Inflow →
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
      {/* ============================================================ */}
      {/* 6. INFLOW SLIP, CASH SWEEP & FULL RADAR MATRIX TABLE */}
      {/* ============================================================ */}
      {(selectedTab === 'inflow' || selectedTab === 'all') && (
        <div className="w-full space-y-8 pt-4">
          
          {/* Top: Inflow Slip & Recommendation Card (Centered) */}
          <div className="max-w-4xl mx-auto space-y-6">
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
                    Enter planned deposit amount → Autonomous Engine recommends Golden Setup or Dime! FCD Sweep
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
                      className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>⚡ Use Auto: ฿{dashboard.auto_inflow_thb.toLocaleString()}</span>
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
                          All stocks trading above EMA 150/200 buy zone • Sitting on hands and collecting high yield
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#131722] border border-white/10 my-4">
                      <div className="text-[13px] text-slate-400 font-medium">Recommended Action:</div>
                      <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1 tabular-nums">
                        Park ${recommendation.total_usd?.toFixed(2)} (฿{recommendation.total_thb?.toLocaleString()}) in Dime! FCD
                      </div>
                      <div className="text-[13px] text-slate-300 mt-1">
                        Earn ~{recommendation.fcd_yield_pct}% APY while waiting for discounts.
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

          {/* ============================================================ */}
          {/* FULL TECHNICAL & FUNDAMENTAL RADAR MATRIX TABLE */}
          {/* ============================================================ */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-[#1E222D] border border-white/10">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎯 Full Technical & Fundamental Radar Matrix</span>
                </h2>
                <p className="text-[13px] text-slate-300 mt-0.5">
                  Click any row to open detail modal • Click headers to sort ASC/DESC • Click Chart to open Live Quest
                </p>
              </div>
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
                  <tr className="border-b border-white/10 bg-[#131722] text-slate-300 font-bold uppercase tracking-wider select-none">
                    <th onClick={() => toggleTableSort('SYMBOL')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Symbol</span>
                        {tableSortKey === 'SYMBOL' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('PRICE')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Price</span>
                        {tableSortKey === 'PRICE' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th className="p-3.5 min-w-[140px]">30D Trend</th>
                    <th onClick={() => toggleTableSort('WEIGHT')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>สัดส่วน (Weight)</span>
                        {tableSortKey === 'WEIGHT' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('EMA150')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>vs EMA150</span>
                        {tableSortKey === 'EMA150' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('EMA200')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>vs EMA200</span>
                        {tableSortKey === 'EMA200' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('BANKER')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Banker</span>
                        {tableSortKey === 'BANKER' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('PE')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>P/E</span>
                        {tableSortKey === 'PE' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('PEG')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>PEG</span>
                        {tableSortKey === 'PEG' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('CAGR')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>CAGR 3Y</span>
                        {tableSortKey === 'CAGR' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('BEAT')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>กำไร Q</span>
                        {tableSortKey === 'BEAT' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th onClick={() => toggleTableSort('STATUS')} className="p-3.5 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Signal</span>
                        {tableSortKey === 'STATUS' && (tableSortOrder === 'ASC' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />)}
                      </div>
                    </th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedRadarRows.map((row) => {
                    const isBuy = row.traffic_light === 'BUY_ZONE';
                    const isWait = row.traffic_light === 'WAIT';
                    return (
                      <tr
                        key={row.symbol}
                        onClick={() => setDetailModalStock(row)}
                        className="hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">{row.symbol}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                              row.category === 'Core' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                            }`}>
                              {row.category[0]}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-black text-slate-100 tabular-nums">
                          ${row.currentPrice.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          <div className="w-[120px]">
                            <MiniSparkline
                              closes={row.sparkline?.closes || []}
                              ema150={row.sparkline?.ema150 || []}
                              ema200={row.sparkline?.ema200 || []}
                              height={32}
                              showEma={true}
                            />
                          </div>
                        </td>
                        <td className="p-3.5 tabular-nums">
                          <div className="font-bold text-white text-xs">
                            {row.weight_pct}%
                            <span className="text-slate-400 font-normal text-[11px]"> / {row.target_percent}%</span>
                          </div>
                          <div className="w-16 h-1 rounded-full bg-slate-800 mt-1 overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 rounded-full"
                              style={{ width: `${Math.min(100, (row.weight_pct / Math.max(1, row.target_percent)) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className={`p-3.5 font-bold tabular-nums ${row.distEma150 >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                          {row.distEma150 >= 0 ? `+${row.distEma150}%` : `${row.distEma150}%`}
                        </td>
                        <td className={`p-3.5 font-bold tabular-nums ${row.distEma200 >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                          {row.distEma200 >= 0 ? `+${row.distEma200}%` : `${row.distEma200}%`}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-amber-300">{row.banker.toFixed(1)}</span>
                          <span className="text-slate-400 text-xs">/20</span>
                        </td>
                        <td className="p-3.5 text-slate-200 tabular-nums font-semibold">
                          {row.pe_trailing ? row.pe_trailing.toFixed(1) : (row.pe_forward ? `${row.pe_forward.toFixed(1)}f` : '—')}
                        </td>
                        <td className="p-3.5 tabular-nums font-semibold">
                          {row.peg_ratio ? (
                            <span className={row.peg_ratio < 1.5 ? 'text-emerald-400 font-bold' : row.peg_ratio < 2.5 ? 'text-amber-300' : 'text-slate-300'}>
                              {row.peg_ratio.toFixed(2)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-3.5 text-amber-300 font-black tabular-nums">
                          {row.expected_cagr ?? 26}%
                        </td>
                        <td className="p-3.5 text-purple-300 font-semibold tabular-nums">
                          {row.consecutive_eps_qs > 0 ? `🔥 ${row.consecutive_eps_qs} Qs` : '—'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                            isBuy
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                              : isWait
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                          }`}>
                            <span>{isBuy ? '🔷' : isWait ? '🟡' : '🔴'}</span>
                            <span>{row.traffic_light}</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedStockSymbol(row.symbol);
                                setSelectedTab('radar');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-bold border border-cyan-500/30 transition-all flex items-center gap-1 cursor-pointer"
                              title="Open in Quest Live Chart"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>Chart</span>
                            </button>
                            <button
                              onClick={() => setDetailModalStock(row)}
                              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                              title="View Full Fundamentals"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend Box */}
            <div className="p-4 rounded-2xl bg-[#131722] border border-white/10 space-y-2 text-[13px]">
              <div className="font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>คำจำกัดความสัญญาณ Radar & Scenarios (Signal Definitions):</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300 mt-2">
                <div className="p-3 rounded-xl bg-[#1E222D] border border-cyan-500/20 space-y-1">
                  <div className="font-black text-cyan-300 flex items-center gap-1.5">
                    <span>🔷 BUY ZONE (โซนทยอยสะสม)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ราคาลงมาแตะหรือต่ำกว่า EMA 150 / EMA 200 หรือเข้าเกณฑ์ Oversold พร้อม Banker Flow สะสม เป็นจุดเข้าซื้อตามโควต้าที่มีความคุ้มค่าสูงสุด
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#1E222D] border border-amber-500/20 space-y-1">
                  <div className="font-black text-amber-300 flex items-center gap-1.5">
                    <span>🟡 WAIT (โซนเฝ้ารอ / ชะลอซื้อ)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ราคาลอยตัวสูงกว่าเส้นค่าเฉลี่ย หรือพอร์ตถือครองใกล้เต็มเป้าหมาย แนะนำให้อยู่เฉยๆ หรือปันเงินไปพักใน Dime! FCD รับดอกเบี้ย ~4.5% APY
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#1E222D] border border-rose-500/20 space-y-1">
                  <div className="font-black text-rose-400 flex items-center gap-1.5">
                    <span>🔴 DANGER / CEILING (ความเสี่ยงสูง / ชนเพดาน)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    สัดส่วนหุ้นตัวนี้ทะลุเพดานปลอดภัยของพอร์ต (&gt;30%) หรือราคาหลุดแนวรับรุนแรงพร้อมเงินไหลออก ห้ามซื้อเพิ่มเพื่อป้องกันความเสี่ยง
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 7. ALL TAB: SIMULATOR PANEL */}
      {/* ============================================================ */}
      {selectedTab === 'all' && (
        <div className="space-y-6 pt-6 border-t border-white/10">
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
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 cursor-pointer"
              >
                {showSimPanel ? 'Hide Simulator' : 'Show Simulator'}
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
      {/* ============================================================ */}
      {/* 8. CONFIG SETTINGS MODAL */}
      {/* ============================================================ */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl bg-[#1E222D] border border-white/10 p-6 shadow-2xl space-y-6">
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
                      className="text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
                    >
                      ⚡ Auto: ฿{dashboard.auto_inflow_thb.toLocaleString()}
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

              {/* 10-Year Historical Data Lake Backfill Section */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <label className="block text-white font-bold">
                  📥 10-Year Historical Data Lake (Staggered Queue)
                </label>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Populate local SQLite lake with up to 10 years of OHLCV daily candle data for all 12 Commander stocks. Uses rate-limit protected queue (2 concurrent, 3s delay).
                </p>
                {isBackfilling ? (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Backfilling in progress: {backfillStatus?.current_symbol || 'Loading...'}
                      </span>
                      <span>{backfillStatus?.completed || 0} / {backfillStatus?.total || 12} stocks</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round(((backfillStatus?.completed || 0) / Math.max(1, backfillStatus?.total || 12)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#131722] border border-white/5 flex-wrap gap-3">
                    <div>
                      <span className="text-slate-200 font-bold block">Status: {backfillStatus?.status === 'COMPLETED' ? '✅ All 12 Stocks Cached' : 'Ready to Backfill'}</span>
                      <span className="text-xs text-slate-400">
                        {backfillStatus ? `${backfillStatus.completed}/${backfillStatus.total} stocks processed` : 'Full OHLCV 10-year depth in SQLite'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (activePortfolioId) {
                          triggerBackfill(activePortfolioId, 10);
                        }
                      }}
                      disabled={isBackfilling}
                      className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Backfill 10Y History</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 12 Commander Expected 3Y CAGR Overrides */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <label className="block text-white font-bold">
                  📊 Expected 3Y CAGR per Commander Stock (%)
                </label>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Fine-tune expected 3-year compound growth rates. Affects forward portfolio CAGR & milestone ETA calculation.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {(radar?.rows || []).map((r) => (
                    <div key={r.symbol} className="p-2.5 rounded-xl bg-[#131722] border border-white/5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs block">{r.symbol}</span>
                        <span className="text-[11px] text-slate-400 block">${r.currentPrice.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          value={stockCagrInputs[r.symbol] ?? (r.expected_cagr || 26)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setStockCagrInputs(prev => ({ ...prev, [r.symbol]: isNaN(val) ? 26 : val }));
                          }}
                          className="w-14 px-1.5 py-1 bg-[#1E222D] border border-white/10 rounded-lg text-amber-300 font-bold text-xs text-right focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-slate-400 text-xs">%</span>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* ============================================================ */}
      {/* 9. STOCK DETAIL MODAL (WITH MINI CHART & VALUATION STATS) */}
      {/* ============================================================ */}
      {detailModalStock && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-[#1A1D2D] border border-white/15 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 flex items-center justify-center text-white font-black text-xl">
                  {detailModalStock.symbol}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{detailModalStock.symbol}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      detailModalStock.category === 'Core' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {detailModalStock.category} Commander
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1 ${
                      detailModalStock.traffic_light === 'BUY_ZONE'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : detailModalStock.traffic_light === 'WAIT'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      <span>{detailModalStock.traffic_light === 'BUY_ZONE' ? '🔷' : detailModalStock.traffic_light === 'WAIT' ? '🟡' : '🔴'}</span>
                      <span>{detailModalStock.traffic_light}</span>
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-300 mt-0.5">
                    Market Price: <strong className="text-white">${detailModalStock.currentPrice.toFixed(2)}</strong> · Weight: <strong className="text-cyan-300">{detailModalStock.weight_pct}%</strong> (Target {detailModalStock.target_percent}%)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalStock(null)}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mini Trend Preview (200x80) */}
            <div className="p-4 rounded-2xl bg-[#131722] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">30-Day Trend vs EMAs</span>
                <div className="text-sm font-semibold text-slate-200">
                  EMA 150: <span className={detailModalStock.distEma150 >= 0 ? 'text-cyan-300' : 'text-rose-400'}>{detailModalStock.distEma150 >= 0 ? `+${detailModalStock.distEma150}%` : `${detailModalStock.distEma150}%`}</span>
                  {' · '}
                  EMA 200: <span className={detailModalStock.distEma200 >= 0 ? 'text-cyan-300' : 'text-rose-400'}>{detailModalStock.distEma200 >= 0 ? `+${detailModalStock.distEma200}%` : `${detailModalStock.distEma200}%`}</span>
                </div>
              </div>
              <div className="w-[200px] h-[80px] bg-[#0E121B] rounded-xl p-1 border border-white/5 flex items-center justify-center">
                <MiniSparkline
                  closes={detailModalStock.sparkline?.closes || []}
                  ema150={detailModalStock.sparkline?.ema150 || []}
                  ema200={detailModalStock.sparkline?.ema200 || []}
                  height={70}
                  showEma={true}
                />
              </div>
            </div>

            {/* Valuation & Fundamentals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
              <div className="p-3 rounded-xl bg-[#131722] border border-white/5">
                <span className="text-slate-400 text-xs block">P/E (Trailing)</span>
                <span className="text-base font-black text-slate-100 mt-0.5 block tabular-nums">
                  {detailModalStock.pe_trailing ? detailModalStock.pe_trailing.toFixed(1) : (detailModalStock.pe_forward ? `${detailModalStock.pe_forward.toFixed(1)}f` : 'N/A')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#131722] border border-white/5">
                <span className="text-slate-400 text-xs block">PEG Ratio</span>
                <span className="text-base font-black text-cyan-300 mt-0.5 block tabular-nums">
                  {detailModalStock.peg_ratio ? detailModalStock.peg_ratio.toFixed(2) : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#131722] border border-white/5">
                <span className="text-slate-400 text-xs block">Exp CAGR 3Y</span>
                <span className="text-base font-black text-amber-300 mt-0.5 block tabular-nums">
                  {detailModalStock.expected_cagr ?? 26}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#131722] border border-white/5">
                <span className="text-slate-400 text-xs block">EPS Beat Streak</span>
                <span className="text-base font-black text-purple-300 mt-0.5 block tabular-nums">
                  {detailModalStock.consecutive_eps_qs > 0 ? `🔥 ${detailModalStock.consecutive_eps_qs} Qs` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Engine Rationale */}
            <div className="p-4 rounded-2xl bg-[#131722] border border-white/10 space-y-2 text-[13px]">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>Autonomous Execution Rationale</span>
                <span>Banker Flow: {detailModalStock.banker.toFixed(1)}/20</span>
              </div>
              <p className="text-slate-200 leading-relaxed font-medium">
                {detailModalStock.reason}
              </p>
              <p className="text-slate-300 leading-relaxed">
                (ไทย: {detailModalStock.reason_th})
              </p>
            </div>

            {/* Footer & Cross-Tab Jump Button */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => setDetailModalStock(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[13px] font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedStockSymbol(detailModalStock.symbol);
                  setSelectedTab('radar');
                  setDetailModalStock(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-[13px] font-black shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Activity className="w-4 h-4" />
                <span>🔍 View in Live Interactive Chart</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
