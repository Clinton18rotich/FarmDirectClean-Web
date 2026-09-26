// FILE: backend/src/services/deliveryLegs.js
// Session 4B — multi-leg shipment tracking for trades.
// A delivery is often multiple hops (farm → booking office → bus → stage → buyer)
// This service appends and updates legs on a trade.delivery object.
//
// Storage: legs are stored on the trade itself (delivery.legs[]). No separate
// file — they live with the trade for atomic persistence.
//
// Lazy migration: trades with a legacy single-hop delivery get a synthetic
// 1-leg chain on read so the tracker always has something to render.

const COURIERS = [
  { id: 'easycoach',     name: 'Easy Coach',      type: 'bus' },
  { id: 'mashpoa',       name: 'Mash Poa',        type: 'bus' },
  { id: 'moderncoast',   name: 'Modern Coast',    type: 'bus' },
  { id: 'guardian',      name: 'Guardian Angel',  type: 'bus' },
  { id: 'northrift',     name: 'North Rift',      type: 'bus' },
  { id: 'molo',          name: 'Molo Line',       type: 'bus' },
  { id: 'g4s',           name: 'G4S',             type: 'courier' },
  { id: 'sendy',         name: 'Sendy',           type: 'courier' },
  { id: 'pickupmtaani',  name: 'Pickup Mtaani',   type: 'courier' },
  { id: 'other',         name: 'Other',           type: 'other' },
];

const METHODS = [
  { id: 'self_drop',     label: 'Self drop' },
  { id: 'bus_parcel',    label: 'Bus parcel' },
  { id: 'courier',       label: 'Courier' },
  { id: 'boda',          label: 'Boda / Motorbike' },
  { id: 'tuktuk',        label: 'Tuk Tuk' },
  { id: 'pickup',        label: 'Pickup / Lorry' },
  { id: 'rider',         label: 'FarmDirect rider' },
  { id: 'walk',          label: 'Hand delivery' },
  { id: 'other',         label: 'Other' },
];

const LEG_STATUS = ['pending', 'in_transit', 'arrived', 'failed'];

function genLegId() {
  return 'LEG-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
}

/**
 * Ensure delivery.legs exists on a trade. If not, lazily synthesize a
 * single-leg chain from the existing pickup/dropoff/rider info.
 * Mutates the trade in place — caller must persist().
 */
function ensureLegs(trade) {
  if (!trade || !trade.delivery) return trade;
  const d = trade.delivery;
  if (Array.isArray(d.legs) && d.legs.length > 0) return trade;

  // Lazy migration: build a single synthetic leg
  const syntheticLeg = {
    id: genLegId(),
    from: {
      county: d.pickup?.county || null,
      ward: d.pickup?.ward || null,
      area: d.pickup?.area || null,
      label: d.pickup?.area || d.pickup?.ward || d.pickup?.county || 'Pickup',
    },
    to: {
      county: d.dropoff?.county || null,
      ward: d.dropoff?.ward || null,
      area: d.dropoff?.area || null,
      label: d.dropoff?.area || d.dropoff?.ward || d.dropoff?.county || 'Dropoff',
    },
    method: 'rider',
    carrier: null,
    trackingCode: null,
    status: d.deliveredAt ? 'arrived' : (d.pickedUpAt ? 'in_transit' : 'pending'),
    departedAt: d.pickedUpAt || null,
    arrivedAt: d.deliveredAt || null,
    addedBy: 'system',
    addedAt: trade.createdAt || new Date().toISOString(),
    notes: 'Auto-created from single-leg delivery',
  };

  d.legs = [syntheticLeg];
  d.currentLegIndex = 0;
  return trade;
}

/**
 * Add a new leg to the chain. Anyone on the trade can add (seller/buyer/rider).
 * Trade must have a delivery object (which every trade gets at creation).
 */
function addLeg(trade, legData, byRole) {
  if (!trade || !trade.delivery) return { error: 'Trade has no delivery' };
  ensureLegs(trade);
  const d = trade.delivery;
  if (!Array.isArray(d.legs)) d.legs = [];

  if (!legData || !legData.from || !legData.to) {
    return { error: 'from and to are required' };
  }
  if (!legData.method || !METHODS.find(m => m.id === legData.method)) {
    return { error: 'Valid method is required' };
  }

  // New leg appended at the end
  const newLeg = {
    id: genLegId(),
    from: {
      county: legData.from.county || null,
      ward: legData.from.ward || null,
      area: legData.from.area || null,
      label: legData.from.label || legData.from.area || legData.from.ward || legData.from.county || 'Origin',
    },
    to: {
      county: legData.to.county || null,
      ward: legData.to.ward || null,
      area: legData.to.area || null,
      label: legData.to.label || legData.to.area || legData.to.ward || legData.to.county || 'Destination',
    },
    method: legData.method,
    carrier: legData.carrier || null,
    trackingCode: legData.trackingCode || null,
    status: 'pending',
    departedAt: null,
    arrivedAt: null,
    addedBy: byRole || 'system',
    addedAt: new Date().toISOString(),
    notes: legData.notes || null,
  };

  d.legs.push(newLeg);
  // currentLegIndex is the leg currently in progress (or the last pending one)
  d.currentLegIndex = d.legs.findIndex(l => l.status !== 'arrived');
  if (d.currentLegIndex === -1) d.currentLegIndex = d.legs.length - 1;

  return { leg: newLeg, legs: d.legs, currentLegIndex: d.currentLegIndex };
}

/**
 * Update a leg's status. Only the leg's own participants can update.
 *   - pending → in_transit: sets departedAt
 *   - in_transit → arrived: sets arrivedAt
 *   - any → failed: marks failed
 */
function updateLegStatus(trade, legId, { status, notes, byRole }) {
  if (!trade || !trade.delivery) return { error: 'Trade has no delivery' };
  ensureLegs(trade);
  const d = trade.delivery;
  const leg = (d.legs || []).find(l => l.id === legId);
  if (!leg) return { error: 'Leg not found' };
  if (!LEG_STATUS.includes(status)) return { error: 'Invalid status' };

  // Forward-only progression (except fail-from-anywhere)
  const order = { pending: 0, in_transit: 1, arrived: 2, failed: 99 };
  if (status === 'failed') {
    // Allow fail from any non-arrived state
    if (leg.status === 'arrived') return { error: 'Cannot fail an arrived leg' };
  } else {
    if (order[status] <= order[leg.status]) {
      return { error: `Cannot move leg from ${leg.status} to ${status}` };
    }
  }

  const now = new Date().toISOString();
  leg.status = status;
  if (status === 'in_transit' && !leg.departedAt) leg.departedAt = now;
  if (status === 'arrived' && !leg.arrivedAt) leg.arrivedAt = now;
  if (notes) leg.notes = (leg.notes ? leg.notes + ' | ' : '') + notes;

  leg.lastUpdateBy = byRole || 'system';
  leg.lastUpdateAt = now;

  // Recompute currentLegIndex
  d.currentLegIndex = d.legs.findIndex(l => l.status !== 'arrived');
  if (d.currentLegIndex === -1) d.currentLegIndex = d.legs.length - 1;

  // Update legacy top-level timestamps for backward compat with old UI
  if (status === 'in_transit' && !d.pickedUpAt) d.pickedUpAt = now;
  if (status === 'arrived' && d.currentLegIndex === d.legs.length - 1 && !d.deliveredAt) {
    d.deliveredAt = now;
    d.status = 'delivered';
  }

  return { leg, legs: d.legs, currentLegIndex: d.currentLegIndex };
}

function removeLeg(trade, legId, byRole) {
  if (!trade || !trade.delivery) return { error: 'Trade has no delivery' };
  ensureLegs(trade);
  const d = trade.delivery;
  const idx = (d.legs || []).findIndex(l => l.id === legId);
  if (idx === -1) return { error: 'Leg not found' };
  const leg = d.legs[idx];
  if (leg.status === 'arrived') return { error: 'Cannot remove an arrived leg' };
  if (leg.status === 'in_transit') return { error: 'Cannot remove an in-transit leg' };
  // Only the adder (or a system/admin) can remove
  if (byRole && leg.addedBy !== byRole) {
    return { error: 'Only the leg creator can remove it' };
  }
  d.legs.splice(idx, 1);
  d.currentLegIndex = d.legs.findIndex(l => l.status !== 'arrived');
  if (d.currentLegIndex === -1) d.currentLegIndex = Math.max(0, d.legs.length - 1);
  return { legs: d.legs, currentLegIndex: d.currentLegIndex };
}

function getLegs(trade) {
  if (!trade || !trade.delivery) return { legs: [], currentLegIndex: -1 };
  ensureLegs(trade);
  const d = trade.delivery;
  return {
    legs: d.legs || [],
    currentLegIndex: d.currentLegIndex != null ? d.currentLegIndex : (d.legs || []).length - 1,
    overallStatus: computeOverallStatus(d.legs || []),
  };
}

function computeOverallStatus(legs) {
  if (!legs.length) return 'pending';
  if (legs.some(l => l.status === 'failed')) return 'has_failure';
  const lastLeg = legs[legs.length - 1];
  if (lastLeg.status === 'arrived') return 'delivered';
  if (legs.some(l => l.status === 'in_transit')) return 'in_transit';
  if (legs.some(l => l.status === 'arrived')) return 'partial';
  return 'pending';
}

function getConfig() {
  return { couriers: COURIERS, methods: METHODS, statuses: LEG_STATUS };
}

module.exports = {
  ensureLegs,
  addLeg,
  updateLegStatus,
  removeLeg,
  getLegs,
  computeOverallStatus,
  getConfig,
  COURIERS,
  METHODS,
  LEG_STATUS,
};
