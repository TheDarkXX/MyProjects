import React, { useState, useMemo, useEffect } from 'react';
import { useHoldings } from '../../../hooks/useHoldings';
import { useTransactionStore } from '../../../stores/transactionStore';
import { useBlueprintStore } from '../../../stores/blueprintStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { usePriceStore } from '../../../stores/priceStore';
import { useXChartStore } from '../../../stores/xchartStore';
import { useUiStore } from '../../../stores/uiStore';

import { MyPortKPIHeader, MyPortViewMode } from './MyPortKPIHeader';
import { MyPortM1Pie } from './MyPortM1Pie';
import { MyPortTableView } from './MyPortTableView';
import { MyPortBentoGridView } from './MyPortBentoGridView';
import { MyPortHoldingDrawer } from './MyPortHoldingDrawer';
import { PortfolioSliceItem, SLICE_PALETTE } from './types';

interface MyPortTabProps {
  tabId: string;
}

const VIEW_MODE_STORAGE_KEY = 'xchart_myport_viewmode_v1';

export const MyPortTab: React.FC<MyPortTabProps> = () => {
  const { 
    holdings = [], 
    cashBalance = 0, 
    cashWeight = 0, 
    totalNetWorth = 0, 
    totalPnl = 0, 
    totalPnlPercent = 0,
    todaysProfit = 0,
    todaysProfitPercent = 0,
  } = useHoldings();

  const { transactions, fetchTransactions } = useTransactionStore();
  const { blueprints, fetchBlueprints } = useBlueprintStore();
  const { portfolios, activePortfolioId, setActivePortfolio, fetchPortfolios } = usePortfolioStore();
  const { fetchPrices, fetchExchangeRate, exchangeRate } = usePriceStore();
  const { addTab } = useXChartStore();
  const { currency, setCurrency } = useUiStore();

  // Load saved view mode or default to 'split'
  const [viewMode, setViewMode] = useState<MyPortViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === 'split' || saved === 'table' || saved === 'bento') {
        return saved;
      }
    }
    return 'split';
  });

  const handleSetViewMode = (mode: MyPortViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  };

  // Hover and selection state for two-way sync
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [drawerSymbol, setDrawerSymbol] = useState<string | null>(null);

  // Ensure portfolios are fetched
  useEffect(() => {
    if (portfolios.length === 0) {
      fetchPortfolios();
    }
  }, [portfolios.length, fetchPortfolios]);

  // Auto-select first portfolio if activePortfolioId is null
  useEffect(() => {
    if (portfolios.length > 0 && !activePortfolioId) {
      setActivePortfolio(portfolios[0].id);
    }
  }, [portfolios, activePortfolioId, setActivePortfolio]);

  // Fetch transactions, blueprints, and USD/THB rate for active portfolio
  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
      fetchBlueprints(activePortfolioId);
      fetchExchangeRate('USD', 'THB');
    }
  }, [activePortfolioId, fetchTransactions, fetchBlueprints, fetchExchangeRate]);

  // Handle portfolio switching with clean state reset
  const handleSelectPortfolio = (id: string) => {
    setActivePortfolio(id);
    setDrawerSymbol(null);
    setHoveredSymbol(null);
  };

  // Fetch live market prices for all held symbols
  useEffect(() => {
    const activeSymbols = (holdings || [])
      .map((h) => h.symbol)
      .filter((s) => s && s !== 'CASH');
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
    }
  }, [holdings, fetchPrices]);

  // Transform holdings into M1 Portfolio Slices
  const slices: PortfolioSliceItem[] = useMemo(() => {
    const validHoldings = (holdings || []).filter((h) => h && h.quantity > 0 && h.symbol !== 'CASH');
    const result: PortfolioSliceItem[] = [];

    validHoldings.forEach((h, idx) => {
      const sym = h.symbol.toUpperCase();
      const bp = (blueprints || []).find((b) => b && b.symbol && b.symbol.toUpperCase() === sym);
      const targetWeight = bp ? Number(bp.target_percent) || 0 : 0;
      const actualWeight = h.weightPercent || 0;
      const drift = targetWeight > 0 ? actualWeight - targetWeight : 0;
      const color = SLICE_PALETTE[idx % SLICE_PALETTE.length];

      result.push({
        symbol: sym,
        name: sym,
        category: h.stockType || 'Core',
        quantity: h.quantity,
        avgCost: h.avgCost,
        totalCost: h.totalCost,
        lastPrice: h.lastPrice || h.avgCost,
        dayChangePercent: h.dayChangePercent || 0,
        dayReturn: h.dayReturn || 0,
        currentValue: h.currentValue || 0,
        totalReturn: h.totalReturn || 0,
        totalReturnPercent: h.totalReturnPercent || 0,
        actualWeight,
        targetWeight,
        drift,
        blueprintTargetPrice: bp?.target_price ? Number(bp.target_price) : null,
        blueprintCeilingPrice: bp?.ceiling_price ? Number(bp.ceiling_price) : null,
        blueprintNotes: bp?.notes || undefined,
        color,
        isCash: false,
      });
    });

    // Add cash cushion slice if available
    if (cashBalance > 0) {
      result.push({
        symbol: 'CASH',
        name: 'Cash Cushion',
        category: 'Cash',
        quantity: cashBalance,
        avgCost: 1,
        totalCost: cashBalance,
        lastPrice: 1,
        dayChangePercent: 0,
        dayReturn: 0,
        currentValue: cashBalance,
        totalReturn: 0,
        totalReturnPercent: 0,
        actualWeight: cashWeight,
        targetWeight: 0,
        drift: 0,
        color: '#10B981', // Emerald green for cash
        isCash: true,
      });
    }

    // Sort by actual weight descending
    return result.sort((a, b) => b.actualWeight - a.actualWeight);
  }, [holdings, cashBalance, cashWeight, blueprints]);

  // Quick action: Open candlestick chart tab for a symbol
  const handleOpenChart = (symbol: string) => {
    if (!symbol || symbol === 'CASH') return;
    addTab({ type: 'STOCK', symbol: symbol.toUpperCase(), title: symbol.toUpperCase() });
  };

  const winnersCount = useMemo(() => slices.filter((s) => !s.isCash && s.totalReturnPercent > 0).length, [slices]);
  const losersCount = useMemo(() => slices.filter((s) => !s.isCash && s.totalReturnPercent < 0).length, [slices]);

  const activeDrawerSlice = useMemo(() => {
    if (!drawerSymbol) return undefined;
    return slices.find((s) => s.symbol.toUpperCase() === drawerSymbol.toUpperCase());
  }, [slices, drawerSymbol]);

  const activeDrawerBlueprint = useMemo(() => {
    if (!drawerSymbol) return undefined;
    return (blueprints || []).find((b) => b && b.symbol && b.symbol.toUpperCase() === drawerSymbol.toUpperCase());
  }, [blueprints, drawerSymbol]);

  const rate = exchangeRate || 34.5;
  const totalValueTHB = (totalNetWorth || 0) * rate;

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#0B1220] overflow-hidden relative select-none">
      {/* 1. Executive Top KPI Strip (Connected to Currency & Portfolio Switcher) */}
      <MyPortKPIHeader
        totalNetWorth={totalNetWorth}
        totalValueTHB={totalValueTHB}
        todaysProfit={todaysProfit}
        todaysProfitPercent={todaysProfitPercent}
        totalUnrealizedProfit={totalPnl}
        totalUnrealizedProfitPercent={totalPnlPercent}
        cashBalance={cashBalance}
        cashWeight={cashWeight}
        winnersCount={winnersCount}
        losersCount={losersCount}
        portfolios={portfolios}
        activePortfolioId={activePortfolioId}
        onSelectPortfolio={handleSelectPortfolio}
        viewMode={viewMode}
        onChangeViewMode={handleSetViewMode}
        currency={currency}
        onToggleCurrency={setCurrency}
        exchangeRate={rate}
      />

      {/* 2. Main Canvas View depending on ViewMode */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
        {viewMode === 'split' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden min-h-0 w-full">
            {/* Left: The M1 Finance Interactive Donut Wheel (2/5 of screen = 40%) */}
            <div className="w-full lg:w-[40%] xl:w-[40%] 2xl:w-[40%] h-full overflow-hidden shrink-0 border-r border-slate-800/80">
              <MyPortM1Pie
                slices={slices}
                totalNetWorth={totalNetWorth}
                totalValueTHB={totalValueTHB}
                totalUnrealizedProfit={totalPnl}
                totalUnrealizedProfitPercent={totalPnlPercent}
                todaysProfit={todaysProfit}
                todaysProfitPercent={todaysProfitPercent}
                hoveredSymbol={hoveredSymbol}
                onHoverSymbol={setHoveredSymbol}
                onSelectSymbol={(sym) => setDrawerSymbol(sym)}
                currency={currency}
                exchangeRate={rate}
              />
            </div>

            {/* Right: Slices Holdings Data Grid */}
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
              <MyPortTableView
                slices={slices}
                exchangeRate={rate}
                hoveredSymbol={hoveredSymbol}
                onHoverSymbol={setHoveredSymbol}
                onSelectSymbol={(sym) => setDrawerSymbol(sym)}
                onOpenChart={handleOpenChart}
                currency={currency}
              />
            </div>
          </div>
        )}

        {viewMode === 'table' && (
          <MyPortTableView
            slices={slices}
            exchangeRate={rate}
            hoveredSymbol={hoveredSymbol}
            onHoverSymbol={setHoveredSymbol}
            onSelectSymbol={(sym) => setDrawerSymbol(sym)}
            onOpenChart={handleOpenChart}
            currency={currency}
          />
        )}

        {viewMode === 'bento' && (
          <MyPortBentoGridView
            slices={slices}
            exchangeRate={rate}
            hoveredSymbol={hoveredSymbol}
            onHoverSymbol={setHoveredSymbol}
            onSelectSymbol={(sym) => setDrawerSymbol(sym)}
            onOpenChart={handleOpenChart}
            currency={currency}
          />
        )}
      </div>

      {/* 3. Slide-over Quick Inspect Drawer */}
      <MyPortHoldingDrawer
        symbol={drawerSymbol}
        slice={activeDrawerSlice}
        transactions={transactions}
        blueprint={activeDrawerBlueprint}
        exchangeRate={rate}
        onClose={() => setDrawerSymbol(null)}
        onOpenChart={handleOpenChart}
        currency={currency}
      />
    </div>
  );
};
