import React, { useMemo, useState, useEffect } from 'react';
import { Portfolio, SnapshotBackfillStatus, Transaction, DisplayMethod } from '../types';
import { usePortfolioSummary, UsePortfolioSummaryReturn, PeriodReturns } from '../hooks/usePortfolioSummary';

interface PortfolioReturnsSummaryProps {
    portfolio: Portfolio;
    transactions: Transaction[];
    rawPriceDataCache: Record<string, Record<string, Record<string, number>>>;
    snapshotBackfillStatus: SnapshotBackfillStatus | null;
    currency: 'USD' | 'THB';
    exchangeRate: number;
    displayMethod: DisplayMethod;
    onDisplayMethodChange: (method: DisplayMethod) => void;
}

// --- Helper UI Components ---
const InfoIcon: React.FC<{ tooltipText: string }> = ({ tooltipText }) => (
    <div className="group relative inline-block ml-1.5 text-gray-500 cursor-help">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 p-2 text-xs text-left bg-gray-900 text-gray-300 border border-gray-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-pre-wrap">{tooltipText}</div>
    </div>
);

const SnapshotStatusIndicator: React.FC<{ status: SnapshotBackfillStatus | null }> = ({ status }) => {
    if (!status || status.phase === 'idle' || (status.phase === 'complete' && !status.message.includes('up-to-date'))) return null;
    let text = status.message;
    if (status.phase === 'calculating' && status.details) text = `Calculating historical performance... (${status.details.processedDays}/${status.details.totalDays} days)`;
    const isWorking = status.phase === 'checking' || status.phase === 'calculating' || status.phase === 'saving';
    return (
        <div className={`flex items-center space-x-2 text-xs px-3 py-1 rounded-full border transition-opacity duration-300 ${isWorking ? 'border-blue-700 bg-blue-900/50 text-blue-300 animate-pulse' : 'border-green-700 bg-green-900/50 text-green-300'}`}>
            {isWorking ? (<svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>)}
            <span>{text}</span>
            {status.phase === 'calculating' && status.progress !== undefined && (<div className="w-16 bg-gray-700 rounded-full h-1.5 ml-2"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${status.progress}%` }}></div></div>)}
        </div>
    );
};


// --- Main Component ---
const PortfolioReturnsSummary: React.FC<PortfolioReturnsSummaryProps> = (props) => {
    const { displayMethod, onDisplayMethodChange } = props;

    const { returns, loading, lastUpdated, dataQuality } = usePortfolioSummary(
        props.portfolio,
        props.transactions,
        props.rawPriceDataCache,
        displayMethod
    );

    const formatCurrency = (value: number) => {
        if (isNaN(value)) return '--';
        const rate = props.currency === 'THB' ? props.exchangeRate : 1;
        const options: Intl.NumberFormatOptions = {
            style: 'currency',
            currency: props.currency,
        };
        if (props.currency === 'THB') {
            options.minimumFractionDigits = 0;
            options.maximumFractionDigits = 0;
        } else {
            options.minimumFractionDigits = 2;
            options.maximumFractionDigits = 2;
        }
        const formatter = new Intl.NumberFormat(props.currency === 'THB' ? 'th-TH' : 'en-US', options);
        return formatter.format(value * rate);
    };
    
    // --- Period Returns Bar ---
    const ReturnItem: React.FC<{ label: string; data: PeriodReturns[keyof PeriodReturns]; displayMethod?: DisplayMethod }> = ({ label, data, displayMethod }) => {
        if (!data) return (<div className="text-center px-4 py-4 flex-1"><div className="text-base text-gray-400">{label}</div><div className="text-3xl font-bold text-gray-500">-</div></div>);
        const { cumulativeReturnPct, absoluteReturn, warnings = [], notes = [] } = data;
        let tooltip = `${notes.join("\n")}`;
        if (warnings.length > 0) tooltip += `\n\nWarnings:\n- ${warnings.join("\n- ")}`;

        const methodName = displayMethod === 'TWR' ? '(Time-Weighted)' : '(Simple)';

        return (
            <div className="text-center px-4 py-4 flex-1 flex flex-col justify-center relative transition-transform duration-300 ease-in-out hover:scale-110 hover:z-10">
                <div className="text-base text-gray-400 flex items-center justify-center">
                    {label}{label === 'Total' ? ' Return' : ''}
                    {label === 'Total' && displayMethod && <span className="text-xs ml-1.5">{methodName}</span>}
                    <InfoIcon tooltipText={tooltip} />
                </div>
                {cumulativeReturnPct !== null && isFinite(cumulativeReturnPct) ? (
                    <>
                        <div className={`text-3xl font-bold ${cumulativeReturnPct >= 0 ? 'text-green-400' : 'text-red-500'}`}>{cumulativeReturnPct.toFixed(2)}%</div>
                        <div className={`text-base mt-1 ${cumulativeReturnPct >= 0 ? 'text-green-400/80' : 'text-red-500/80'}`}>{formatCurrency(absoluteReturn)}</div>
                    </>
                ) : (<div className="text-3xl font-bold text-yellow-400" title={warnings.join('\n')}>--</div>)}
            </div>
        );
    };

    const dataStatusMessage = () => {
        if (loading.isCalculatingLive) return 'Calculating live performance data...';
        if (lastUpdated) return `Source: Live Calculation (as of ${lastUpdated})`;
        if (dataQuality === 'empty') return 'No historical data found. Use Snapshot Generator.';
        return '';
    };

    const isLoading = loading.isCalculatingLive;

    return (
        <div className="space-y-6">
            <div className="flex justify-end min-h-[28px]"><SnapshotStatusIndicator status={props.snapshotBackfillStatus} /></div>
            
            <div className="bg-[#1A2233] border border-gray-700/50 rounded-lg shadow-lg">
                <div className="flex flex-wrap justify-around items-stretch divide-x divide-gray-700/50">
                    {isLoading ? (Array.from({ length: 8 }).map((_, i) => (<div key={i} className="text-center px-4 py-4 flex-1 animate-pulse"><div className="h-4 bg-gray-700 rounded w-12 mx-auto mb-2"></div><div className="h-9 bg-gray-600 rounded w-20 mx-auto"></div></div>))) 
                    : (<>
                        <ReturnItem label="1D" data={returns?.['1D']} />
                        <ReturnItem label="1W" data={returns?.['1W']} />
                        <ReturnItem label="1M" data={returns?.['1M']} />
                        <ReturnItem label="3M" data={returns?.['3M']} />
                        <ReturnItem label="6M" data={returns?.['6M']} />
                        <ReturnItem label="YTD" data={returns?.['YTD']} />
                        <ReturnItem label="1Y" data={returns?.['1Y']} />
                        <ReturnItem label="Total" data={returns?.['Total']} displayMethod={displayMethod} />
                       </>)}
                </div>
                <div className="flex justify-between items-center text-right text-xs text-gray-500 pr-3 pb-1.5 pl-3 font-mono h-8">
                    <div className="flex items-center bg-gray-800/60 border border-gray-700 p-0.5 rounded-md text-sm">
                        <button onClick={() => onDisplayMethodChange('TWR')} className={`px-2 py-0.5 rounded-md text-xs transition-colors ${displayMethod === 'TWR' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>Time-Weighted</button>
                        <button onClick={() => onDisplayMethodChange('SIMPLE')} className={`px-2 py-0.5 rounded-md text-xs transition-colors ${displayMethod === 'SIMPLE' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-700'}`}>Simple Return</button>
                    </div>
                    {!isLoading && (<div className="flex items-center justify-end">{dataStatusMessage()}</div>)}
                </div>
            </div>
        </div>
    );
};

export default PortfolioReturnsSummary;
