const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

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

  const contentType = response.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = { error: 'Invalid JSON response from server' };
    }
  } else {
    const text = await response.text();
    if (!response.ok) {
      if (response.status === 524 || text.includes('524') || text.includes('timeout occurred')) {
        throw new Error('TIMEOUT_524: Cloudflare Timeout (524) การวิเคราะห์ใช้เวลานานกว่า 100 วินาที ระบบกำลังประมวลผลอยู่เบื้องหลัง');
      }
      if (response.status === 504 || response.status === 502) {
        throw new Error(`GATEWAY_ERROR_${response.status}: เซิร์ฟเวอร์กำลังประมวลผลหรือการเชื่อมต่อขัดข้อง (${response.status})`);
      }
      throw new Error(`HTTP Error ${response.status}: ${text.slice(0, 120)}`);
    }
    data = { text };
  }

  if (!response.ok) {
    throw new Error(data.error || `API Request Failed (${response.status})`);
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
    quoteBatch: (symbols: string[]) => authFetch('/prices/quote-batch', { method: 'POST', body: JSON.stringify({ symbols }) }),
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
    advisor: (mode: string, blueprints: any[], fundamentals: any, portfolio_id: string, force = false, actualHoldings?: any) => authFetch('/ai-advisor', { method: 'POST', body: JSON.stringify({ mode, blueprints, fundamentals, portfolio_id, force, actualHoldings }) }),
    latestAdvisor: (portfolio_id: string, blueprints: any[]) => authFetch('/ai-advisor/latest', { method: 'POST', body: JSON.stringify({ portfolio_id, blueprints }) }),
    saveAdvisorHistory: (portfolio_id: string, mode: string, blueprints: any[], result: any) => authFetch('/ai-advisor/save', { method: 'POST', body: JSON.stringify({ portfolio_id, mode, blueprints, result }) }),
  },
  blueprints: {
    list: (portfolioId: string) => authFetch(`/blueprints/${portfolioId}`),
    upsert: (portfolioId: string, data: any) => authFetch(`/blueprints/${portfolioId}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (portfolioId: string, symbol: string, data: any) => authFetch(`/blueprints/${portfolioId}/${symbol}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (portfolioId: string, symbol: string) => authFetch(`/blueprints/${portfolioId}/${symbol}`, { method: 'DELETE' }),
    autoGenerate: (portfolioId: string) => authFetch(`/blueprints/${portfolioId}/auto-generate`, { method: 'POST' }),
    getTemplates: (portfolioId: string) => authFetch(`/blueprints/${portfolioId}/templates`),
    saveTemplate: (portfolioId: string, data: any) => authFetch(`/blueprints/${portfolioId}/templates`, { method: 'POST', body: JSON.stringify(data) }),
    deleteTemplate: (portfolioId: string, templateId: string) => authFetch(`/blueprints/${portfolioId}/templates/${templateId}`, { method: 'DELETE' }),
    getLatestSnapshot: (portfolioId: string, source?: string) => authFetch(`/blueprints/${portfolioId}/snapshots/latest${source ? `?source=${source}` : ''}`),
    saveSnapshot: (portfolioId: string, data: any) => authFetch(`/blueprints/${portfolioId}/snapshots`, { method: 'POST', body: JSON.stringify(data) }),
  },
  project2x: {
    dashboard: (portfolioId: string) => authFetch(`/project-2x/dashboard/${portfolioId}`),
    quotas: (portfolioId: string) => authFetch(`/project-2x/quotas/${portfolioId}`),
    resetQuotas: (portfolioId: string) => authFetch(`/project-2x/quotas/${portfolioId}/reset`, { method: 'POST' }),
    scan: (portfolioId: string) => authFetch(`/project-2x/scan/${portfolioId}`),
    recommend: (portfolioId: string, amount_thb: number) => authFetch(`/project-2x/recommend/${portfolioId}`, { method: 'POST', body: JSON.stringify({ amount_thb }) }),
    config: (portfolioId: string) => authFetch(`/project-2x/config/${portfolioId}`),
    updateConfig: (portfolioId: string, data: any) => authFetch(`/project-2x/config/${portfolioId}`, { method: 'POST', body: JSON.stringify(data) }),
    backfill: (portfolioId: string, years = 10) => authFetch(`/project-2x/backfill/${portfolioId}`, { method: 'POST', body: JSON.stringify({ years }) }),
    backfillStatus: (portfolioId: string) => authFetch(`/project-2x/backfill-status/${portfolioId}`),
    fundamentals: (portfolioId: string) => authFetch(`/project-2x/fundamentals/${portfolioId}`),
    updateFundamentals: (portfolioId: string, data: { symbol: string; expected_cagr_3y?: number; consecutive_eps_qs?: number }) => authFetch(`/project-2x/fundamentals/${portfolioId}`, { method: 'POST', body: JSON.stringify(data) }),
  },
  chart: {
    get: (symbol: string, days = 36500, resolution = '1D') => 
      authFetch(`/chart/${encodeURIComponent(symbol)}?days=${days}&resolution=${encodeURIComponent(resolution)}`),
  },
  market: {
    heatmap: (scope = 'sp100') => authFetch(`/market/heatmap?scope=${encodeURIComponent(scope)}`),
  }
};
