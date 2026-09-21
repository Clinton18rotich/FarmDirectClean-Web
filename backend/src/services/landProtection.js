/**
 * Land Sovereignty Service
 * GPS boundary mapping, title deed vault, witness verification
 * Protects farmers from land grabbing, eviction, title theft
 */

const storage = require('./storage');
const sms = require('./sms');

const parcels = storage.objectToMap(storage.load('land_parcels', {}));
const witnesses = storage.objectToMap(storage.load('land_witnesses', {}));
const deedVault = storage.objectToMap(storage.load('land_deed_vault', {}));
const sosAlerts = storage.objectToMap(storage.load('land_sos_alerts', {}));

function persist() {
  storage.save('land_parcels', storage.mapToObject(parcels));
  storage.save('land_witnesses', storage.mapToObject(witnesses));
  storage.save('land_deed_vault', storage.mapToObject(deedVault));
  storage.save('land_sos_alerts', storage.mapToObject(sosAlerts));
}

// ═════════════════════════════════════════════════════
// G1: GPS BOUNDARY MAPPING
// ═════════════════════════════════════════════════════

function generateParcelId() {
  return 'PARCEL-' + Date.now().toString(36).toUpperCase();
}

/**
 * Register a land parcel with GPS boundaries
 */
function registerParcel(data) {
  const id = generateParcelId();
  const now = new Date().toISOString();

  // Compute area from GPS polygon if provided
  let computedArea = null;
  if (data.waypoints && data.waypoints.length >= 3) {
    computedArea = computePolygonArea(data.waypoints);
  }

  const parcel = {
    id,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    ownerPhone: data.ownerPhone,

    // Location
    county: data.county,
    subCounty: data.subCounty,
    ward: data.ward,
    village: data.village,

    // Land details
    titleDeed: data.titleDeed || null,
    areaHectares: data.areaHectares ? parseFloat(data.areaHectares) : computedArea,
    areaComputed: computedArea,
    landUse: data.landUse || 'Mixed farming',
    description: data.description || '',

    // GPS boundaries
    waypoints: data.waypoints || [],   // [{lat, lng, label, recordedAt}]
    polygonClosed: false,
    hasGpsBoundary: data.waypoints && data.waypoints.length >= 3,

    // Verification
    status: 'draft',  // draft | pending_witnesses | verified | disputed
    witnesses: [],
    requiredWitnesses: 3,
    confirmedWitnesses: 0,

    // Title deed vault
    titleDeedPhoto: null,       // base64 or reference
    titleDeedHash: null,        // SHA-256 of photo
    titleDeedUploadedAt: null,

    // Blockchain-lite
    recordHash: 'HASH-' + Math.random().toString(36).substring(2, 18).toUpperCase(),
    landmarkHash: null,         // hash combining GPS + title

    // Meta
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
    history: [{
      action: 'created',
      at: now,
      note: 'Parcel registered with ' + (data.waypoints?.length || 0) + ' GPS waypoints',
    }],
  };

  parcels.set(id, parcel);
  persist();

  console.log('🏠 Parcel registered:', id, '|', data.ownerName);
  console.log('   Area:', parcel.areaHectares, 'ha');
  console.log('   Waypoints:', parcel.waypoints.length);

  return parcel;
}

/**
 * Add a GPS waypoint to a parcel
 */
function addWaypoint(parcelId, waypoint) {
  const parcel = parcels.get(parcelId);
  if (!parcel) return { error: 'Parcel not found' };

  const wp = {
    lat: parseFloat(waypoint.lat),
    lng: parseFloat(waypoint.lng),
    label: waypoint.label || `Point ${parcel.waypoints.length + 1}`,
    recordedAt: new Date().toISOString(),
  };

  if (!wp.lat || !wp.lng) return { error: 'Invalid coordinates' };

  parcel.waypoints.push(wp);
  parcel.hasGpsBoundary = parcel.waypoints.length >= 3;
  parcel.updatedAt = new Date().toISOString();
  parcel.history.push({
    action: 'waypoint_added',
    at: parcel.updatedAt,
    note: `${wp.label}: ${wp.lat}, ${wp.lng}`,
  });

  persist();
  console.log('📍 Waypoint added to', parcelId, ':', wp.label);
  return parcel;
}

/**
 * Compute polygon area from GPS waypoints (Haversine + shoelace)
 */
function computePolygonArea(waypoints) {
  if (!waypoints || waypoints.length < 3) return null;
  
  // Shoelace formula with approximate conversion to meters
  const R = 6371000; // Earth radius in meters
  let area = 0;
  
  for (let i = 0; i < waypoints.length; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % waypoints.length];
    
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const lng1 = p1.lng * Math.PI / 180;
    const lng2 = p2.lng * Math.PI / 180;
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  const areaSqMeters = Math.abs(area * R * R / 2);
  const areaHectares = areaSqMeters / 10000;
  
  return Math.round(areaHectares * 100) / 100;
}

// ═════════════════════════════════════════════════════
// G2: TITLE DEED DIGITAL VAULT
// ═════════════════════════════════════════════════════

function uploadTitleDeed(parcelId, data) {
  const parcel = parcels.get(parcelId);
  if (!parcel) return { error: 'Parcel not found' };

  if (!data.photoBase64 && !data.titleDeedNumber) {
    return { error: 'Either photo or title deed number required' };
  }

  // Simple hash from photo (in production, use real SHA-256)
  const hashInput = (data.photoBase64 || data.titleDeedNumber) + parcel.ownerPhone;
  const hash = 'HASH-' + Buffer.from(hashInput).toString('base64').slice(0, 20).toUpperCase();

  parcel.titleDeedPhoto = data.photoBase64 || null;
  parcel.titleDeedNumber = data.titleDeedNumber || parcel.titleDeed;
  parcel.titleDeedHash = hash;
  parcel.titleDeedUploadedAt = new Date().toISOString();

  // Combine GPS + title into landmark hash
  if (parcel.waypoints.length >= 3 && hash) {
    const combined = parcel.waypoints.map(w => `${w.lat},${w.lng}`).join('|') + hash;
    parcel.landmarkHash = 'LAND-' + Buffer.from(combined).toString('base64').slice(0, 16).toUpperCase();
  }

  parcel.updatedAt = new Date().toISOString();
  parcel.history.push({
    action: 'title_deed_uploaded',
    at: parcel.updatedAt,
    note: `Title deed stored, hash: ${hash}`,
  });

  // Store in vault (separate from parcel for extra backup)
  deedVault.set(parcelId, {
    parcelId,
    ownerId: parcel.ownerId,
    titleDeedNumber: parcel.titleDeedNumber,
    titleDeedHash: hash,
    hasPhoto: !!data.photoBase64,
    uploadedAt: parcel.titleDeedUploadedAt,
  });

  persist();
  console.log('📜 Title deed vaulted for', parcelId, '| Hash:', hash);
  return parcel;
}

function getDeedFromVault(parcelId) {
  return deedVault.get(parcelId);
}

// ═════════════════════════════════════════════════════
// G3: NEIGHBOR WITNESS VERIFICATION
// ═════════════════════════════════════════════════════

function inviteWitness(parcelId, witnessData) {
  const parcel = parcels.get(parcelId);
  if (!parcel) return { error: 'Parcel not found' };

  if (parcel.witnesses.length >= 5) {
    return { error: 'Maximum 5 witnesses allowed' };
  }

  const witnessId = 'WIT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  
  const witness = {
    id: witnessId,
    parcelId,
    name: witnessData.name,
    phone: witnessData.phone,
    relationship: witnessData.relationship || 'Neighbor',
    
    status: 'invited',   // invited | confirmed | declined
    invitedAt: new Date().toISOString(),
    confirmedAt: null,
    declinedAt: null,
    
    // Verification data
    confirmationCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    confirmedLocation: null,   // GPS where witness confirmed
    witnessStatement: null,
  };

  witnesses.set(witnessId, witness);
  parcel.witnesses.push(witnessId);
  parcel.status = 'pending_witnesses';
  parcel.updatedAt = new Date().toISOString();

  // Send SMS invite
  const smsMessage = `FarmDirect Land Verification
${parcel.ownerName} has named you as a witness for their land in ${parcel.village || parcel.ward}, ${parcel.county}.

Reply with this code to confirm:
YES ${witness.confirmationCode}

Only confirm if you know this land is theirs.
Reply NO to decline.`;

  sms.sendSms(witness.phone, smsMessage, {
    type: 'witness_invite',
    parcelId,
    witnessId,
  }).catch(err => console.error('SMS failed:', err.message));

  persist();
  console.log('👥 Witness invited:', witness.name, '|', parcelId);
  console.log('   Code:', witness.confirmationCode);
  return { witness, parcel };
}

/**
 * Witness confirms (via SMS or web)
 */
function confirmWitness(witnessId, code, location) {
  const witness = witnesses.get(witnessId);
  if (!witness) return { error: 'Witness not found' };
  if (witness.status === 'confirmed') return { error: 'Already confirmed' };
  if (code !== witness.confirmationCode) return { error: 'Invalid code' };

  witness.status = 'confirmed';
  witness.confirmedAt = new Date().toISOString();
  witness.confirmedLocation = location || null;

  const parcel = parcels.get(witness.parcelId);
  if (parcel) {
    parcel.confirmedWitnesses = parcel.witnesses
      .map(id => witnesses.get(id))
      .filter(w => w?.status === 'confirmed').length;

    parcel.history.push({
      action: 'witness_confirmed',
      at: witness.confirmedAt,
      note: `${witness.name} confirmed boundary`,
    });

    // Auto-verify when 3 witnesses confirm
    if (parcel.confirmedWitnesses >= 3 && parcel.status !== 'verified') {
      parcel.status = 'verified';
      parcel.verifiedAt = new Date().toISOString();
      parcel.history.push({
        action: 'verified',
        at: parcel.verifiedAt,
        note: `Parcel verified with ${parcel.confirmedWitnesses} witnesses`,
      });
      console.log('✅ Parcel VERIFIED:', parcel.id);
    }

    parcel.updatedAt = new Date().toISOString();
  }

  persist();
  console.log('✅ Witness confirmed:', witness.name);
  return { witness, parcel };
}

function declineWitness(witnessId, reason) {
  const witness = witnesses.get(witnessId);
  if (!witness) return { error: 'Witness not found' };

  witness.status = 'declined';
  witness.declinedAt = new Date().toISOString();
  witness.declineReason = reason || 'No reason given';

  persist();
  console.log('❌ Witness declined:', witness.name);
  return { witness };
}

// ═════════════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════════════

function getParcel(id) {
  return parcels.get(id);
}

function getParcelEnriched(id) {
  const parcel = parcels.get(id);
  if (!parcel) return null;

  return {
    ...parcel,
    witnessDetails: parcel.witnesses.map(wid => witnesses.get(wid)).filter(Boolean),
    deedInVault: !!deedVault.get(id),
    verificationProgress: {
      required: 3,
      confirmed: parcel.confirmedWitnesses,
      percent: Math.min(100, Math.round((parcel.confirmedWitnesses / 3) * 100)),
    },
  };
}

function listParcels(filter = {}) {
  let list = [...parcels.values()];
  if (filter.ownerId) list = list.filter(p => p.ownerId === filter.ownerId);
  if (filter.county) list = list.filter(p => p.county === filter.county);
  if (filter.status) list = list.filter(p => p.status === filter.status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getStats() {
  const all = [...parcels.values()];
  const allWitnesses = [...witnesses.values()];
  return {
    totalParcels: all.length,
    verifiedParcels: all.filter(p => p.status === 'verified').length,
    pendingVerification: all.filter(p => p.status === 'pending_witnesses').length,
    totalHectares: all.reduce((s, p) => s + (p.areaHectares || 0), 0),
    totalWitnesses: allWitnesses.length,
    confirmedWitnesses: allWitnesses.filter(w => w.status === 'confirmed').length,
    titleDeedsVaulted: deedVault.size,
    gpsBoundaries: all.filter(p => p.hasGpsBoundary).length,
  };
}

module.exports = {
  // Parcels
  registerParcel,
  addWaypoint,
  computePolygonArea,
  getParcel,
  getParcelEnriched,
  listParcels,
  // Title deed vault
  uploadTitleDeed,
  getDeedFromVault,
  // Witnesses
  inviteWitness,
  confirmWitness,
  declineWitness,
  // Stats
  getStats,
  // Debug
  _parcels: parcels,
  _witnesses: witnesses,
  _deedVault: deedVault,
};
