import { create } from 'zustand';
import { api } from '../services/api';

export interface Transaction {
  id: string;
  portfolio_id: string;
  date: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND' | 'INTEREST';
  asset: string;
  amount: number;
  price: number;
  fee: number;
  stock_type?: string;
  sector?: string;
  note?: string;
  status: string;
}

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  
  fetchTransactions: (portfolioId: string) => Promise<void>;
  addTransaction: (data: Partial<Transaction>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  bulkCreateTransaction: (transactions: Partial<Transaction>[]) => Promise<void>;
  bulkDeleteTransaction: (ids: string[]) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,

  fetchTransactions: async (portfolioId: string) => {
    set({ loading: true });
    try {
      const data = await api.transactions.list(portfolioId);
      set({ transactions: data, loading: false });
    } catch (error) {
      set({ loading: false });
      console.error(error);
    }
  },

  addTransaction: async (data) => {
    const tx = await api.transactions.create(data);
    set((state) => ({ transactions: [tx, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
  },

  updateTransaction: async (id, data) => {
    const updated = await api.transactions.update(id, data);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t))
    }));
  },

  deleteTransaction: async (id) => {
    await api.transactions.delete(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id)
    }));
  },

  bulkCreateTransaction: async (transactions) => {
    const { created } = await api.transactions.bulk('create', { transactions });
    if (created && Array.isArray(created)) {
      set((state) => ({ 
        transactions: [...created, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
      }));
    } else {
      // Fallback: re-fetch if response is just a success message
      const activePortfolioId = transactions[0]?.portfolio_id;
      if (activePortfolioId) {
        get().fetchTransactions(activePortfolioId);
      }
    }
  },

  bulkDeleteTransaction: async (ids) => {
    await api.transactions.bulk('delete', { ids });
    set((state) => ({
      transactions: state.transactions.filter((t) => !ids.includes(t.id))
    }));
  }
}));
