
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PortfolioItem, SummaryData } from '../types';

type SortKey = keyof PortfolioItem;
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const getColumnClass = (key: SortKey): string => {
  switch (key) {
    case 'lastPrice':
    case 'avgCost':
    case 'totalCost':
    case 'currentValue':
      return 'col-price';
    case 'quantity':
    case 'portfolioPercent':
      return 'col-alloc';
    case 'sector':
    case 'assetType':
      return 'col-meta';
    default:
      return '';
  }
};

const getHeaderClass = (key: SortKey): string => {
  switch (key) {
    case 'lastPrice':
    case 'avgCost':
    case 'totalCost':
    case 'currentValue':
      return 'col-header-price';
    case 'dayChangePercent':
    case 'dayReturn':
    case 'totalReturn':
    case 'totalReturnPercent':
      return 'col-header-meta'; // Neutral for performance headers
    case 'quantity':
    case 'portfolioPercent':
      return 'col-header-alloc';
    case 'sector':
    case 'assetType':
      return 'col-header-meta';
    default:
      return '';
  }
};


const useSortableData = (items: PortfolioItem[], config: SortConfig | null) => {
  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (config !== null) {
      const parseValue = (value: any) => {
        if (typeof value !== 'string') return value;
        const num = parseFloat(value.replace(/[,%]/g, ''));
        return isNaN(num) ? value : num;
      };

      sortableItems.sort((a, b) => {
        const key = config.key;
        const valA = parseValue(a[key]);
        const valB = parseValue(b[key]);

        if (valA < valB) {
          return config.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return config.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, config]);

  return sortedItems;
};

const SortIcon: React.FC<{ direction?: SortDirection | 'none' }> = ({ direction }) => {
    const iconClasses = "w-4 h-4 ml-2";
    if (direction === 'ascending') return <span aria-hidden="true" className={iconClasses}>▲</span>;
    if (direction === 'descending') return <span aria-hidden="true" className={iconClasses}>▼</span>;
    return <span aria-hidden="true" className={`${iconClasses} text-gray-600`}>↕</span>;
};


interface PortfolioTableProps {
  portfolioId: string;
  data: PortfolioItem[];
  cash: SummaryData;
  total: SummaryData;
  currency: 'USD' | 'THB';
  exchangeRate: number;
  onDeleteStock: (portfolioId: string, symbol: string) => void;
  justUpdatedSymbols: Set<string>;
  visibleColumns: Set<string>;
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({ portfolioId, data, cash, total, currency, exchangeRate, onDeleteStock, justUpdatedSymbols, visibleColumns }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'dayChangePercent', direction: 'descending' });
  const [sortAnnouncement, setSortAnnouncement] = useState('');
  const sortedData = useSortableData(data, sortConfig);
  const tableRef = useRef<HTMLTableElement>(null);

  const requestSort = (key: SortKey, label: string) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setSortAnnouncement(`Sorted by ${label} ${direction}`);
  };
  
  const getAriaSort = (key: SortKey): 'ascending' | 'descending' | 'none' => {
      if (!sortConfig || sortConfig.key !== key) return 'none';
      return sortConfig.direction;
  };

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        const activeEl = document.activeElement;
        if (!activeEl || !table.contains(activeEl)) return;

        const currentCell = activeEl.closest('td, th');
        if (!currentCell) return;
        
        const currentRow = currentCell.parentElement as HTMLTableRowElement;
        const visibleCells = Array.from(currentRow.cells).filter(cell => !cell.classList.contains('hidden-column'));
        const currentVisibleIndex = visibleCells.indexOf(currentCell as HTMLTableCellElement);

        let nextCell: HTMLElement | null = null;

        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                if (currentVisibleIndex < visibleCells.length - 1) {
                    nextCell = visibleCells[currentVisibleIndex + 1];
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (currentVisibleIndex > 0) {
                    nextCell = visibleCells[currentVisibleIndex - 1];
                }
                break;
            case 'Enter':
                 if (currentCell.tagName === 'TH' && currentCell.closest('thead')) {
                    e.preventDefault();
                    currentCell.querySelector('button')?.click();
                 }
                 break;
        }

        if (nextCell) {
            const focusable = nextCell.querySelector('button') || nextCell;
            focusable.focus();
        }
    };

    table.addEventListener('keydown', handleKeyDown);
    const cells = table.querySelectorAll('tbody td, tbody th[scope="row"]');
    cells.forEach(cell => cell.setAttribute('tabindex', '-1'));
    
    return () => {
        if (table) {
            table.removeEventListener('keydown', handleKeyDown);
        }
    };
  }, [sortedData, visibleColumns]);

  const formatCurrency = (value: number) => {
    const rate = currency === 'THB' ? exchangeRate : 1;
    const options: Intl.NumberFormatOptions = {};

    if (currency === 'THB') {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }

    return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', options).format(value * rate);
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const headers: { key: SortKey; label: string; isNumeric?: boolean }[] = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'lastPrice', label: 'Last Price', isNumeric: true },
    { key: 'dayChangePercent', label: 'Day Change %', isNumeric: true },
    { key: 'dayReturn', label: 'Day Return', isNumeric: true },
    { key: 'totalReturn', label: 'Total Return', isNumeric: true },
    { key: 'totalReturnPercent', label: 'Total Return %', isNumeric: true},
    { key: 'quantity', label: 'Quantity', isNumeric: true },
    { key: 'avgCost', label: 'Avg Cost', isNumeric: true },
    { key: 'totalCost', label: 'Total Cost', isNumeric: true },
    { key: 'currentValue', label: 'Current Value', isNumeric: true },
    { key: 'portfolioPercent', label: 'Portfolio %', isNumeric: true },
    { key: 'sector', label: 'Sector' },
    { key: 'assetType', label: 'Asset Type' },
  ];

  const renderValue = (item: PortfolioItem, key: SortKey) => {
      const value = item[key];
      if (value === null || value === undefined) return '—';
      if (typeof value !== 'number') return value || '—';

      switch(key) {
        case 'lastPrice':
        case 'dayChange':
        case 'dayReturn':
        case 'totalReturn':
        case 'avgCost':
        case 'totalCost':
        case 'currentValue':
          return formatCurrency(value);
        case 'dayChangePercent':
        case 'totalReturnPercent':
        case 'portfolioPercent':
          return formatPercent(value);
        case 'quantity':
            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
        default:
          return value;
      }
  };

  const stocksTotalData = {
      dayReturn: data.reduce((sum, s) => sum + s.dayReturn, 0),
      totalReturn: data.reduce((sum, s) => sum + s.totalReturn, 0),
      totalCost: data.reduce((sum, s) => sum + s.totalCost, 0),
      currentValue: data.reduce((sum, s) => sum + s.currentValue, 0),
      totalReturnPercent: data.reduce((sum, s) => sum + s.totalCost, 0) > 0 ? (data.reduce((sum, s) => sum + s.totalReturn, 0) / data.reduce((sum, s) => sum + s.totalCost, 0)) * 100 : 0,
      portfolioPercent: total.currentValue > 0 ? (data.reduce((sum, s) => sum + s.currentValue, 0) / total.currentValue) * 100 : 0,
  };
  

  return (
    <>
      <div aria-live="polite" className="sr-only">
        {sortAnnouncement}
      </div>
      <div className="overflow-x-auto">
        <table ref={tableRef} tabIndex={0} className="w-full text-sm text-left text-gray-300 border-collapse">
          <thead className="text-[15px] font-medium text-[#9AA4B2]">
            <tr>
              {headers.map(({ key, label, isNumeric }, index) => (
                <th
                  scope="col"
                  key={key}
                  aria-sort={getAriaSort(key)}
                  className={`p-2.5 sticky top-0 z-20 border-b border-white/10 whitespace-nowrap
                    ${isNumeric ? 'text-right' : 'text-left'}
                    ${index === 0 ? 'sticky left-0 z-30' : ''}
                    ${!visibleColumns.has(key) ? 'hidden-column' : ''}
                    ${getHeaderClass(key)}`}
                >
                  <button
                    onClick={() => requestSort(key, label)}
                    className="flex items-center w-full"
                  >
                    <span className="flex-1">{label}</span>
                    <SortIcon direction={getAriaSort(key)} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-base text-[#E5E7EB]">
            {sortedData.map((item) => {
              const isJustUpdated = justUpdatedSymbols.has(item.symbol);
              const updatedCells = ['lastPrice', 'dayChangePercent', 'dayReturn', 'currentValue'];

              return (
              <tr key={item.symbol} className="transition-colors duration-150">
                <th scope="row" className="p-2.5 font-medium text-left sticky left-0 z-10">
                  <div className="font-semibold">{item.symbol}</div>
                  <div className="text-xs text-[#9AA4B2] opacity-70 truncate max-w-[150px]">{item.name}</div>
                </th>
                <td className={`p-2.5 text-right num ${isJustUpdated && updatedCells.includes('lastPrice') ? 'price-updated-flash' : ''} ${!visibleColumns.has('lastPrice') ? 'hidden-column' : ''} ${getColumnClass('lastPrice')}`}>{renderValue(item, 'lastPrice')}</td>
                <td className={`p-2.5 text-right num ${item.dayChangePercent >= 0 ? 'text-green-400' : 'text-red-500'} ${isJustUpdated && updatedCells.includes('dayChangePercent') ? 'price-updated-flash' : ''} ${!visibleColumns.has('dayChangePercent') ? 'hidden-column' : ''} ${item.dayChangePercent >= 0 ? 'col-perf-pos' : 'col-perf-neg'}`}>
                    {renderValue(item, 'dayChangePercent')}
                </td>
                <td className={`p-2.5 text-right num ${item.dayReturn >= 0 ? 'text-green-400' : 'text-red-500'} ${isJustUpdated && updatedCells.includes('dayReturn') ? 'price-updated-flash' : ''} ${!visibleColumns.has('dayReturn') ? 'hidden-column' : ''} ${item.dayReturn >= 0 ? 'col-perf-pos' : 'col-perf-neg'}`}>
                    {renderValue(item, 'dayReturn')}
                </td>
                <td className={`p-2.5 text-right num ${item.totalReturn >= 0 ? 'text-green-400' : 'text-red-500'} ${!visibleColumns.has('totalReturn') ? 'hidden-column' : ''} ${item.totalReturn >= 0 ? 'col-perf-pos' : 'col-perf-neg'}`}>
                    {renderValue(item, 'totalReturn')}
                </td>
                <td className={`p-2.5 text-right num ${item.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-500'} ${!visibleColumns.has('totalReturnPercent') ? 'hidden-column' : ''} ${item.totalReturnPercent >= 0 ? 'col-perf-pos' : 'col-perf-neg'}`}>
                    {renderValue(item, 'totalReturnPercent')}
                </td>
                <td className={`p-2.5 text-right num ${!visibleColumns.has('quantity') ? 'hidden-column' : ''} ${getColumnClass('quantity')}`}>{renderValue(item, 'quantity')}</td>
                <td className={`p-2.5 text-right num ${!visibleColumns.has('avgCost') ? 'hidden-column' : ''} ${getColumnClass('avgCost')}`}>{renderValue(item, 'avgCost')}</td>
                <td className={`p-2.5 text-right num ${!visibleColumns.has('totalCost') ? 'hidden-column' : ''} ${getColumnClass('totalCost')}`}>{renderValue(item, 'totalCost')}</td>
                <td className={`p-2.5 text-right num ${isJustUpdated && updatedCells.includes('currentValue') ? 'price-updated-flash' : ''} ${!visibleColumns.has('currentValue') ? 'hidden-column' : ''} ${getColumnClass('currentValue')}`}>{renderValue(item, 'currentValue')}</td>
                <td className={`p-2.5 text-right num ${!visibleColumns.has('portfolioPercent') ? 'hidden-column' : ''} ${getColumnClass('portfolioPercent')}`}>{renderValue(item, 'portfolioPercent')}</td>
                <td className={`p-2.5 text-left text-[#9AA4B2] opacity-70 ${!visibleColumns.has('sector') ? 'hidden-column' : ''} ${getColumnClass('sector')}`}>{item.sector || '—'}</td>
                <td className={`p-2.5 text-left text-[#9AA4B2] opacity-70 ${!visibleColumns.has('assetType') ? 'hidden-column' : ''} ${getColumnClass('assetType')}`}>{item.assetType || '—'}</td>
              </tr>
            )})}
          </tbody>
          <tfoot className="text-gray-200">
            <tr className="summary-row-cash" style={{fontSize: '14.5px', fontWeight: 500}}>
              <th scope="row" className="p-2.5 text-left font-medium sticky left-0 z-10">Cash</th>
              <td className={`p-2.5 ${!visibleColumns.has('lastPrice') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('dayChangePercent') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('dayReturn') ? 'hidden-column' : ''}`}>—</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalReturn') ? 'hidden-column' : ''}`}>—</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalReturnPercent') ? 'hidden-column' : ''}`}>—</td>
              <td className={`p-2.5 ${!visibleColumns.has('quantity') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('avgCost') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalCost') ? 'hidden-column' : ''}`}>—</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('currentValue') ? 'hidden-column' : ''}`}>{formatCurrency(cash.currentValue)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('portfolioPercent') ? 'hidden-column' : ''}`}>{formatPercent(cash.portfolioPercent)}</td>
              <td className={`p-2.5 ${!visibleColumns.has('sector') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('assetType') ? 'hidden-column' : ''}`}>Cash</td>
            </tr>
            <tr className="summary-row-stocks" style={{fontSize: '15px', fontWeight: 600, color: '#F1F5F9'}}>
              <th scope="row" className="p-2.5 text-left font-semibold sticky left-0 z-10">Stocks Total</th>
              <td className={`p-2.5 ${!visibleColumns.has('lastPrice') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('dayChangePercent') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('dayReturn') ? 'hidden-column' : ''} ${stocksTotalData.dayReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(stocksTotalData.dayReturn)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalReturn') ? 'hidden-column' : ''} ${stocksTotalData.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(stocksTotalData.totalReturn)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalReturnPercent') ? 'hidden-column' : ''} ${stocksTotalData.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(stocksTotalData.totalReturnPercent)}</td>
              <td className={`p-2.5 ${!visibleColumns.has('quantity') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('avgCost') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalCost') ? 'hidden-column' : ''}`}>{formatCurrency(stocksTotalData.totalCost)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('currentValue') ? 'hidden-column' : ''}`}>{formatCurrency(stocksTotalData.currentValue)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('portfolioPercent') ? 'hidden-column' : ''}`}>{formatPercent(stocksTotalData.portfolioPercent)}</td>
              <td className={`p-2.5 ${!visibleColumns.has('sector') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('assetType') ? 'hidden-column' : ''}`}></td>
            </tr>
            <tr className="summary-row-total" style={{fontSize: '17px', fontWeight: 700, color: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'}}>
              <th scope="row" className="p-2.5 text-left font-bold sticky left-0 z-10">Total Portfolio Value</th>
              <td className={`p-2.5 ${!visibleColumns.has('lastPrice') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('dayChangePercent') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('dayReturn') ? 'hidden-column' : ''} ${total.dayReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(total.dayReturn)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalReturn') ? 'hidden-column' : ''} ${total.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(total.totalReturn)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalReturnPercent') ? 'hidden-column' : ''} ${total.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(total.totalReturnPercent)}</td>
              <td className={`p-2.5 ${!visibleColumns.has('quantity') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('avgCost') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('totalCost') ? 'hidden-column' : ''}`}>{formatCurrency(total.totalCost)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('currentValue') ? 'hidden-column' : ''}`}>{formatCurrency(total.currentValue)}</td>
              <td className={`p-2.5 text-right num ${!visibleColumns.has('portfolioPercent') ? 'hidden-column' : ''}`}>{formatPercent(total.portfolioPercent)}</td>
              <td className={`p-2.5 ${!visibleColumns.has('sector') ? 'hidden-column' : ''}`}></td>
              <td className={`p-2.5 ${!visibleColumns.has('assetType') ? 'hidden-column' : ''}`}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};

export default PortfolioTable;
