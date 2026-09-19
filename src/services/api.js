const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return await res.json();
}

export const api = {
  health: () => request('/health'),
  
  // Escrow
  createEscrow: (data) => request('/api/escrow/create', { 
    method: 'POST', body: data 
  }),
  getEscrow: (id) => request(`/api/escrow/${id}`),
  releaseEscrow: (id, notes) => request(`/api/escrow/${id}/release`, {
    method: 'POST', body: { notes }
  }),
  escrowHealth: () => request('/api/escrow/health'),

  // Business (owner)
  getRevenueSummary: (period = 'all') => 
    request(`/api/business/revenue/summary?period=${period}`),
  getRevenueLog: () => request('/api/business/revenue/log'),
  estimateRevenue: (subtotal, deliveryFee) => 
    request('/api/business/revenue/estimate', { 
      method: 'POST', 
      body: { subtotal, deliveryFee } 
    }),
};
