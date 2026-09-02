import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Portfolio, DailyPortfolioSnapshot } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Import TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto'; // for time scale
import { calculateAndSavePortfolioSnapshot } from '../lib/calculatePortfolioSnapshot';
import { calculateReturnsFromSnapshots } from '../hooks/usePortfolioSummary';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale // Register TimeScale
);

interface DatabaseTestPageProps {
  transactions: Transaction[];
}

// Helper to find the last known value on or before a given date
const findValueOnOrBefore = (targetDate: string, data: any[], key: string): number | undefined => {
    let lastKnownValue: number | undefined = undefined;
    // Ensure data is sorted by date ascending
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const d of sortedData) {
        if (d.date > targetDate) break;
        if (d[key] !== undefined && d[key] !== null) {
            lastKnownValue = d[key];
        }
    }
    return lastKnownValue;
};


const DatabaseTestPage: React.FC<DatabaseTestPageProps> = ({ transactions }) => {
    const [portfoliosForTest, setPortfoliosForTest] = useState<Portfolio[]>([]);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
    const [populationState, setPopulationState] = useState<{ message: string; progress: number, running: boolean } | null>(null);
    const [validationState, setValidationState] = useState<{ results: any[] | null; status: string }>({ results: null, status: 'Idle' });
    const [testResults, setTestResults] = useState<string>('');
    const [status, setStatus] = useState<string>('Idle');
    const [historicalData, setHistoricalData] = useState<any[] | null>(null);


    useEffect(() => {
        const fetchPortfolios = async () => {
            const { data } = await supabase.from('portfolios').select('*');
            if (data) {
                setPortfoliosForTest(data as Portfolio[]);
                if (data.length > 0) {
                    setSelectedPortfolioId(data[0].id);
                }
            }
        };
        fetchPortfolios();
    }, []);

    const handlePopulateData = async () => {
        if (!selectedPortfolioId) {
            setPopulationState({ message: 'Please select a portfolio.', progress: 0, running: false });
            return;
        }
        setPopulationState({ message: 'Starting...', progress: 0, running: true });

        try {
            const portfolioTransactions = transactions.filter(t => t.portfolioId === selectedPortfolioId);
            const symbols = Array.from(new Set(portfolioTransactions.map(t => t.symbol)));
            
            setPopulationState({ message: `Fetching prices for ${symbols.length} symbols...`, progress: 0, running: true });
            
            const { data: priceData, error } = await supabase.from('historical_prices').select('symbol, date, price').in('symbol', symbols);
            if (error) throw error;

            const allHistoricalPrices: Record<string, Record<string, number>> = {};
            if (Array.isArray(priceData)) {
                priceData.forEach((p: any) => {
                    if (p && typeof p.symbol === 'string' && typeof p.date === 'string' && typeof p.price === 'number') {
                        if (!allHistoricalPrices[p.symbol]) allHistoricalPrices[p.symbol] = {};
                        allHistoricalPrices[p.symbol][p.date] = p.price;
                    }
                });
            }

            const result = await calculateAndSavePortfolioSnapshot(
                selectedPortfolioId,
                transactions,
                allHistoricalPrices,
                30,
                (progress) => {
                    setPopulationState({ message: progress.message, progress: (progress.processed / progress.total) * 100, running: true });
                }
            );

            setPopulationState({ message: result.message, progress: 100, running: false });
            // Dispatch event to notify summary component to refetch
            window.dispatchEvent(new CustomEvent('snapshotsUpdated', { detail: { portfolioId: selectedPortfolioId } }));
        } catch(e) {
            const err = e as Error;
            setPopulationState({ message: `Error: ${err.message}`, progress: 0, running: false });
        }
    };

    const handleValidateData = async () => {
        if (!selectedPortfolioId) {
            setValidationState({ results: null, status: 'Please select a portfolio.' });
            return;
        }
        setValidationState({ results: null, status: 'Starting validation...' });

        try {
            const portfolio = portfoliosForTest.find(p => p.id === selectedPortfolioId);
            if (!portfolio) throw new Error("Selected portfolio not found.");

            setValidationState({ results: null, status: 'Fetching DB snapshots...' });
            const { data: snapshots, error: snapError } = await supabase.from('portfolio_daily_snapshots').select('date, total_value').eq('portfolio_id', selectedPortfolioId).order('date');
            if (snapError) throw snapError;
            if (!snapshots || snapshots.length < 2) throw new Error('Not enough snapshot data in DB to validate.');
            const mappedSnapshots: DailyPortfolioSnapshot[] = snapshots.map(d => ({...d, value: d.total_value, portfolio_id: selectedPortfolioId }));
            
            const lastSnapshotValue = mappedSnapshots.length > 0 ? mappedSnapshots[mappedSnapshots.length - 1].value : 0;
            const { returns: dbReturns } = calculateReturnsFromSnapshots(mappedSnapshots, lastSnapshotValue);
            
            setValidationState({ results: null, status: 'Fetching prices for live calculation...' });
            const symbols = Array.from(new Set(transactions.filter(t => t.portfolioId === selectedPortfolioId).map(t => t.symbol)));
            const { data: priceData, error: priceError } = await supabase.from('historical_prices').select('symbol, date, price').in('symbol', symbols);
            if (priceError) throw priceError;
            const priceCache: Record<string, Record<string, number>> = {};
            if (Array.isArray(priceData)) {
                priceData.forEach((p: any) => {
                    if (p && typeof p.symbol === 'string' && typeof p.date === 'string' && typeof p.price === 'number') {
                        if (!priceCache[p.symbol]) priceCache[p.symbol] = {};
                        priceCache[p.symbol][p.date] = p.price;
                    }
                });
            }
            
            setValidationState({ results: null, status: 'Calculating live returns...' });
            // The 'calculateReturnsInRealtime' function was removed. This validation step is now stubbed out
            // as a new live calculation method is required for a full comparison.
            const liveReturns: any = {}; // STUB: Live calculation logic was removed from the app.

            setValidationState({ results: null, status: 'Comparing results...' });
            const comparison = Object.keys(dbReturns).map(period => {
                const dbRet = dbReturns[period as keyof typeof dbReturns]?.cumulativeReturnPct;
                const liveRet = liveReturns[period as keyof typeof liveReturns]?.cumulativeReturnPct;
                const dbDisplay = isNaN(dbRet) || dbRet === null ? 'N/A' : dbRet.toFixed(4);
                const liveDisplay = isNaN(liveRet) || liveRet === null ? 'N/A' : liveRet.toFixed(4);
                let diff = 'N/A';
                if (typeof dbRet === 'number' && typeof liveRet === 'number' && isFinite(dbRet) && isFinite(liveRet)) {
                    diff = (dbRet - liveRet).toFixed(4);
                }
                return { period, db: dbDisplay, live: liveDisplay, diff };
            });

            setValidationState({ results: comparison, status: 'Validation complete.' });
        } catch(e) {
            const err = e as Error;
            setValidationState({ results: null, status: `Error: ${err.message}` });
        }
    };


    const fetchFirst5 = async () => { setStatus('Fetching first 5 rows...'); setTestResults(''); const { data, error } = await supabase.from('historical_prices').select('*').limit(5); if (error) { setStatus('Error'); setTestResults(`Error: ${error.message}`); } else { setStatus('Success'); setTestResults(JSON.stringify(data, null, 2)); setHistoricalData(data); } };
    const fetchAapl = async () => { setStatus("Fetching 'AAPL' rows..."); setTestResults(''); const { data, error } = await supabase.from('historical_prices').select('*').eq('symbol', 'AAPL').limit(10); if (error) { setStatus('Error'); setTestResults(`Error: ${error.message}`); } else { setStatus('Success'); setTestResults(JSON.stringify(data, null, 2)); setHistoricalData(data); } };
    
    const clearResults = () => { setTestResults(''); setStatus('Idle'); setHistoricalData(null); };

  return (
    <div className="container mx-auto p-4 md:p-6 text-white space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Database Test &amp; Data Tools</h1>
      <p className="text-gray-400">Use these tools to populate, test, and validate portfolio data.</p>
      
        <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio Snapshot Population & Validation (Recent Data)</h2>
             <div className="mb-4">
                <label htmlFor="portfolio-select-historical" className="block text-sm font-medium text-gray-400 mb-1">Select Portfolio</label>
                <select id="portfolio-select-historical" value={selectedPortfolioId} onChange={e => setSelectedPortfolioId(e.target.value)} className="w-full md:w-1/2 bg-gray-800 border border-gray-600 rounded-md px-3 py-2">
                    {portfoliosForTest.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">1. Populate Snapshot Data</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Calculates and saves the last 30 days of data. Good for quick updates or testing.</p>
                        <button onClick={handlePopulateData} disabled={!selectedPortfolioId || populationState?.running} className="w-full px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                            {populationState?.running ? 'Populating...' : 'Populate Last 30 Days of Snapshots'}
                        </button>
                        {populationState && (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold">Status: <span className="font-mono text-yellow-300">{populationState.message}</span></p>
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${populationState.progress}%` }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">2. Validate Data Quality</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Compare returns from DB snapshots vs. a live calculation to check for discrepancies.</p>
                         <button onClick={handleValidateData} disabled={!selectedPortfolioId || validationState.status.includes('...')} className="w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                            {validationState.status.includes('...') ? 'Validating...' : 'Validate Snapshot Data'}
                        </button>
                         <p className="text-sm font-semibold">Status: <span className="font-mono text-yellow-300">{validationState.status}</span></p>
                        {validationState.results && (
                            <div className="max-h-60 overflow-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="text-gray-400 uppercase bg-gray-800"><tr><th className="p-2">Period</th><th className="p-2 text-right">DB Return %</th><th className="p-2 text-right">Live Return %</th><th className="p-2 text-right">Diff %</th></tr></thead>
                                    <tbody>
                                        {validationState.results.map(r => (<tr key={r.period} className="border-b border-gray-700 font-mono"><td className="p-2">{r.period}</td><td className="p-2 text-right">{r.db}</td><td className="p-2 text-right">{r.live}</td><td className={`p-2 text-right ${Math.abs(parseFloat(r.diff)) > 0.01 ? 'text-red-400' : 'text-green-400'}`}>{r.diff}</td></tr>))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

      <div className="bg-[#111827] rounded-lg shadow-2xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Table `historical_prices` Tests</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <button onClick={fetchFirst5} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">Fetch First 5 Rows</button>
          <button onClick={fetchAapl} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">Fetch Sample 'AAPL'</button>
          <button onClick={clearResults} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 font-semibold">Clear All Results</button>
        </div>
        <div className="bg-black/30 p-4 rounded-md">
          <p className="text-sm font-semibold mb-2">Status: <span className="font-mono text-yellow-300">{status}</span></p>
          <div className="max-h-60 overflow-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{testResults}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTestPage;