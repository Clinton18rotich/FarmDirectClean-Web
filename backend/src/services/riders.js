/**
 * Riders Service — delivery partners
 *
 * Enhancement of the existing rider system with:
 * - Vehicle classification (A-G)
 * - Free onboarding + KYC verification
 * - Availability calendar
 * - Reliability scoring
 * - Tier promotion
 *
 * Backward compatible: existing riders get migrated with safe defaults.
 */

const storage = require('./storage');
const vc = require('./vehicleClasses');

const riders = storage.objectToMap(storage.load('riders', {}));

function persist() {
  storage.save('riders', storage.mapToObject(riders));
}

function normalizeKenyaPhone(input) {
  if (!input) return '';
  let digits = String(input).replace(/[^\d]/g, '');
  if (digits.startsWith('254')) { /* ok */ }
  else if (digits.startsWith('0')) digits = '254' + digits.slice(1);
  else if (digits.length === 9) digits = '254' + digits;
  else return input;
  if (digits.length !== 12) return input;
  return '+' + digits;
}

/**
 * Migrate a rider record to the new schema (idempotent).
 */
function migrate(rider) {
  if (!rider) return rider;

  const cls = vc.getClassForVehicle(rider.vehicle?.type);

  if (!rider.vehicle) rider.vehicle = {};
  if (!rider.vehicle.class) rider.vehicle.class = cls?.code || 'B';
  if (!rider.vehicle.maxValue) rider.vehicle.maxValue = cls?.maxValue || 5000;
  if (!rider.vehicle.maxWeight) rider.vehicle.maxWeight = cls?.maxWeight || 100;
  if (!rider.vehicle.insurance) {
    rider.vehicle.insurance = {
      required: cls?.insuranceRequired || false,
      uploaded: false,
      certificateUrl: null,
      expiry: null,
      verified: false,
      verifiedAt: null,
    };
  }

  if (!rider.kycStatus) {
    // Existing riders are grandfathered in as 'verified' for now.
    // New riders start 'pending'.
    rider.kycStatus = 'verified';
    rider.kycLegacy = true;
  }
  if (!rider.idNumber) rider.idNumber = null;
  if (!rider.idPhotoUrl) rider.idPhotoUrl = null;
  if (!rider.selfieUrl) rider.selfieUrl = null;

  if (!rider.availability) {
    rider.availability = {
      defaultSchedule: {
        mon: [{ from: '08:00', to: '17:00' }],
        tue: [{ from: '08:00', to: '17:00' }],
        wed: [{ from: '08:00', to: '17:00' }],
        thu: [{ from: '08:00', to: '17:00' }],
        fri: [{ from: '08:00', to: '17:00' }],
        sat: [{ from: '08:00', to: '17:00' }],
        sun: [],
      },
      exceptions: [],
      isOnline: !!rider.isOnline,
      lastToggleAt: null,
      busyUntil: null,
      maxConcurrentJobs: 1,
      currentJobs: 0,
    };
  }

  if (!rider.stats) {
    rider.stats = {
      completedDeliveries: rider.totalDeliveries || 0,
      cancelledDeliveries: 0,
      unresponsiveCount: 0,
      totalEarned: 0,
      averageRating: rider.rating || 5.0,
      totalRatings: rider.totalDeliveries ? 1 : 0,
      lastDeliveryAt: null,
      lastActiveAt: rider.lastActiveAt || null,
    };
  }

  if (!rider.reliability) {
    rider.reliability = {
      score: 50,
      responded: 0,
      totalOffers: 0,
      responseRate: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      lastCalculatedAt: null,
    };
  }

  if (!rider.tier) rider.tier = 'new';

  return rider;
}

/**
 * Migrate all riders on load.
 */
(function migrateAll() {
  let count = 0;
  for (const rider of riders.values()) {
    migrate(rider);
    count++;
  }
  if (count > 0) {
    persist();
    console.log(`🏍️  Migrated ${count} riders to Session 2 schema`);
  }
})();

// ═══════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════

/**
 * Register a new rider (free — no KYC fee).
 * Riders start with kycStatus: 'pending'. They can accept jobs once verified.
 */
function registerRider(data) {
  const {
    rider,
    vehicle,
    location,
    radiusKm,
    pricePerDelivery,
    availability,
    payment,
  } = data;

  if (!rider?.fullName || !rider?.phone) {
    return { error: 'Name and phone required' };
  }
  if (!vehicle?.type) {
    return { error: 'Vehicle type required' };
  }
  if (!location) {
    return { error: 'Location required' };
  }

  const normalizedPhone = normalizeKenyaPhone(rider.phone);
  const cls = vc.getClassForVehicle(vehicle.type);

  const id = 'RDR-' + Date.now().toString(36).toUpperCase();
  const now = new Date().toISOString();

  const record = {
    id,
    rider: { ...rider, phone: normalizedPhone },

    // Vehicle with class metadata
    vehicle: {
      ...vehicle,
      class: cls.code,
      maxValue: cls.maxValue,
      maxWeight: cls.maxWeight,
      insurance: {
        required: cls.insuranceRequired,
        uploaded: false,
        certificateUrl: null,
        expiry: null,
        verified: false,
        verifiedAt: null,
      },
    },

    location,
    radiusKm: radiusKm || 10,
    pricePerDelivery: parseInt(pricePerDelivery) || null,
    payment: {
      ...payment,
      pochiPhone: payment?.pochiPhone ? normalizeKenyaPhone(payment.pochiPhone) : null,
    },

    // KYC (new riders pending until verified)
    kycStatus: 'pending',
    idNumber: null,
    idPhotoUrl: null,
    selfieUrl: null,
    kycSubmittedAt: null,
    kycVerifiedAt: null,
    kycVerifiedBy: null,

    // Availability (default: online, standard schedule)
    availability: {
      defaultSchedule: {
        mon: [{ from: '08:00', to: '17:00' }],
        tue: [{ from: '08:00', to: '17:00' }],
        wed: [{ from: '08:00', to: '17:00' }],
        thu: [{ from: '08:00', to: '17:00' }],
        fri: [{ from: '08:00', to: '17:00' }],
        sat: [{ from: '08:00', to: '17:00' }],
        sun: [],
      },
      exceptions: [],
      isOnline: false,
      lastToggleAt: null,
      busyUntil: null,
      maxConcurrentJobs: 1,
      currentJobs: 0,
    },

    // Legacy fields (kept for backward compat)
    status: 'active',
    isOnline: false,
    currentOrderId: null,
    totalDeliveries: 0,
    rating: 5.0,
    lastActiveAt: now,
    registeredAt: now,

    // New stats
    stats: {
      completedDeliveries: 0,
      cancelledDeliveries: 0,
      unresponsiveCount: 0,
      totalEarned: 0,
      averageRating: null,
      totalRatings: 0,
      lastDeliveryAt: null,
      lastActiveAt: now,
    },

    reliability: {
      score: 50,
      responded: 0,
      totalOffers: 0,
      responseRate: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      lastCalculatedAt: null,
    },

    tier: 'new',
    tierUpdatedAt: now,
  };

  riders.set(id, record);
  persist();

  console.log(`🏍️  Rider registered: ${id} | ${rider.fullName} | Class ${cls.code}`);
  return { rider: record };
}

/**
 * Submit KYC documents.
 */
function submitKyc(riderId, { idNumber, idPhotoUrl, selfieUrl }) {
  const rider = riders.get(riderId);
  if (!rider) return { error: 'Rider not found' };

  if (!idNumber || idNumber.replace(/\D/g, '').length < 7) {
    return { error: 'Valid national ID number required' };
  }
  if (!idPhotoUrl) return { error: 'ID photo required' };
  if (!selfieUrl) return { error: 'Selfie required' };

  rider.idNumber = idNumber.replace(/\D/g, '');
  rider.idPhotoUrl = idPhotoUrl;
  rider.selfieUrl = selfieUrl;
  rider.kycStatus = 'pending';
  rider.kycSubmittedAt = new Date().toISOString();
  persist();

  console.log(`📋 KYC submitted for ${riderId}`);
  return { rider };
}

/**
 * Approve KYC (admin).
 */
function approveKyc(riderId, { verifiedBy }) {
  const rider = riders.get(riderId);
  if (!rider) return { error: 'Rider not found' };

  rider.kycStatus = 'verified';
  rider.kycVerifiedAt = new Date().toISOString();
  rider.kycVerifiedBy = verifiedBy || 'admin';
  persist();

  console.log(`✅ KYC approved for ${riderId}`);
  return { rider };
}

/**
 * Reject KYC (admin).
 */
function rejectKyc(riderId, { reason, verifiedBy }) {
  const rider = riders.get(riderId);
  if (!rider) return { error: 'Rider not found' };

  rider.kycStatus = 'rejected';
  rider.kycRejectedAt = new Date().toISOString();
  rider.kycRejectedBy = verifiedBy || 'admin';
  rider.kycRejectionReason = reason || 'Not specified';
  persist();

  console.log(`❌ KYC rejected for ${riderId}: ${reason}`);
  return { rider };
}

// ═══════════════════════════════════════════════════════════
// AVAILABILITY
// ═══════════════════════════════════════════════════════════

function setAvailability(riderId, { defaultSchedule, exceptions }) {
  const rider = riders.get(riderId);
  if (!rider) return { error: 'Rider not found' };

  if (defaultSchedule) rider.availability.defaultSchedule = defaultSchedule;
  if (Array.isArray(exceptions)) rider.availability.exceptions = exceptions;
  persist();
  return { rider };
}

function setOnline(riderId, isOnline) {
  const rider = riders.get(riderId);
  if (!rider) return { error: 'Rider not found' };

  rider.availability.isOnline = !!isOnline;
  rider.availability.lastToggleAt = new Date().toISOString();
  rider.isOnline = !!isOnline; // keep legacy field in sync
  persist();

  console.log(`🏍️  ${riderId} is now ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
  return { rider };
}

/**
 * Check if a rider is available NOW.
 * Considers: online toggle, default schedule, exceptions, currentJobs, busyUntil.
 */
function isAvailableNow(rider, when = new Date()) {
  if (!rider || rider.status !== 'active') return false;
  if (rider.kycStatus !== 'verified') return false;
  if (!rider.availability?.isOnline) return false;

  // Concurrent jobs cap
  if (rider.availability.currentJobs >= rider.availability.maxConcurrentJobs) {
    return false;
  }

  // Busy until a certain time?
  if (rider.availability.busyUntil) {
    const busyUntil = new Date(rider.availability.busyUntil);
    if (busyUntil > when) return false;
  }

  // Exceptions override schedule (e.g., rider marked personal day off)
  const dateStr = when.toISOString().slice(0, 10);
  const exception = rider.availability.exceptions?.find(e => e.date === dateStr);
  if (exception) {
    if (exception.available === false) return false;
    if (exception.from && exception.to) {
      const time = when.toTimeString().slice(0, 5);
      return time >= exception.from && time <= exception.to;
    }
    return true;
  }

  // Online = available. Schedule is a soft default; the online toggle is
  // the hard switch. Riders toggle offline when they don't want jobs.
  return true;
}

// ═══════════════════════════════════════════════════════════
// RELIABILITY
// ═══════════════════════════════════════════════════════════

function computeReliability(riderId) {
  const rider = riders.get(riderId);
  if (!rider) return { error: 'Rider not found' };

  const r = rider.reliability;
  const s = rider.stats;

  // Response rate
  if (r.totalOffers > 0) {
    r.responseRate = Math.round((r.responded / r.totalOffers) * 100);
  }

  // Score computation (0-100):
  //   Base: 50
  //   + response rate (up to +25)
  //   + completed deliveries (up to +15)
  //   + rating factor (up to +10)
  //   - unresponsive count (-5 each, floor 0)
  //   - cancellations (-3 each, floor 0)

  let score = 50;
  score += Math.round((r.responseRate / 100) * 25);
  score += Math.min(15, Math.floor(s.completedDeliveries / 2));
  if (s.averageRating) {
    score += Math.round(((s.averageRating - 4.0) / 1.0) * 10);
  }
  score -= Math.min(30, s.unresponsiveCount * 5);
  score -= Math.min(20, s.cancelledDeliveries * 3);

  r.score = Math.max(0, Math.min(100, score));
  r.lastCalculatedAt = new Date().toISOString();
  persist();

  return { rider, score: r.score };
}

/**
 * Auto-promote a rider's tier based on stats.
 * - new: fewer than 5 deliveries
 * - established: 5+ deliveries + 4.0+ rating
 * - trusted: 20+ deliveries + 4.5+ rating + reliability > 70
 * - pro: pro subscription active
 */
function promoteTier(riderId) {
  const rider = riders.get(riderId);
  if (!rider) return { error: 'Rider not found' };

  const s = rider.stats;
  const rel = rider.reliability.score;

  let newTier = 'new';
  if (s.completedDeliveries >= 20 && s.averageRating >= 4.5 && rel >= 70) {
    newTier = 'trusted';
  } else if (s.completedDeliveries >= 5 && s.averageRating >= 4.0) {
    newTier = 'established';
  }

  if (rider.tier !== newTier) {
    console.log(`🎖️  ${riderId} promoted: ${rider.tier} → ${newTier}`);
    rider.tier = newTier;
    rider.tierUpdatedAt = new Date().toISOString();
    persist();
  }

  return { rider, tier: newTier };
}

// ═══════════════════════════════════════════════════════════
// MATCHING (data-side, used by delivery.js in Session 3)
// ═══════════════════════════════════════════════════════════

/**
 * Find eligible riders for a delivery.
 * Filters by:
 * - availability (online + schedule)
 * - KYC verified
 * - vehicle class capable of the value
 * - insurance valid
 * - within radius of pickup
 */
function getEligibleRiders({ pickup, valueKes, radiusKm = 15, limit = 10 }) {
  const requiredClass = vc.getRequiredClass(valueKes);
  const eligible = [];

  for (const rider of riders.values()) {
    if (rider.status !== 'active') continue;
    if (rider.kycStatus !== 'verified') continue;
    if (!isAvailableNow(rider)) continue;

    // Class check
    const riderClass = rider.vehicle.class || vc.getRiderClass(rider);
    if (riderClass < requiredClass) continue;

    // Insurance check
    if (!vc.isInsuranceValid(rider)) continue;

    // Location check
    const sameCounty = !pickup?.county || rider.location?.county === pickup.county;
    // For now: county-level matching. Ward-level in Session 3.
    if (!sameCounty && !pickup?.adjacentCounties?.includes(rider.location?.county)) {
      continue;
    }

    eligible.push(rider);
  }

  // Sort by reliability score (highest first)
  eligible.sort((a, b) => (b.reliability?.score || 0) - (a.reliability?.score || 0));

  return {
    requiredClass,
    total: eligible.length,
    riders: eligible.slice(0, limit),
  };
}

// ═══════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════

function getRiderByPhone(phone) {
  if (!phone) return null;
  const target = normalizeKenyaPhone(phone);
  if (!target) return null;
  const targetDigits = String(target).replace(/\D/g, '');
  for (const r of riders.values()) {
    const rDigits = String(r.phone || '').replace(/\D/g, '');
    if (!rDigits) continue;
    // Match by last 9 digits (handles +254 vs 254 vs 0 prefix variance)
    if (rDigits.slice(-9) === targetDigits.slice(-9)) return r;
  }
  return null;
}

function getRider(id) {
  return riders.get(id);
}

function listRiders(filter = {}) {
  const all = [...riders.values()];
  let filtered = all;

  if (filter.county) filtered = filtered.filter(r => r.location?.county === filter.county);
  if (filter.vehicleClass) filtered = filtered.filter(r => r.vehicle.class === filter.vehicleClass);
  if (filter.vehicleType) filtered = filtered.filter(r => r.vehicle.type === filter.vehicleType);
  if (filter.isOnline !== undefined) filtered = filtered.filter(r => r.availability?.isOnline === filter.isOnline);
  if (filter.kycStatus) filtered = filtered.filter(r => r.kycStatus === filter.kycStatus);
  if (filter.tier) filtered = filtered.filter(r => r.tier === filter.tier);

  return filtered;
}

function getStats() {
  const all = [...riders.values()];
  const byClass = {};
  const byTier = {};
  let online = 0;
  let verified = 0;

  for (const r of all) {
    const cls = r.vehicle?.class || 'B';
    byClass[cls] = (byClass[cls] || 0) + 1;
    byTier[r.tier || 'new'] = (byTier[r.tier || 'new'] || 0) + 1;
    if (r.availability?.isOnline) online++;
    if (r.kycStatus === 'verified') verified++;
  }

  return {
    total: all.length,
    online,
    verified,
    byClass,
    byTier,
  };
}

module.exports = {
  getRiderByPhone,
  registerRider,
  submitKyc,
  approveKyc,
  rejectKyc,
  setAvailability,
  setOnline,
  isAvailableNow,
  computeReliability,
  promoteTier,
  getEligibleRiders,
  getRider,
  listRiders,
  getStats,
  // Testing helpers
  _riders: riders,
  _persist: persist,
};
