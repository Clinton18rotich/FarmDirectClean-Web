/**
 * Shamba & Mfugo Safi Service
 * Digital Livestock & Land Sovereignty System
 * 
 * Modules:
 * A. Digital Land Vault — GPS boundaries, title deeds, witnesses
 * B. Livestock Passport — UUID IDs, theft reports
 * (C and D wired later with SMS)
 */

const storage = require('./storage');

// Load from disk
const land = storage.objectToMap(storage.load('shamba_land', {}));
const livestock = storage.objectToMap(storage.load('shamba_livestock', {}));
const disputes = storage.objectToMap(storage.load('shamba_disputes', {}));

function persist() {
  storage.save('shamba_land', storage.mapToObject(land));
  storage.save('shamba_livestock', storage.mapToObject(livestock));
  storage.save('shamba_disputes', storage.mapToObject(disputes));
}

/**
 * Generate livestock passport ID
 * Format: KE-{TYPE}-{RANDOM}
 */
function generatePassportId(animalType) {
  const typeCode = {
    'Cow': 'COW',
    'Goat': 'GOAT',
    'Sheep': 'SHEEP',
    'Pig': 'PIG',
    'Chicken': 'CHICK',
    'Camel': 'CAMEL',
    'Donkey': 'DONK',
    'Rabbit': 'RAB',
  }[animalType] || 'ANIMAL';

  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `KE-${typeCode}-${random}`;
}

// ═════════════════════════════════════════════════════
// MODULE A: DIGITAL LAND VAULT
// ═════════════════════════════════════════════════════

/**
 * Register a land parcel
 */
function registerLand(data) {
  const id = 'LAND-' + Date.now().toString(36).toUpperCase();
  const parcel = {
    id,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    ownerPhone: data.ownerPhone,
    // Location (from LocationPicker)
    location: data.location,
    // Land details
    titleDeed: data.titleDeed || null,
    areaHectares: data.areaHectares,
    landUse: data.landUse || 'mixed farming',
    // Boundaries
    coordinates: data.coordinates || null, // Future: GPS polygon
    // Witnesses (community verification)
    witnesses: data.witnesses || [],
    // Status
    status: 'pending_verification',
    verifiedBy: [],
    registeredAt: new Date().toISOString(),
    // Blockchain-lite hash (simulated)
    recordHash: 'HASH-' + Math.random().toString(36).substring(2, 18).toUpperCase(),
  };

  land.set(id, parcel);
  persist();

  console.log('🏠 Land registered:', id, '|', data.areaHectares, 'ha in', data.location?.county);
  return parcel;
}

/**
 * Get all land parcels for a farmer
 */
function getLandByOwner(ownerId) {
  return [...land.values()].filter(p => p.ownerId === ownerId);
}

/**
 * Get single parcel
 */
function getLand(id) {
  return land.get(id);
}

/**
 * Add a witness to a land parcel
 */
function addWitness(landId, witness) {
  const parcel = land.get(landId);
  if (!parcel) return null;

  const exists = parcel.witnesses.find(w => w.phone === witness.phone);
  if (exists) return parcel;

  parcel.witnesses.push({
    name: witness.name,
    phone: witness.phone,
    addedAt: new Date().toISOString(),
    verified: false,
  });

  // Auto-verify if 3+ witnesses
  if (parcel.witnesses.length >= 3 && parcel.status === 'pending_verification') {
    parcel.status = 'verified';
  }

  persist();
  console.log('👥 Witness added to', landId, ':', witness.name);
  return parcel;
}

/**
 * List all land parcels (admin)
 */
function listLand() {
  return [...land.values()].sort((a, b) => 
    new Date(b.registeredAt) - new Date(a.registeredAt)
  );
}

// ═════════════════════════════════════════════════════
// MODULE B: LIVESTOCK PASSPORT
// ═════════════════════════════════════════════════════

/**
 * Register a new animal with passport
 */
function registerLivestock(data) {
  const passportId = generatePassportId(data.type);
  
  const animal = {
    passportId,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    ownerPhone: data.ownerPhone,
    // Animal details
    type: data.type,              // Cow, Goat, Sheep, etc.
    breed: data.breed,
    age: data.age || null,
    color: data.color || null,
    gender: data.gender || null,
    // Location
    location: data.location,
    // AI coat pattern (mock for now)
    aiCoat: '#' + Math.random().toString(16).substring(2, 8).toUpperCase(),
    // Photo (later)
    photoUrl: data.photoUrl || null,
    // Status
    status: 'alive',
    health: 'healthy',
    // Medical records
    vaccinations: [],
    treatments: [],
    // Ownership history
    ownershipHistory: [{
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      from: new Date().toISOString(),
    }],
    // Theft tracking
    isReportedStolen: false,
    theftReport: null,
    // Blockchain-lite
    recordHash: 'HASH-' + Math.random().toString(36).substring(2, 18).toUpperCase(),
    registeredAt: new Date().toISOString(),
  };

  livestock.set(passportId, animal);
  persist();

  console.log('🐄 Livestock registered:', passportId, '|', data.type, data.breed);
  return animal;
}

/**
 * Get all livestock for a farmer
 */
function getLivestockByOwner(ownerId) {
  return [...livestock.values()].filter(a => a.ownerId === ownerId);
}

/**
 * Get single animal
 */
function getLivestock(passportId) {
  return livestock.get(passportId);
}

/**
 * Report animal as stolen
 */
function reportStolen(passportId, report) {
  const animal = livestock.get(passportId);
  if (!animal) return null;

  animal.isReportedStolen = true;
  animal.status = 'stolen';
  animal.theftReport = {
    reportedBy: report.reportedBy,
    reportedAt: new Date().toISOString(),
    description: report.description || '',
    location: report.location || animal.location,
    contactPhone: report.contactPhone,
  };

  // Simulated: notify slaughterhouses
  console.log('🚨 THEFT REPORTED:', passportId, '— Slaughterhouses notified');

  persist();
  return animal;
}

/**
 * Add vaccination record
 */
function addVaccination(passportId, vaccine) {
  const animal = livestock.get(passportId);
  if (!animal) return null;

  animal.vaccinations.push({
    name: vaccine.name,
    vetName: vaccine.vetName,
    date: vaccine.date || new Date().toISOString(),
    nextDue: vaccine.nextDue || null,
  });

  persist();
  console.log('💉 Vaccination added to', passportId, ':', vaccine.name);
  return animal;
}

/**
 * List all livestock (admin)
 */
function listLivestock() {
  return [...livestock.values()].sort((a, b) => 
    new Date(b.registeredAt) - new Date(a.registeredAt)
  );
}

// ═════════════════════════════════════════════════════
// STATS
// ═════════════════════════════════════════════════════

function getStats() {
  const allLand = [...land.values()];
  const allAnimals = [...livestock.values()];
  
  return {
    land: {
      total: allLand.length,
      totalHectares: allLand.reduce((s, p) => s + (p.areaHectares || 0), 0),
      verified: allLand.filter(p => p.status === 'verified').length,
      pending: allLand.filter(p => p.status === 'pending_verification').length,
    },
    livestock: {
      total: allAnimals.length,
      alive: allAnimals.filter(a => a.status === 'alive').length,
      stolen: allAnimals.filter(a => a.status === 'stolen').length,
      byType: allAnimals.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {}),
    },
    disputes: disputes.size,
  };
}

module.exports = {
  // Land
  registerLand,
  getLandByOwner,
  getLand,
  addWitness,
  listLand,
  // Livestock
  registerLivestock,
  getLivestockByOwner,
  getLivestock,
  reportStolen,
  addVaccination,
  listLivestock,
  // Utils
  getStats,
  generatePassportId,
  _land: land,
  _livestock: livestock,
};

// ═════════════════════════════════════════════════════
// MODULE E: SLAUGHTERHOUSE PORTAL
// ═════════════════════════════════════════════════════

const slaughterhouses = storage.objectToMap(storage.load('shamba_slaughterhouses', {}));
const slaughterRequests = storage.objectToMap(storage.load('shamba_slaughter_requests', {}));
const meatTokens = storage.objectToMap(storage.load('shamba_meat_tokens', {}));

function persistSlaughter() {
  storage.save('shamba_slaughterhouses', storage.mapToObject(slaughterhouses));
  storage.save('shamba_slaughter_requests', storage.mapToObject(slaughterRequests));
  storage.save('shamba_meat_tokens', storage.mapToObject(meatTokens));
}

function generateSlaughterhouseId() {
  return 'SLAUGHTER-' + Date.now().toString(36).toUpperCase();
}

function generateSlaughterRequestId() {
  return 'SLQ-' + Date.now().toString(36).toUpperCase();
}

function generateMeatToken() {
  return 'MEAT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function generateApprovalCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Register a slaughterhouse
 */
function registerSlaughterhouse(data) {
  const id = generateSlaughterhouseId();
  const facility = {
    id,
    businessName: data.businessName,
    operatorName: data.operatorName,
    operatorPhone: data.operatorPhone,
    operatorEmail: data.operatorEmail || null,
    location: data.location,
    licenseNumber: data.licenseNumber,
    capacityPerDay: parseInt(data.capacityPerDay) || 0,
    accepts: data.accepts || ['Cow', 'Goat', 'Sheep', 'Pig'],
    payment: data.payment || null,
    status: 'pending_verification',
    registeredAt: new Date().toISOString(),
    verifiedAt: null,
    verifiedBy: null,
    totalSlaughters: 0,
    slaughtersToday: 0,
    lastSlaughterDate: null,
  };

  slaughterhouses.set(id, facility);
  persistSlaughter();

  console.log('🏭 Slaughterhouse registered:', id, '|', data.businessName);
  console.log('   License:', data.licenseNumber, '| Capacity:', data.capacityPerDay, '/day');
  return facility;
}

/**
 * Get slaughterhouse by ID
 */
function getSlaughterhouse(id) {
  return slaughterhouses.get(id);
}

/**
 * List all slaughterhouses
 */
function listSlaughterhouses(filter = {}) {
  let list = [...slaughterhouses.values()];
  if (filter.status) list = list.filter(s => s.status === filter.status);
  if (filter.county) list = list.filter(s => s.location?.county === filter.county);
  return list.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
}

/**
 * Verify slaughterhouse license (admin action)
 */
function verifySlaughterhouse(id, verifiedBy) {
  const facility = slaughterhouses.get(id);
  if (!facility) return null;
  facility.status = 'active';
  facility.verifiedAt = new Date().toISOString();
  facility.verifiedBy = verifiedBy;
  persistSlaughter();
  console.log('✅ Slaughterhouse verified:', id);
  return facility;
}

/**
 * Look up animal by passport ID (for slaughterhouse scan)
 */
function lookupAnimal(passportId) {
  const animal = livestock.get(passportId);
  if (!animal) return { found: false };

  // Check if animal is reported stolen
  if (animal.isReportedStolen) {
    return {
      found: true,
      animal,
      blocked: true,
      reason: 'REPORTED_STOLEN',
      message: '🚨 This animal is reported STOLEN. Do not proceed. Contact police.',
    };
  }

  // Check health
  if (animal.health !== 'healthy') {
    return {
      found: true,
      animal,
      blocked: true,
      reason: 'UNHEALTHY',
      message: '⚠️ This animal is marked unhealthy. Cannot slaughter.',
    };
  }

  return {
    found: true,
    animal,
    blocked: false,
  };
}

/**
 * Create slaughter request (from slaughterhouse)
 */
function createSlaughterRequest(data) {
  const requestId = generateSlaughterRequestId();
  const approvalCode = generateApprovalCode();

  const request = {
    id: requestId,
    slaughterhouseId: data.slaughterhouseId,
    slaughterhouseName: data.slaughterhouseName,
    slaughterhousePhone: data.slaughterhousePhone,
    animalPassport: data.animalPassport,
    animalType: data.animalType,
    animalBreed: data.animalBreed,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    ownerPhone: data.ownerPhone,
    status: 'pending_approval',
    approvalCode,
    requestedAt: new Date().toISOString(),
    approvedAt: null,
    rejectedAt: null,
    completedAt: null,
    rejectionReason: null,
    meatTokens: [],
  };

  slaughterRequests.set(requestId, request);
  persistSlaughter();

  console.log('🏭 Slaughter request:', requestId);
  console.log('   Animal:', data.animalPassport, '| Owner:', data.ownerName);
  console.log('   Approval code:', approvalCode, '(send to', data.ownerPhone + ')');

  return request;
}

/**
 * Approve slaughter (owner action, via SMS or web)
 */
function approveSlaughter(requestId, code) {
  const request = slaughterRequests.get(requestId);
  if (!request) return { success: false, message: 'Request not found' };
  if (request.status !== 'pending_approval') {
    return { success: false, message: 'Request is ' + request.status };
  }
  if (code !== request.approvalCode) {
    return { success: false, message: 'Invalid approval code' };
  }

  request.status = 'approved';
  request.approvedAt = new Date().toISOString();

  persistSlaughter();
  console.log('✅ Slaughter approved:', requestId);
  return { success: true, request };
}

/**
 * Reject slaughter (owner action)
 */
function rejectSlaughter(requestId, reason) {
  const request = slaughterRequests.get(requestId);
  if (!request) return { success: false, message: 'Request not found' };
  if (request.status !== 'pending_approval') {
    return { success: false, message: 'Request is ' + request.status };
  }

  request.status = 'rejected';
  request.rejectedAt = new Date().toISOString();
  request.rejectionReason = reason || 'Owner declined';

  persistSlaughter();
  console.log('❌ Slaughter rejected:', requestId, '|', reason);
  return { success: true, request };
}

/**
 * Complete slaughter + generate meat tokens
 */
function completeSlaughter(requestId, numberOfPackages = 1) {
  const request = slaughterRequests.get(requestId);
  if (!request) return { success: false, message: 'Request not found' };
  if (request.status !== 'approved') {
    return { success: false, message: 'Request not approved' };
  }

  // Generate meat tokens
  const tokens = [];
  for (let i = 0; i < numberOfPackages; i++) {
    const token = generateMeatToken();
    const meatRecord = {
      token,
      animalPassport: request.animalPassport,
      animalType: request.animalType,
      animalBreed: request.animalBreed,
      slaughterhouseId: request.slaughterhouseId,
      slaughterhouseName: request.slaughterhouseName,
      farmerName: request.ownerName,
      farmerPhone: request.ownerPhone,
      slaughteredAt: new Date().toISOString(),
      packageNumber: i + 1,
      totalPackages: numberOfPackages,
      verified: true,
      reported: false,
    };
    meatTokens.set(token, meatRecord);
    tokens.push(token);
  }

  request.status = 'completed';
  request.completedAt = new Date().toISOString();
  request.meatTokens = tokens;

  // Update slaughterhouse stats
  const facility = slaughterhouses.get(request.slaughterhouseId);
  if (facility) {
    facility.totalSlaughters = (facility.totalSlaughters || 0) + 1;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = facility.lastSlaughterDate;
    if (lastDate === today) {
      facility.slaughtersToday = (facility.slaughtersToday || 0) + 1;
    } else {
      facility.slaughtersToday = 1;
      facility.lastSlaughterDate = today;
    }
  }

  persistSlaughter();
  console.log('✅ Slaughter completed:', requestId, '| Generated', tokens.length, 'meat tokens');
  return { success: true, request, tokens };
}

/**
 * Verify meat token (consumer action)
 */
function verifyMeat(token) {
  const record = meatTokens.get(token);
  if (!record) {
    return { success: false, valid: false, message: 'Meat token not found — possible counterfeit' };
  }
  if (record.reported) {
    return { success: false, valid: false, message: 'This meat was reported as fraud' };
  }
  return { success: true, valid: true, meat: record };
}

/**
 * Report meat fraud
 */
function reportMeatFraud(token, report) {
  const record = meatTokens.get(token);
  if (!record) return null;

  record.reported = true;
  record.fraudReport = {
    reportedBy: report.reportedBy,
    reportedAt: new Date().toISOString(),
    description: report.description || '',
    contactPhone: report.contactPhone,
  };

  persistSlaughter();
  console.log('🚨 MEAT FRAUD REPORTED:', token);
  return record;
}

/**
 * List slaughter requests (filtered)
 */
function listSlaughterRequests(filter = {}) {
  let list = [...slaughterRequests.values()];
  if (filter.status) list = list.filter(r => r.status === filter.status);
  if (filter.slaughterhouseId) list = list.filter(r => r.slaughterhouseId === filter.slaughterhouseId);
  if (filter.ownerId) list = list.filter(r => r.ownerId === filter.ownerId);
  return list.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
}

function getSlaughterRequest(id) {
  return slaughterRequests.get(id);
}

// Add slaughterhouse data to exports
module.exports.registerSlaughterhouse = registerSlaughterhouse;
module.exports.getSlaughterhouse = getSlaughterhouse;
module.exports.listSlaughterhouses = listSlaughterhouses;
module.exports.verifySlaughterhouse = verifySlaughterhouse;
module.exports.lookupAnimal = lookupAnimal;
module.exports.createSlaughterRequest = createSlaughterRequest;
module.exports.approveSlaughter = approveSlaughter;
module.exports.rejectSlaughter = rejectSlaughter;
module.exports.completeSlaughter = completeSlaughter;
module.exports.verifyMeat = verifyMeat;
module.exports.reportMeatFraud = reportMeatFraud;
module.exports.listSlaughterRequests = listSlaughterRequests;
module.exports.getSlaughterRequest = getSlaughterRequest;
module.exports._slaughterhouses = slaughterhouses;
module.exports._slaughterRequests = slaughterRequests;
module.exports._meatTokens = meatTokens;

// ═════════════════════════════════════════════════════
// MEAT CHAIN TRACKING (extends meat tokens)
// ═════════════════════════════════════════════════════

/**
 * Receive meat at a handler (butchery/supermarket/restaurant)
 * Updates the meat token with chain info
 */
function receiveMeatAtHandler(token, handler, notes) {
  const record = meatTokens.get(token);
  if (!record) return { success: false, message: 'Meat token not found' };
  if (record.reported) return { success: false, message: 'This meat was reported as fraud' };
  if (record.status === 'sold_to_consumer') return { success: false, message: 'Meat already sold' };
  if (record.currentHolderId === handler.id) return { success: false, message: 'Already at this handler' };

  // Initialize chain if not present
  if (!record.chain) {
    record.chain = [{
      holder: 'slaughterhouse',
      id: record.slaughterhouseId,
      name: record.slaughterhouseName,
      at: record.slaughteredAt,
    }];
  }

  // Add handler to chain
  record.chain.push({
    holder: handler.type,
    id: handler.id,
    name: handler.businessName,
    at: new Date().toISOString(),
    notes: notes || null,
  });

  record.currentHolderId = handler.id;
  record.currentHolderName = handler.businessName;
  record.currentHolderType = handler.type;
  record.currentHolderPhone = handler.ownerPhone;
  record.status = 'at_handler';

  persistSlaughter();
  console.log('📦 Meat received:', token, 'at', handler.businessName);
  return { success: true, meat: record };
}

/**
 * Mark meat as sold to consumer
 */
function sellMeat(token, saleInfo) {
  const record = meatTokens.get(token);
  if (!record) return { success: false, message: 'Meat token not found' };
  if (record.reported) return { success: false, message: 'Cannot sell reported meat' };
  if (record.status === 'sold_to_consumer') return { success: false, message: 'Already sold' };

  if (!record.chain) record.chain = [];
  record.chain.push({
    holder: 'consumer',
    at: new Date().toISOString(),
    notes: saleInfo?.notes || 'Sold to consumer',
  });

  record.status = 'sold_to_consumer';
  record.soldAt = new Date().toISOString();
  record.soldBy = record.currentHolderName;

  persistSlaughter();
  console.log('✅ Meat sold:', token);
  return { success: true, meat: record };
}

/**
 * Return/reject meat (back to slaughterhouse)
 */
function returnMeat(token, reason) {
  const record = meatTokens.get(token);
  if (!record) return { success: false, message: 'Meat token not found' };

  if (!record.chain) record.chain = [];
  record.chain.push({
    holder: 'returned',
    at: new Date().toISOString(),
    notes: reason || 'Returned to slaughterhouse',
  });

  record.status = 'returned';
  record.currentHolderId = record.slaughterhouseId;
  record.currentHolderName = record.slaughterhouseName;
  record.currentHolderType = 'slaughterhouse';
  record.returnedAt = new Date().toISOString();
  record.returnReason = reason || null;

  persistSlaughter();
  console.log('↩️  Meat returned:', token, '|', reason);
  return { success: true, meat: record };
}

/**
 * Get full chain for a meat token
 */
/**
 * Mask phone for privacy: +254712345678 -> +25471****678
 */
function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return phone;
  return '+' + digits.slice(0, 5) + '****' + digits.slice(-3);
}

/**
 * Calculate human-readable duration
 */
function humanDuration(fromIso, toIso) {
  if (!fromIso) return null;
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  const ms = end - new Date(fromIso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days < 1) return 'less than a day';
  if (days < 30) return days + ' days';
  const months = Math.floor(days / 30);
  if (months < 24) return months + ' months';
  return Math.floor(months / 12) + ' years';
}

/**
 * Build source animal data for meat trace
 */
function buildSourceAnimalData(meatRecord) {
  const animal = livestock.get(meatRecord.animalPassport);
  if (!animal) {
    return {
      passportId: meatRecord.animalPassport,
      type: meatRecord.animalType,
      breed: meatRecord.animalBreed,
      note: 'Animal record not available',
    };
  }

  const ageAtSlaughter = meatRecord.slaughteredAt && animal.registeredAt
    ? humanDuration(animal.registeredAt, meatRecord.slaughteredAt)
    : 'unknown';

  return {
    passportId: animal.passportId,
    type: animal.type,
    breed: animal.breed,
    age: animal.age || null,
    ageRaised: ageAtSlaughter,
    gender: animal.gender || null,
    color: animal.color || null,
    aiCoat: animal.aiCoat || null,
    photoUrl: animal.photoUrl || null,
    raisedAt: {
      county: animal.location?.county || 'Unknown',
      ward: animal.location?.ward || null,
      area: animal.location?.area || animal.location?.locality || null,
    },
    farmer: {
      name: animal.ownerName,
      phone: maskPhone(animal.ownerPhone),
      fullPhoneAvailable: false,
    },
    health: {
      status: animal.health || 'unknown',
      vaccinations: animal.vaccinations || [],
      treatments: animal.treatments || [],
      vaccinationCount: (animal.vaccinations || []).length,
      treatmentCount: (animal.treatments || []).length,
    },
    ownershipHistory: animal.ownershipHistory || [],
    ownerCount: (animal.ownershipHistory || []).length,
    verification: {
      recordHash: animal.recordHash,
      registeredAt: animal.registeredAt,
      verified: true,
      verifiedBy: 'FarmDirect Kenya',
      platform: 'Shamba & Mfugo Safi',
    },
  };
}

function getMeatChain(token) {
  const record = meatTokens.get(token);
  if (!record) return null;
  const sourceAnimal = buildSourceAnimalData(record);

  return {
    token: record.token,
    animalPassport: record.animalPassport,
    animalType: record.animalType,
    animalBreed: record.animalBreed,
    farmerName: record.farmerName,
    farmerPhone: record.farmerPhone,
    slaughterhouseName: record.slaughterhouseName,
    slaughteredAt: record.slaughteredAt,
    currentHolder: record.currentHolderId ? {
      id: record.currentHolderId,
      name: record.currentHolderName,
      type: record.currentHolderType,
      phone: record.currentHolderPhone,
    } : null,
    status: record.status || 'at_slaughterhouse',
    chain: record.chain || [{
      holder: 'slaughterhouse',
      id: record.slaughterhouseId,
      name: record.slaughterhouseName,
      at: record.slaughteredAt,
    }],
    reported: record.reported || false,
    soldAt: record.soldAt || null,
    soldBy: record.soldBy || null,
    sourceAnimal: sourceAnimal,
  };
}

module.exports.receiveMeatAtHandler = receiveMeatAtHandler;
module.exports.sellMeat = sellMeat;
module.exports.returnMeat = returnMeat;
module.exports.getMeatChain = getMeatChain;
