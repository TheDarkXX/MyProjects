import React, { useState, useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useHoldings, Holding } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import { Scale, SlidersHorizontal, DollarSign, ArrowRight, Check, Copy, Sparkles, TrendingUp, Scissors, ShieldAlert, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

type RebalanceMode = 'cashflow' | 'matrix' | 'trim';

export const SmartRebalancePage: React.FC = () => {
  const { activePortfolioId, portfolios } = usePortfolioStore();
  const { holdings, cashBalance, totalNetWorth } = useHoldings();
  const { currency, exchangeRate } = useUiStore();
  const { prices } = usePriceStore();

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  // Rebalance Mode
  const [mode, setMode] = useState<RebalanceMode>('cashflow');

  // Mode 1: Cash flow deposit input (in USD)
  const [depositAmountUsd, setDepositAmountUsd] = useState<number>(1000);
  const [selectedStrategy, setSelectedStrategy] = useState<'alpha' | 'lifecycle' | 'equal'>('alpha');
  const [copied, setCopied] = useState<boolean>(false);

  // Mode 2: Custom Target Weights (% per symbol)
  const [customTargets, setCustomTargets] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (holdings.length > 0) {
      const equalShare = Number((100 / holdings.length).toFixed(1));
      holdings.forEach(h => {
        init[h.symbol] = h.weightPercent || equalShare;
      });
    }
    return init;
  });

  // Mode 3: Trim Simulator
  const [trimSymbol, setTrimSymbol] = useState<string>(() => holdings[0]?.symbol || '');
  const [trimShares, setTrimShares] = useState<number>(1);
  const [targetFundSymbol, setTargetFundSymbol] = useState<string>(() => holdings[1]?.symbol || '');

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const formatMoney = (usd: number) => {
    const val = currency === 'THB' ? usd * exchangeRate : usd;
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Sort holdings by value descending
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
  }, [holdings]);

  // Auto-select defaults when holdings load
  React.useEffect(() => {
    if (!trimSymbol && sortedHoldings.length > 0) {
      setTrimSymbol(sortedHoldings[0].symbol);
    }
    if (!targetFundSymbol && sortedHoldings.length > 1) {
      setTargetFundSymbol(sortedHoldings[1].symbol);
    }
  }, [sortedHoldings, trimSymbol, targetFundSymbol]);

  // MODE 1: Cash-Flow Rebalancing Calculation
  const cashflowRecommendations = useMemo(() => {
    if (depositAmountUsd <= 0 || sortedHoldings.length === 0) return [];

    const newTotalVal = totalNetWorth + depositAmountUsd;
    const recommendations: {
      symbol: string;
      stockType: string;
      price: number;
      currentQty: number;
      currentWeight: number;
      targetWeight: number;
      targetVal: number;
      currentVal: number;
      allocatedUsd: number;
      buyShares: number;
      projectedWeight: number;
    }[] = [];

    // Target weights depending on strategy
    const targetWeights: Record<string, number> = {};

    if (selectedStrategy === 'alpha') {
      // Shay Boloor Sweet Spot: Top 1 = 25%, Top 2 = 18%, Top 3 = 15% (Total 58%), others share 42%
      sortedHoldings.forEach((h, idx) => {
        if (idx === 0) targetWeights[h.symbol] = 25;
        else if (idx === 1) targetWeights[h.symbol] = 18;
        else if (idx === 2) targetWeights[h.symbol] = 15;
        else {
          const remainingCount = Math.max(1, sortedHoldings.length - 3);
          targetWeights[h.symbol] = Number((42 / remainingCount).toFixed(1));
        }
      });
    } else if (selectedStrategy === 'lifecycle') {
      // Phase-based targets: Hyper Growth & Compounders get priority
      sortedHoldings.forEach(h => {
        if (h.stockType === 'Core Compounder') targetWeights[h.symbol] = 20;
        else if (h.stockType === 'Hyper Growth' || h.stockType === 'Winner') targetWeights[h.symbol] = 18;
        else if (h.stockType === 'Small Cap') targetWeights[h.symbol] = 8;
        else targetWeights[h.symbol] = 10;
      });
    } else {
      // Equal Weight
      const eq = 100 / sortedHoldings.length;
      sortedHoldings.forEach(h => { targetWeights[h.symbol] = eq; });
    }

    // Calculate deficits (how much $ each stock is below its target in the new enlarged portfolio)
    const deficits = sortedHoldings.map(h => {
      const tgtPct = targetWeights[h.symbol] || 0;
      const tgtVal = (tgtPct / 100) * newTotalVal;
      const currVal = h.currentValue || 0;
      const deficit = Math.max(0, tgtVal - currVal);
      return {
        symbol: h.symbol,
        stockType: h.stockType || 'Core Compounder',
        price: h.lastPrice || h.avgCost || 1,
        currentQty: h.quantity,
        currentWeight: h.weightPercent || 0,
        targetWeight: tgtPct,
        currentVal,
        targetVal: tgtVal,
        deficit,
      };
    });

    const totalDeficit = deficits.reduce((s, d) => s + d.deficit, 0);

    // Allocate the new deposit proportionally to deficits
    deficits.forEach(d => {
      let allocatedUsd = 0;
      if (totalDeficit > 0) {
        allocatedUsd = (d.deficit / totalDeficit) * depositAmountUsd;
      } else {
        allocatedUsd = (d.targetWeight / 100) * depositAmountUsd;
      }

      const buyShares = d.price > 0 ? Number((allocatedUsd / d.price).toFixed(2)) : 0;
      const newVal = d.currentVal + allocatedUsd;
      const projectedWeight = newTotalVal > 0 ? (newVal / newTotalVal) * 100 : 0;

      if (allocatedUsd >= 5) {
        recommendations.push({
          symbol: d.symbol,
          stockType: d.stockType,
          price: d.price,
          currentQty: d.currentQty,
          currentWeight: d.currentWeight,
          targetWeight: d.targetWeight,
          targetVal: d.targetVal,
          currentVal: d.currentVal,
          allocatedUsd,
          buyShares,
          projectedWeight,
        });
      }
    });

    return recommendations.sort((a, b) => b.allocatedUsd - a.allocatedUsd);
  }, [sortedHoldings, depositAmountUsd, totalNetWorth, selectedStrategy]);

  // MODE 2: Target vs Actual Delta Matrix
  const matrixAnalysis = useMemo(() => {
    return sortedHoldings.map(h => {
      const actualPct = h.weightPercent || 0;
      const targetPct = customTargets[h.symbol] ?? actualPct;
      const deltaPct = actualPct - targetPct; // Positive = Overweight, Negative = Underweight
      const targetVal = (targetPct / 100) * totalNetWorth;
      const deltaVal = (h.currentValue || 0) - targetVal;
      const price = h.lastPrice || h.avgCost || 1;
      const sharesGap = Math.abs(deltaVal) / price;

      return {
        symbol: h.symbol,
        stockType: h.stockType || 'Core Compounder',
        price,
        currentVal: h.currentValue || 0,
        actualPct,
        targetPct,
        deltaPct,
        deltaVal,
        sharesGap,
        status: Math.abs(deltaPct) < 1.0 ? 'on_target' : deltaPct > 0 ? 'overweight' : 'underweight',
      };
    });
  }, [sortedHoldings, customTargets, totalNetWorth]);

  // MODE 3: Trim Simulation
  const trimHolding = useMemo(() => holdings.find(h => h.symbol === trimSymbol), [holdings, trimSymbol]);
  const targetHolding = useMemo(() => holdings.find(h => h.symbol === targetFundSymbol), [holdings, targetFundSymbol]);

  const trimProceedsUsd = useMemo(() => {
    if (!trimHolding) return 0;
    return trimShares * (trimHolding.lastPrice || trimHolding.avgCost || 0);
  }, [trimHolding, trimShares]);

  const newFundedShares = useMemo(() => {
    if (!targetHolding || trimProceedsUsd <= 0) return 0;
    const p = targetHolding.lastPrice || targetHolding.avgCost || 1;
    return Number((trimProceedsUsd / p).toFixed(2));
  }, [targetHolding, trimProceedsUsd]);

  const copyBuyingPlan = () => {
    const text = cashflowRecommendations
      .map(r => `• BUY ${r.symbol}: +${r.buyShares} shares (~$${r.allocatedUsd.toFixed(0)})`)
      .join('\n');
    const header = `📋 Cash-Flow Buying Plan (Deposit: $${depositAmountUsd}):\n` + text;
    navigator.clipboard.writeText(header);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[2800px] mx-auto pb-16 space-y-6 px-1">
      {/* 1. Page Header */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#823AFD] via-[#06B6D4] to-[#10B981] flex items-center justify-center shadow-[0_4px_16px_rgba(130,58,253,0.3)]">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Smart Cashflow Rebalancer
              <span className="text-xs px-3 py-1 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-emerald-400 font-bold">
                Tax-Free Optimization
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[#9898C8] mt-1">
              ปรับพอร์ตอัจฉริยะด้วยการเติมเงินใหม่ (Cash-Flow Rebalancing) เข้าสัดส่วนเป้าหมาย โดยไม่ต้องขายหุ้นผู้ชนะ
            </p>
          </div>
        </div>

        {/* 3-Mode Selector */}
        <div className="flex items-center bg-[#1A1D2D] p-1.5 rounded-2xl border border-[#2A2E45] gap-1 self-start xl:self-auto overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setMode('cashflow')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              mode === 'cashflow'
                ? "bg-gradient-to-r from-[#823AFD] to-[#10B981] text-white shadow-md"
                : "text-[#9898C8] hover:text-white"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>1. Cash-Flow Rebalance (เติมเงิน)</span>
          </button>

          <button
            onClick={() => setMode('matrix')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              mode === 'matrix'
                ? "bg-gradient-to-r from-[#823AFD] to-[#06B6D4] text-white shadow-md"
                : "text-[#9898C8] hover:text-white"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>2. Target vs Actual Matrix</span>
          </button>

          <button
            onClick={() => setMode('trim')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              mode === 'trim'
                ? "bg-gradient-to-r from-[#FC2D79] to-[#823AFD] text-white shadow-md"
                : "text-[#9898C8] hover:text-white"
            )}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>3. Smart Trim Simulator</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: CASH-FLOW REBALANCING (DCA INJECTION)            */}
      {/* ======================================================== */}
      {mode === 'cashflow' && (
        <div className="space-y-6">
          {/* Controls Banner */}
          <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Deposit Input */}
              <div className="lg:col-span-6 space-y-3">
                <label className="text-xs font-bold text-[#9898C8] uppercase tracking-wider block">
                  จำนวนเงินที่จะเติมเข้าพอร์ต (New Cash Injection)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-lg">$</span>
                    <input
                      type="number"
                      value={depositAmountUsd}
                      onChange={(e) => setDepositAmountUsd(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-[#161926] border border-[#2A2E45] focus:border-[#10B981] rounded-2xl py-3 pl-10 pr-4 text-2xl font-black text-white tabular-nums outline-none transition-all"
                      placeholder="1000"
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-[#9898C8] block">เทียบเท่าเงินบาท</span>
                    <span className="text-base font-bold text-emerald-400 tabular-nums">
                      ~฿{(depositAmountUsd * exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setDepositAmountUsd(amt)}
                      className={clsx(
                        "px-3 py-1 rounded-xl text-xs font-bold border transition-all",
                        depositAmountUsd === amt
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-[#161926] text-[#9898C8] border-[#2A2E45] hover:text-white"
                      )}
                    >
                      +${amt.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => setDepositAmountUsd(Math.round(50000 / exchangeRate))}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-[#161926] text-[#9898C8] border border-[#2A2E45] hover:text-white"
                  >
                    +50,000 บาท
                  </button>
                </div>
              </div>

              {/* Strategy Preset Selector */}
              <div className="lg:col-span-6 space-y-3">
                <label className="text-xs font-bold text-[#9898C8] uppercase tracking-wider block">
                  โมเดลการจัดสรรที่ต้องการ (Rebalancing Strategy)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setSelectedStrategy('alpha')}
                    className={clsx(
                      "p-3 rounded-2xl border text-left transition-all",
                      selectedStrategy === 'alpha'
                        ? "bg-[#823AFD]/15 border-[#823AFD] text-white shadow-sm"
                        : "bg-[#161926] border-[#2A2E45] text-[#9898C8] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Shay Boloor Alpha</span>
                    </div>
                    <span className="text-[11px] text-[#9898C8] block mt-1 leading-snug">
                      ดัน Top 3 ให้กุมสัดส่วน 55-60% เพื่อเร่งโต
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStrategy('lifecycle')}
                    className={clsx(
                      "p-3 rounded-2xl border text-left transition-all",
                      selectedStrategy === 'lifecycle'
                        ? "bg-[#06B6D4]/15 border-[#06B6D4] text-white shadow-sm"
                        : "bg-[#161926] border-[#2A2E45] text-[#9898C8] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <TrendingUp className="w-3.5 h-3.5 text-[#06B6D4]" />
                      <span>Lifecycle Balanced</span>
                    </div>
                    <span className="text-[11px] text-[#9898C8] block mt-1 leading-snug">
                      กระจายตามระดับการเติบโต 4 เฟส
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedStrategy('equal')}
                    className={clsx(
                      "p-3 rounded-2xl border text-left transition-all",
                      selectedStrategy === 'equal'
                        ? "bg-emerald-500/15 border-emerald-500 text-white shadow-sm"
                        : "bg-[#161926] border-[#2A2E45] text-[#9898C8] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Scale className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Equal Weight</span>
                    </div>
                    <span className="text-[11px] text-[#9898C8] block mt-1 leading-snug">
                      เฉลี่ยสัดส่วนให้เท่ากันทุกตัว
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Buying Plan Cards */}
          <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  คำสั่งเคาะซื้อที่แนะนำ (Recommended Buying Orders)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                    Zero Selling Required
                  </span>
                </h3>
                <p className="text-xs text-[#9898C8]">
                  ระบบคำนวณจำนวนหุ้นที่ควรซื้อเพิ่ม เพื่อดึงสัดส่วนพอร์ตกลับเข้าสู่ Alpha Sweet Spot
                </p>
              </div>

              <button
                onClick={copyBuyingPlan}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A1D2D] hover:bg-[#2A2E45] border border-[#2A2E45] text-white text-xs font-bold rounded-xl transition-all self-start sm:self-auto"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#823AFD]" />}
                <span>{copied ? 'คัดลอกเรียบร้อย!' : 'คัดลอกแผนเคาะซื้อ'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
              {cashflowRecommendations.map((rec) => (
                <div
                  key={rec.symbol}
                  className="bg-[#161926] border border-[#2A2E45] hover:border-[#10B981]/50 rounded-2xl p-5 shadow-sm space-y-4 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#823AFD] to-[#FC2D79] flex items-center justify-center font-black text-white text-sm shadow-sm">
                        {rec.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-base">{rec.symbol}</div>
                        <span className="text-[11px] text-[#9898C8] font-medium">{rec.stockType}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#9898C8] block">ราคาตลาด</span>
                      <span className="text-sm font-bold text-white tabular-nums">${rec.price.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Buying Callout */}
                  <div className="bg-[#1A1D2D] p-3.5 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">คำแนะนำ</span>
                      <div className="text-lg font-black text-white tabular-nums">
                        BUY +{rec.buyShares} หุ้น
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#9898C8] block">งบที่ใช้</span>
                      <div className="text-lg font-black text-emerald-400 tabular-nums">
                        ${rec.allocatedUsd.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Weight Progression Preview */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[#9898C8]">
                      <span>สัดส่วนในพอร์ต:</span>
                      <span>
                        <strong className="text-white">{rec.currentWeight.toFixed(1)}%</strong>
                        {' '}&rarr;{' '}
                        <strong className="text-emerald-400">{rec.projectedWeight.toFixed(1)}%</strong>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#1A1D2D] rounded-full overflow-hidden flex">
                      <div style={{ width: `${Math.min(100, rec.currentWeight)}%` }} className="bg-[#823AFD] h-full" />
                      <div style={{ width: `${Math.min(100, rec.projectedWeight - rec.currentWeight)}%` }} className="bg-emerald-400 h-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: TARGET VS ACTUAL DELTA MATRIX                     */}
      {/* ======================================================== */}
      {mode === 'matrix' && (
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Target vs Actual Allocation Matrix
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-[#06B6D4] font-bold">
                Gap Analysis
              </span>
            </h3>
            <p className="text-xs text-[#9898C8]">
              กำหนดสัดส่วนเป้าหมาย (Target %) ของหุ้นแต่ละตัว และตรวจดูส่วนต่าง Gap ว่าตัวไหนขาดหรือเกิน
            </p>
          </div>

          <div className="overflow-x-auto custom-scrollbar pt-2">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#2A2E45] text-xs text-[#9898C8]">
                  <th className="pb-3 px-4 font-semibold">Asset</th>
                  <th className="pb-3 px-4 font-semibold text-right">Current Value</th>
                  <th className="pb-3 px-4 font-semibold text-right">Actual %</th>
                  <th className="pb-3 px-4 font-semibold text-center w-36">Target %</th>
                  <th className="pb-3 px-4 font-semibold text-right">Target Value</th>
                  <th className="pb-3 px-4 font-semibold text-right">Delta ($ / %)</th>
                  <th className="pb-3 px-4 font-semibold text-center">Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2E45]/60 text-sm">
                {matrixAnalysis.map((item) => (
                  <tr key={item.symbol} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-extrabold text-white flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#161926] border border-[#2A2E45] flex items-center justify-center text-xs">
                        {item.symbol.slice(0, 3)}
                      </div>
                      <span>{item.symbol}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white tabular-nums">
                      {formatMoney(item.currentVal)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-white tabular-nums">
                      {item.actualPct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#161926] border border-[#2A2E45] rounded-xl px-2.5 py-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={item.targetPct}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCustomTargets(prev => ({ ...prev, [item.symbol]: val }));
                          }}
                          className="w-12 bg-transparent text-center font-bold text-white outline-none tabular-nums text-xs"
                        />
                        <span className="text-xs text-[#9898C8]">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#CBD5E1] tabular-nums">
                      {formatMoney((item.targetPct / 100) * totalNetWorth)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span className={clsx("font-bold text-xs px-2 py-0.5 rounded-md inline-block",
                        item.status === 'on_target' ? "bg-emerald-500/15 text-emerald-300" :
                        item.status === 'overweight' ? "bg-blue-500/15 text-blue-300" :
                        "bg-amber-500/15 text-amber-300"
                      )}>
                        {item.deltaPct >= 0 ? '+' : ''}{item.deltaPct.toFixed(1)}% ({item.deltaVal >= 0 ? '+' : ''}{formatMoney(item.deltaVal)})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-semibold">
                      {item.status === 'on_target' && (
                        <span className="text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> On Target
                        </span>
                      )}
                      {item.status === 'underweight' && (
                        <span className="text-amber-400 font-bold">
                          เติม +{item.sharesGap.toFixed(1)} หุ้น
                        </span>
                      )}
                      {item.status === 'overweight' && (
                        <span className="text-blue-400">
                          เกินเป้า {formatMoney(item.deltaVal)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 3: SMART TRIM SIMULATOR                             */}
      {/* ======================================================== */}
      {mode === 'trim' && (
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-lg space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Smart Trim Simulator (จำลองขายทำกำไรตัวใหญ่ไปเติมตัวเล็ก)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold">
                Emergency Rebalance Only
              </span>
            </h3>
            <p className="text-xs text-[#9898C8]">
              ใช้เฉพาะกรณีที่หุ้นตัวใหญ่เริ่ม Over-concentrated เกินเกณฑ์ 35% เพื่อจำลองการขายทำกำไรไปเติมหุ้นตัวอื่น
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Source Stock to Trim */}
            <div className="bg-[#161926] p-5 rounded-2xl border border-[#2A2E45] space-y-4">
              <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider block">
                1. เลือกหุ้นที่จะขายทำกำไร (Trim Source)
              </span>
              
              <div className="flex gap-3">
                <select
                  value={trimSymbol}
                  onChange={(e) => {
                    setTrimSymbol(e.target.value);
                    setTrimShares(1);
                  }}
                  className="bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-2.5 text-white font-bold outline-none flex-1"
                >
                  {sortedHoldings.map(h => (
                    <option key={h.symbol} value={h.symbol}>
                      {h.symbol} (ถือ {h.quantity} หุ้น • {h.weightPercent?.toFixed(1) ?? '0.0'}%)
                    </option>
                  ))}
                </select>
              </div>

              {trimHolding && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-xs text-[#9898C8]">
                    <span>จำนวนหุ้นที่จะ Trim:</span>
                    <strong className="text-white text-sm">{trimShares} หุ้น</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={Math.max(1, Math.floor(trimHolding.quantity))}
                    value={trimShares}
                    onChange={(e) => setTrimShares(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <div className="bg-[#1A1D2D] p-3 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-[#9898C8]">เงินสดที่จะได้รับจากการขาย:</span>
                    <span className="text-lg font-black text-rose-400 tabular-nums">
                      +{formatMoney(trimProceedsUsd)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Destination Stock to Fund */}
            <div className="bg-[#161926] p-5 rounded-2xl border border-[#2A2E45] space-y-4">
              <span className="text-xs font-bold text-[#9898C8] uppercase tracking-wider block">
                2. เลือกหุ้นที่จะนำเงินไปเติม (Destination Asset)
              </span>

              <div className="flex gap-3">
                <select
                  value={targetFundSymbol}
                  onChange={(e) => setTargetFundSymbol(e.target.value)}
                  className="bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-4 py-2.5 text-white font-bold outline-none flex-1"
                >
                  {sortedHoldings.filter(h => h.symbol !== trimSymbol).map(h => (
                    <option key={h.symbol} value={h.symbol}>
                      {h.symbol} ({h.stockType} • {h.weightPercent?.toFixed(1) ?? '0.0'}%)
                    </option>
                  ))}
                </select>
              </div>

              {targetHolding && (
                <div className="space-y-3 pt-2">
                  <div className="bg-[#1A1D2D] p-4 rounded-xl border border-emerald-500/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-[#9898C8]">จำนวนหุ้นที่จะได้เพิ่ม:</span>
                      <span className="text-xl font-black text-emerald-400 tabular-nums">
                        +{newFundedShares} หุ้น
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                      เงินจากการขาย {trimSymbol} ({formatMoney(trimProceedsUsd)}) จะช่วยเพิ่มน้ำหนักให้ {targetHolding.symbol} โดยไม่ต้องควักเงินสดส่วนตัวเพิ่ม
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
