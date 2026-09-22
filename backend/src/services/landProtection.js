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
    areaProvisional: computedArea,     // object from computePolygonArea (not yet official)
    areaSqMeters: null,                // official — set on payment
    areaHectares: null,                // official — set on payment
    areaAcres: null,                   // official — set on payment
    areaDisplay: '⏳ Pending payment',
    perimeterMeters: null,
    boundarySegments: [],
    areaWarning: null,
    areaDeed: data.areaHectares ? parseFloat(data.areaHectares) : null,
    boundaryFrozenAt: null,
    boundaryFrozenHash: null,
    landUse: data.landUse || 'Mixed farming',
    description: data.description || '',

    // GPS boundaries
    waypoints: data.waypoints || [],   // [{lat, lng, label, recordedAt}]
    polygonClosed: false,
    hasGpsBoundary: data.waypoints && data.waypoints.length >= 3,

    // Registration fee (Module G + KYC + M-Pesa)
    tier: 'basic',                   // basic (KES 500) | premium (KES 2000)
    fee: 500,                        // KES — charged once at registration
    feePaid: false,
    feePaidAt: null,
    paymentRef: null,
    checkoutRequestId: null,         // for M-Pesa callback matching
    premiumFee: null,                // KES 2000 once upgraded
    premiumPaidAt: null,
    premiumPaymentRef: null,

    // Verification
    status: 'pending_payment',  // pending_payment | draft | pending_witnesses | verified | disputed
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
  console.log('   Area:', parcel.areaProvisional?.display || 'unknown');
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
function haversine(p1, p2) {
  const R = 6371000;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function computeBoundarySegments(waypoints) {
  const segments = [];
  for (let i = 0; i < waypoints.length; i++) {
    const j = (i + 1) % waypoints.length;
    segments.push({
      from: waypoints[i].label || `Point ${i + 1}`,
      to: waypoints[j].label || `Point ${j + 1}`,
      meters: Math.round(haversine(waypoints[i], waypoints[j]) * 10) / 10,
    });
  }
  return segments;
}

function computePerimeter(waypoints) {
  let total = 0;
  for (let i = 0; i < waypoints.length; i++) {
    total += haversine(waypoints[i], waypoints[(i + 1) % waypoints.length]);
  }
  return total;
}

function formatArea(sqMeters) {
  if (!sqMeters || sqMeters < 0.01) return '0 m²';
  if (sqMeters < 1) return `${sqMeters.toFixed(2)} m²`;
  if (sqMeters < 1000) return `${Math.round(sqMeters)} m²`;
  if (sqMeters < 4000) return `${(sqMeters / 4046.86).toFixed(2)} acres`;
  if (sqMeters < 100000) {
    return `${(sqMeters / 4046.86).toFixed(2)} acres (${(sqMeters / 10000).toFixed(2)} ha)`;
  }
  return `${(sqMeters / 10000).toFixed(2)} ha`;
}

function computeBoundaryHash(waypoints) {
  const crypto = require('crypto');
  const canonical = waypoints
    .map(w => `${Number(w.lat).toFixed(7)},${Number(w.lng).toFixed(7)}`)
    .join('|');
  return 'BD-' + crypto.createHash('sha256')
    .update(canonical)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();
}

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
  
  const areaAcres = areaSqMeters / 4046.86;
  const perimeterMeters = computePerimeter(waypoints);
  const boundarySegments = computeBoundarySegments(waypoints);

  const worstAccuracy = Math.max(...waypoints.map(w => Number(w.accuracy) || 0));
  let warning = null;
  if (areaSqMeters < 100) {
    warning = 'Area under 100 m² — walk the full boundary';
  } else if (worstAccuracy > 10) {
    warning = `GPS accuracy ±${Math.round(worstAccuracy)}m — too imprecise for legal use`;
  }

  return {
    sqMeters: Math.round(areaSqMeters * 100) / 100,
    hectares: Math.round(areaHectares * 1000000) / 1000000,
    acres: Math.round(areaAcres * 10000) / 10000,
    perimeterMeters: Math.round(perimeterMeters),
    boundarySegments,
    display: formatArea(areaSqMeters),
    warning,
    worstAccuracy: Math.round(worstAccuracy),
  };
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
    totalHectares: all.reduce((s, p) => s + ((p.areaSqMeters || 0) / 10000), 0),
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

// ═════════════════════════════════════════════════════
// G4: EVICTION SOS BUTTON
// ═════════════════════════════════════════════════════

const emergencyContacts = storage.objectToMap(storage.load('land_emergency_contacts', {}));

function persistSOS() {
  storage.save('land_sos_alerts', storage.mapToObject(sosAlerts));
  storage.save('land_emergency_contacts', storage.mapToObject(emergencyContacts));
}

/**
 * Save emergency contacts for a farmer
 */
function saveEmergencyContacts(ownerId, contacts) {
  emergencyContacts.set(ownerId, {
    ownerId,
    contacts: contacts || [],
    updatedAt: new Date().toISOString(),
  });
  persistSOS();
  console.log('📞 Emergency contacts saved for', ownerId);
  return emergencyContacts.get(ownerId);
}

function getEmergencyContacts(ownerId) {
  return emergencyContacts.get(ownerId) || { ownerId, contacts: [] };
}

/**
 * Trigger eviction SOS
 * Alerts: NLC + farmer's contacts + witnesses + admin + police
 */
async function triggerEvictionSOS(parcelId, data) {
  const parcel = parcels.get(parcelId);
  if (!parcel) return { error: 'Parcel not found' };

  const id = 'SOS-' + Date.now().toString(36).toUpperCase();
  const now = new Date().toISOString();

  // Get all witnesses for this parcel
  const parcelWitnesses = parcel.witnesses
    .map(wid => witnesses.get(wid))
    .filter(w => w && w.status === 'confirmed');

  // Get farmer's emergency contacts
  const emergency = getEmergencyContacts(parcel.ownerId);

  // Build alert content
  const landmarkInfo = `Parcel: ${parcelId}
Owner: ${parcel.ownerName}
Location: ${parcel.village || parcel.ward}, ${parcel.county}
GPS: ${parcel.waypoints.length > 0 ? `${parcel.waypoints[0].lat}, ${parcel.waypoints[0].lng}` : 'Not recorded'}
Area: ${parcel.areaDisplay || 'pending'}
Witnesses: ${parcelWitnesses.length} confirmed
Landmark Hash: ${parcel.landmarkHash || 'N/A'}`;

  const alertMessage = `🚨 EVICTION SOS — FARMDIRECT

${parcel.ownerName} is being EVICTED from their land.
${landmarkInfo}

Reported: ${now}
Reporter: ${data.reporterName || parcel.ownerName}
Situation: ${data.situation || 'Eviction in progress'}

This farmer has VERIFIED digital proof of ownership.
Respond immediately.`;

  // Compose recipients
  const recipients = [];

  // 1. National Land Commission (default)
  recipients.push({
    type: 'NLC',
    name: 'National Land Commission',
    phone: process.env.NLC_PHONE || '0700000000',
  });

  // 2. Farmer's emergency contacts
  for (const contact of (emergency.contacts || [])) {
    recipients.push({
      type: 'emergency',
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    });
  }

  // 3. All confirmed witnesses
  for (const w of parcelWitnesses) {
    recipients.push({
      type: 'witness',
      name: w.name,
      phone: w.phone,
      relationship: w.relationship,
    });
  }

  // 4. FarmDirect admin
  recipients.push({
    type: 'admin',
    name: 'FarmDirect Admin',
    phone: process.env.ADMIN_PHONE || '0700000001',
  });

  // 5. Local police (if county mapped)
  const policeByCounty = {
    'Bomet': '999', 'Nakuru': '999', 'Nairobi': '999',
    'Kisumu': '999', 'Mombasa': '999',
  };
  recipients.push({
    type: 'police',
    name: `Police — ${parcel.county}`,
    phone: policeByCounty[parcel.county] || '999',
  });

  // Send SMS to all
  const alertLog = [];
  for (const r of recipients) {
    try {
      await sms.sendSms(r.phone, alertMessage, {
        type: 'eviction_sos',
        sosId: id,
        parcelId,
        recipientType: r.type,
      });
      alertLog.push({
        type: r.type,
        name: r.name,
        phone: r.phone,
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      alertLog.push({
        type: r.type,
        name: r.name,
        phone: r.phone,
        status: 'failed',
        error: err.message,
      });
    }
  }

  const sos = {
    id,
    parcelId,
    ownerId: parcel.ownerId,
    ownerName: parcel.ownerName,
    county: parcel.county,
    village: parcel.village || parcel.ward,
    gps: parcel.waypoints.length > 0 ? parcel.waypoints[0] : null,
    witnessCount: parcelWitnesses.length,
    landmarkHash: parcel.landmarkHash,
    reporterName: data.reporterName || parcel.ownerName,
    reporterPhone: data.reporterPhone || parcel.ownerPhone,
    situation: data.situation || 'Eviction in progress',
    photoUrl: data.photoUrl || null,
    alertLog,
    totalAlerts: alertLog.filter(a => a.status === 'sent').length,
    status: 'active',
    triggeredAt: now,
    resolvedAt: null,
    resolutionNotes: null,
  };

  sosAlerts.set(id, sos);

  // Mark parcel as disputed
  parcel.status = 'disputed';
  parcel.history.push({
    action: 'eviction_sos_triggered',
    at: now,
    note: `SOS triggered. Alerts sent: ${sos.totalAlerts}`,
  });

  persist();
  persistSOS();

  console.log('');
  console.log('🚨🚨🚨 EVICTION SOS TRIGGERED 🚨🚨🚨');
  console.log('   Parcel:', parcelId);
  console.log('   Owner:', parcel.ownerName);
  console.log('   Alerts sent:', sos.totalAlerts);
  console.log('   Recipients:', recipients.map(r => r.type).join(', '));
  console.log('');

  return { sos, parcel };
}

function getSOS(id) {
  return sosAlerts.get(id);
}

function listSOSAlerts(filter = {}) {
  let list = [...sosAlerts.values()];
  if (filter.status) list = list.filter(s => s.status === filter.status);
  if (filter.ownerId) list = list.filter(s => s.ownerId === filter.ownerId);
  if (filter.county) list = list.filter(s => s.county === filter.county);
  return list.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
}

function resolveSOS(id, resolutionNotes) {
  const sos = sosAlerts.get(id);
  if (!sos) return { error: 'SOS not found' };

  sos.status = 'resolved';
  sos.resolvedAt = new Date().toISOString();
  sos.resolutionNotes = resolutionNotes || 'Situation resolved';

  const parcel = parcels.get(sos.parcelId);
  if (parcel && parcel.status === 'disputed') {
    parcel.status = 'verified';  // Back to verified
    parcel.history.push({
      action: 'sos_resolved',
      at: sos.resolvedAt,
      note: sos.resolutionNotes,
    });
  }

  persist();
  persistSOS();

  console.log('✅ SOS resolved:', id);
  return { sos };
}

// ═════════════════════════════════════════════════════
// G5: LAND-LIVESTOCK GPS MATCH
// ═════════════════════════════════════════════════════

/**
 * Verify ownership by checking if owner's livestock are on the parcel
 * Uses livestock registration location + parcel GPS boundary
 */
function landLivestockMatch(parcelId, livestockPassports) {
  const parcel = parcels.get(parcelId);
  if (!parcel) return { error: 'Parcel not found' };

  const shamba = require('./shamba');
  const animals = livestockPassports.map(pid => {
    const a = shamba._livestock ? shamba._livestock.get(pid) : null;
    return a ? { passportId: pid, animal: a } : { passportId: pid, notFound: true };
  });

  // Check each animal's location matches parcel
  const matches = animals.map(({ passportId, animal, notFound }) => {
    if (notFound) {
      return { passportId, match: false, reason: 'Animal not found in system' };
    }
    if (animal.ownerId !== parcel.ownerId) {
      return { passportId, match: false, reason: 'Animal owned by different person' };
    }

    // Simple location match: same county + ward
    const sameCounty = animal.location?.county === parcel.county;
    const sameWard = animal.location?.ward === parcel.ward;

    if (sameCounty && sameWard) {
      return {
        passportId,
        match: true,
        animalType: animal.type,
        animalBreed: animal.breed,
        animalLocation: animal.location,
      };
    }

    return {
      passportId,
      match: false,
      reason: 'Animal located outside parcel',
      animalLocation: animal.location,
      parcelLocation: { county: parcel.county, ward: parcel.ward },
    };
  });

  const matchCount = matches.filter(m => m.match).length;
  const verification = matchCount >= 2 ? 'strong' 
                     : matchCount === 1 ? 'moderate' 
                     : 'weak';

  return {
    parcelId,
    ownerName: parcel.ownerName,
    parcelLocation: { county: parcel.county, ward: parcel.ward },
    animalsChecked: animals.length,
    matches: matchCount,
    verification,
    details: matches,
    conclusion: matchCount >= 2 
      ? `✅ VERIFIED: ${matchCount} animals confirmed at this parcel`
      : matchCount === 1
        ? `⚠️ WEAK: Only 1 animal confirmed at this parcel`
        : `❌ NOT VERIFIED: No animals found at this parcel`,
  };
}

// ═════════════════════════════════════════════════════
// G6: RENTAL GRAZING LEASE
// ═════════════════════════════════════════════════════

const leases = storage.objectToMap(storage.load('land_leases', {}));

function persistLeases() {
  storage.save('land_leases', storage.mapToObject(leases));
}

function createLease(data) {
  const id = 'LEASE-' + Date.now().toString(36).toUpperCase();
  const now = new Date().toISOString();

  const lease = {
    id,
    // Land
    parcelId: data.parcelId,
    // Parties
    landownerId: data.landownerId,
    landownerName: data.landownerName,
    landownerPhone: data.landownerPhone,
    tenantId: data.tenantId,
    tenantName: data.tenantName,
    tenantPhone: data.tenantPhone,
    // Terms
    purpose: data.purpose || 'Grazing',
    monthlyFee: parseInt(data.monthlyFee) || 0,
    startDate: data.startDate,
    endDate: data.endDate,
    terms: data.terms || '',
    // Approval
    status: 'pending_approval',
    approvalCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    // Meta
    createdAt: now,
    approvedAt: null,
    rejectedAt: null,
    terminatedAt: null,
    history: [{
      action: 'created',
      at: now,
      note: `Lease created by ${data.tenantName}`,
    }],
  };

  leases.set(id, lease);

  // SMS to landowner for approval
  const smsMessage = `FarmDirect Lease Request
${data.tenantName} wants to lease your land for ${lease.purpose}
From: ${lease.startDate} to: ${lease.endDate}
Fee: KES ${lease.monthlyFee}/month

Reply YES ${lease.approvalCode} to approve
Reply NO to reject`;

  sms.sendSms(data.landownerPhone, smsMessage, {
    type: 'lease_request',
    leaseId: id,
  }).catch(err => console.error(err.message));

  persistLeases();
  console.log('📄 Lease created:', id, '|', data.tenantName, '→', data.landownerName);
  return lease;
}

function approveLease(leaseId, code) {
  const lease = leases.get(leaseId);
  if (!lease) return { error: 'Lease not found' };
  if (lease.approvalCode !== code) return { error: 'Invalid code' };

  lease.status = 'active';
  lease.approvedAt = new Date().toISOString();
  lease.history.push({
    action: 'approved',
    at: lease.approvedAt,
    note: 'Landowner approved',
  });

  persistLeases();
  console.log('✅ Lease approved:', leaseId);
  return { lease };
}

function rejectLease(leaseId, reason) {
  const lease = leases.get(leaseId);
  if (!lease) return { error: 'Lease not found' };

  lease.status = 'rejected';
  lease.rejectedAt = new Date().toISOString();
  lease.rejectionReason = reason || 'Rejected';
  lease.history.push({
    action: 'rejected',
    at: lease.rejectedAt,
    note: reason || 'Rejected by landowner',
  });

  persistLeases();
  console.log('❌ Lease rejected:', leaseId);
  return { lease };
}

function listLeases(filter = {}) {
  let list = [...leases.values()];
  if (filter.landownerId) list = list.filter(l => l.landownerId === filter.landownerId);
  if (filter.tenantId) list = list.filter(l => l.tenantId === filter.tenantId);
  if (filter.parcelId) list = list.filter(l => l.parcelId === filter.parcelId);
  if (filter.status) list = list.filter(l => l.status === filter.status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ═════════════════════════════════════════════════════
// G7: NOMADIC HERD EXEMPTION
// ═════════════════════════════════════════════════════

function markNomadic(passportId, data) {
  const shamba = require('./shamba');
  const animal = shamba._livestock ? shamba._livestock.get(passportId) : null;
  if (!animal) return { error: 'Animal not found' };

  animal.nomadic = {
    enabled: true,
    reason: data.reason || 'Seasonal grazing',
    allowedCounties: data.allowedCounties || [],
    seasonStart: data.seasonStart || null,
    seasonEnd: data.seasonEnd || null,
    approvedBy: data.approvedBy || 'owner',
    enabledAt: new Date().toISOString(),
  };

  console.log('🐪 Animal marked nomadic:', passportId, '|', animal.nomadic.reason);
  return { animal };
}

// Add to exports
module.exports.saveEmergencyContacts = saveEmergencyContacts;
module.exports.getEmergencyContacts = getEmergencyContacts;
module.exports.triggerEvictionSOS = triggerEvictionSOS;
module.exports.getSOS = getSOS;
module.exports.listSOSAlerts = listSOSAlerts;
module.exports.resolveSOS = resolveSOS;
module.exports.landLivestockMatch = landLivestockMatch;
module.exports.createLease = createLease;
module.exports.approveLease = approveLease;
module.exports.rejectLease = rejectLease;
module.exports.listLeases = listLeases;
module.exports.markNomadic = markNomadic;
module.exports._sosAlerts = sosAlerts;
module.exports._emergencyContacts = emergencyContacts;
module.exports._leases = leases;


// ═════════════════════════════════════════════════════
// PARCEL PAYMENT (Module G + M-Pesa)
// ═════════════════════════════════════════════════════

/**
 * Initiate KES 500 registration fee STK push for a parcel
 */
function promoteAreaToOfficial(parcel) {
  if (!parcel.areaProvisional) return;

  parcel.areaSqMeters = parcel.areaProvisional.sqMeters;
  parcel.areaHectares = parcel.areaProvisional.hectares;
  parcel.areaAcres = parcel.areaProvisional.acres;
  parcel.areaDisplay = parcel.areaProvisional.display;
  parcel.perimeterMeters = parcel.areaProvisional.perimeterMeters;
  parcel.boundarySegments = parcel.areaProvisional.boundarySegments;
  parcel.areaWarning = parcel.areaProvisional.warning;
  parcel.boundaryFrozenAt = new Date().toISOString();
  parcel.boundaryFrozenHash = computeBoundaryHash(parcel.waypoints);

  console.log('🔒 Boundary frozen for', parcel.id, '|', parcel.areaDisplay, '| hash:', parcel.boundaryFrozenHash);
}

async function initiateParcelPayment(parcelId, phone) {
  const parcel = parcels.get(parcelId);
  if (!parcel) return { error: 'Parcel not found' };
  if (parcel.feePaid) return { error: 'Already paid' };

  const mpesa = require('./mpesa');

  // Simulated mode — mark paid immediately, promote to draft
  if (!mpesa.isConfigured()) {
    console.log('⚠️  M-Pesa not configured — simulating parcel payment');
    parcel.feePaid = true;
    parcel.feePaidAt = new Date().toISOString();
    parcel.paymentRef = 'SIMULATED-' + Date.now();
    parcel.status = 'draft';
    promoteAreaToOfficial(parcel);
    parcel.history.push({ action: 'fee_paid', at: parcel.feePaidAt, note: 'KES ' + parcel.fee + ' (simulated) | ' + (parcel.areaDisplay || '') });
    persist();
    return { record: parcel, stk: null };
  }

  // Real STK push
  try {
    const result = await mpesa.stkPush({
      phone,
      amount: parcel.fee,
      accountRef: 'LAND-' + parcel.id,
      description: 'FarmDirect land registration',
    });

    parcel.checkoutRequestId = result.CheckoutRequestID;
    parcel.stkInitiatedAt = new Date().toISOString();
    parcel.status = 'awaiting_payment';
    persist();

    return {
      record: parcel,
      stk: {
        checkoutRequestId: result.CheckoutRequestID,
        customerMessage: result.CustomerMessage,
      },
    };
  } catch (err) {
    console.error('❌ Parcel STK failed:', err.message);
    return { error: 'Failed to send M-Pesa prompt: ' + err.message };
  }
}

/**
 * Initiate KES 2000 premium upgrade STK push
 */
async function initiatePremiumUpgrade(parcelId, phone) {
  const parcel = parcels.get(parcelId);
  if (!parcel) return { error: 'Parcel not found' };
  if (!parcel.feePaid) return { error: 'Pay basic registration fee first' };
  if (parcel.tier === 'premium') return { error: 'Already premium' };

  const mpesa = require('./mpesa');
  const PREMIUM_FEE = 2000;

  if (!mpesa.isConfigured()) {
    console.log('⚠️  M-Pesa not configured — simulating premium upgrade');
    parcel.tier = 'premium';
    parcel.premiumFee = PREMIUM_FEE;
    parcel.premiumPaidAt = new Date().toISOString();
    parcel.premiumPaymentRef = 'SIMULATED-' + Date.now();
    parcel.history.push({ action: 'premium_upgrade', at: parcel.premiumPaidAt, note: 'KES ' + PREMIUM_FEE + ' (simulated)' });
    persist();
    return { record: parcel, stk: null };
  }

  try {
    const result = await mpesa.stkPush({
      phone,
      amount: PREMIUM_FEE,
      accountRef: 'LAND-PREM-' + parcel.id,
      description: 'FarmDirect premium land verification',
    });

    parcel.premiumCheckoutRequestId = result.CheckoutRequestID;
    parcel.premiumStkInitiatedAt = new Date().toISOString();
    persist();

    return {
      record: parcel,
      stk: {
        checkoutRequestId: result.CheckoutRequestID,
        customerMessage: result.CustomerMessage,
      },
    };
  } catch (err) {
    console.error('❌ Premium STK failed:', err.message);
    return { error: 'Failed to send M-Pesa prompt: ' + err.message };
  }
}

/**
 * Confirm parcel payment from M-Pesa callback
 * Matches by CheckoutRequestID (never phone)
 */
async function confirmParcelPayment(checkoutRequestId, callbackData) {
  const parcel = [...parcels.values()].find(
    p => p.checkoutRequestId === checkoutRequestId || p.premiumCheckoutRequestId === checkoutRequestId
  );
  if (!parcel) return { error: 'No matching parcel' };

  const isPremium = parcel.premiumCheckoutRequestId === checkoutRequestId;

  if (!callbackData.success) {
    parcel.status = isPremium ? parcel.status : 'payment_failed';
    parcel.paymentFailureReason = callbackData.resultDesc;
    persist();
    return { record: parcel };
  }

  if (isPremium) {
    parcel.tier = 'premium';
    parcel.premiumFee = callbackData.amount;
    parcel.premiumPaidAt = new Date().toISOString();
    parcel.premiumPaymentRef = callbackData.mpesaReceipt;
    parcel.history.push({ action: 'premium_upgrade', at: parcel.premiumPaidAt, note: 'KES ' + callbackData.amount + ' | ' + callbackData.mpesaReceipt });
  } else {
    parcel.feePaid = true;
    parcel.feePaidAt = new Date().toISOString();
    parcel.paymentRef = callbackData.mpesaReceipt;
    parcel.fee = callbackData.amount;
    parcel.status = 'draft';
    promoteAreaToOfficial(parcel);
    parcel.history.push({ action: 'fee_paid', at: parcel.feePaidAt, note: 'KES ' + callbackData.amount + ' | ' + callbackData.mpesaReceipt + ' | ' + (parcel.areaDisplay || '') });
  }

  persist();
  return { record: parcel };
}

/**
 * List parcels stuck in awaiting_payment, plus premium upgrades pending.
 * Used by the reconciliation cron to recover lost callbacks.
 *
 * For premium upgrades: parcel already has tier !== 'premium' but a
 * premiumCheckoutRequestId is set — return a copy with checkoutRequestId
 * pointing to the premium STK so the cron matches the right record.
 */
function listAwaitingPayment() {
  const out = [];
  for (const parcel of parcels.values()) {
    // Case 1 — basic fee unpaid
    if (parcel.status === 'awaiting_payment' && parcel.checkoutRequestId) {
      out.push(parcel);
    }
    // Case 2 — premium upgrade pending (parcel already draft, tier still basic)
    if (
      parcel.premiumCheckoutRequestId &&
      parcel.premiumStkInitiatedAt &&
      parcel.tier !== 'premium'
    ) {
      out.push({ ...parcel, checkoutRequestId: parcel.premiumCheckoutRequestId });
    }
  }
  return out;
}

module.exports.initiateParcelPayment = initiateParcelPayment;
module.exports.initiatePremiumUpgrade = initiatePremiumUpgrade;
module.exports.confirmParcelPayment = confirmParcelPayment;
module.exports.listAwaitingPayment = listAwaitingPayment;
