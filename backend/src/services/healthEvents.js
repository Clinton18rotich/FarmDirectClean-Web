// FILE: backend/src/services/healthEvents.js
// Two-tier health record. Every event carries a tier:
//   vet_verified       — signed by a KVB-verified professional
//   self_reported      — owner attests (70% of Kenyan livestock care)
//   community_attested — neighbor/extension officer witnessed
// The animal passport becomes a full health diary, not a vet-only record.

const storage = require('./storage');
const shamba = require('./shamba');

const healthEvents = storage.objectToMap(storage.load('shamba_health_events', {}));

function persist() {
  storage.save('shamba_health_events', storage.mapToObject(healthEvents));
}

function generateEventId() {
  return 'HE-' + Date.now().toString(36).toUpperCase();
}

const EVENT_TYPES = [
  { id: 'deworming',     label: 'Deworming',           icon: '💊' },
  { id: 'vaccination',   label: 'Vaccination',         icon: '💉' },
  { id: 'spray',         label: 'Tick / Fly Spray',    icon: '🧴' },
  { id: 'wound_care',    label: 'Wound Care',          icon: '🩹' },
  { id: 'hoof_trim',     label: 'Hoof Trimming',       icon: '🦶' },
  { id: 'castration',    label: 'Castration',          icon: '⚕️' },
  { id: 'drenching',     label: 'Drenching',           icon: '🥤' },
  { id: 'observation',   label: 'Observation / Note',  icon: '📝' },
  { id: 'other',         label: 'Other',               icon: '📋' },
];

// Common products available in Kenyan agrovets — used by the guided picker
const COMMON_PRODUCTS = {
  deworming: [
    'Ivomec', 'Albendazole', 'Fenbendazole', 'Levamisole',
    'Oxyclozanide', 'Ivermectin Pour-On',
  ],
  vaccination: [
    'FMD (Foot and Mouth)', 'Anthrax', 'Blackquarter (BQ)', 'Lumpy Skin Disease (LSD)',
    'CBPP (Contagious Bovine Pleuropneumonia)', 'East Coast Fever (ECF)', 'Rabies', 'PPR (Goats/Sheep)',
  ],
  spray: [
    'Steladone', 'Amitraz', 'Cyphenothrin', 'Deltamethrin Pour-On', 'Supona', 'Taktic',
  ],
  drenching: ['Albendazole oral', 'Fenbendazole oral', 'Levamisole oral'],
};

function inferTier(role) {
  if (role === 'vet') return 'vet_verified';
  if (role === 'owner') return 'self_reported';
  return 'community_attested';
}

/**
 * Record a health event on an animal.
 * data = {
 *   eventType, eventDate,
 *   performedBy: { role: 'owner'|'vet'|'neighbor'|'extension_officer', userId, name, kycId?, kvbVerified? },
 *   product, dosage, method, batchNumber,
 *   notes, photos: [],
 * }
 */
function recordHealthEvent(passportId, data) {
  const animal = shamba._livestock ? shamba._livestock.get(passportId) : null;
  if (!animal) return { error: 'Animal not found' };

  if (!data.eventType) return { error: 'eventType required' };
  const validType = EVENT_TYPES.find(t => t.id === data.eventType);
  if (!validType) return { error: 'Invalid eventType' };

  if (!data.performedBy || !data.performedBy.role) {
    return { error: 'performedBy.role required (owner | vet | neighbor | extension_officer)' };
  }
  const validRoles = ['owner', 'vet', 'neighbor', 'extension_officer'];
  if (!validRoles.includes(data.performedBy.role)) {
    return { error: 'Invalid performedBy.role' };
  }

  const id = generateEventId();
  const now = new Date().toISOString();

  const event = {
    id,
    passportId,
    eventType: data.eventType,
    eventTypeLabel: validType.label,
    eventDate: data.eventDate || now,
    performedBy: {
      role: data.performedBy.role,
      userId: data.performedBy.userId || null,
      name: (data.performedBy.name || '').trim() || null,
      kycId: data.performedBy.kycId || null,
      kvbVerified: !!data.performedBy.kvbVerified,
    },
    tier: inferTier(data.performedBy.role),
    product: data.product || null,
    dosage: data.dosage || null,
    method: data.method || null,
    batchNumber: data.batchNumber || null,
    notes: data.notes || null,
    photos: Array.isArray(data.photos) ? data.photos.slice(0, 3) : [],
    verifiedBy: null,
    verifiedAt: null,
    createdAt: now,
  };

  healthEvents.set(id, event);
  persist();

  console.log('🩺 Health event:', id, '|', passportId, '|', data.eventType, '| tier:', event.tier);
  return { event };
}

function listHealthEvents(passportId, filter = {}) {
  const out = [];
  for (const e of healthEvents.values()) {
    if (e.passportId !== passportId) continue;
    if (filter.tier && e.tier !== filter.tier) continue;
    if (filter.eventType && e.eventType !== filter.eventType) continue;
    out.push(e);
  }
  // Newest first
  out.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
  return { events: out, count: out.length };
}

function getEvent(eventId) {
  return healthEvents.get(eventId) || null;
}

/**
 * Countersign a self-reported event (upgrades tier to vet_verified).
 * data = { vetId, vetName, kycId, kvbVerified }
 */
function countersignEvent(passportId, eventId, vetData) {
  const event = healthEvents.get(eventId);
  if (!event) return { error: 'Event not found' };
  if (event.passportId !== passportId) return { error: 'Event does not belong to this animal' };
  if (event.tier === 'vet_verified') return { error: 'Event already vet-verified' };
  if (!vetData || !vetData.vetId) return { error: 'Vet ID required' };

  event.verifiedBy = {
    role: 'vet',
    userId: vetData.vetId,
    name: (vetData.vetName || '').trim() || null,
    kycId: vetData.kycId || null,
    kvbVerified: !!vetData.kvbVerified,
  };
  event.verifiedAt = new Date().toISOString();
  event.tier = 'vet_verified';
  event.previousTier = event.previousTier || inferTier(event.performedBy.role);

  healthEvents.set(eventId, event);
  persist();

  console.log('🩺 Countersigned:', eventId, 'by vet', vetData.vetName || vetData.vetId);
  return { event };
}

function deleteEvent(eventId, byUserId) {
  const event = healthEvents.get(eventId);
  if (!event) return { error: 'Event not found' };
  if (byUserId && event.performedBy.userId !== byUserId) {
    return { error: 'Only the recorder can delete this event' };
  }
  healthEvents.delete(eventId);
  persist();
  return { success: true };
}

function getStats() {
  const all = Array.from(healthEvents.values());
  const byTier = { vet_verified: 0, self_reported: 0, community_attested: 0 };
  const byType = {};
  for (const e of all) {
    byTier[e.tier] = (byTier[e.tier] || 0) + 1;
    byType[e.eventType] = (byType[e.eventType] || 0) + 1;
  }
  return {
    total: all.length,
    byTier,
    byType,
    eventTypes: EVENT_TYPES,
    commonProducts: COMMON_PRODUCTS,
  };
}

module.exports = {
  recordHealthEvent,
  listHealthEvents,
  getEvent,
  countersignEvent,
  deleteEvent,
  getStats,
  EVENT_TYPES,
  COMMON_PRODUCTS,
  _healthEvents: healthEvents,
};
