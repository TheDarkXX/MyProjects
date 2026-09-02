import { create } from 'zustand';
import { api } from '../services/api';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  verify: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('stock_auth_token'),
  token: localStorage.getItem('stock_auth_token'),
  loading: false,

  login: async (password: string) => {
    set({ loading: true });
    try {
      const { token } = await api.auth.login(password);
      localStorage.setItem('stock_auth_token', token);
      set({ isAuthenticated: true, token, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('stock_auth_token');
    set({ isAuthenticated: false, token: null });
  },

  verify: async () => {
    try {
      await api.auth.verify();
    } catch {
      localStorage.removeItem('stock_auth_token');
      set({ isAuthenticated: false, token: null });
    }
  }
}));
