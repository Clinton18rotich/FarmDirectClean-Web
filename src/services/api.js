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
  createEscrow: (data) => request('/api/escrow/create', { method: 'POST', body: data }),
  getEscrow: (id) => request(`/api/escrow/${id}`),
  releaseEscrow: (id, notes) => request(`/api/escrow/${id}/release`, { method: 'POST', body: { notes } }),
  escrowHealth: () => request('/api/escrow/health'),
  lookupEscrow: (accountNumber) => request(`/api/escrow/lookup/${accountNumber}`),

  // Pochi
  recordPochiPayment: (data) => request('/api/pochi/record', { method: 'POST', body: data }),
  getPochiPayment: (orderId) => request(`/api/pochi/order/${orderId}`),
  pochiHealth: () => request('/api/pochi/health'),

  // Business
  getRevenueSummary: (period = 'all') => request(`/api/business/revenue/summary?period=${period}`),
  getRevenueLog: () => request('/api/business/revenue/log'),
  estimateRevenue: (subtotal, deliveryFee) => request('/api/business/revenue/estimate', { method: 'POST', body: { subtotal, deliveryFee } }),

  // Location — shared across all features
  location: {
    health: () => request('/api/location/health'),
    stats: () => request('/api/location/stats'),
    counties: () => request('/api/location/counties'),
    subCounties: (county) => request(`/api/location/subcounties?county=${encodeURIComponent(county)}`),
    constituencies: (county) => request(`/api/location/constituencies?county=${encodeURIComponent(county)}`),
    wards: (county, constituency) => request(`/api/location/wards?county=${encodeURIComponent(county || '')}&constituency=${encodeURIComponent(constituency || '')}`),
    localities: (county) => request(`/api/location/localities?county=${encodeURIComponent(county)}`),
    areas: (county, locality) => request(`/api/location/areas?county=${encodeURIComponent(county)}&locality=${encodeURIComponent(locality || '')}`),
    search: (q, limit = 40) => request(`/api/location/search?q=${encodeURIComponent(q)}&limit=${limit}`),
    resolve: (data) => request('/api/location/resolve', { method: 'POST', body: data }),
  },
};

// Farmer registration
api.registerFarmer = (data) => request('/api/farmer/register', { method: 'POST', body: data });
api.getFarmer = (id) => request(`/api/farmer/${id}`);
api.listFarmers = () => request('/api/farmer/list');
