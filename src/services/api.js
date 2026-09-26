const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    // Network failure — server down, phone offline, DNS, CORS, etc.
    throw new Error(`Network error: ${err.message || 'request failed'}`);
  }

  // Always try to parse JSON — the backend returns JSON for every status,
  // including errors, so we can surface the real message to the caller.
  let body;
  try {
    body = await res.json();
  } catch (err) {
    // Non-JSON response (usually a 502/504 HTML page from a proxy).
    throw new Error(`HTTP ${res.status} — invalid JSON response`);
  }

  // Non-2xx → throw with the backend's message if present.
  // 2xx → return body as-is; caller still owns `success: false` handling
  // (some endpoints use that as a normal branch, e.g. auth lookup misses).
  if (!res.ok) {
    const msg = (body && (body.message || body.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body;
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
  healthEventTypes: () => request('/api/shamba/health-event-types'),
  recordHealthEvent: (passportId, data) => request(`/api/shamba/livestock/${passportId}/health-event`, { method: 'POST', body: data }),
  getHealthEventDocument: (passportId, eventId) => request(`/api/shamba/livestock/${passportId}/health-event/${eventId}/document`),
  getHealthCertificate: (passportId) => request(`/api/shamba/livestock/${passportId}/health-certificate`),
  listHealthEvents: (passportId, filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/shamba/livestock/${passportId}/health-events${params ? '?' + params : ''}`);
  },
  getHealthEvent: (passportId, eventId) => request(`/api/shamba/livestock/${passportId}/health-event/${eventId}`),
  countersignHealthEvent: (passportId, eventId, data) => request(`/api/shamba/livestock/${passportId}/health-event/${eventId}/countersign`, { method: 'POST', body: data }),
  deleteHealthEvent: (passportId, eventId, by) => request(`/api/shamba/livestock/${passportId}/health-event/${eventId}${by ? '?by=' + encodeURIComponent(by) : ''}`, { method: 'DELETE' }),

  // Marketplace (Session 1 backend)
  listForSale: (passportId, data) => request(`/api/shamba/livestock/${passportId}/list-for-sale`, { method: 'POST', body: data }),
  withdrawFromSale: (passportId, data) => request(`/api/shamba/livestock/${passportId}/withdraw-sale`, { method: 'POST', body: data }),
  updatePhotos: (passportId, data) => request(`/api/shamba/livestock/${passportId}/photos`, { method: 'POST', body: data }),
  transferOwnership: (passportId, data) => request(`/api/shamba/livestock/${passportId}/transfer`, { method: 'POST', body: data }),
  saleable: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/shamba/livestock/saleable${params ? '?' + params : ''}`);
  },
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
  revealMeatContact: (token) => request(`/api/slaughterhouse/meat/${token}/reveal-contact`, { method: 'POST', body: {} }),
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

// Physical attributes + measurement guide
api.shamba.physicalAttributes = () => request('/api/shamba/physical-attributes');
api.shamba.measurementGuide = (lang = 'en') => request(`/api/shamba/measurement-guide?lang=${lang}`);
api.shamba.measurementGuideSMS = (lang = 'en') => request(`/api/shamba/measurement-guide/sms?lang=${lang}`);
api.shamba.estimateWeight = (data) => request('/api/shamba/livestock/estimate-weight', { method: 'POST', body: data });
api.shamba.compareBreed = (passportId) => request(`/api/shamba/livestock/${passportId}/compare-breed`);


// Land Protection (Module G)
api.landProtection = {
  // Stats & health
  health: () => request('/api/land-protection/health'),
  stats: () => request('/api/land-protection/stats'),

  // Parcels
  registerParcel: (data) => request('/api/land-protection/parcels/register', { method: 'POST', body: data }),
  addWaypoint: (id, data) => request(`/api/land-protection/parcels/${id}/waypoint`, { method: 'POST', body: data }),
  listParcels: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/land-protection/parcels/list${params ? '?' + params : ''}`);
  },
  getParcel: (id) => request(`/api/land-protection/parcels/${id}`),
  payParcel: (id, phone) => request(`/api/land-protection/parcels/${id}/pay`, { method: 'POST', body: { phone } }),
  upgradeParcel: (id, phone) => request(`/api/land-protection/parcels/${id}/upgrade`, { method: 'POST', body: { phone } }),
  parcelStatus: (id) => request(`/api/land-protection/parcels/${id}/status`),

  // Inheritance plan (free service)
  declareInheritance: (id, data) => request(`/api/land-protection/parcels/${id}/inheritance/declare`, { method: 'POST', body: data }),
  getInheritance: (id) => request(`/api/land-protection/parcels/${id}/inheritance`),
  withdrawInheritance: (id, parentPhone) => request(`/api/land-protection/parcels/${id}/inheritance/withdraw`, { method: 'POST', body: { parentPhone } }),
  confirmBeneficiary: (id, code) => request(`/api/land-protection/inheritance/beneficiary/${id}/confirm`, { method: 'POST', body: { code } }),
  disputeBeneficiary: (id, code, reason) => request(`/api/land-protection/inheritance/beneficiary/${id}/dispute`, { method: 'POST', body: { code, reason } }),
  confirmElder: (id, code) => request(`/api/land-protection/inheritance/elder/${id}/confirm`, { method: 'POST', body: { code } }),

  // Title deed vault
  uploadTitleDeed: (id, data) => request(`/api/land-protection/parcels/${id}/title-deed`, { method: 'POST', body: data }),
  getTitleDeed: (id) => request(`/api/land-protection/parcels/${id}/title-deed`),

  // Witness verification
  inviteWitness: (parcelId, data) => request(`/api/land-protection/parcels/${parcelId}/witness`, { method: 'POST', body: data }),
  confirmWitness: (witnessId, data) => request(`/api/land-protection/witnesses/${witnessId}/confirm`, { method: 'POST', body: data }),
  declineWitness: (witnessId, data) => request(`/api/land-protection/witnesses/${witnessId}/decline`, { method: 'POST', body: data }),

  // Eviction SOS
  triggerSOS: (parcelId, data) => request(`/api/land-protection/parcels/${parcelId}/sos`, { method: 'POST', body: data }),
  listSOS: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/land-protection/sos/list${params ? '?' + params : ''}`);
  },
  getSOS: (id) => request(`/api/land-protection/sos/${id}`),
  resolveSOS: (id, data) => request(`/api/land-protection/sos/${id}/resolve`, { method: 'POST', body: data }),

  // Emergency contacts
  getEmergencyContacts: (ownerId) => request(`/api/land-protection/emergency-contacts/${ownerId}`),
  saveEmergencyContacts: (ownerId, data) => request(`/api/land-protection/emergency-contacts/${ownerId}`, { method: 'POST', body: data }),

  // Land-livestock match
  verifyWithLivestock: (parcelId, livestockPassports) => 
    request(`/api/land-protection/parcels/${parcelId}/verify-with-livestock`, { 
      method: 'POST', 
      body: { livestockPassports } 
    }),

  // Leases
  createLease: (data) => request('/api/land-protection/leases/create', { method: 'POST', body: data }),
  approveLease: (id, code) => request(`/api/land-protection/leases/${id}/approve`, { method: 'POST', body: { code } }),
  rejectLease: (id, reason) => request(`/api/land-protection/leases/${id}/reject`, { method: 'POST', body: { reason } }),
  listLeases: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/land-protection/leases/list${params ? '?' + params : ''}`);
  },

  // Nomadic
  markNomadic: (passportId, data) => request(`/api/land-protection/livestock/${passportId}/nomadic`, { method: 'POST', body: data }),
};


// KYC — Identity verification + seller tiers
api.kyc = {
  roles: (role) => request(role ? `/api/kyc/roles/${role}` : '/api/kyc/roles'),
  roleConfig: (role) => request(`/api/kyc/roles/${role}`),
  // Public
  config: () => request('/api/kyc/config'),
  tiers: () => request('/api/kyc/tiers'),

  // Verification flow
  createRequest: (data) => request('/api/kyc/request', { method: 'POST', body: data }),
  // M-Pesa STK push (real or simulated based on backend MPESA_ENV)
  pay: (id, phone) => request(`/api/kyc/${id}/pay`, { method: 'POST', body: { phone } }),
  statusById: (id) => request(`/api/kyc/${id}/status`),

  // Legacy: manual confirm (kept as emergency fallback)
  confirmPayment: (id, paymentRef) => request(`/api/kyc/${id}/confirm-payment`, { method: 'POST', body: { paymentRef } }),
  verify: (data) => request('/api/kyc/verify', { method: 'POST', body: data }),

  // Status
  status: (userId) => request(`/api/kyc/status/${userId}`),
  tier: (userId) => request(`/api/kyc/tier/${userId}`),
  canSell: (userId, amount) => request(`/api/kyc/can-sell/${userId}`, { method: 'POST', body: { amount } }),

  // Admin
  stats: () => request('/api/kyc/stats'),
  list: (filter = {}) => {
    const params = new URLSearchParams(filter).toString();
    return request(`/api/kyc/list${params ? '?' + params : ''}`);
  },
};


// Market (Module G + Livestock)
api.market = {
  // Listings
  createListing: (data) => request('/api/market/listings', { method: 'POST', body: data }),
  searchListings: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/api/market/listings${params ? '?' + params : ''}`);
  },
  getListing: (id, buyerId) => request(`/api/market/listings/${id}${buyerId ? '?buyerId=' + encodeURIComponent(buyerId) : ''}`),
  pauseListing: (id, data) => request(`/api/market/listings/${id}/pause`, { method: 'POST', body: data }),
  resumeListing: (id, data) => request(`/api/market/listings/${id}/resume`, { method: 'POST', body: data }),
  sellerListings: (sellerId) => request(`/api/market/seller/${sellerId}/listings`),

  // Contact unlock (KES 100)
  unlockContact: (id, data) => request(`/api/market/listings/${id}/unlock`, { method: 'POST', body: data }),
  unlockStatus: (id, buyerId) => request(`/api/market/listings/${id}/unlock-status?buyerId=${encodeURIComponent(buyerId)}`),
  buyerUnlocks: (buyerId) => request(`/api/market/buyer/${buyerId}/unlocks`),

  // Offers
  createOffer: (data) => request('/api/market/offers', { method: 'POST', body: data }),
  counterOffer: (id, data) => request(`/api/market/offers/${id}/counter`, { method: 'POST', body: data }),
  acceptOffer: (id, data) => request(`/api/market/offers/${id}/accept`, { method: 'POST', body: data }),
  rejectOffer: (id, data) => request(`/api/market/offers/${id}/reject`, { method: 'POST', body: data }),
  withdrawOffer: (id, data) => request(`/api/market/offers/${id}/withdraw`, { method: 'POST', body: data }),
  getOffer: (id) => request(`/api/market/offers/${id}`),
  listingOffers: (id) => request(`/api/market/listings/${id}/offers`),
  buyerOffers: (buyerId) => request(`/api/market/buyer/${buyerId}/offers`),
  myOffers: (userId) => request(`/api/market/buyer/${userId}/offers`),  // alias of buyerOffers
  sellerOffers: (sellerId) => request(`/api/market/seller/${sellerId}/offers`),

  // Stats
  stats: () => request('/api/market/stats'),
  config: () => request('/api/market/config'),
};


// Trades (the orchestration layer)
api.trades = {
  // Create + fund
  create: (data) => request('/api/trades/create', { method: 'POST', body: data }),
  fund: (id, buyerPhone) => request(`/api/trades/${id}/fund`, { method: 'POST', body: { buyerPhone } }),

  // Lifecycle
  release: (id, data) => request(`/api/trades/${id}/release`, { method: 'POST', body: data }),
  dispute: (id, data) => request(`/api/trades/${id}/dispute`, { method: 'POST', body: data }),

  // Rider hooks
  riderAccepted: (id, data) => request(`/api/trades/${id}/rider-accepted`, { method: 'POST', body: data }),
  deliveryComplete: (id) => request(`/api/trades/${id}/delivery-complete`, { method: 'POST' }),
  matchRider: (id) => request(`/api/trades/${id}/match-rider`, { method: 'POST' }),

  // Queries
  get: (id) => request(`/api/trades/${id}`),
  myTrades: (userId, role) => request(`/api/trades/user/${userId}${role ? '?role=' + role : ''}`),
  riderTrades: (riderId) => request(`/api/trades/rider/${riderId}`),
  // Session 4B — multi-leg shipment tracking
  getLegs: (id) => request(`/api/trades/${id}/legs`),
  getMovementPermit: (id) => request(`/api/trades/${id}/movement-permit`),
  addLeg: (id, data) => request(`/api/trades/${id}/legs`, { method: 'POST', body: data }),
  updateLeg: (id, legId, data) => request(`/api/trades/${id}/legs/${legId}`, { method: 'PATCH', body: data }),
  removeLeg: (id, legId, byRole) => request(`/api/trades/${id}/legs/${legId}`, { method: 'DELETE', body: { byRole } }),
  stats: () => request('/api/trades/stats'),
};
// Chat (Session 6.11)
api.chat = {
  findOrCreateThread: (data) => request('/api/chat/threads', { method: 'POST', body: data }),
  listThreads: (userId) => request(`/api/chat/threads?userId=${encodeURIComponent(userId)}`),
  getThread: (threadId, viewerId) => request(`/api/chat/threads/${threadId}${viewerId ? '?viewerId=' + encodeURIComponent(viewerId) : ''}`),
  sendMessage: (threadId, from, text) => request(`/api/chat/threads/${threadId}/messages`, { method: 'POST', body: { from, text } }),
  markRead: (threadId, userId) => request(`/api/chat/threads/${threadId}/read`, { method: 'POST', body: { userId } }),
  archive: (threadId, userId) => request(`/api/chat/threads/${threadId}/archive`, { method: 'POST', body: { userId } }),
  unreadCount: (userId) => request(`/api/chat/unread?userId=${encodeURIComponent(userId)}`),
  stats: () => request('/api/chat/stats'),
};

// Auth (Session 6.20) — simple login by phone
api.auth = {
  lookup: (phone) => request('/api/auth/lookup', { method: 'POST', body: { phone } }),
  restore: (phone) => request('/api/auth/restore', { method: 'POST', body: { phone } }),
  registerBuyer: (data) => request('/api/auth/register-buyer', { method: 'POST', body: data }),
  addBuyerAddress: (buyerId, address) => request(`/api/auth/buyer/${buyerId}/address`, { method: 'POST', body: { address } }),
};
