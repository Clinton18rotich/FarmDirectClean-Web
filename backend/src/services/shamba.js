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
