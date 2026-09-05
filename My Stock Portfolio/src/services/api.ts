const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getToken() {
  return localStorage.getItem('stock_auth_token');
}

async function authFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('stock_auth_token');
    window.location.reload(); 
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API Request Failed');
  }

  return data;
}

export const api = {
  auth: {
    login: (password: string) => authFetch('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
    verify: () => authFetch('/auth/verify'),
  },
  portfolios: {
    list: () => authFetch('/portfolios'),
    create: (data: any) => authFetch('/portfolios', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => authFetch(`/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => authFetch(`/portfolios/${id}`, { method: 'DELETE' }),
  },
  transactions: {
    list: (portfolioId?: string) => authFetch(portfolioId ? `/transactions?portfolio_id=${portfolioId}` : '/transactions'),
    create: (data: any) => authFetch('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => authFetch(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => authFetch(`/transactions/${id}`, { method: 'DELETE' }),
    bulk: (action: 'create'|'delete', payload: any) => authFetch('/transactions/bulk', { method: 'POST', body: JSON.stringify({ action, ...payload }) })
  },
  prices: {
    latest: (symbols: string[]) => authFetch('/prices/latest', { method: 'POST', body: JSON.stringify({ symbols }) }),
    historical: (symbols: string[], from: string, to: string) => authFetch('/historical', { method: 'POST', body: JSON.stringify({ symbols, from, to }) }),
    exchangeRate: (from = 'USD', to = 'THB') => authFetch(`/exchange-rate?from=${from}&to=${to}`),
    search: (query: string) => authFetch(`/prices/search?q=${encodeURIComponent(query)}`),
    technicals: (symbol: string) => authFetch(`/prices/technicals/${encodeURIComponent(symbol)}`),
    profile: (symbol: string) => authFetch(`/prices/profile/${encodeURIComponent(symbol)}`),
    fundamentalsBatch: (symbols: string[]) => authFetch(`/prices/fundamentals-batch?symbols=${symbols.join(',')}`),
  },
  metadata: {
    list: (symbols: string[]) => authFetch(`/metadata?symbols=${symbols.join(',')}`),
  },
  snapshots: {
    list: (portfolioId: string) => authFetch(`/snapshots/${portfolioId}`),
    backfill: (portfolioId: string, snapshots: any[]) => authFetch('/snapshots/backfill', { method: 'POST', body: JSON.stringify({ portfolio_id: portfolioId, snapshots }) })
  },
  backup: {
    list: () => authFetch('/backup'),
    create: () => authFetch('/backup', { method: 'POST' }),
  },
  ai: {
    chat: (prompt: string) => authFetch('/ai-chat', { method: 'POST', body: JSON.stringify({ prompt }) }),
    advisor: (mode: string, blueprints: any[], fundamentals: any, portfolio_id: string) => authFetch('/ai-advisor', { method: 'POST', body: JSON.stringify({ mode, blueprints, fundamentals, portfolio_id }) }),
    latestAdvisor: (portfolio_id: string, blueprints: any[]) => authFetch('/ai-advisor/latest', { method: 'POST', body: JSON.stringify({ portfolio_id, blueprints }) }),
  },
  blueprints: {
    list: (portfolioId: string) => authFetch(`/blueprints/${portfolioId}`),
    upsert: (portfolioId: string, data: any) => authFetch(`/blueprints/${portfolioId}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (portfolioId: string, symbol: string, data: any) => authFetch(`/blueprints/${portfolioId}/${symbol}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (portfolioId: string, symbol: string) => authFetch(`/blueprints/${portfolioId}/${symbol}`, { method: 'DELETE' }),
    autoGenerate: (portfolioId: string) => authFetch(`/blueprints/${portfolioId}/auto-generate`, { method: 'POST' }),
  }
};
