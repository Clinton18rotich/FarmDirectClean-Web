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

/**
 * Compute life stage from birth date + type + gender
 */
function computeLifeStage(animal) {
  const ageInfo = computeAge(animal);
  const ageMonths = ageInfo.months;
  const gender = animal.gender;

  const stages = {
    'Cow':     { young: 'Calf',     teen: 'Weaner',    adult: gender === 'Male' ? 'Bull' : 'Cow' },
    'Goat':    { young: 'Kid',      teen: 'Yearling',  adult: gender === 'Male' ? 'Buck' : 'Doe' },
    'Sheep':   { young: 'Lamb',     teen: 'Yearling',  adult: gender === 'Male' ? 'Ram' : 'Ewe' },
    'Pig':     { young: 'Piglet',   teen: 'Grower',    adult: gender === 'Male' ? 'Boar' : 'Sow' },
    'Chicken': { young: 'Chick',    teen: 'Grower',    adult: gender === 'Male' ? 'Rooster' : 'Hen' },
    'Camel':   { young: 'Calf',     teen: 'Yearling',  adult: 'Camel' },
    'Donkey':  { young: 'Foal',     teen: 'Yearling',  adult: 'Donkey' },
    'Rabbit':  { young: 'Kit',      teen: 'Young',     adult: 'Rabbit' },
  };

  const s = stages[animal.type] || { young: 'Newborn', teen: 'Young', adult: 'Adult' };
  if (ageMonths < 12) return s.young;
  if (ageMonths < 24) return s.teen;
  return s.adult;
}

/**
 * Compute age in months + human-readable
 */
function computeAge(animal) {
  // Priority 1: explicit birthDate (newborns registered with birth date)
  if (animal.birthDate) {
    const months = Math.floor((Date.now() - new Date(animal.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return { months, display: formatMonths(months), source: 'birthDate' };
  }

  // Priority 2: parse age string like "4 years", "18 months", "2 years 6 months"
  if (animal.age) {
    const parsed = parseAgeString(animal.age);
    if (parsed) return { months: parsed, display: formatMonths(parsed), source: 'ageField' };
  }

  // Priority 3: fall back to registration date (may understate age)
  if (animal.registeredAt) {
    const months = Math.floor((Date.now() - new Date(animal.registeredAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
    return { months, display: formatMonths(months), source: 'registeredAt' };
  }

  return { months: 0, display: 'unknown', source: 'unknown' };
}

function formatMonths(months) {
  if (months < 1) return 'less than 1 month';
  if (months < 12) return months + ' month' + (months > 1 ? 's' : '');
  const years = Math.floor(months / 12);
  const extraMonths = months % 12;
  return years + ' year' + (years > 1 ? 's' : '') + (extraMonths > 0 ? ' ' + extraMonths + ' months' : '');
}

function parseAgeString(str) {
  if (!str) return null;
  const s = String(str).toLowerCase();
  let totalMonths = 0;
  let matched = false;

  const yearMatch = s.match(/(\d+)\s*year/);
  if (yearMatch) { totalMonths += parseInt(yearMatch[1]) * 12; matched = true; }

  const monthMatch = s.match(/(\d+)\s*month/);
  if (monthMatch) { totalMonths += parseInt(monthMatch[1]); matched = true; }

  const weekMatch = s.match(/(\d+)\s*week/);
  if (weekMatch) { totalMonths += Math.floor(parseInt(weekMatch[1]) / 4); matched = true; }

  const dayMatch = s.match(/(\d+)\s*day/);
  if (dayMatch && !matched) { totalMonths += Math.floor(parseInt(dayMatch[1]) / 30); matched = true; }

  return matched ? totalMonths : null;
}

/**
 * Enrich an animal record with computed fields
 */
function enrichAnimal(animal) {
  if (!animal) return null;
  const age = computeAge(animal);
  const stage = computeLifeStage(animal);
  const isYoung = age.months < 12;

  // Derived physical data
  const bcs = interpretBCS(animal.bodyConditionScore);
  const productionScore = computeProductionScore(animal);
  const marketValue = computeMarketValue({ ...animal, productionScore });

  // Auto-compute weight if measurements available but no explicit weight
  let estimatedWeight = animal.weight;
  let weightSource = animal.weight ? 'measured' : null;
  if (!estimatedWeight && animal.heartGirth && animal.bodyLength) {
    estimatedWeight = estimateWeight(animal.type, animal.heartGirth, animal.bodyLength);
    weightSource = 'estimated';
  }

  return {
    ...animal,
    currentLifeStage: stage,
    ageMonths: age.months,
    ageDisplay: age.display,
    isYoung,
    displayName: isYoung ? stage : `${stage} (${age.display})`,

    // Derived
    weight: estimatedWeight,
    weightSource,
    bcsInterpretation: bcs,
    productionScore,
    marketValue,
  };
}


/**
 * Compute Body Condition Score interpretation
 */
function interpretBCS(score) {
  if (!score) return null;
  const s = parseInt(score);
  if (s <= 1) return { label: 'Emaciated', color: '#C62828', note: 'Severely underweight — needs urgent feeding' };
  if (s === 2) return { label: 'Thin', color: '#FF9800', note: 'Underweight — needs better nutrition' };
  if (s === 3) return { label: 'Ideal', color: '#4CAF50', note: 'Perfect condition for market' };
  if (s === 4) return { label: 'Fat', color: '#FF9800', note: 'Slightly heavy — reduce feed' };
  if (s >= 5) return { label: 'Obese', color: '#C62828', note: 'Overweight — health risk' };
  return null;
}

/**
 * Compute weight from heart girth + body length (weight tape formula)
 * Cattle: (Girth² × Length) / 300
 * Goats/Sheep: (Girth² × Length) / 350
 */
function estimateWeight(animalType, heartGirth, bodyLength) {
  if (!heartGirth || !bodyLength) return null;
  const g = parseFloat(heartGirth);
  const l = parseFloat(bodyLength);
  if (g < 30 || l < 30) return null;

  // Kenya weight tape formula (cm measurements → kg output)
  // Cattle: (Girth² x Length) / 30000
  // Goat/Sheep/Pig: (Girth² x Length) / 40000
  let divisor;
  if (['Cow', 'Bull', 'Heifer', 'Camel', 'Donkey'].includes(animalType)) {
    divisor = 30000;
  } else if (['Goat', 'Sheep', 'Pig'].includes(animalType)) {
    divisor = 40000;
  } else {
    divisor = 35000;
  }

  return Math.round((g * g * l) / divisor);
}

/**
 * Compute production value score (0-100)
 * Higher score = higher market value
 */
function computeProductionScore(animal) {
  let score = 50; // baseline

  // Weight bonus
  if (animal.weight) {
    const avg = { 'Cow': 400, 'Goat': 40, 'Sheep': 45, 'Pig': 100, 'Camel': 500 }[animal.type] || 50;
    const ratio = animal.weight / avg;
    score += Math.min(20, Math.max(-20, (ratio - 1) * 40));
  }

  // BCS bonus
  if (animal.bodyConditionScore) {
    const bcs = parseInt(animal.bodyConditionScore);
    if (bcs === 3) score += 15;
    else if (bcs === 2 || bcs === 4) score += 5;
    else score -= 10;
  }

  // Vaccination bonus
  if ((animal.vaccinations || []).length > 0) score += 5;
  if ((animal.vaccinations || []).length >= 2) score += 5;

  // Vet verified bonus
  if (animal.deathRecord?.vetVerified) score += 5;

  // Health penalties
  if (animal.health === 'deceased') score = 0;
  if (animal.quarantine?.active) score -= 30;
  if (animal.isReportedStolen) score = 0;

  // Age penalty (older animals worth less for meat)
  if (animal.teethAge === 'worn') score -= 10;
  if (animal.teethAge === 'full') score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute market value estimate (KES)
 * Simple model: base by type × production score × regional multiplier
 */
function computeMarketValue(animal, regionalAvg) {
  if (!animal) return null;

  // Base price by type (approximate Kenya averages)
  const basePrices = {
    'Cow': 65000, 'Bull': 75000, 'Heifer': 55000,
    'Goat': 10000, 'Sheep': 12000, 'Pig': 20000,
    'Chicken': 1200, 'Camel': 120000, 'Donkey': 30000,
    'Rabbit': 2500,
  };

  const base = basePrices[animal.type] || 20000;
  const score = animal.productionScore || 50;

  // Score multiplier (0.6 to 1.4)
  const scoreMultiplier = 0.6 + (score / 100) * 0.8;

  // Breed multiplier (Friesian, Boran, etc. premium)
  const breedMultipliers = {
    'Friesian': 1.3, 'Jersey': 1.2, 'Ayrshire': 1.15,
    'Boran': 1.1, 'Sahiwal': 1.15, 'Sahiwal': 1.15,
    'Dorper': 1.2, 'Merino': 1.25,
    'Galla': 0.95, 'Red Maasai': 1.0,
    'Kienyeji': 0.85,
  };
  const breedMult = breedMultipliers[animal.breed] || 1.0;

  // Regional multiplier (Nairobi higher, remote lower)
  const regionMult = regionalAvg?.multiplier || 1.0;

  const estimated = Math.round(base * scoreMultiplier * breedMult * regionMult);

  return {
    estimated,
    range: {
      low: Math.round(estimated * 0.85),
      high: Math.round(estimated * 1.15),
    },
    basePrice: base,
    scoreMultiplier: parseFloat(scoreMultiplier.toFixed(2)),
    breedMultiplier: breedMult,
    regionMultiplier: regionMult,
    confidence: score > 60 ? 'high' : score > 40 ? 'medium' : 'low',
  };
}

function registerLivestock(data) {
  const passportId = generatePassportId(data.type);
  const now = new Date().toISOString();

  // Photo required — anti-theft prevention (Session 1)
  if (!data.photoUrl && (!data.photos || data.photos.length === 0)) {
    return { error: 'At least one photo required to register livestock' };
  }
  
  // If newborn, validate mother exists (if provided)
  let mother = null;
  if (data.motherPassport) {
    mother = livestock.get(data.motherPassport);
    if (!mother) {
      return { error: 'Mother passport ' + data.motherPassport + ' not found' };
    }
  }
  if (data.fatherPassport) {
    const father = livestock.get(data.fatherPassport);
    if (!father) {
      return { error: 'Father passport ' + data.fatherPassport + ' not found' };
    }
  }

  const isNewborn = !!data.isNewborn;
  const birthDate = data.birthDate || (isNewborn ? now : null);

  const animal = {
    passportId,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    ownerPhone: data.ownerPhone,
    // Animal details
    type: data.type,
    breed: data.breed,
    age: data.age || null,
    color: data.color || null,
    gender: data.gender || null,

    // ═══ PHYSICAL PROFILE (NEW) ═══
    weight: data.weight ? parseFloat(data.weight) : null,
    heartGirth: data.heartGirth ? parseFloat(data.heartGirth) : null,
    bodyLength: data.bodyLength ? parseFloat(data.bodyLength) : null,
    heightAtWithers: data.heightAtWithers ? parseFloat(data.heightAtWithers) : null,
    bodyConditionScore: data.bodyConditionScore ? parseInt(data.bodyConditionScore) : null,
    muscleCondition: data.muscleCondition || null,
    fatCover: data.fatCover || null,

    // Skin & coat
    coatCondition: data.coatCondition || null,
    skinCondition: data.skinCondition || null,
    skinProblems: data.skinProblems || [],
    coatColorPattern: data.coatColorPattern || null,

    // Udder & reproduction (dairy)
    udderSize: data.udderSize || null,
    udderShape: data.udderShape || null,
    teatCondition: data.teatCondition || null,
    milkVeins: data.milkVeins || null,
    lactationStatus: data.lactationStatus || null,
    dailyMilkYield: data.dailyMilkYield ? parseFloat(data.dailyMilkYield) : null,
    pregnancyStatus: data.pregnancyStatus || null,
    pregnancyMonths: data.pregnancyMonths ? parseInt(data.pregnancyMonths) : null,
    calvingHistory: data.calvingHistory ? parseInt(data.calvingHistory) : null,
    lastCalvingDate: data.lastCalvingDate || null,

    // Head & features
    horns: data.horns || null,
    eyes: data.eyes || null,
    teethAge: data.teethAge || null,
    ears: data.ears || null,
    muzzle: data.muzzle || null,

    // Legs & movement
    hooves: data.hooves || null,
    legs: data.legs || null,
    walking: data.walking || null,
    jointSwelling: data.jointSwelling || null,

    // Production data
    purpose: data.purpose || null,
    breedPurity: data.breedPurity || null,
    sireInfo: data.sireInfo || null,
    damInfo: data.damInfo || null,
    feedRegime: data.feedRegime || null,

    // Documents
    vaccinationCard: data.vaccinationCard || null,
    vetCertificate: data.vetCertificate || null,
    movementPermit: data.movementPermit || null,
    brandMark: data.brandMark || null,
    earTag: data.earTag || null,
    // ═══ END PHYSICAL PROFILE ═══

    // ═══ NEW: Newborn fields ═══
    isNewborn,
    birthDate: birthDate,
    motherPassport: data.motherPassport || null,
    fatherPassport: data.fatherPassport || null,
    birthWeight: data.birthWeight || null,
    // Location
    location: data.location,
    aiCoat: '#' + Math.random().toString(16).substring(2, 8).toUpperCase(),
    photoUrl: data.photoUrl || null,
    // Status
    status: 'alive',
    health: 'healthy',
    // Medical records
    vaccinations: [],
    treatments: [],
    // Ownership history
    // ═══ MARKETPLACE STATE (Session 1) ═══
    forSale: {
      listedAt: null,
      askingPrice: null,
      negotiable: true,
      listingId: null,                    // reference to market.js listing
      status: 'none',                     // none | active | paused | sold
      pausedAt: null,
      pausedReason: null,
      soldAt: null,
      soldPrice: null,
      soldToBuyerId: null,
      soldToBuyerName: null,
    },
    frozenByTradeId: null,                // while set, animal can't be edited
    frozenAt: null,

    ownershipHistory: [{
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      from: now,
    }],
    // Theft tracking
    isReportedStolen: false,
    theftReport: null,
    // Offspring tracking (for parents)
    offspring: [],
    // Blockchain-lite
    recordHash: 'HASH-' + Math.random().toString(36).substring(2, 18).toUpperCase(),
    registeredAt: now,
  };

  livestock.set(passportId, animal);

  // Update mother's offspring list
  if (mother) {
    if (!mother.offspring) mother.offspring = [];
    mother.offspring.push({
      passportId,
      type: animal.type,
      breed: animal.breed,
      gender: animal.gender,
      birthDate: birthDate,
    });
    livestock.set(data.motherPassport, mother);
  }

  persist();

  // Auto-compute weight if not provided but measurements are
  if (!animal.weight && animal.heartGirth && animal.bodyLength) {
    animal.weight = estimateWeight(animal.type, animal.heartGirth, animal.bodyLength);
  }

  console.log('🐄 Livestock registered:', passportId, '|', data.type, data.breed, isNewborn ? '(NEWBORN)' : '');
  if (animal.weight) console.log('   Weight:', animal.weight + 'kg');
  if (animal.bodyConditionScore) console.log('   BCS:', animal.bodyConditionScore);
  if (mother) console.log('   Mother:', data.motherPassport);

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
  if (animal.isReportedStolen) return { error: 'Already reported stolen' };
  if (animal.status === 'dead') return { error: 'Cannot report deceased animal as stolen' };

  animal.isReportedStolen = true;
  animal.status = 'stolen';
  animal.theftReport = {
    passportId,
    reportedBy: report.reportedBy || animal.ownerName,
    reportedAt: new Date().toISOString(),
    description: report.description || '',
    location: report.location || animal.location,
    contactPhone: report.contactPhone || animal.ownerPhone,
    bounty: report.bounty || null,
  };

  persist();
  console.log('🚨 THEFT REPORTED:', passportId, '|', animal.type, animal.breed);

  return animal;
}

/**
 * Trigger theft alert broadcast (called from route, async)
 */
async function triggerTheftBroadcast(passportId, entities) {
  const animal = livestock.get(passportId);
  if (!animal || !animal.theftReport) return null;

  const theftAlert = require('./theftAlert');
  const result = await theftAlert.broadcastTheftAlert(animal, animal.theftReport, entities);

  // Store theftId on animal for reference
  animal.theftReport.theftId = result.theftId;
  animal.theftReport.alertsSent = result.totalAlerts;
  animal.theftReport.alertSummary = result.summary;
  persist();

  return result;
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

  // Check if home-slaughtered (ceremony)
  if (animal.status === 'slaughtered_home') {
    return {
      found: true,
      animal,
      blocked: true,
      reason: 'HOME_SLAUGHTER',
      message: '🏠 This animal was slaughtered at home for a ceremony. Meat cannot be sold commercially.',
    };
  }

  // Check if deceased — apply safety classification
  if (animal.status === 'dead') {
    const deathDate = animal.deathRecord?.deathDate || 'unknown date';
    const cause = animal.deathRecord?.causeLabel || 'unknown';
    const safety = classifyMeatSafety(animal.deathRecord);

    return {
      found: true,
      animal,
      blocked: !safety.edible,
      safety: safety,
      reason: safety.edible ? 'EMERGENCY_SLAUGHTER' : 'DECEASED',
      message: safety.edible 
        ? `⚠️ Emergency slaughter approved — ${safety.reason}`
        : `🕯️ This animal is DECEASED (${cause}, ${deathDate.split('T')[0]}). ${safety.reason}`,
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

/**
 * Get full lineage of an animal (3 generations up + offspring down)
 */
function getLineage(passportId) {
  const animal = livestock.get(passportId);
  if (!animal) return null;

  const buildAncestors = (passport, depth = 0) => {
    if (!passport || depth > 3) return null;
    const a = livestock.get(passport);
    if (!a) return { passportId: passport, notFound: true };
    return {
      passportId: a.passportId,
      type: a.type,
      breed: a.breed,
      gender: a.gender,
      name: a.ownerName,
      mother: a.motherPassport ? buildAncestors(a.motherPassport, depth + 1) : null,
      father: a.fatherPassport ? buildAncestors(a.fatherPassport, depth + 1) : null,
    };
  };

  return {
    animal: enrichAnimal(animal),
    mother: animal.motherPassport ? buildAncestors(animal.motherPassport) : null,
    father: animal.fatherPassport ? buildAncestors(animal.fatherPassport) : null,
    offspring: (animal.offspring || []).map(o => {
      const child = livestock.get(o.passportId);
      return child ? enrichAnimal(child) : o;
    }),
    offspringCount: (animal.offspring || []).length,
  };
}

/**
 * Enriched list of livestock by owner
 */
function getEnrichedLivestockByOwner(ownerId) {
  return [...livestock.values()]
    .filter(a => a.ownerId === ownerId)
    .map(enrichAnimal);
}

/**
 * Enriched single animal
 */
function getEnrichedLivestock(passportId) {
  const animal = livestock.get(passportId);
  return animal ? enrichAnimal(animal) : null;
}

module.exports.getLineage = getLineage;
module.exports.getEnrichedLivestockByOwner = getEnrichedLivestockByOwner;
module.exports.getEnrichedLivestock = getEnrichedLivestock;
module.exports.enrichAnimal = enrichAnimal;
module.exports.computeLifeStage = computeLifeStage;
module.exports.computeAge = computeAge;


// ═════════════════════════════════════════════════════
// DEATH TRACKING
// ═════════════════════════════════════════════════════

const DEATH_CAUSES = [
  { id: 'illness', label: 'Illness / Disease', icon: '🦠' },
  { id: 'natural', label: 'Natural (old age)', icon: '🕰️' },
  { id: 'predator', label: 'Predator attack', icon: '🐆' },
  { id: 'accident', label: 'Accident', icon: '⚠️' },
  { id: 'theft', label: 'Theft / Illegal slaughter', icon: '🔪' },
  { id: 'unknown', label: 'Unknown', icon: '❓' },
];

/**
 * Report an animal's death
 */
function reportAnimalDeath(passportId, data) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (animal.status === 'dead') return { error: 'Animal already marked deceased' };
  if (animal.isReportedStolen && data.cause !== 'theft') {
    return { error: 'This animal is marked stolen. Report as theft cause.' };
  }

  const now = new Date().toISOString();

  animal.status = 'dead';
  animal.health = 'deceased';
  animal.deathRecord = {
    passportId,
    deathDate: data.deathDate || now,
    reportedAt: now,
    cause: data.cause || 'unknown',
    causeLabel: (DEATH_CAUSES.find(c => c.id === data.cause) || DEATH_CAUSES[5]).label,
    diseaseType: data.diseaseType || null,
    description: data.description || '',
    location: data.location || animal.location,
    reportedBy: data.reportedBy || animal.ownerName,
    reportedByPhone: data.reportedByPhone || animal.ownerPhone,
    photoUrl: data.photoUrl || null,
    // Optional vet verification (can be added later)
    vetVerified: false,
    vetVerification: null,
    // Compensation tracking
    insurance: data.insurance || null,
    countyCompensation: data.cause === 'predator' ? {
      eligible: true,
      status: 'not_claimed',
      note: 'Kenya government compensates predator attacks',
    } : null,
    // Movement after death
    disposalMethod: data.disposalMethod || null, // buried / burned / vet took / other
  };

  persist();

  console.log('🕯️  Death reported:', passportId, '|', animal.type, animal.breed);
  console.log('   Cause:', animal.deathRecord.causeLabel);
  if (data.diseaseType) console.log('   Disease:', data.diseaseType);

  return animal;
}

/**
 * Vet verifies a death (optional, can be called later)
 */
function verifyDeathByVet(passportId, vetData) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (animal.status !== 'dead' || !animal.deathRecord) {
    return { error: 'Animal has no death record to verify' };
  }

  animal.deathRecord.vetVerified = true;
  animal.deathRecord.vetVerification = {
    vetName: vetData.vetName,
    vetLicense: vetData.vetLicense || null,
    vetPhone: vetData.vetPhone || null,
    confirmedCause: vetData.confirmedCause || animal.deathRecord.cause,
    notes: vetData.notes || '',
    verifiedAt: new Date().toISOString(),
  };

  if (vetData.confirmedCause && vetData.confirmedCause !== animal.deathRecord.cause) {
    animal.deathRecord.cause = vetData.confirmedCause;
    animal.deathRecord.causeLabel = (DEATH_CAUSES.find(c => c.id === vetData.confirmedCause) || DEATH_CAUSES[5]).label;
  }

  persist();
  console.log('✅ Death verified by vet:', passportId, '|', vetData.vetName);
  return animal;
}

/**
 * Get death record for an animal
 */
function getDeathRecord(passportId) {
  const animal = livestock.get(passportId);
  if (!animal || !animal.deathRecord) return null;
  return animal.deathRecord;
}

/**
 * List all deaths (with filters)
 */
function listDeaths(filter = {}) {
  let list = [...livestock.values()].filter(a => a.status === 'dead' && a.deathRecord);

  if (filter.cause) list = list.filter(a => a.deathRecord.cause === filter.cause);
  if (filter.county) list = list.filter(a => a.deathRecord.location?.county === filter.county);
  if (filter.ownerId) list = list.filter(a => a.ownerId === filter.ownerId);
  if (filter.fromDate) list = list.filter(a => new Date(a.deathRecord.deathDate) >= new Date(filter.fromDate));
  if (filter.toDate) list = list.filter(a => new Date(a.deathRecord.deathDate) <= new Date(filter.toDate));

  return list
    .map(a => ({ ...enrichAnimal(a), deathRecord: a.deathRecord }))
    .sort((a, b) => new Date(b.deathRecord.deathDate) - new Date(a.deathRecord.deathDate));
}

/**
 * Death statistics (for disease outbreak detection)
 */
function getDeathStats(filter = {}) {
  const allDeaths = [...livestock.values()].filter(a => a.status === 'dead' && a.deathRecord);

  const stats = {
    total: allDeaths.length,
    byCause: {},
    byCounty: {},
    byType: {},
    byDisease: {},
    last30Days: 0,
    last7Days: 0,
    vetVerified: 0,
    pendingVetVerification: 0,
  };

  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

  for (const animal of allDeaths) {
    const d = animal.deathRecord;
    const deathTime = new Date(d.deathDate).getTime();

    stats.byCause[d.cause] = (stats.byCause[d.cause] || 0) + 1;

    const county = d.location?.county || 'Unknown';
    if (!stats.byCounty[county]) stats.byCounty[county] = { total: 0, byCause: {} };
    stats.byCounty[county].total++;
    stats.byCounty[county].byCause[d.cause] = (stats.byCounty[county].byCause[d.cause] || 0) + 1;

    stats.byType[animal.type] = (stats.byType[animal.type] || 0) + 1;

    if (d.diseaseType) {
      stats.byDisease[d.diseaseType] = (stats.byDisease[d.diseaseType] || 0) + 1;
    }

    if (deathTime >= thirtyDaysAgo) stats.last30Days++;
    if (deathTime >= sevenDaysAgo) stats.last7Days++;

    if (d.vetVerified) stats.vetVerified++;
    else stats.pendingVetVerification++;
  }

  return stats;
}

/**
 * Detect potential disease outbreaks
 * (Multiple deaths from same disease in same county within 14 days)
 */
function detectOutbreaks() {
  const allDeaths = [...livestock.values()].filter(a => a.status === 'dead' && a.deathRecord && a.deathRecord.cause === 'illness');
  const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
  const clusters = {};

  for (const animal of allDeaths) {
    const d = animal.deathRecord;
    if (new Date(d.deathDate).getTime() < fourteenDaysAgo) continue;
    if (!d.diseaseType) continue;

    const county = d.location?.county || 'Unknown';
    const key = `${county}::${d.diseaseType}`;

    if (!clusters[key]) {
      clusters[key] = {
        county,
        disease: d.diseaseType,
        count: 0,
        animals: [],
        firstDeath: d.deathDate,
        lastDeath: d.deathDate,
      };
    }

    clusters[key].count++;
    clusters[key].animals.push({
      passportId: animal.passportId,
      type: animal.type,
      deathDate: d.deathDate,
    });
    if (new Date(d.deathDate) > new Date(clusters[key].lastDeath)) {
      clusters[key].lastDeath = d.deathDate;
    }
  }

  // Only return clusters with 3+ deaths (potential outbreak)
  return Object.values(clusters)
    .filter(c => c.count >= 3)
    .sort((a, b) => b.count - a.count);
}

module.exports.DEATH_CAUSES = DEATH_CAUSES;
module.exports.reportAnimalDeath = reportAnimalDeath;
module.exports.verifyDeathByVet = verifyDeathByVet;
module.exports.getDeathRecord = getDeathRecord;
module.exports.listDeaths = listDeaths;
module.exports.getDeathStats = getDeathStats;
module.exports.detectOutbreaks = detectOutbreaks;


// ═════════════════════════════════════════════════════
// MEAT SAFETY CLASSIFICATION
// ═════════════════════════════════════════════════════

/**
 * Classify whether meat from a dead animal is safe to eat
 * Based on death cause + vet verification + timing
 */
function classifyMeatSafety(deathRecord) {
  if (!deathRecord) return { edible: false, reason: 'No death record' };

  const cause = deathRecord.cause;
  const hoursSinceDeath = (Date.now() - new Date(deathRecord.deathDate).getTime()) / (1000 * 60 * 60);

  // Rule 1: Illness — never edible
  if (cause === 'illness') {
    return {
      edible: false,
      severity: 'critical',
      reason: 'Disease risk — meat must not be consumed',
      action: 'Bury or burn immediately',
    };
  }

  // Rule 2: Predator attack — never edible
  if (cause === 'predator') {
    return {
      edible: false,
      severity: 'critical',
      reason: 'Predator attacks contaminate meat',
      action: 'Bury or burn immediately',
    };
  }

  // Rule 3: Theft / illegal slaughter — never edible
  if (cause === 'theft') {
    return {
      edible: false,
      severity: 'critical',
      reason: 'Illegal slaughter — meat cannot be sold or consumed',
      action: 'Report to police',
    };
  }

  // Rule 4: Unknown cause — never edible
  if (cause === 'unknown') {
    return {
      edible: false,
      severity: 'high',
      reason: 'Cause unknown — cannot verify safety',
      action: 'Bury or burn',
    };
  }

  // Rule 5: Natural (old age) — edible only with vet approval
  if (cause === 'natural') {
    return {
      edible: deathRecord.vetVerified,
      severity: 'medium',
      reason: deathRecord.vetVerified 
        ? 'Vet verified safe for consumption' 
        : 'Requires vet inspection before consumption',
      action: deathRecord.vetVerified ? 'Safe to consume' : 'Vet must inspect',
      requiresVet: !deathRecord.vetVerified,
    };
  }

  // Rule 6: Accident — edible only if vet verified WITHIN 2 hours
  if (cause === 'accident') {
    if (hoursSinceDeath > 2) {
      return {
        edible: false,
        severity: 'high',
        reason: 'Too late for emergency slaughter (over 2 hours since death)',
        action: 'Bury or burn',
      };
    }
    if (!deathRecord.vetVerified) {
      return {
        edible: false,
        severity: 'high',
        reason: 'Vet must inspect within 2 hours of death',
        action: 'Call vet immediately',
        requiresVet: true,
        hoursRemaining: (2 - hoursSinceDeath).toFixed(1),
      };
    }
    return {
      edible: true,
      severity: 'low',
      reason: 'Emergency slaughter — vet approved',
      action: 'Safe for immediate consumption, not for sale',
      requiresVet: false,
    };
  }

  return { edible: false, severity: 'high', reason: 'Unclassified', action: 'Consult vet' };
}

// ═════════════════════════════════════════════════════
// HOME SLAUGHTER (CEREMONY)
// ═════════════════════════════════════════════════════

const CEREMONY_TYPES = [
  { id: 'wedding', label: 'Wedding', icon: '💍' },
  { id: 'funeral', label: 'Funeral', icon: '🕊️' },
  { id: 'dowry', label: 'Dowry / Ruracio', icon: '🎁' },
  { id: 'religious', label: 'Religious (Eid, Diwali, etc.)', icon: '🕌' },
  { id: 'family', label: 'Family gathering', icon: '👨‍👩‍👧‍👦' },
  { id: 'other', label: 'Other celebration', icon: '🎉' },
];

/**
 * Record a home slaughter for ceremony
 * NOT a death — separate status: slaughtered_home
 */
function recordHomeSlaughter(passportId, data) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (animal.status === 'dead') return { error: 'Animal already marked dead' };
  if (animal.status === 'slaughtered_home') return { error: 'Already recorded as home slaughter' };
  if (animal.isReportedStolen) return { error: 'Cannot record stolen animal as home slaughter' };
  if (animal.health !== 'healthy') return { error: 'Animal is not healthy — consult vet before slaughter' };

  const now = new Date().toISOString();

  animal.status = 'slaughtered_home';
  animal.health = 'consumed';
  animal.homeSlaughter = {
    passportId,
    ceremonyType: data.ceremonyType || 'family',
    ceremonyLabel: (CEREMONY_TYPES.find(c => c.id === data.ceremonyType) || CEREMONY_TYPES[4]).label,
    ceremonyDate: data.ceremonyDate || now,
    recordedAt: now,
    numberOfGuests: data.numberOfGuests || null,
    slaughteredBy: data.slaughteredBy || animal.ownerName,
    location: data.location || animal.location,
    notes: data.notes || '',
    photos: data.photos || [],
    // Certificate (optional)
    certificate: {
      issued: true,
      certificateId: 'HOME-CERT-' + Date.now().toString(36).toUpperCase(),
      issuedAt: now,
      message: 'This animal was healthy at time of home slaughter. Meat is for home/family consumption only. NOT FOR SALE.',
      animalSnapshot: {
        passportId: animal.passportId,
        type: animal.type,
        breed: animal.breed,
        gender: animal.gender,
        aiCoat: animal.aiCoat,
        ownerName: animal.ownerName,
      },
    },
    // Cannot be sold
    saleable: false,
  };

  persist();

  console.log('🏠 Home slaughter recorded:', passportId, '|', animal.type, animal.breed);
  console.log('   Ceremony:', animal.homeSlaughter.ceremonyLabel);
  console.log('   Certificate:', animal.homeSlaughter.certificate.certificateId);

  return animal;
}

function getHomeSlaughterRecord(passportId) {
  const animal = livestock.get(passportId);
  if (!animal || !animal.homeSlaughter) return null;
  return animal.homeSlaughter;
}

function listHomeSlaughters(filter = {}) {
  let list = [...livestock.values()].filter(a => a.status === 'slaughtered_home' && a.homeSlaughter);

  if (filter.ceremonyType) list = list.filter(a => a.homeSlaughter.ceremonyType === filter.ceremonyType);
  if (filter.county) list = list.filter(a => a.homeSlaughter.location?.county === filter.county);
  if (filter.ownerId) list = list.filter(a => a.ownerId === filter.ownerId);
  if (filter.fromDate) list = list.filter(a => new Date(a.homeSlaughter.ceremonyDate) >= new Date(filter.fromDate));
  if (filter.toDate) list = list.filter(a => new Date(a.homeSlaughter.ceremonyDate) <= new Date(filter.toDate));

  return list
    .map(a => ({ ...enrichAnimal(a), homeSlaughter: a.homeSlaughter }))
    .sort((a, b) => new Date(b.homeSlaughter.ceremonyDate) - new Date(a.homeSlaughter.ceremonyDate));
}

function getHomeSlaughterStats(filter = {}) {
  const all = [...livestock.values()].filter(a => a.status === 'slaughtered_home' && a.homeSlaughter);

  const stats = {
    total: all.length,
    byCeremony: {},
    byCounty: {},
    byType: {},
    last30Days: 0,
    last7Days: 0,
    totalGuests: 0,
  };

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const animal of all) {
    const h = animal.homeSlaughter;
    const time = new Date(h.ceremonyDate).getTime();

    stats.byCeremony[h.ceremonyType] = (stats.byCeremony[h.ceremonyType] || 0) + 1;

    const county = h.location?.county || 'Unknown';
    stats.byCounty[county] = (stats.byCounty[county] || 0) + 1;

    stats.byType[animal.type] = (stats.byType[animal.type] || 0) + 1;

    if (time >= thirtyDaysAgo) stats.last30Days++;
    if (time >= sevenDaysAgo) stats.last7Days++;

    if (h.numberOfGuests) stats.totalGuests += h.numberOfGuests;
  }

  return stats;
}



// ═══════════════════════════════════════════════════════════
// SESSION 1: MARKETPLACE — FOR SALE, OWNERSHIP TRANSFER, FROZEN
// ═══════════════════════════════════════════════════════════

/**
 * Mark an animal as available for sale.
 * Requires: ownership, no active theft report, alive, at least one photo.
 */
function markForSale(passportId, { ownerId, askingPrice, negotiable = true }) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (animal.ownerId !== ownerId) return { error: 'Not the owner' };
  if (animal.isReportedStolen) return { error: 'Reported stolen — cannot list' };
  if (animal.status !== 'alive') return { error: 'Animal not alive' };
  if (animal.frozenByTradeId) return { error: 'Animal is in an active trade' };
  if (!animal.photoUrl && (!animal.photos || animal.photos.length === 0)) {
    return { error: 'At least one photo required before listing' };
  }

  const price = Number(askingPrice);
  if (!price || price <= 0) return { error: 'Valid asking price required' };

  animal.forSale = {
    listedAt: new Date().toISOString(),
    askingPrice: price,
    negotiable: negotiable !== false,
    listingId: null,
    status: 'active',
    pausedAt: null,
    pausedReason: null,
    soldAt: null,
    soldPrice: null,
    soldToBuyerId: null,
    soldToBuyerName: null,
  };
  persist();

  console.log('🏷️  Marked for sale:', passportId, '| KES', price);
  return { animal };
}

/**
 * Mark an animal as sold (called from trades.js after successful trade).
 */
function markSold(passportId, { buyerId, buyerName, soldPrice, tradeId }) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (!animal.forSale || animal.forSale.status !== 'active') {
    return { error: 'Animal is not currently for sale' };
  }

  animal.forSale.status = 'sold';
  animal.forSale.soldAt = new Date().toISOString();
  animal.forSale.soldPrice = Number(soldPrice);
  animal.forSale.soldToBuyerId = buyerId;
  animal.forSale.soldToBuyerName = buyerName || null;
  animal.forSale.tradeId = tradeId || null;

  persist();
  console.log('💰 Marked sold:', passportId, '→', buyerName, '| KES', soldPrice);
  return { animal };
}

/**
 * Withdraw an animal from sale (pause, don't clear).
 */
function withdrawFromSale(passportId, { ownerId, reason }) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (animal.ownerId !== ownerId) return { error: 'Not the owner' };
  if (animal.frozenByTradeId) return { error: 'Animal is in an active trade' };
  if (!animal.forSale || animal.forSale.status !== 'active') {
    return { error: 'Animal is not listed for sale' };
  }

  animal.forSale.status = 'paused';
  animal.forSale.pausedAt = new Date().toISOString();
  animal.forSale.pausedReason = reason || 'Withdrawn by owner';

  persist();
  console.log('⏸️  Withdrawn from sale:', passportId);
  return { animal };
}

/**
 * Transfer ownership after a successful trade.
 * Appends to ownershipHistory; changes ownerId/OwnerName/OwnerPhone.
 * Clears forSale status.
 */
function updateOwnership(passportId, { newOwnerId, newOwnerName, newOwnerPhone, soldPrice, tradeId, mpesaRef }) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };

  const now = new Date().toISOString();

  // Close the current ownership entry
  const current = animal.ownershipHistory?.[animal.ownershipHistory.length - 1];
  if (current && !current.to) {
    current.to = now;
    current.soldTo = newOwnerId;
    current.soldPrice = soldPrice;
    current.tradeId = tradeId;
  }

  // Append the new owner
  animal.ownershipHistory = animal.ownershipHistory || [];
  animal.ownershipHistory.push({
    ownerId: newOwnerId,
    ownerName: newOwnerName,
    ownerPhone: newOwnerPhone,
    from: now,
    via: 'trade',
    tradeId: tradeId || null,
    mpesaRef: mpesaRef || null,
  });

  // Update current owner
  animal.ownerId = newOwnerId;
  animal.ownerName = newOwnerName;
  if (newOwnerPhone) animal.ownerPhone = newOwnerPhone;

  // Clear listing
  if (animal.forSale) {
    animal.forSale.status = 'sold';
    animal.forSale.soldAt = now;
    animal.forSale.soldPrice = soldPrice;
    animal.forSale.soldToBuyerId = newOwnerId;
    animal.forSale.soldToBuyerName = newOwnerName;
    animal.forSale.tradeId = tradeId || null;
  }

  // Clear frozen flag
  animal.frozenByTradeId = null;
  animal.frozenAt = null;

  persist();
  console.log('🔄 Ownership transferred:', passportId, '→', newOwnerName);
  return { animal };
}

/**
 * List animals currently available for sale, filtered.
 */
function getSaleableLivestock(filter = {}) {
  const out = [];
  for (const animal of livestock.values()) {
    if (!animal.forSale || animal.forSale.status !== 'active') continue;
    if (animal.isReportedStolen) continue;
    if (animal.status !== 'alive') continue;

    if (filter.type && animal.type !== filter.type) continue;
    if (filter.county && animal.location?.county !== filter.county) continue;
    if (filter.ward && animal.location?.ward !== filter.ward) continue;
    if (filter.minPrice && animal.forSale.askingPrice < Number(filter.minPrice)) continue;
    if (filter.maxPrice && animal.forSale.askingPrice > Number(filter.maxPrice)) continue;
    if (filter.breed && animal.breed !== filter.breed) continue;
    if (filter.ownerId && animal.ownerId !== filter.ownerId) continue;

    out.push(animal);
  }

  // Sort by listed date descending (newest first)
  out.sort((a, b) => new Date(b.forSale.listedAt) - new Date(a.forSale.listedAt));

  // Pagination
  const limit = Math.min(Number(filter.limit) || 50, 200);
  const offset = Number(filter.offset) || 0;
  return {
    total: out.length,
    limit,
    offset,
    items: out.slice(offset, offset + limit),
  };
}

/**
 * Freeze an animal during an active trade (prevents listing/purchase elsewhere).
 */
function setFrozen(passportId, tradeId) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  animal.frozenByTradeId = tradeId;
  animal.frozenAt = new Date().toISOString();
  persist();
  return { ok: true };
}

function clearFrozen(passportId) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  animal.frozenByTradeId = null;
  animal.frozenAt = null;
  persist();
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════
// SESSION 1: LIVESTOCK PLUGIN (for trades.js orchestration)
// ═══════════════════════════════════════════════════════════

/**
 * Update the photo gallery for an animal (up to 5).
 * First photo becomes the primary photoUrl.
 */
function updatePhotos(passportId, { ownerId, photos }) {
  const animal = livestock.get(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (animal.ownerId !== ownerId) return { error: 'Not the owner' };
  if (animal.frozenByTradeId) return { error: 'Animal is in an active trade' };
  if (!Array.isArray(photos)) return { error: 'photos must be array' };
  if (photos.length > 5) return { error: 'Maximum 5 photos' };

  animal.photos = photos;
  if (photos.length > 0 && !animal.photoUrl) {
    animal.photoUrl = photos[0];
  }
  persist();
  return { animal };
}

const livestockPlugin = {
  name: 'livestock',
  referenceType: 'livestock-passport',

  async validateSubject({ referenceId, sellerId }) {
    const animal = livestock.get(referenceId);
    if (!animal) return { error: 'Animal not found' };
    if (animal.ownerId !== sellerId) return { error: 'Not the owner' };
    if (animal.isReportedStolen) return { error: 'Reported stolen' };
    if (animal.status !== 'alive') return { error: 'Animal not alive' };
    if (!animal.forSale || animal.forSale.status !== 'active') {
      return { error: 'Not currently for sale' };
    }
    if (!animal.photoUrl && (!animal.photos || animal.photos.length === 0)) {
      return { error: 'Photo required' };
    }
    return { ok: true, subject: animal };
  },

  buildSnapshot(animal, agreedPrice) {
    return {
      passportId: animal.passportId,
      type: animal.type,
      breed: animal.breed,
      age: animal.age,
      gender: animal.gender,
      color: animal.color,
      health: animal.health,
      photoUrl: animal.photoUrl,
      photos: animal.photos || [],
      location: animal.location,
      vaccinations: animal.vaccinations || [],
      ownershipHistory: animal.ownershipHistory || [],
      isReportedStolen: animal.isReportedStolen || false,
      agreedPrice: Number(agreedPrice),
      agreementDate: new Date().toISOString(),
    };
  },

  async transferOwnership({ referenceId, newOwner, tradeId, mpesaRef, soldPrice }) {
    return updateOwnership(referenceId, {
      newOwnerId: newOwner.id,
      newOwnerName: newOwner.name,
      newOwnerPhone: newOwner.phone,
      tradeId,
      mpesaRef,
      soldPrice,
    });
  },

  deliveryModes(distanceKm) {
    if (distanceKm < 15) return ['self_pickup', 'self_delivery', 'rider', 'meet_halfway'];
    if (distanceKm < 50) return ['self_delivery', 'rider', 'farm_transport'];
    if (distanceKm < 100) return ['rider', 'farm_transport', 'livestock_lorry', 'trekking'];
    return ['livestock_lorry', 'trekking', 'multi_day_trek'];
  },

  async freezeForTrade({ referenceId, tradeId }) {
    return setFrozen(referenceId, tradeId);
  },

  async unfreeze({ referenceId }) {
    return clearFrozen(referenceId);
  },

  // Vehicle class needed to deliver this subject
  requiredVehicleClass(subject) {
    const value = subject.forSale?.askingPrice || 0;
    if (value <= 2000) return 'A';
    if (value <= 5000) return 'B';
    if (value <= 15000) return 'C';
    if (value <= 30000) return 'D';
    if (value <= 100000) return 'E';
    if (value <= 500000) return 'F';
    return 'G';
  },
};


module.exports.classifyMeatSafety = classifyMeatSafety;
module.exports.CEREMONY_TYPES = CEREMONY_TYPES;
module.exports.recordHomeSlaughter = recordHomeSlaughter;
module.exports.getHomeSlaughterRecord = getHomeSlaughterRecord;
module.exports.listHomeSlaughters = listHomeSlaughters;
module.exports.getHomeSlaughterStats = getHomeSlaughterStats;

module.exports.triggerTheftBroadcast = triggerTheftBroadcast;


module.exports.interpretBCS = interpretBCS;
module.exports.estimateWeight = estimateWeight;
module.exports.computeProductionScore = computeProductionScore;
module.exports.computeMarketValue = computeMarketValue;
module.exports.getPhysicalAttributes = () => require('./physicalAttributes');
// ═══ SESSION 1: MARKETPLACE EXPORTS ═══
module.exports.markForSale = markForSale;
module.exports.markSold = markSold;
module.exports.withdrawFromSale = withdrawFromSale;
module.exports.updateOwnership = updateOwnership;
module.exports.getSaleableLivestock = getSaleableLivestock;
module.exports.setFrozen = setFrozen;
module.exports.updatePhotos = updatePhotos;
module.exports.clearFrozen = clearFrozen;
module.exports.livestockPlugin = livestockPlugin;

