
import React, { useState, useMemo } from 'react';
import { AlphaPickItem } from '../types';

type SortKey = keyof AlphaPickItem | 'pickedDateParsed';
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const useSortableData = (items: AlphaPickItem[], config: SortConfig | null) => {
  const sortedItems = useMemo(() => {
    let sortableItems = [...items].map(item => ({
        ...item,
        pickedDateParsed: new Date(item.pickedDate).getTime()
    }));

    if (config !== null) {
      sortableItems.sort((a, b) => {
        const key = config.key;
        if (a[key] < b[key]) {
          return config.direction === 'ascending' ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return config.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, config]);

  return sortedItems;
};


const SortIcon: React.FC<{ direction?: SortDirection }> = ({ direction }) => {
    if (!direction) return <svg className="w-3 h-3 text-gray-400 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>;
    return direction === 'ascending' ? (
        <svg className="w-3 h-3 text-white inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
    ) : (
        <svg className="w-3 h-3 text-white inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
    );
};

const RatingBadge: React.FC<{ rating: AlphaPickItem['rating'] }> = ({ rating }) => {
    const baseClasses = "px-2 py-0.5 rounded-full text-xs font-semibold";
    let colorClasses = "";
    switch(rating) {
        case 'Strong Buy':
            colorClasses = "bg-green-600/30 text-green-300";
            break;
        case 'Buy':
            colorClasses = "bg-emerald-600/30 text-emerald-300";
            break;
        case 'Hold':
            colorClasses = "bg-yellow-600/30 text-yellow-300";
            break;
    }
    return <span className={`${baseClasses} ${colorClasses}`}>{rating}</span>
};

const AlphaPickTable: React.FC<{ data: AlphaPickItem[] }> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'holdingPercent', direction: 'descending'});
  const sortedData = useSortableData(data, sortConfig);
  
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig && sortConfig.key === key && sortConfig.direction === 'descending') {
        setSortConfig(null);
        return;
    }
    setSortConfig({ key, direction });
  };
  
  const getSortDirection = (key: SortKey) => {
      if (!sortConfig || sortConfig.key !== key) return undefined;
      return sortConfig.direction;
  };

  const headers: { key: SortKey; label: string; align?: 'right' | 'left' }[] = [
    { key: 'company', label: 'Company' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'pickedDateParsed', label: 'Picked' },
    { key: 'returnPercent', label: 'Return', align: 'right' },
    { key: 'sector', label: 'Sector' },
    { key: 'rating', label: 'Rating' },
    { key: 'holdingPercent', label: 'Holding %', align: 'right' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-orange-200 uppercase bg-black/30 border-b-2 border-orange-800">
          <tr>
            {headers.map(({ key, label, align }) => (
              <th scope="col" key={label} className={`px-4 py-3 whitespace-nowrap text-${align || 'left'} cursor-pointer hover:bg-black/40 transition-colors`} onClick={() => requestSort(key)}>
                {label}
                <SortIcon direction={getSortDirection(key)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr key={`${item.symbol}-${item.pickedDate}`} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
              <td scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">
                {item.company}
              </td>
              <td className="px-4 py-3 font-bold text-blue-400 underline">{item.symbol}</td>
              <td className="px-4 py-3">{item.pickedDate}</td>
              <td className={`px-4 py-3 text-right font-mono ${item.returnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {item.returnPercent.toFixed(2)}%
              </td>
              <td className="px-4 py-3">{item.sector}</td>
              <td className="px-4 py-3">
                <RatingBadge rating={item.rating} />
              </td>
              <td className="px-4 py-3 text-right font-mono">{item.holdingPercent.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AlphaPickTable;
