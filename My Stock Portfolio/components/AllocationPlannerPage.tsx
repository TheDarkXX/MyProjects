import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Portfolio, Transaction, TransactionStockType, SupabaseLatestPrice } from '../types';
import Sidebar from './Sidebar';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector, Tooltip } from 'recharts';


// --- Type Definitions ---
type AllocationCategory = 'Compounder' | 'Growth' | 'Bet' | 'Cash';
type SettingsTab = 'mainAllocation' | 'stockCategorization' | 'secondaryAllocation';

interface Allocation {
  Compounder: number;
  Growth: number;
  Bet: number;
  Cash: number;
}

interface StockCategory {
  symbol: string;
  name: string;
  category: AllocationCategory | null;
  initialCategory: AllocationCategory | null; // The auto-detected or previously saved category
}

interface AllocationPreset {
  id: string;
  name: string;
  description: string;
  main_allocation: Allocation;
}

interface BuyingPlanItem {
    symbol: string;
    category: AllocationCategory;
    shares: number;
    price: number;
    cost: number;
    name: string;
}

interface StockGapAnalysisItem {
    symbol: string;
    name: string;
    currentValue: number;
    currentPctInCategory: number;
    targetPctInCategory: number;
    targetValue: number;
    gapValue: number;
}


interface GapAnalysisItem {
    category: AllocationCategory;
    currentValue: number;
    currentPct: number;
    targetPct: number;
    targetValue: number;
    gap: number;
    gapPct: number;
    stocks: StockGapAnalysisItem[];
}

interface GapAnalysis {
    categoryGaps: GapAnalysisItem[];
    portfolioTotal: number;
}


interface AllocationPlannerPageProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  setNotification: (message: string, type: 'success' | 'error') => void;
  latestPrices: Record<string, SupabaseLatestPrice>;
  currency: 'USD' | 'THB';
  exchangeRate: number;
  onBulkSaveTransactions: (txs: (Omit<Transaction, 'id'> & { id?: string })[]) => Promise<void>;
  onNavChange: (page: string) => void;
}

const CATEGORIES: AllocationCategory[] = ['Compounder', 'Growth', 'Bet', 'Cash'];
const CATEGORY_COLORS: Record<AllocationCategory, string> = {
  Compounder: '#3B82F6', // blue
  Growth: '#22C55E',     // green
  Bet: '#F59E0B',        // orange
  Cash: '#64748B',       // gray
};

const isAllocationCategory = (key: string): key is AllocationCategory => {
    return CATEGORIES.includes(key as AllocationCategory);
};

const AllocationPlannerPage: React.FC<AllocationPlannerPageProps> = ({ portfolios, selectedPortfolioId, setSelectedPortfolioId, setNotification, latestPrices, currency, exchangeRate, onBulkSaveTransactions, onNavChange }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isDataReady, setIsDataReady] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<AllocationCategory>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [watchList, setWatchList] = useState<Record<string, { hasAlert: boolean; targetPrice?: string }>>({});

    // Data states
    const [dbMainAllocation, setDbMainAllocation] = useState<Allocation | null>(null);
    const [dbStockCategories, setDbStockCategories] = useState<Map<string, AllocationCategory>>(new Map());
    const [dbSecondaryAllocation, setDbSecondaryAllocation] = useState<Record<string, Record<string, number>>>({});
    const [needToBuyStocks, setNeedToBuyStocks] = useState<{symbol: string, category: string, targetValue?: number, targetPercent?: number}[]>([]);
    const [loadingNeedToBuy, setLoadingNeedToBuy] = useState(true);
    const [activeTab, setActiveTab] = useState('main');
    const [editAllocation, setEditAllocation] = useState<Allocation>({
      Compounder: 0,
      Growth: 0,
      Bet: 0,
      Cash: 0
    });
    const [editCategories, setEditCategories] = useState<Record<string, string>>({});
    const [editWeights, setEditWeights] = useState<Record<string, Record<string, number>>>({});

    const activePortfolio = useMemo(() => portfolios.find(p => p.id === selectedPortfolioId), [portfolios, selectedPortfolioId]);

    function handleSetPriceAlert(symbol: string) {
        const price = prompt(`Set target price for ${symbol}:`)
        if (price && !isNaN(parseFloat(price))) {
            setWatchList(prev => ({
            ...prev,
            [symbol]: { hasAlert: true, targetPrice: price }
            }))
            alert(`Alert set for ${symbol} at $${price}`)
        }
    }

    function handleAddToWatch(symbol: string) {
        setWatchList(prev => ({
            ...prev,
            [symbol]: { hasAlert: false }
        }))
        alert(`${symbol} added to watch list`)
    }

    const formatCurrency = (value: number) => {
        if (isNaN(value)) return '--';
        const rate = currency === 'THB' ? exchangeRate : 1;
        const options: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: currency,
        };
        if (currency === 'THB') {
            options.minimumFractionDigits = 0;
            options.maximumFractionDigits = 0;
        } else {
            options.minimumFractionDigits = 2;
            options.maximumFractionDigits = 2;
        }
        return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', options).format(value * rate);
    };

    const resetPlanner = () => {
        setIsDataReady(false);
        setDbMainAllocation(null);
        setDbStockCategories(new Map());
        setDbSecondaryAllocation({});
        setExpandedCategories(new Set());
    };

    const toggleCategory = (category: AllocationCategory) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    useEffect(() => {
        if (!selectedPortfolioId) {
            resetPlanner();
            setInitialLoading(false);
            return;
        }
        
        setInitialLoading(true);
        const loadData = async () => {
            resetPlanner();
            try {
                const [allocationsRes, stockCategoriesRes] = await Promise.all([
                    supabase.from('portfolio_allocations').select('main_allocation, secondary_allocation').eq('portfolio_id', selectedPortfolioId).single(),
                    supabase.from('stock_allocations').select('symbol, category').eq('portfolio_id', selectedPortfolioId)
                ]);

                if (allocationsRes.data) {
                    const data = allocationsRes.data as Record<string, unknown>;
                    if (data.main_allocation) {
                        try {
                            const mainAllocRaw = typeof data.main_allocation === 'string'
                                ? JSON.parse(data.main_allocation)
                                : data.main_allocation;
            
                            if (mainAllocRaw && typeof mainAllocRaw === 'object' && !Array.isArray(mainAllocRaw)) {
                                const mainAllocObj = mainAllocRaw as Record<string, unknown>;
                                const getNum = (v: unknown) => typeof v === 'number' ? v : 0;
                                const mainAlloc: Allocation = {
                                    Compounder: getNum(mainAllocObj['Compounder']),
                                    Growth: getNum(mainAllocObj['Growth']),
                                    Bet: getNum(mainAllocObj['Bet']),
                                    Cash: getNum(mainAllocObj['Cash']),
                                };
                                setDbMainAllocation(mainAlloc);
                            }
                        } catch (e) {
                            console.error("Failed to parse main_allocation", e);
                        }
                    }
            
                    if (data.secondary_allocation) {
                        try {
                            const secondaryAlloc = (typeof data.secondary_allocation === 'string'
                                ? JSON.parse(data.secondary_allocation)
                                : data.secondary_allocation) as Record<string, Record<string, number>>;
                            setDbSecondaryAllocation(secondaryAlloc || {});
                        } catch (e) {
                            console.error("Failed to parse secondary_allocation", e);
                        }
                    }
                }

                if (stockCategoriesRes.data) {
                    setDbStockCategories(new Map(stockCategoriesRes.data.map(item => [item.symbol, item.category as AllocationCategory])));
                }
                
                setIsDataReady(true);
            } catch (error) {
                const err = error as Error;
                setNotification(`Failed to load allocation plan: ${err.message}`, 'error');
            } finally {
                setInitialLoading(false);
            }
        };
        
        loadData();
    }, [selectedPortfolioId, setNotification]);

    useEffect(() => {
      if (isSettingsOpen && dbMainAllocation) {
        setEditAllocation(dbMainAllocation)
      }
    }, [isSettingsOpen, dbMainAllocation]);

    useEffect(() => {
      async function loadStocksAndCategories() {
        if (!isSettingsOpen || !selectedPortfolioId || !activePortfolio) return
        
        const uniqueSymbols = activePortfolio.data.map(d => d.symbol);

        const { data: categories } = await supabase
          .from('stock_allocations')
          .select('symbol, category')
          .eq('portfolio_id', selectedPortfolioId)
        
        const categoryMap: Record<string, string> = {}
        categories?.forEach(c => {
          categoryMap[c.symbol] = c.category
        })
        
        uniqueSymbols.forEach(symbol => {
          if (!categoryMap[symbol]) {
            categoryMap[symbol] = 'Compounder' // Default for new/uncategorized stocks
          }
        })
        
        setEditCategories(categoryMap)
      }
      
      loadStocksAndCategories()
    }, [isSettingsOpen, selectedPortfolioId, activePortfolio]);

    useEffect(() => {
        if (Object.keys(editCategories).length === 0) return;

        // Prioritize loading saved weights from the database
        if (dbSecondaryAllocation && Object.keys(dbSecondaryAllocation).length > 0) {
            // A simple merge: Start with the saved weights, then ensure all categorized stocks are present.
            const newWeights = { ...dbSecondaryAllocation };
            Object.entries(editCategories).forEach(([symbol, category]) => {
                if (!newWeights[category]) {
                    newWeights[category] = {};
                }
                if (newWeights[category][symbol] === undefined) {
                    newWeights[category][symbol] = 0; // Add new stocks with 0 weight
                }
            });
            setEditWeights(newWeights);
            return;
        }

        // Fallback to equal distribution if no saved weights are found
        const weightsByCategory: Record<string, Record<string, number>> = {};
        Object.entries(editCategories).forEach(([symbol, category]) => {
            if (!weightsByCategory[category]) {
                weightsByCategory[category] = {};
            }
            weightsByCategory[category][symbol] = 0;
        });

        Object.keys(weightsByCategory).forEach(category => {
            const stocks = Object.keys(weightsByCategory[category]);
            if (stocks.length > 0) {
                const equalWeight = Math.floor(100 / stocks.length);
                stocks.forEach((symbol, idx) => {
                    weightsByCategory[category][symbol] = idx === 0 ? equalWeight + (100 - equalWeight * stocks.length) : equalWeight;
                });
            }
        });

        setEditWeights(weightsByCategory);
    }, [editCategories, dbSecondaryAllocation]);

    const loadNeedToBuyStocks = useCallback(async () => {
        if (!selectedPortfolioId || !activePortfolio) return;
        try {
          setLoadingNeedToBuy(true)
          
          const { data: allocation } = await supabase
            .from('portfolio_allocations')
            .select('main_allocation, secondary_allocation')
            .eq('portfolio_id', selectedPortfolioId)
            .single()
          
          const portfolioTotal = activePortfolio.total.currentValue || 0;
          const holdings = activePortfolio.data || [];
          
          const mainAllocRaw = allocation?.main_allocation;
          let mainAlloc: Allocation | undefined = undefined;
          if (mainAllocRaw) {
              const parsed = typeof mainAllocRaw === 'string' ? JSON.parse(mainAllocRaw) : mainAllocRaw;
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  const mainAllocObj = parsed as Record<string, unknown>;
                  const getNum = (v: unknown) => typeof v === 'number' ? v : 0;
                  mainAlloc = {
                      Compounder: getNum(mainAllocObj['Compounder']),
                      Growth: getNum(mainAllocObj['Growth']),
                      Bet: getNum(mainAllocObj['Bet']),
                      Cash: getNum(mainAllocObj['Cash']),
                  };
              }
          }
          
          const secondaryAllocRaw = allocation?.secondary_allocation;
          let secondaryAlloc: Record<string, Record<string, number>> | undefined = undefined;
          if (secondaryAllocRaw) {
              const parsed = typeof secondaryAllocRaw === 'string' ? JSON.parse(secondaryAllocRaw) : secondaryAllocRaw;
              if (parsed && typeof parsed === 'object') {
                  secondaryAlloc = parsed as Record<string, Record<string, number>>;
              }
          }

          if (!secondaryAlloc || !mainAlloc) {
            setNeedToBuyStocks([]);
            return;
          }
          
          const needToBuy: { symbol: string; category: string; targetValue: number; targetPercent: number }[] = [];
          
          for (const [category, stocks] of Object.entries(secondaryAlloc)) {
            if (category === 'Cash') continue;
            if (mainAlloc && isAllocationCategory(category)) {
                const catKey = category as AllocationCategory;
                const categoryPercent = mainAlloc[catKey] || 0;
                const categoryTargetValue = (portfolioTotal * categoryPercent) / 100;
                
                for (const [symbol, stockPercent] of Object.entries(stocks)) {
                  const holding = holdings.find(h => h.symbol === symbol);
                  const quantity = holding?.quantity || 0;
                  
                  if (quantity <= 0) {
                    const targetValue = (categoryTargetValue * stockPercent) / 100;
                    
                    needToBuy.push({
                      symbol,
                      category,
                      targetValue: targetValue,
                      targetPercent: (categoryPercent * stockPercent) / 100
                    });
                  }
                }
            }
          }
          
          setNeedToBuyStocks(needToBuy);
        } catch (error) {
          console.error('Error loading need to buy stocks:', error);
          setNotification('Could not calculate stocks to buy.', 'error');
        } finally {
          setLoadingNeedToBuy(false)
        }
    }, [selectedPortfolioId, activePortfolio, setNotification]);


    useEffect(() => {
      if (selectedPortfolioId && isDataReady && activePortfolio) {
        loadNeedToBuyStocks()
      }
    }, [selectedPortfolioId, isDataReady, activePortfolio, loadNeedToBuyStocks]);

    const gapAnalysis = useMemo<GapAnalysis | null>(() => {
        if (!activePortfolio || !dbMainAllocation || !isDataReady) {
            return null;
        }

        const portfolioTotal = activePortfolio.total.currentValue;
        if (portfolioTotal === 0) return null;

        const categoryTotals = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {} as Record<AllocationCategory, number>);
        activePortfolio.data.forEach(stock => {
            const category = dbStockCategories.get(stock.symbol);
            if (category) categoryTotals[category] += stock.currentValue;
        });
        categoryTotals['Cash'] += activePortfolio.cash.currentValue;

        const categoryGaps = CATEGORIES.map(cat => {
            const categoryValue = categoryTotals[cat];
            const categoryCurrentPct = (categoryValue / portfolioTotal) * 100;
            const categoryTargetPct = dbMainAllocation[cat] || 0;
            const categoryTargetValue = portfolioTotal * (categoryTargetPct / 100);
            
            const stocksInCategory = activePortfolio.data.filter(s => dbStockCategories.get(s.symbol) === cat);
            const categoryStockTotal = stocksInCategory.reduce((sum, s) => sum + s.currentValue, 0);

            // Stocks currently owned in this category
            const stockDetails: StockGapAnalysisItem[] = stocksInCategory.map(stock => {
                const targetPctInCategory = dbSecondaryAllocation[cat]?.[stock.symbol] || 0;
                const currentPctInCategory = categoryStockTotal > 0 ? (stock.currentValue / categoryStockTotal) * 100 : 0;
                const targetValue = categoryTargetValue * (targetPctInCategory / 100);
                return {
                    symbol: stock.symbol,
                    name: stock.name,
                    currentValue: stock.currentValue,
                    currentPctInCategory,
                    targetPctInCategory,
                    targetValue,
                    gapValue: targetValue - stock.currentValue,
                };
            });

            // Stocks in plan but not yet owned ("Need to Buy")
            if (dbSecondaryAllocation[cat]) {
                for (const symbol in dbSecondaryAllocation[cat]) {
                    if (!activePortfolio.data.some(s => s.symbol === symbol)) {
                        const targetPctInCategory = dbSecondaryAllocation[cat][symbol] || 0;
                        const targetValue = categoryTargetValue * (targetPctInCategory / 100);
                        stockDetails.push({
                            symbol,
                            name: 'New Stock', // Placeholder
                            currentValue: 0,
                            currentPctInCategory: 0,
                            targetPctInCategory,
                            targetValue,
                            gapValue: targetValue,
                        });
                    }
                }
            }

            return {
                category: cat,
                currentValue: categoryValue,
                currentPct: categoryCurrentPct,
                targetPct: categoryTargetPct,
                targetValue: categoryTargetValue,
                gap: categoryTargetValue - categoryValue,
                gapPct: categoryTargetPct - categoryCurrentPct,
                stocks: stockDetails.sort((a,b) => b.currentValue - a.currentValue),
            };
        });

        return { categoryGaps, portfolioTotal };
    }, [activePortfolio, dbMainAllocation, dbStockCategories, dbSecondaryAllocation, isDataReady]);

    const handleSaveSettings = async () => {
        if (!selectedPortfolioId) {
            setNotification('No portfolio selected.', 'error');
            return;
        }

        setIsSaving(true);

        // 1. Validation
        const mainAllocTotal = Object.values(editAllocation).reduce((sum: number, val: number) => sum + (val || 0), 0);
        if (mainAllocTotal !== 100) {
            setNotification('Main allocation must total 100%.', 'error');
            setActiveTab('main');
            setIsSaving(false);
            return;
        }

        for (const category in editWeights) {
            const categoryStocks = editWeights[category] || {};
            const categoryTotal = Object.values(categoryStocks).reduce((sum: number, val: number) => sum + (val || 0), 0);
            if (categoryTotal !== 100) {
                setNotification(`Stock weights for category "${category}" must total 100%.`, 'error');
                setActiveTab('weights');
                setIsSaving(false);
                return;
            }
        }

        try {
            // 2. Save Main and Secondary Allocations
            const { error: portfolioAllocError } = await supabase
                .from('portfolio_allocations')
                .upsert(
                    {
                        portfolio_id: selectedPortfolioId,
                        main_allocation: editAllocation,
                        secondary_allocation: editWeights,
                    },
                    { onConflict: 'portfolio_id' }
                );

            if (portfolioAllocError) throw portfolioAllocError;

            // 3. Save Stock Categories
            const stockCategoriesToUpsert = Object.entries(editCategories).map(([symbol, category]) => ({
                portfolio_id: selectedPortfolioId,
                symbol: symbol,
                category: category,
            }));

            if (stockCategoriesToUpsert.length > 0) {
                 const { error: stockAllocError } = await supabase
                    .from('stock_allocations')
                    .upsert(stockCategoriesToUpsert, { onConflict: 'portfolio_id,symbol' });

                if (stockAllocError) throw stockAllocError;
            }

            setNotification('Allocation settings saved successfully!', 'success');
            setIsSettingsOpen(false);

            // Trigger a re-fetch after a short delay for DB replication
            setTimeout(() => {
                window.dispatchEvent(new Event('refetchData')); 
            }, 500);

        } catch (error) {
            const err = error as Error;
            console.error("Failed to save allocation settings:", err);
            setNotification(`Error saving settings: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddStockToCategory = (category: string) => {
        const symbol = prompt(`Enter stock symbol to add to "${category}":`);
        if (symbol) {
            const newSymbol = symbol.trim().toUpperCase();
            if (Object.keys(editCategories).includes(newSymbol)) {
                alert(`Error: ${newSymbol} is already in your plan.`);
                return;
            }
            setEditCategories(prev => ({...prev, [newSymbol]: category}));
            setEditWeights(prev => {
                const newWeights = {...prev};
                if (!newWeights[category]) {
                    newWeights[category] = {};
                }
                newWeights[category][newSymbol] = 0;
                return newWeights;
            });
        }
    };

    const CustomDonutTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length && gapAnalysis) {
            const categoryName = payload[0].name as AllocationCategory;
            const categoryData = gapAnalysis.categoryGaps.find(g => g.category === categoryName);

            if (!categoryData) return null;

            const gapColor = categoryData.gap >= 0 ? 'text-green-400' : 'text-red-400';

            return (
                <div className="bg-gray-800/90 border border-gray-600 rounded-lg p-3 shadow-xl backdrop-blur-sm w-64">
                    <div className="font-bold text-base mb-2" style={{ color: CATEGORY_COLORS[categoryData.category] }}>
                        {categoryData.category}
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Current:</span>
                            <span className="font-mono font-medium text-white">{formatCurrency(categoryData.currentValue)} ({categoryData.currentPct.toFixed(2)}%)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Target:</span>
                            <span className="font-mono font-medium text-white">{formatCurrency(categoryData.targetValue)} ({categoryData.targetPct.toFixed(2)}%)</span>
                        </div>
                    </div>
                    <hr className="border-gray-600 my-2" />
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Gap:</span>
                        <span className={`font-mono font-bold text-base ${gapColor}`}>
                            {categoryData.gap >= 0 ? '+' : ''}{formatCurrency(categoryData.gap)} ({categoryData.gap >= 0 ? '+' : ''}{categoryData.gapPct.toFixed(2)}%)
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const renderActiveDonutShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        return (
            <g style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))' }}>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                 <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + 8}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill="transparent"
                    stroke={fill}
                    strokeWidth={2}
                />
            </g>
        );
    };

    // --- Visual Summary Components ---
    const AllocationDonutChart = () => {
        const [activeIndex, setActiveIndex] = useState<number | null>(null);

        const chartData = useMemo(() => gapAnalysis?.categoryGaps.map(g => ({
            name: g.category,
            current: g.currentPct,
            target: g.targetPct,
            color: CATEGORY_COLORS[g.category]
        })), [gapAnalysis]);

        if (!chartData) return null;

        return (
            <div className="w-full h-80 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData} dataKey="target" nameKey="name"
                            cx="50%" cy="50%" outerRadius="100%" innerRadius="80%" fill="#8884d8" fillOpacity={0.3}
                            stroke="none" startAngle={90} endAngle={-270}
                        >
                            {chartData.map((entry, index) => <Cell key={`cell-target-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Pie
                            data={chartData} dataKey="current" nameKey="name"
                            cx="50%" cy="50%" outerRadius="75%" innerRadius="55%" fill="#8884d8"
                            stroke="#111827" strokeWidth={4} startAngle={90} endAngle={-270}
                            activeIndex={activeIndex} activeShape={renderActiveDonutShape}
                            onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}
                        >
                            {chartData.map((entry, index) => <Cell key={`cell-current-${index}`} fill={entry.color} />)}
                        </Pie>
                         <Tooltip content={<CustomDonutTooltip />} cursor={{ fill: 'transparent' }} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-gray-400 text-sm">Total Value</span>
                    <span className="text-white font-bold text-2xl">{formatCurrency(gapAnalysis?.portfolioTotal || 0)}</span>
                </div>
            </div>
        );
    };
    
    const AlignmentSummary = () => {
        if (!gapAnalysis) return null;

        const totalDeviation = gapAnalysis.categoryGaps.reduce((sum, cat) => sum + Math.abs(cat.gapPct), 0);
        const alignmentScore = Math.max(0, 100 - (totalDeviation / 2));

        const statusCounts = {
            onTrack: gapAnalysis.categoryGaps.filter(cat => Math.abs(cat.gapPct) <= 2).length,
            needsAttention: gapAnalysis.categoryGaps.filter(cat => Math.abs(cat.gapPct) > 2 && Math.abs(cat.gapPct) <= 5).length,
            actionNeeded: gapAnalysis.categoryGaps.filter(cat => Math.abs(cat.gapPct) > 5).length,
        };

        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-white">Overall Alignment</h3>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-4xl font-bold text-blue-400">{alignmentScore.toFixed(0)}%</span>
                        <div className="w-full bg-gray-700 rounded-full h-4">
                            <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${alignmentScore}%` }}></div>
                        </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Status Summary</h3>
                    <div className="mt-2 space-y-2 text-sm">
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2">✅ On Track <small className="text-gray-400">(±2%)</small></span> <span className="font-bold">{statusCounts.onTrack}</span></div>
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2">⚠️ Needs Attention <small className="text-gray-400">(±2-5%)</small></span> <span className="font-bold">{statusCounts.needsAttention}</span></div>
                        <div className="flex justify-between items-center"><span className="flex items-center gap-2">🔴 Over/Under Allocated <small className="text-gray-400">(&gt;±5%)</small></span> <span className="font-bold">{statusCounts.actionNeeded}</span></div>
                    </div>
                </div>
            </div>
        );
    };

    if (initialLoading) {
        return <div className="text-center p-20">Loading allocation plan...</div>;
    }
    
    if (!selectedPortfolioId) {
        return (
            <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-80px)]">
                <Sidebar portfolios={portfolios} selectedPortfolioId={''} setSelectedPortfolioId={setSelectedPortfolioId} showTopMovers={false} />
                <main className="flex-1 p-4 md:p-6 text-white overflow-y-auto flex items-center justify-center">
                    <div className="text-center text-gray-500">Please select a portfolio to plan its allocation.</div>
                </main>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-80px)]">
            <Sidebar portfolios={portfolios} selectedPortfolioId={selectedPortfolioId || ''} setSelectedPortfolioId={setSelectedPortfolioId} showTopMovers={false} />
            <main className="flex-1 p-4 md:p-6 text-white overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold">Allocation Dashboard</h1>
                            <p className="text-gray-400 mt-1">Allocation status for <span className="font-bold text-blue-400">{activePortfolio?.name}</span>.</p>
                        </div>
                        <button onClick={() => setIsSettingsOpen(true)} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 font-semibold flex items-center justify-center space-x-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                            <span>Edit Allocation Settings</span>
                        </button>
                    </div>

                    {isDataReady && gapAnalysis ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-gray-800/50 p-6 rounded-lg shadow-md flex flex-col justify-center">
                                    <AlignmentSummary />
                                </div>
                                <div className="bg-gray-800/50 p-6 rounded-lg shadow-md flex items-center justify-center">
                                    <AllocationDonutChart />
                                </div>
                            </div>
                            <div className="bg-gray-800/50 p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold mb-4">Allocation Status</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                                            <tr>
                                                <th className="p-3 text-left w-1/3">Category</th>
                                                <th className="p-3 text-right">Current Value</th>
                                                <th className="p-3 text-right">Current %</th>
                                                <th className="p-3 text-right">Target %</th>
                                                <th className="p-3 text-right">Gap</th>
                                                <th className="p-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {gapAnalysis.categoryGaps.map(cat => {
                                                const gapAbs = Math.abs(cat.gapPct);
                                                let status, statusColor, statusText;
                                                if (gapAbs <= 2) { status = '✅'; statusColor = 'text-green-400'; statusText = 'On Track'; }
                                                else if (gapAbs <= 5) { status = '⚠️'; statusColor = 'text-yellow-400'; statusText = 'Needs Attention'; }
                                                else { status = '🔴'; statusColor = 'text-red-400'; statusText = cat.gapPct > 0 ? 'Under Allocated' : 'Over Allocated'; }
                                                const isExpanded = expandedCategories.has(cat.category);
                                                
                                                return (
                                                    <React.Fragment key={cat.category}>
                                                    <tr className="cursor-pointer hover:bg-gray-700/30" onClick={() => toggleCategory(cat.category)}>
                                                        <td className="p-3 font-semibold" style={{color: CATEGORY_COLORS[cat.category]}}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▸</span>
                                                                <span>{cat.category}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-mono">{formatCurrency(cat.currentValue)}</td>
                                                        <td className="p-3 text-right font-mono">{cat.currentPct.toFixed(2)}%</td>
                                                        <td className="p-3 text-right font-mono text-blue-300">{cat.targetPct.toFixed(2)}%</td>
                                                        <td className={`p-3 text-right font-mono font-bold ${cat.gap >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {cat.gap >= 0 ? '+' : ''}{formatCurrency(cat.gap)}
                                                        </td>
                                                        <td className={`p-3 text-center font-semibold ${statusColor}`}>
                                                            <div className="flex items-center justify-center gap-2"><span>{status}</span><span>{statusText}</span></div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && cat.category !== 'Cash' && (
                                                        <tr className="bg-gray-900/30">
                                                            <td colSpan={6} className="p-3">
                                                                <div className="space-y-2">
                                                                    {cat.stocks.length > 0 ? cat.stocks.map(stock => {
                                                                        const stockGapPct = stock.targetPctInCategory - stock.currentPctInCategory;
                                                                        let stockStatus, stockStatusColor, stockStatusText;
                                                                        if (stock.currentValue === 0) { stockStatus = '💰'; stockStatusColor = 'text-yellow-400'; stockStatusText = 'Need to Buy'; }
                                                                        else if (Math.abs(stockGapPct) <= 5) { stockStatus = '✅'; stockStatusColor = 'text-green-400'; stockStatusText = 'On Track'; }
                                                                        else if (stockGapPct > 0) { stockStatus = '⚠️'; stockStatusColor = 'text-yellow-400'; stockStatusText = 'Under-weight'; }
                                                                        else { stockStatus = '🔴'; stockStatusColor = 'text-red-400'; stockStatusText = 'Over-weight'; }
                                                                        
                                                                        return (
                                                                            <div key={stock.symbol} className="grid grid-cols-6 items-center text-xs p-2 rounded-md hover:bg-gray-800/50">
                                                                                <div className="font-bold">{stock.symbol}</div>
                                                                                <div className="text-right font-mono">{formatCurrency(stock.currentValue)}</div>
                                                                                <div className="text-right font-mono">{stock.currentPctInCategory.toFixed(2)}%</div>
                                                                                <div className="text-right font-mono text-blue-400">{stock.targetPctInCategory.toFixed(2)}%</div>
                                                                                <div className={`text-right font-mono ${stock.gapValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>{stock.gapValue >= 0 ? '+' : ''}{formatCurrency(stock.gapValue)}</div>
                                                                                <div className={`text-center font-semibold ${stockStatusColor} flex items-center justify-center gap-1`}><span>{stockStatus}</span><span>{stockStatusText}</span></div>
                                                                            </div>
                                                                        );
                                                                    }) : <div className="text-center text-gray-500 text-xs py-2">No stocks assigned to this category.</div>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div style={{
                                backgroundColor: '#1F2937',
                                borderRadius: '8px',
                                padding: '24px',
                                marginTop: '24px',
                                marginBottom: '24px'
                            }}>
                                <h3 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                                📋 Need to Buy
                                </h3>
                                
                                {loadingNeedToBuy ? (
                                <p style={{ color: '#9CA3AF', textAlign: 'center' }}>Loading...</p>
                                ) : needToBuyStocks.length > 0 ? (
                                <div>
                                    <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '16px' }}>
                                    {needToBuyStocks.length} {needToBuyStocks.length === 1 ? 'stock' : 'stocks'} in your plan are not yet owned.
                                    </p>
                                    {needToBuyStocks.map((stock) => (
                                    <div 
                                        key={stock.symbol}
                                        style={{
                                        backgroundColor: '#374151',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        marginBottom: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                        }}
                                    >
                                        <div>
                                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
                                                {stock.symbol}
                                            </span>
                                            <span style={{
                                                marginLeft: '12px',
                                                padding: '4px 8px',
                                                backgroundColor: '#4B5563',
                                                color: '#D1D5DB',
                                                borderRadius: '4px',
                                                fontSize: '12px'
                                            }}>
                                                {stock.category}
                                            </span>
                                            <div style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '8px' }}>
                                                Target: {formatCurrency(stock.targetValue || 0)}
                                            </div>
                                            {/* Action buttons */}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <button 
                                                onClick={() => handleSetPriceAlert(stock.symbol)}
                                                style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                backgroundColor: '#1F2937',
                                                border: '1px solid #4B5563',
                                                borderRadius: '6px',
                                                color: '#D1D5DB',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                                }}
                                            >
                                                🎯 Set Alert
                                            </button>
                                            <button 
                                                onClick={() => handleAddToWatch(stock.symbol)}
                                                style={{
                                                flex: 1,
                                                padding: '8px 12px',
                                                backgroundColor: '#1F2937',
                                                border: '1px solid #4B5563',
                                                borderRadius: '6px',
                                                color: '#D1D5DB',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                                }}
                                            >
                                                ⭐ Watch
                                            </button>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '24px' }}>
                                            {watchList[stock.symbol]?.hasAlert ? '🎯' : '💰'}
                                        </span>
                                    </div>
                                    ))}
                                    <div style={{
                                    marginTop: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid #4B5563',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                    }}>
                                    <span style={{ color: '#D1D5DB', fontWeight: '500' }}>Total needed:</span>
                                    <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
                                        {formatCurrency(needToBuyStocks.reduce((sum, s) => sum + (s.targetValue || 0), 0))}
                                    </span>
                                    </div>
                                </div>
                                ) : (
                                <div style={{
                                    backgroundColor: '#374151',
                                    borderRadius: '8px',
                                    padding: '24px',
                                    textAlign: 'center',
                                    color: '#9CA3AF',
                                    marginTop: '16px'
                                    }}>
                                    <span style={{fontSize: '24px', display: 'block', marginBottom: '8px'}}>🎉</span>
                                    <p style={{fontWeight: '500', color: 'white'}}>All Stocks Owned!</p>
                                    <p style={{fontSize: '14px', marginTop: '4px'}}>You currently own at least some shares of every stock in your allocation plan.</p>
                                </div>
                                )}
                            </div>

                            <div className="text-center">
                                <button onClick={() => setIsRebalanceModalOpen(true)} className="px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-500 font-bold text-lg">
                                    Create Rebalance Plan
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center bg-gray-800/50 p-10 rounded-lg">
                            <p className="font-bold text-lg">No Allocation Plan Found</p>
                            <p className="text-gray-400 mt-2">Click "Edit Allocation Settings" to create your first plan for this portfolio.</p>
                        </div>
                    )}
                </div>
                {isSettingsOpen && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                  }}>
                    <div style={{
                      backgroundColor: '#1F2937',
                      borderRadius: '12px',
                      width: '90%',
                      maxWidth: '800px',
                      maxHeight: '90vh',
                      overflow: 'auto',
                      padding: '24px'
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                          Allocation Settings
                        </h2>
                        <button 
                          onClick={() => setIsSettingsOpen(false)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#9CA3AF',
                            fontSize: '24px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      
                      {/* Tabs */}
                      <div style={{ borderBottom: '1px solid #374151', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <button 
                              onClick={() => setActiveTab('main')}
                              style={{
                                padding: '12px 24px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'main' ? '2px solid #3B82F6' : '2px solid transparent',
                                color: activeTab === 'main' ? 'white' : '#9CA3AF',
                                cursor: 'pointer'
                              }}
                            >
                              Main Allocation
                            </button>
                            <button 
                              onClick={() => setActiveTab('categories')}
                              style={{
                                padding: '12px 24px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'categories' ? '2px solid #3B82F6' : '2px solid transparent',
                                color: activeTab === 'categories' ? 'white' : '#9CA3AF',
                                cursor: 'pointer'
                              }}
                            >
                              Stock Categories
                            </button>
                            <button 
                              onClick={() => setActiveTab('weights')}
                              style={{
                                padding: '12px 24px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'weights' ? '2px solid #3B82F6' : '2px solid transparent',
                                color: activeTab === 'weights' ? 'white' : '#9CA3AF',
                                cursor: 'pointer'
                              }}
                            >
                              Stock Weights
                            </button>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div style={{ color: 'white', minHeight: '200px' }}>
                        {activeTab === 'main' && (
                            <div>
                              <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>Main Allocation</h3>
                              <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '24px' }}>
                                Adjust percentages for each category. Total must equal 100%.
                              </p>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Compounder */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '500' }}>Compounder</span>
                                    <input 
                                      type="number"
                                      value={editAllocation.Compounder}
                                      onChange={(e) => setEditAllocation(prev => ({ ...prev, Compounder: Number(e.target.value) }))}
                                      min="0"
                                      max="100"
                                      style={{
                                        width: '80px',
                                        padding: '4px 8px',
                                        backgroundColor: '#374151',
                                        border: '1px solid #4B5563',
                                        borderRadius: '4px',
                                        color: 'white',
                                        textAlign: 'right'
                                      }}
                                    />
                                  </div>
                                  <input 
                                    type="range"
                                    value={editAllocation.Compounder}
                                    onChange={(e) => setEditAllocation(prev => ({ ...prev, Compounder: Number(e.target.value) }))}
                                    min="0"
                                    max="100"
                                    style={{ width: '100%' }}
                                  />
                                </div>
                                
                                {/* Growth */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '500' }}>Growth</span>
                                    <input 
                                      type="number"
                                      value={editAllocation.Growth}
                                      onChange={(e) => setEditAllocation(prev => ({ ...prev, Growth: Number(e.target.value) }))}
                                      min="0"
                                      max="100"
                                      style={{
                                        width: '80px',
                                        padding: '4px 8px',
                                        backgroundColor: '#374151',
                                        border: '1px solid #4B5563',
                                        borderRadius: '4px',
                                        color: 'white',
                                        textAlign: 'right'
                                      }}
                                    />
                                  </div>
                                  <input 
                                    type="range"
                                    value={editAllocation.Growth}
                                    onChange={(e) => setEditAllocation(prev => ({ ...prev, Growth: Number(e.target.value) }))}
                                    min="0"
                                    max="100"
                                    style={{ width: '100%' }}
                                  />
                                </div>
                                
                                {/* Bet */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '500' }}>Bet</span>
                                    <input 
                                      type="number"
                                      value={editAllocation.Bet}
                                      onChange={(e) => setEditAllocation(prev => ({ ...prev, Bet: Number(e.target.value) }))}
                                      min="0"
                                      max="100"
                                      style={{
                                        width: '80px',
                                        padding: '4px 8px',
                                        backgroundColor: '#374151',
                                        border: '1px solid #4B5563',
                                        borderRadius: '4px',
                                        color: 'white',
                                        textAlign: 'right'
                                      }}
                                    />
                                  </div>
                                  <input 
                                    type="range"
                                    value={editAllocation.Bet}
                                    onChange={(e) => setEditAllocation(prev => ({ ...prev, Bet: Number(e.target.value) }))}
                                    min="0"
                                    max="100"
                                    style={{ width: '100%' }}
                                  />
                                </div>
                                
                                {/* Cash */}
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: '500' }}>Cash</span>
                                    <input 
                                      type="number"
                                      value={editAllocation.Cash}
                                      onChange={(e) => setEditAllocation(prev => ({ ...prev, Cash: Number(e.target.value) }))}
                                      min="0"
                                      max="100"
                                      style={{
                                        width: '80px',
                                        padding: '4px 8px',
                                        backgroundColor: '#374151',
                                        border: '1px solid #4B5563',
                                        borderRadius: '4px',
                                        color: 'white',
                                        textAlign: 'right'
                                      }}
                                    />
                                  </div>
                                  <input 
                                    type="range"
                                    value={editAllocation.Cash}
                                    onChange={(e) => setEditAllocation(prev => ({ ...prev, Cash: Number(e.target.value) }))}
                                    min="0"
                                    max="100"
                                    style={{ width: '100%' }}
                                  />
                                </div>
                              </div>
                              
                              {/* Total validation */}
                              <div style={{
                                marginTop: '24px',
                                padding: '16px',
                                backgroundColor: '#374151',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <span>Total:</span>
                                <span style={{
                                  fontSize: '20px',
                                  fontWeight: 'bold',
                                  color: (Object.values(editAllocation).reduce((sum: number, val: number) => sum + (val || 0), 0)) === 100 ? '#10B981' : '#EF4444'
                                }}>
                                  {Object.values(editAllocation).reduce((sum: number, val: number) => sum + (val || 0), 0)}%
                                </span>
                              </div>
                              
                              {Object.values(editAllocation).reduce((sum: number, val: number) => sum + (val || 0), 0) !== 100 && (
                                <p style={{ color: '#EF4444', fontSize: '14px', marginTop: '8px' }}>
                                  ⚠️ Total must equal 100%
                                </p>
                              )}
                            </div>
                          )}
                          
                          {activeTab === 'categories' && (
                            <div>
                              <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>Stock Categories</h3>
                              <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '24px' }}>
                                Assign each stock to an allocation category.
                              </p>
                              
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid #374151' }}>
                                      <th style={{ textAlign: 'left', padding: '12px', color: '#9CA3AF', fontSize: '14px' }}>Symbol</th>
                                      <th style={{ textAlign: 'left', padding: '12px', color: '#9CA3AF', fontSize: '14px' }}>Category</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.keys(editCategories).map((symbol) => (
                                      <tr key={symbol} style={{ borderBottom: '1px solid #374151' }}>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{symbol}</td>
                                        <td style={{ padding: '12px' }}>
                                          <select 
                                            value={editCategories[symbol]}
                                            onChange={(e) => setEditCategories(prev => ({ ...prev, [symbol]: e.target.value }))}
                                            style={{
                                              width: '100%',
                                              padding: '8px',
                                              backgroundColor: '#374151',
                                              border: '1px solid #4B5563',
                                              borderRadius: '4px',
                                              color: 'white',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            <option value="Compounder">Compounder</option>
                                            <option value="Growth">Growth</option>
                                            <option value="Bet">Bet</option>
                                            <option value="Cash">Cash</option>
                                          </select>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                
                                {Object.keys(editCategories).length === 0 && (
                                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '24px' }}>
                                    No stocks found in portfolio
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {activeTab === 'weights' && (
                            <div>
                              <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>Stock Weights</h3>
                              <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '24px' }}>
                                Set target percentages for stocks within each category. Each category must total 100%.
                              </p>
                              
                              {Object.keys(editWeights).map((category) => {
                                const categoryStocks = editWeights[category] || {};
                                const totalPercent = Object.values(categoryStocks).reduce((sum: number, val: number) => sum + (val || 0), 0);
                                
                                return (
                                  <div key={category} style={{
                                    marginBottom: '32px',
                                    padding: '20px',
                                    backgroundColor: '#374151',
                                    borderRadius: '8px'
                                  }}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                                        <h4 style={{ fontSize: '16px', fontWeight: '600' }}>
                                          {category}
                                        </h4>
                                        <button 
                                            onClick={() => handleAddStockToCategory(category)}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#4B5563',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                            }}
                                        >
                                            + Add Stock
                                        </button>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                      {Object.keys(categoryStocks).length > 0 ? Object.keys(categoryStocks).map((symbol) => (
                                        <div key={symbol}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span>{symbol}</span>
                                            <input 
                                              type="number"
                                              value={categoryStocks[symbol]}
                                              onChange={(e) => {
                                                  const value = parseFloat(e.target.value);
                                                  setEditWeights(prev => ({
                                                    ...prev,
                                                    [category]: {
                                                      ...(prev[category] || {}),
                                                      [symbol]: isNaN(value) ? 0 : value
                                                    }
                                                  }))
                                              }}
                                              min="0"
                                              max="100"
                                              style={{
                                                width: '80px',
                                                padding: '4px 8px',
                                                backgroundColor: '#1F2937',
                                                border: '1px solid #4B5563',
                                                borderRadius: '4px',
                                                color: 'white',
                                                textAlign: 'right'
                                              }}
                                            />
                                          </div>
                                          <input 
                                            type="range"
                                            value={categoryStocks[symbol]}
                                            onChange={(e) => setEditWeights(prev => ({
                                              ...prev,
                                              [category]: {
                                                ...(prev[category] || {}),
                                                [symbol]: Number(e.target.value)
                                              }
                                            }))}
                                            min="0"
                                            max="100"
                                            style={{ width: '100%' }}
                                          />
                                        </div>
                                      )) : <p className="text-sm text-gray-400 text-center py-4">No stocks in this category. Click "+ Add Stock" to begin.</p>}
                                    </div>
                                    
                                    <div style={{
                                      marginTop: '16px',
                                      padding: '12px',
                                      backgroundColor: '#1F2937',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      justifyContent: 'space-between'
                                    }}>
                                      <span>Total:</span>
                                      <span style={{
                                        fontWeight: 'bold',
                                        color: totalPercent === 100 ? '#10B981' : '#EF4444'
                                      }}>
                                        {totalPercent}%
                                      </span>
                                    </div>
                                    
                                    {totalPercent !== 100 && (
                                      <p style={{ color: '#EF4444', fontSize: '12px', marginTop: '8px' }}>
                                        ⚠️ Must total 100%
                                      </p>
                                    )}
                                  </div>
                                )
                              })}
                              
                              {Object.keys(editWeights).length === 0 && (
                                <p style={{ color: '#9CA3AF', textAlign: 'center' }}>
                                  No stocks categorized yet. Please assign stocks to categories first.
                                </p>
                              )}
                            </div>
                          )}
                      </div>
                      
                      {/* Footer */}
                      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setIsSettingsOpen(false)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#374151',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                opacity: isSaving ? 0.6 : 1,
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </main>
        </div>
    );
};

export default AllocationPlannerPage;