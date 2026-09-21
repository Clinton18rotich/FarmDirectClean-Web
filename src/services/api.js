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

// Shamba — Death + Safety + Home Slaughter
api.shamba.deathCauses = () => request('/api/shamba/death-causes');
api.shamba.reportDeath = (passportId, data) => request(`/api/shamba/livestock/${passportId}/death`, { method: 'POST', body: data });
api.shamba.getDeathRecord = (passportId) => request(`/api/shamba/livestock/${passportId}/death`);
api.shamba.listDeaths = (filter = {}) => {
  const params = new URLSearchParams(filter).toString();
  return request(`/api/shamba/deaths/list${params ? '?' + params : ''}`);
};
api.shamba.deathStats = () => request('/api/shamba/deaths/stats');
api.shamba.outbreaks = () => request('/api/shamba/deaths/outbreaks');
api.shamba.verifyDeathByVet = (passportId, data) => request(`/api/shamba/livestock/${passportId}/death/verify-vet`, { method: 'POST', body: data });

api.shamba.checkSafety = (passportId) => request(`/api/shamba/safety/${passportId}`);

api.shamba.ceremonyTypes = () => request('/api/shamba/ceremony-types');
api.shamba.recordHomeSlaughter = (passportId, data) => request(`/api/shamba/livestock/${passportId}/home-slaughter`, { method: 'POST', body: data });
api.shamba.getHomeSlaughter = (passportId) => request(`/api/shamba/livestock/${passportId}/home-slaughter`);
api.shamba.listHomeSlaughters = (filter = {}) => {
  const params = new URLSearchParams(filter).toString();
  return request(`/api/shamba/home-slaughters/list${params ? '?' + params : ''}`);
};
api.shamba.homeSlaughterStats = () => request('/api/shamba/home-slaughters/stats');

// Slaughterhouse Portal
api.slaughterhouse = {
  register: (data) => request('/api/slaughterhouse/register', { method: 'POST', body: data }),
  list: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/slaughterhouse/list${params ? '?' + params : ''}`);
  },
  get: (id) => request(`/api/slaughterhouse/${id}`),
  verify: (id, data) => request(`/api/slaughterhouse/${id}/verify`, { method: 'POST', body: data }),
  lookupAnimal: (passportId) => request(`/api/slaughterhouse/lookup/${passportId}`),
  requestSlaughter: (data) => request('/api/slaughterhouse/slaughter/request', { method: 'POST', body: data }),
  approveSlaughter: (id, code) => request(`/api/slaughterhouse/slaughter/${id}/approve`, { method: 'POST', body: { code } }),
  rejectSlaughter: (id, reason) => request(`/api/slaughterhouse/slaughter/${id}/reject`, { method: 'POST', body: { reason } }),
  completeSlaughter: (id, data) => request(`/api/slaughterhouse/slaughter/${id}/complete`, { method: 'POST', body: data }),
  listSlaughterRequests: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/slaughterhouse/slaughter/list${params ? '?' + params : ''}`);
  },
  getSlaughterRequest: (id) => request(`/api/slaughterhouse/slaughter/${id}`),
  verifyMeat: (token) => request(`/api/slaughterhouse/meat/verify/${token}`),
  reportMeatFraud: (token, data) => request(`/api/slaughterhouse/meat/${token}/report`, { method: 'POST', body: data }),
};

// Meat Handler (Butchery/Supermarket)
api.meatHandler = {
  register: (data) => request('/api/meat-handler/register', { method: 'POST', body: data }),
  list: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/meat-handler/list${params ? '?' + params : ''}`);
  },
  get: (id) => request(`/api/meat-handler/${id}`),
  verify: (id, data) => request(`/api/meat-handler/${id}/verify`, { method: 'POST', body: data }),
  types: () => request('/api/meat-handler/types'),
  receiveMeat: (data) => request('/api/meat-handler/meat/receive', { method: 'POST', body: data }),
  sellMeat: (data) => request('/api/meat-handler/meat/sell', { method: 'POST', body: data }),
  returnMeat: (data) => request('/api/meat-handler/meat/return', { method: 'POST', body: data }),
  getChain: (token) => request(`/api/meat-handler/meat/chain/${token}`),
  getReceived: (id) => request(`/api/meat-handler/${id}/received`),
  getSold: (id) => request(`/api/meat-handler/${id}/sold`),
};

// Delivery API (for alerts, matching)
api.listDeliveries = (filter = {}) => {
  const params = new URLSearchParams(filter).toString();
  return request(`/api/delivery/list${params ? '?' + params : ''}`);
};
api.getDelivery = (id) => request(`/api/delivery/${id}`);
api.createDelivery = (data) => request('/api/delivery/create', { method: 'POST', body: data });
api.deliveryStats = () => request('/api/delivery/stats');
api.riderReply = (id, data) => request(`/api/delivery/${id}/rider-reply`, { method: 'POST', body: data });

// Theft alert tracking (for AlertsScreen)
api.shamba.listTheftAlerts = () => request('/api/shamba/theft-alerts/list');
api.shamba.theftAlertStats = () => request('/api/shamba/theft-alerts/stats');
api.shamba.getTheftAlert = (passportId) => request(`/api/shamba/theft-alerts/${passportId}`);
api.shamba.resolveTheftAlert = (theftId, data) => request(`/api/shamba/theft-alerts/${theftId}/resolve`, { method: 'POST', body: data });

// Veterinary Network
api.vet = {
  constants: () => request('/api/vet/constants'),
  stats: () => request('/api/vet/stats'),

  // Registration
  register: (data) => request('/api/vet/register', { method: 'POST', body: data }),
  list: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/vet/list${params ? '?' + params : ''}`);
  },
  get: (id) => request(`/api/vet/${id}`),
  getByPhone: (phone) => request(`/api/vet/by-phone/${phone}`),
  verify: (id, data) => request(`/api/vet/${id}/verify`, { method: 'POST', body: data }),
  vetStats: (id) => request(`/api/vet/${id}/stats`),

  // Sick reports
  reportSick: (data) => request('/api/vet/sick/report', { method: 'POST', body: data }),
  listSickReports: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/vet/sick/list${params ? '?' + params : ''}`);
  },
  getSickReport: (id) => request(`/api/vet/sick/${id}`),
  acceptCase: (id, vetId) => request(`/api/vet/sick/${id}/accept`, { method: 'POST', body: { vetId } }),
  rejectCase: (id, vetId, reason) => request(`/api/vet/sick/${id}/reject`, { method: 'POST', body: { vetId, reason } }),
  startTreatment: (id, vetId) => request(`/api/vet/sick/${id}/start`, { method: 'POST', body: { vetId } }),
  completeTreatment: (id, data) => request(`/api/vet/sick/${id}/complete`, { method: 'POST', body: data }),

  // Quarantine
  quarantine: (passportId, data) => request(`/api/vet/quarantine/${passportId}`, { method: 'POST', body: data }),
  releaseQuarantine: (passportId, data) => request(`/api/vet/quarantine/${passportId}/release`, { method: 'POST', body: data }),

  // Farmer health history
  farmerHealth: (farmerId) => request(`/api/vet/farmer/${farmerId}/health`),
};
