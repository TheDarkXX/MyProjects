

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Portfolio, Transaction } from '../types';
import Sidebar from './Sidebar';
import TransactionFormModal from './TransactionFormModal';
import { formatToUserTimezone } from '../lib/logging';
import Tabs from './Tabs';
import AIAgentTab from './AIAgentTab';
import BulkTransactionModal from './BulkTransactionModal';

interface PortfolioFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string, initial_cash: number, icon: string, color_hex: string, description: string }) => void;
  portfolioToEdit: Portfolio | null;
}

const PortfolioFormModal: React.FC<PortfolioFormModalProps> = ({ isOpen, onClose, onSave, portfolioToEdit }) => {
    const [name, setName] = useState('');
    const [initialCash, setInitialCash] = useState(0);
    const [icon, setIcon] = useState('📁');
    const [color, setColor] = useState('#64748B');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (portfolioToEdit) {
                setName(portfolioToEdit.name);
                setInitialCash(portfolioToEdit.initial_cash || 0);
                setIcon(portfolioToEdit.icon || '📁');
                setColor(portfolioToEdit.color_hex || '#64748B');
                setDescription(portfolioToEdit.description || '');
            } else {
                setName('');
                setInitialCash(0);
                setIcon('📁');
                setColor('#64748B');
                setDescription('');
            }
        }
    }, [isOpen, portfolioToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave({ name: name.trim(), initial_cash: initialCash, icon, color_hex: color, description: description.trim() });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-[#111827] border border-gray-700 rounded-lg shadow-2xl w-full max-w-md p-6 text-white animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <h2 className="text-xl font-bold mb-6">{portfolioToEdit ? 'Edit Portfolio' : 'Create New Portfolio'}</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="portfolioName" className="block text-sm font-medium text-gray-400">Portfolio Name</label>
                            <input type="text" id="portfolioName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2" required autoFocus />
                        </div>
                         <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-400">Description (Optional)</label>
                            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2" />
                        </div>
                        <div>
                            <label htmlFor="initialCash" className="block text-sm font-medium text-gray-400">Initial Cash</label>
                            <input type="number" id="initialCash" value={initialCash} onChange={e => setInitialCash(parseFloat(e.target.value) || 0)} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label htmlFor="icon" className="block text-sm font-medium text-gray-400">Icon (Emoji)</label>
                                <input type="text" id="icon" value={icon} onChange={e => setIcon(e.target.value)} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-center" maxLength={2} />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="color" className="block text-sm font-medium text-gray-400">Color</label>
                                <input type="color" id="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1 block w-full h-10 bg-gray-900 border border-gray-600 rounded-md p-1" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 font-semibold">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">{portfolioToEdit ? 'Save Changes' : 'Create Portfolio'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeletePortfolioConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  portfolioName: string;
}> = ({ isOpen, onClose, onConfirm, portfolioName }) => {
  const [confirmName, setConfirmName] = useState('');
  const isMatch = confirmName === portfolioName;

  useEffect(() => {
    if (isOpen) {
      setConfirmName('');
    }
  }, [isOpen, portfolioName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-[#111827] border border-gray-700 rounded-lg shadow-2xl w-full max-w-md p-6 text-white animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Delete Portfolio</h2>
        <p className="text-gray-400 mb-4">This will mark the portfolio as deleted and hide it from view. This action can be reversed in the database.</p>
        <p className="text-sm text-gray-400 mb-2">To confirm, please type the full portfolio name: <strong className="text-yellow-400">{portfolioName}</strong></p>
        <input
          type="text"
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md p-2"
          autoFocus
        />
        <div className="mt-8 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 font-semibold">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={!isMatch} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 font-semibold disabled:bg-red-800 disabled:cursor-not-allowed">Delete Portfolio</button>
        </div>
      </div>
    </div>
  );
};


interface TransactionPageProps {
  portfolios: Portfolio[];
  transactions: Transaction[];
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  onSaveTransaction: (tx: Omit<Transaction, 'id'> & { id?: string }, options?: { silent?: boolean }) => Promise<string | undefined>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onBulkSaveTransactions: (txs: (Omit<Transaction, 'id'> & { id?: string })[]) => Promise<void>;
  onBulkDeleteTransactions: (ids: string[]) => Promise<void>;
  onCreatePortfolio: (data: { name: string; initial_cash: number; icon: string; color_hex: string; description: string; }) => Promise<void>;
  onUpdatePortfolio: (id: string, data: { name: string; initial_cash: number; icon: string; color_hex: string; description: string; }) => Promise<void>;
  onDeletePortfolio: (id: string, name: string) => Promise<void>;
  exchangeRate: number;
  currency: 'USD' | 'THB';
}

type SortKey = keyof Transaction | 'totalValue' | 'note';
type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const SortIcon: React.FC<{ direction?: SortDirection }> = ({ direction }) => {
    if (!direction) return <svg className="w-3 h-3 text-gray-400 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>;
    return direction === 'ascending' ? (
        <svg className="w-3 h-3 text-white inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
    ) : (
        <svg className="w-3 h-3 text-white inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
    );
};

const TransactionPage: React.FC<TransactionPageProps> = ({ 
  portfolios, 
  transactions: allTransactions, 
  selectedPortfolioId, 
  setSelectedPortfolioId, 
  onSaveTransaction, 
  onDeleteTransaction,
  onBulkSaveTransactions,
  onBulkDeleteTransactions,
  onCreatePortfolio,
  onUpdatePortfolio,
  onDeletePortfolio,
  exchangeRate,
  currency
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'descending' });
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const manageMenuRef = useRef<HTMLDivElement>(null);

  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [portfolioToEdit, setPortfolioToEdit] = useState<Portfolio | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('History');
  const [isCurrencyUpdating, setIsCurrencyUpdating] = useState(false);
  const prevCurrencyRef = useRef(currency);

  const [selectedTxIds, setSelectedTxIds] = useState(new Set<string>());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'add' | 'edit'>('add');

  const activePortfolio = useMemo(() => portfolios.find(p => p.id === selectedPortfolioId), [portfolios, selectedPortfolioId]);

  useEffect(() => {
    if (prevCurrencyRef.current !== currency) {
        setIsCurrencyUpdating(true);
        const timer = setTimeout(() => setIsCurrencyUpdating(false), 1500); // match animation duration
        prevCurrencyRef.current = currency;
        return () => clearTimeout(timer);
    }
  }, [currency]);

  useEffect(() => {
      if (portfolios.length > 0 && (!selectedPortfolioId || !portfolios.some(p => p.id === selectedPortfolioId))) {
          const defaultPortfolio = portfolios.find(p => p.name === "Doctorbank Growth") || portfolios[0];
          setSelectedPortfolioId(defaultPortfolio.id);
      }
  }, [portfolios, selectedPortfolioId, setSelectedPortfolioId]);
  
  // Clear selection when portfolio changes
  useEffect(() => {
    setSelectedTxIds(new Set());
  }, [selectedPortfolioId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (manageMenuRef.current && !manageMenuRef.current.contains(event.target as Node)) {
        setIsManageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const displayedTransactions = useMemo(() => {
    if (!selectedPortfolioId) return [];
    return allTransactions.filter(tx => tx.portfolioId === selectedPortfolioId);
  }, [allTransactions, selectedPortfolioId]);

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...displayedTransactions];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const { key, direction } = sortConfig;
        
        let valA: any;
        let valB: any;

        if (key === 'totalValue') {
          valA = a.amount * a.price;
          valB = b.amount * b.price;
        } else if (key === 'date') {
            valA = new Date(a.date).getTime();
            valB = new Date(b.date).getTime();
        } else {
          valA = a[key as keyof Transaction];
          valB = b[key as keyof Transaction];
        }
        
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (valA < valB) return direction === 'ascending' ? -1 : 1;
        if (valA > valB) return direction === 'ascending' ? 1 : -1;
        
        return 0;
      });
    }
    return sortableItems;
  }, [displayedTransactions, sortConfig]);
  
  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (value: number) => {
    const rate = currency === 'THB' ? exchangeRate : 1;
    const convertedValue = value * rate;

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
    return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', options).format(convertedValue);
  };
  
  const handleOpenAddTxModal = () => {
    setEditingTransaction(null);
    setIsTxModalOpen(true);
  };
  
  const handleOpenEditTxModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };
  
  const handleCloseTxModal = () => {
    setIsTxModalOpen(false);
    setEditingTransaction(null);
  }

  const handleOpenCreatePortfolioModal = () => {
    setPortfolioToEdit(null);
    setIsPortfolioModalOpen(true);
  };

  const handleOpenEditPortfolioModal = () => {
      if (activePortfolio) {
          setPortfolioToEdit(activePortfolio);
          setIsPortfolioModalOpen(true);
      }
      setIsManageMenuOpen(false);
  };

  const handleClosePortfolioModal = () => {
      setIsPortfolioModalOpen(false);
      setPortfolioToEdit(null);
  };

  const handleSavePortfolio = (data: { name: string, initial_cash: number, icon: string, color_hex: string, description: string }) => {
      if (portfolioToEdit) {
          onUpdatePortfolio(portfolioToEdit.id, data);
      } else {
          onCreatePortfolio(data);
      }
  };

  const handleEditFromAI = (txData: Partial<Omit<Transaction, 'id' | 'portfolioId'>>) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const dateForInput = now.toISOString().slice(0, 16);

    const modalReadyData: Transaction = {
        id: '', // No ID for a new transaction
        portfolioId: selectedPortfolioId || '',
        date: txData.date ? new Date(txData.date).toISOString() : dateForInput,
        symbol: txData.symbol || '',
        type: txData.type || 'BUY',
        asset: txData.asset || 'Stock',
        amount: txData.amount || 0,
        price: txData.price || 0,
        fee: txData.fee || 0,
        stockType: txData.stockType || null,
        note: txData.note || '',
    };
    setEditingTransaction(modalReadyData);
    setIsTxModalOpen(true);
    setActiveSubTab('History');
  };

  const handleDeleteClick = () => {
      setIsDeleteConfirmOpen(true);
      setIsManageMenuOpen(false);
  };

  const handleDeletePortfolioConfirm = () => {
      if (activePortfolio) {
          onDeletePortfolio(activePortfolio.id, activePortfolio.name);
      }
      setIsDeleteConfirmOpen(false);
  };

  const handleSelect = (txId: string) => {
    setSelectedTxIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(txId)) newSet.delete(txId);
        else newSet.add(txId);
        return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) setSelectedTxIds(new Set(sortedTransactions.map(tx => tx.id)));
      else setSelectedTxIds(new Set());
  };

  const handleOpenBulkAdd = () => {
      setBulkModalMode('add');
      setIsBulkModalOpen(true);
  };

  const handleOpenBulkEdit = () => {
      setBulkModalMode('edit');
      setIsBulkModalOpen(true);
  };
  
  const handleCloseBulkModal = () => {
    setIsBulkModalOpen(false);
    setSelectedTxIds(new Set());
  }

  const handleDeleteSelected = async () => {
      if (selectedTxIds.size === 0) return;
      const { useModalStore } = await import('../stores/modalStore');
      const confirmed = await useModalStore.getState().confirm(
        'ยืนยันการลบรายการธุรกรรม',
        `คุณแน่ใจหรือไม่ว่าต้องการลบ ${selectedTxIds.size} รายการที่เลือก? การกระทำนี้ไม่สามารถย้อนกลับได้`,
        { variant: 'danger', confirmText: 'ลบรายการ' }
      );
      if (confirmed) {
          onBulkDeleteTransactions(Array.from(selectedTxIds));
          setSelectedTxIds(new Set());
      }
  };

  const headers = [
    { key: 'date', label: 'DATE/TIME' },
    { key: 'symbol', label: 'SYMBOL' },
    { key: 'type', label: 'TYPE' },
    { key: 'asset', label: 'ASSET' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'price', label: 'PRICE' },
    { key: 'fee', label: 'FEE' },
    { key: 'totalValue', label: 'TOTAL COST' },
    { key: 'stockType', label: 'STOCK TYPE' },
    { key: 'note', label: 'NOTE' },
  ];

  const financialColumns = ['price', 'fee', 'totalValue'];

  const renderTableBody = () => {
    const currencyFlashClass = isCurrencyUpdating ? 'price-updated-flash' : '';
    if (sortedTransactions.length === 0) {
      return (
        <tr>
          <td colSpan={headers.length + 2} className="text-center py-10 text-gray-500">
            No transactions recorded for this portfolio.
          </td>
        </tr>
      );
    }
    return sortedTransactions.map(tx => (
      <tr key={tx.id} className={`border-b border-gray-800 transition-colors ${selectedTxIds.has(tx.id) ? 'bg-blue-900/40' : 'hover:bg-gray-800/50'}`}>
        <td className="px-2 py-4 w-4">
            <input 
                type="checkbox" 
                checked={selectedTxIds.has(tx.id)} 
                onChange={() => handleSelect(tx.id)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">{formatToUserTimezone(tx.date)}</td>
        <td className="px-6 py-4 font-bold">{tx.symbol}</td>
        <td className={`px-6 py-4 font-semibold ${['BUY', 'DEPOSIT', 'DIVIDEND', 'INTEREST'].includes(tx.type) ? 'text-green-400' : 'text-red-400'}`}>{tx.type}</td>
        <td className="px-6 py-4">{tx.asset}</td>
        <td className="px-6 py-4">{tx.amount.toLocaleString()}</td>
        <td className={`px-6 py-4 col-price ${currencyFlashClass}`}>{formatCurrency(tx.price)}</td>
        <td className={`px-6 py-4 col-price ${currencyFlashClass}`}>{formatCurrency(tx.fee || 0)}</td>
        <td className={`px-6 py-4 col-price ${currencyFlashClass}`}>{formatCurrency(tx.amount * tx.price)}</td>
        <td className="px-6 py-4">{tx.stockType || 'N/A'}</td>
        <td className="px-6 py-4 text-gray-400 max-w-xs truncate" title={tx.note || ''}>{tx.note || '—'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <button 
            onClick={() => handleOpenEditTxModal(tx)}
            className="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded-md" 
            title="Edit Transaction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
          </button>
        </td>
      </tr>
    ));
  };


  return (
    <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-80px)]">
      <Sidebar
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId || ''}
        setSelectedPortfolioId={setSelectedPortfolioId}
        showAllOption={false}
        showTopMovers={false}
      />
      <main className="flex-1 p-4 md:p-6 text-white">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">
                {activePortfolio ? activePortfolio.name : 'Transactions'}
            </h1>
            {activePortfolio && (
                <div className="relative" ref={manageMenuRef}>
                    <button onClick={() => setIsManageMenuOpen(prev => !prev)} className="px-3 py-1.5 text-sm rounded-md bg-gray-700 hover:bg-gray-600 flex items-center gap-2">
                        Manage
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    {isManageMenuOpen && (
                        <div className="absolute left-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20">
                            <button onClick={handleOpenEditPortfolioModal} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700">Edit</button>
                            <button onClick={handleDeleteClick} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/50">Delete</button>
                            <div className="border-t border-gray-600 my-1"></div>
                            <span className="block px-4 py-2 text-sm text-gray-500 cursor-not-allowed">Set Goal</span>
                        </div>
                    )}
                </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
             <button
              onClick={() => setActiveSubTab('AI Agent')}
              disabled={!selectedPortfolioId}
              className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span>Bulk Order (AI)</span>
            </button>
             <button 
              onClick={handleOpenAddTxModal} 
              disabled={!selectedPortfolioId}
              className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              <span>Add Transaction</span>
            </button>
            <button 
                onClick={handleOpenCreatePortfolioModal}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold flex items-center justify-center space-x-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /><path d="M10.5 10a.5.5 0 00-1 0v1.5H8a.5.5 0 000 1h1.5V14a.5.5 0 001 0v-1.5H12a.5.5 0 000-1h-1.5V10z" /></svg>
                <span>Create Portfolio</span>
            </button>
          </div>
        </div>

        <Tabs tabs={['History', 'AI Agent']} activeTab={activeSubTab} setActiveTab={setActiveSubTab} />

        <div className="mt-6">
            {activeSubTab === 'History' && (
                <>
                <div className="flex items-center space-x-3 mb-4">
                    <button onClick={handleOpenBulkAdd} disabled={!selectedPortfolioId} className="px-3 py-1.5 text-sm rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Bulk Add</button>
                    <button onClick={handleOpenBulkEdit} disabled={selectedTxIds.size === 0} className="px-3 py-1.5 text-sm rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Bulk Edit ({selectedTxIds.size})</button>
                    <button onClick={handleDeleteSelected} disabled={selectedTxIds.size === 0} className="px-3 py-1.5 text-sm rounded-md bg-red-800 hover:bg-red-700 text-red-100 disabled:opacity-50 disabled:cursor-not-allowed">Delete ({selectedTxIds.size})</button>
                </div>
                 <div className="bg-[#111827] rounded-lg shadow-2xl overflow-x-auto">
                    <table className="w-full text-base text-left text-gray-300">
                        <thead className="text-sm text-gray-400 uppercase bg-[#1A2233]">
                        <tr>
                            <th scope="col" className="px-2 py-3 w-4">
                                <input 
                                    type="checkbox" 
                                    onChange={handleSelectAll} 
                                    checked={sortedTransactions.length > 0 && selectedTxIds.size === sortedTransactions.length}
                                    disabled={sortedTransactions.length === 0}
                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                />
                            </th>
                            {headers.map(header => (
                            <th key={header.key} scope="col" className={`px-6 py-3 whitespace-nowrap cursor-pointer hover:bg-gray-700/50 transition-colors ${financialColumns.includes(header.key) ? 'col-header-price' : ''}`} onClick={() => requestSort(header.key as SortKey)}>
                                <div className="flex items-center">
                                    {header.label}
                                    <SortIcon direction={sortConfig?.key === header.key ? sortConfig.direction : undefined} />
                                </div>
                            </th>
                            ))}
                            <th scope="col" className="px-6 py-3 whitespace-nowrap">ACTIONS</th>
                        </tr>
                        </thead>
                        <tbody>
                        {renderTableBody()}
                        </tbody>
                    </table>
                </div>
                </>
            )}
            {activeSubTab === 'AI Agent' && (
                <AIAgentTab
                    selectedPortfolioId={selectedPortfolioId || ''}
                    onSaveTransaction={async (tx) => { await onSaveTransaction(tx); }}
                    onEditInFormRequest={handleEditFromAI}
                    transactions={allTransactions}
                    exchangeRate={exchangeRate}
                />
            )}
        </div>
      </main>
      <TransactionFormModal
        isOpen={isTxModalOpen}
        onClose={handleCloseTxModal}
        onSave={async (tx) => { await onSaveTransaction(tx); }}
        onDelete={onDeleteTransaction}
        transactionToEdit={editingTransaction}
        selectedPortfolioId={selectedPortfolioId || ''}
        exchangeRate={exchangeRate}
      />
      <BulkTransactionModal
        isOpen={isBulkModalOpen}
        onClose={handleCloseBulkModal}
        onSave={onBulkSaveTransactions}
        mode={bulkModalMode}
        initialTransactions={bulkModalMode === 'edit' ? sortedTransactions.filter(tx => selectedTxIds.has(tx.id)) : undefined}
        selectedPortfolioId={selectedPortfolioId || ''}
        exchangeRate={exchangeRate}
      />
      <PortfolioFormModal
        isOpen={isPortfolioModalOpen}
        onClose={handleClosePortfolioModal}
        onSave={handleSavePortfolio}
        portfolioToEdit={portfolioToEdit}
      />
      <DeletePortfolioConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeletePortfolioConfirm}
        portfolioName={activePortfolio?.name || ''}
      />
    </div>
  );
};

export default TransactionPage;