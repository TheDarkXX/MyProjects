import React, { useEffect, useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useHoldings } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { RiskMetricsCard } from './RiskMetricsCard';
import { UnderwaterDrawdownChart } from '../charts/UnderwaterDrawdownChart';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Activity, Sparkles, Layers } from 'lucide-react';
import clsx from 'clsx';

export interface RiskPageProps {
  showHeader?: boolean;
}

export const RiskPage: React.FC<RiskPageProps> = ({ showHeader = true }) => {
  const { activePortfolioId, portfolios } = usePortfolioStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { historical, fetchPrices, fetchHistorical, fetchExchangeRate, exchangeRate } = usePriceStore();
  const { currency } = useUiStore();
  const { holdings, cashBalance, totalNetWorth, cashWeight, securitiesWeight } = useHoldings();

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);
  const activeSymbols = useMemo(() => holdings.map(h => h.symbol).filter(Boolean), [holdings]);

  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate]);

  useEffect(() => {
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
      fetchPrices(['SPY', 'QQQ']);
      const to = new Date().toISOString().split('T')[0];
      fetchHistorical([...activeSymbols, 'SPY', 'QQQ'], '2023-01-01', to);
    }
  }, [activeSymbols.join(','), fetchPrices, fetchHistorical]);

  // Build daily historical portfolio series for risk calculations
  const seriesData = useMemo(() => {
    const confirmedTxs = transactions
      .filter(t => t.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (confirmedTxs.length === 0) return [];

    const startDate = new Date(new Date(confirmedTxs[0].date).toISOString().split('T')[0]);
    const today = new Date();
    let runningCash = activePortfolio?.initial_cash || 0;
    const runningHoldings: Record<string, number> = {};
    const lastKnownPrices: Record<string, number> = {};

    let twrIndex = 100;
    let previousTotalVal = activePortfolio?.initial_cash || 0;

    const points: { date: string; value: number; portfolioValue: number; spyPrice?: number; twrIndex: number }[] = [];

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      let dailyNetCashFlow = 0;

      const daysTxs = confirmedTxs.filter(t => new Date(t.date).toISOString().split('T')[0] === dateStr);
      daysTxs.forEach(t => {
        const amount = t.amount || 0;
        const price = t.price || 0;
        const fee = t.fee || 0;
        const isCash = t.asset === 'Cash' || t.symbol === 'CASH';

        if (t.type === 'DEPOSIT') {
          runningCash += amount;
          dailyNetCashFlow += amount;
        }
        else if (t.type === 'WITHDRAW') {
          runningCash -= amount;
          dailyNetCashFlow -= amount;
        }
        else if (t.type === 'BUY') {
          if (isCash) {
            runningCash += amount;
            dailyNetCashFlow += amount;
          }
          else {
            runningCash -= (amount * price + fee);
            runningHoldings[t.symbol] = (runningHoldings[t.symbol] || 0) + amount;
            if (price > 0 && !lastKnownPrices[t.symbol]) lastKnownPrices[t.symbol] = price;
          }
        } else if (t.type === 'SELL') {
          if (isCash) {
            runningCash -= amount;
            dailyNetCashFlow -= amount;
          }
          else {
            runningCash += (amount * price - fee);
            runningHoldings[t.symbol] = (runningHoldings[t.symbol] || 0) - amount;
          }
        } else if (t.type === 'DIVIDEND' || t.type === 'INTEREST') {
          runningCash += (amount - fee);
        }
      });

      // Update known prices
      Object.keys(runningHoldings).forEach(sym => {
        const history = historical[sym] || [];
        const pt = history.find(p => p.date === dateStr);
        if (pt && pt.price > 0) lastKnownPrices[sym] = pt.price;
      });

      // SPY price
      const spyHist = historical['SPY'] || [];
      const spyPt = spyHist.find(p => p.date === dateStr);
      const spyPrice = spyPt ? spyPt.price : undefined;

      let securitiesVal = 0;
      Object.entries(runningHoldings).forEach(([sym, qty]) => {
        if (qty > 0) {
          const p = lastKnownPrices[sym] || 0;
          securitiesVal += qty * p;
        }
      });

      const totalVal = runningCash + securitiesVal;
      
      // Calculate TWR (Time-Weighted Return)
      if (previousTotalVal > 0) {
        const dailyReturn = (totalVal - dailyNetCashFlow) / previousTotalVal - 1;
        twrIndex = twrIndex * (1 + dailyReturn);
      } else if (previousTotalVal === 0 && totalVal > 0 && dailyNetCashFlow > 0) {
        twrIndex = 100;
      }

      points.push({
        date: dateStr,
        value: twrIndex, // Core change: use TWR for performance charting instead of absolute value
        portfolioValue: totalVal,
        spyPrice,
        twrIndex,
      });

      previousTotalVal = totalVal;
    }

    return points;
  }, [transactions, activePortfolio, historical]);

  // Concentration metrics
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
  }, [holdings]);

  const top1Holding = sortedHoldings[0];
  const top1Weight = top1Holding?.weightPercent || 0;
  const top3Weight = sortedHoldings.slice(0, 3).reduce((s, h) => s + (h.weightPercent || 0), 0);
  const top5Weight = sortedHoldings.slice(0, 5).reduce((s, h) => s + (h.weightPercent || 0), 0);

  const isTop1Risk = top1Weight > 35;
  const isTop3SweetSpot = top3Weight >= 45 && top3Weight <= 65;

  return (
    <div className="w-full max-w-[2800px] mx-auto pb-16 space-y-6 px-1">
      {/* 1. Page Header */}
      {showHeader && (
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-[#823AFD] to-[#FC2D79] flex items-center justify-center shadow-[0_4px_16px_rgba(244,63,94,0.3)]">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                Risk & Alpha Management Center
                <span className="text-xs px-3 py-1 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-rose-400 font-bold">
                  Level 3 Analytics
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[#9898C8] mt-1">
                ศูนย์ควบคุมความเสี่ยง วัดผลความคุ้มค่าผลตอบแทนเทียบความเสี่ยง (Risk-Adjusted Return) และจุดย่อตัวของพอร์ต
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start xl:self-auto bg-[#1A1D2D] px-4 py-2 rounded-2xl border border-[#2A2E45]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-[#CBD5E1] font-semibold">Active Portfolio:</span>
            <span className="text-xs font-bold text-white">{activePortfolio?.name || 'My Portfolio'}</span>
          </div>
        </div>
      )}

      {/* 2. Top Executive Risk Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
        
        {/* Single Stock Risk (Top 1) */}
        <div className={clsx("bg-[#111418] border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all",
          isTop1Risk ? "border-amber-500/60 bg-amber-500/[0.03]" : "border-[#2A2E45]"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              Single-Stock Max Risk (Top 1)
            </span>
            {isTop1Risk ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white tabular-nums tracking-tight">
              {top1Weight.toFixed(1)}%
            </span>
            <span className="text-xs font-bold text-[#CBD5E1]">
              ({top1Holding?.symbol || 'None'})
            </span>
          </div>
          <span className={clsx("text-xs font-semibold mt-2 block", isTop1Risk ? "text-amber-400" : "text-emerald-400")}>
            {isTop1Risk ? '⚠️ เกินเกณฑ์เตือน 35% (Key-Man Risk)' : '🟢 อยู่ในเกณฑ์ปลอดภัย (< 35%)'}
          </span>
        </div>

        {/* Top 3 Concentration */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              Alpha Sweet Spot (Top 3 Weight)
            </span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white tabular-nums tracking-tight mt-1">
            {top3Weight.toFixed(1)}%
          </div>
          <span className={clsx("text-xs font-semibold mt-2 block", isTop3SweetSpot ? "text-emerald-400" : "text-[#823AFD]")}>
            {isTop3SweetSpot ? '🎯 โฟกัสเฉียบคม (45-65% Shay Boloor)' : top3Weight > 65 ? '⚡ กระจุกตัวสูงมาก (> 65%)' : 'กระจายความเสี่ยง'}
          </span>
        </div>

        {/* Cash Buffer */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              Cash Buffer / กระสุนสำรอง
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white tabular-nums tracking-tight mt-1">
            {cashWeight.toFixed(1)}%
          </div>
          <span className="text-xs text-[#CBD5E1] mt-2 block">
            {cashWeight >= 10 ? 'พร้อมช้อนซื้อเมื่อตลาดปรับฐาน' : 'ใช้เงินเต็มประสิทธิภาพ (Fully Invested)'}
          </span>
        </div>

        {/* Top 5 Core Bedrock */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider">
              Top 5 Core Holdings
            </span>
            <Layers className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="text-3xl font-black text-white tabular-nums tracking-tight mt-1">
            {top5Weight.toFixed(1)}%
          </div>
          <span className="text-xs text-[#06B6D4] font-semibold mt-2 block">
            ฐานรากหลัก {sortedHoldings.slice(0, 5).map(h => h.symbol).join(', ') || '-'}
          </span>
        </div>

      </div>

      {/* 3. Detailed Institutional Risk & Volatility Scorecard */}
      <RiskMetricsCard seriesData={seriesData} />

      {/* 4. Underwater Drawdown Chart */}
      <UnderwaterDrawdownChart seriesData={seriesData} />

      {/* 5. Institutional Risk Rulebook & Philosophy (คู่มือกฎเหล็กการคุมความเสี่ยง) */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-4">
        <h4 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          กฎเหล็กการบริหารความเสี่ยงสไตล์ Solo Investor ระดับโลก
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#CBD5E1]">
          <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
            <strong className="text-white text-sm block mb-1">1. ไม่ปล่อยให้เบอร์ 1 เกิน 35%</strong>
            ต่อให้มั่นใจแค่ไหน หุ้นตัวเดียวไม่ควรเกิน 35% ของพอร์ต เพราะหากเกิด Black Swan หรืองบการเงินไตรมาสผิดพลาด พอร์ตจะไม่พังทลายจนกู้ไม่กลับ
          </div>
          <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
            <strong className="text-white text-sm block mb-1">2. มอง Max Drawdown เป็นโอกาส</strong>
            การย่อตัว -10% ถึง -20% เป็นเรื่องปกติของพอร์ตหุ้นเติบโต ตราบใดที่ Beta และ Sharpe Ratio ยังอยู่ในเกณฑ์ดีเยี่ยม ทุกการย่อตัวคือจังหวะเติมเงิน
          </div>
          <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
            <strong className="text-white text-sm block mb-1">3. รักษา Sharpe Ratio ให้สูงกว่า 1.0</strong>
            การได้ผลตอบแทนเยอะแต่ต้องแลกกับความผันผวนบ้าคลั่งไม่ใช่การลงทุนที่ดี Sharpe &gt; 1.0 ยืนยันว่ากำไรที่ได้มาจากความเฉียบคมของกลยุทธ์ ไม่ใช่การเสี่ยงดวง
          </div>
        </div>
      </div>
    </div>
  );
};
