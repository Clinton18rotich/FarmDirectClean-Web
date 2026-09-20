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

// Rider registration
api.registerRider = (data) => request('/api/rider/register', { method: 'POST', body: data });
api.getRider = (id) => request(`/api/rider/${id}`);
api.listRiders = () => request('/api/rider/list');
api.onlineRiders = () => request('/api/rider/online');
api.setRiderStatus = (id, isOnline) => request(`/api/rider/${id}/status`, { method: 'PATCH', body: { isOnline } });

// Shamba & Mfugo Safi
api.shamba = {
  health: () => request('/api/shamba/health'),
  stats: () => request('/api/shamba/stats'),

  // Land
  registerLand: (data) => request('/api/shamba/land/register', { method: 'POST', body: data }),
  listLand: () => request('/api/shamba/land/list'),
  getLandByOwner: (ownerId) => request(`/api/shamba/land/owner/${ownerId}`),
  getLand: (id) => request(`/api/shamba/land/${id}`),
  addWitness: (id, data) => request(`/api/shamba/land/${id}/witness`, { method: 'POST', body: data }),

  // Livestock
  registerLivestock: (data) => request('/api/shamba/livestock/register', { method: 'POST', body: data }),
  listLivestock: () => request('/api/shamba/livestock/list'),
  getLivestockByOwner: (ownerId) => request(`/api/shamba/livestock/owner/${ownerId}`),
  getLivestock: (passportId) => request(`/api/shamba/livestock/${passportId}`),
  reportStolen: (passportId, data) => request(`/api/shamba/livestock/${passportId}/report-stolen`, { method: 'POST', body: data }),
  addVaccination: (passportId, data) => request(`/api/shamba/livestock/${passportId}/vaccination`, { method: 'POST', body: data }),
};
