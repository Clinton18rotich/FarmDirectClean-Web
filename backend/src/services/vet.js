/**
 * Veterinary Network Service
 * Handles vet registration, sick animal reports, dispatch, treatment, quarantine
 */

const storage = require('./storage');
const sms = require('./sms');

// ═════════════════════════════════════════════════════
// DATA STORES
// ═════════════════════════════════════════════════════

const vets = storage.objectToMap(storage.load('vets', {}));
const sickReports = storage.objectToMap(storage.load('sick_reports', {}));
const treatments = storage.objectToMap(storage.load('treatments', {}));

function persist() {
  storage.save('vets', storage.mapToObject(vets));
  storage.save('sick_reports', storage.mapToObject(sickReports));
  storage.save('treatments', storage.mapToObject(treatments));
}

// ═════════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════════

const SPECIALIZATIONS = [
  { id: 'cattle', label: 'Cattle', icon: '🐄' },
  { id: 'goats', label: 'Goats & Sheep', icon: '🐐' },
  { id: 'poultry', label: 'Poultry', icon: '🐔' },
  { id: 'pigs', label: 'Pigs', icon: '🐷' },
  { id: 'camels', label: 'Camels', icon: '🐪' },
  { id: 'wildlife', label: 'Wildlife', icon: '🦁' },
  { id: 'general', label: 'General Practice', icon: '🩺' },
  { id: 'surgery', label: 'Surgery', icon: '🔪' },
];

const VET_TYPES = [
  { id: 'private', label: 'Private Practice' },
  { id: 'government', label: 'Government Vet' },
  { id: 'clinic', label: 'Clinic-Based' },
  { id: 'mobile', label: 'Mobile / Ambulatory' },
];

const SYMPTOMS = [
  { id: 'fever', label: 'High fever', icon: '🌡️' },
  { id: 'not-eating', label: 'Not eating', icon: '🍽️' },
  { id: 'not-walking', label: 'Cannot walk', icon: '🦵' },
  { id: 'wounds', label: 'Wounds / Injuries', icon: '🩹' },
  { id: 'diarrhea', label: 'Diarrhea', icon: '💧' },
  { id: 'vomiting', label: 'Vomiting', icon: '🤢' },
  { id: 'swelling', label: 'Swelling', icon: '🎈' },
  { id: 'breathing', label: 'Difficulty breathing', icon: '😮‍💨' },
  { id: 'skin', label: 'Skin problems', icon: '🔴' },
  { id: 'behavior', label: 'Behavior change', icon: '🧠' },
  { id: 'other', label: 'Other', icon: '❓' },
];

const REPORT_STATUS = {
  PENDING: 'pending',           // Reported, not yet dispatched
  DISPATCHED: 'dispatched',     // Sent to a vet
  ACCEPTED: 'accepted',         // Vet accepted
  EN_ROUTE: 'en_route',         // Vet traveling
  ON_SITE: 'on_site',           // Vet at location
  TREATED: 'treated',           // Treatment complete
  RESOLVED: 'resolved',         // Animal recovered
  REFERRED: 'referred',         // Referred to hospital
  DECEASED: 'deceased',         // Animal died
  CANCELLED: 'cancelled',       // Farmer cancelled
};

const URGENCY_LEVELS = [
  { id: 'low', label: 'Low — Monitor', color: '#4CAF50' },
  { id: 'medium', label: 'Medium — Today', color: '#FF9800' },
  { id: 'high', label: 'High — Urgent', color: '#F44336' },
  { id: 'critical', label: 'Critical — Emergency', color: '#C62828' },
];

// ═════════════════════════════════════════════════════
// VET REGISTRATION
// ═════════════════════════════════════════════════════

function generateVetId(isGovt = false) {
  const prefix = isGovt ? 'VET-GOVT-' : 'VET-';
  return prefix + Date.now().toString(36).toUpperCase();
}

function registerVet(data) {
  const isGovt = data.vetType === 'government';
  const id = generateVetId(isGovt);

  const vet = {
    id,
    fullName: data.fullName,
    phone: data.phone,
    email: data.email || null,
    kvaLicenseNumber: data.kvaLicenseNumber || null,   // Kenya Veterinary Board license
    vetType: data.vetType || 'private',                // private | government | clinic | mobile
    specializations: data.specializations || ['general'],
    location: data.location,
    coverageRadius: data.coverageRadius || 20,
    acceptsEmergency: data.acceptsEmergency !== false,
    availableHours: data.availableHours || '08:00 - 18:00',
    // Payment (private vets only)
    payment: isGovt ? null : (data.payment || null),
    consultationFee: data.consultationFee || 500,
    // Status
    status: isGovt ? 'active' : 'pending_verification',
    isGovt,
    verified: isGovt,
    verifiedAt: isGovt ? new Date().toISOString() : null,
    verifiedBy: isGovt ? 'auto' : null,
    // Stats
    totalCases: 0,
    activeCases: 0,
    completedCases: 0,
    rating: 5.0,
    totalEarnings: 0,
    // Timestamps
    registeredAt: new Date().toISOString(),
  };

  vets.set(id, vet);
  persist();

  console.log('🩺 Vet registered:', id, '|', data.fullName, '(' + vet.vetType + ')');
  if (isGovt) console.log('   Government vet — no payment, county-wide coverage');

  return vet;
}

function verifyVet(id, verifiedBy) {
  const vet = vets.get(id);
  if (!vet) return null;
  vet.status = 'active';
  vet.verified = true;
  vet.verifiedAt = new Date().toISOString();
  vet.verifiedBy = verifiedBy || 'admin';
  persist();
  console.log('✅ Vet verified:', id);
  return vet;
}

function getVet(id) {
  return vets.get(id);
}

function getVetByPhone(phone) {
  return [...vets.values()].find(v => v.phone === phone);
}

function listVets(filter = {}) {
  let list = [...vets.values()];
  if (filter.status) list = list.filter(v => v.status === filter.status);
  if (filter.county) list = list.filter(v => v.location?.county === filter.county);
  if (filter.specialization) {
    list = list.filter(v => v.specializations.includes(filter.specialization));
  }
  if (filter.vetType) list = list.filter(v => v.vetType === filter.vetType);
  if (filter.isGovt !== undefined) list = list.filter(v => v.isGovt === filter.isGovt);
  return list.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
}

// ═════════════════════════════════════════════════════
// SICK ANIMAL REPORTS
// ═════════════════════════════════════════════════════

function generateReportId() {
  return 'SICK-' + Date.now().toString(36).toUpperCase();
}

function reportSickAnimal(data) {
  const id = generateReportId();

  const report = {
    id,
    // Animal
    passportId: data.passportId,
    animalType: data.animalType,
    animalBreed: data.animalBreed,
    animalAge: data.animalAge || null,
    // Farmer
    farmerId: data.farmerId,
    farmerName: data.farmerName,
    farmerPhone: data.farmerPhone,
    location: data.location,
    // Symptoms
    symptoms: data.symptoms || [],
    symptomDetails: data.symptomDetails || '',
    urgency: data.urgency || 'medium',
    photoUrls: data.photoUrls || [],
    // Status
    status: REPORT_STATUS.PENDING,
    dispatchedTo: null,           // Vet ID
    dispatchedAt: null,
    acceptedBy: null,
    acceptedAt: null,
    rejectedBy: [],               // List of vet IDs who declined
    // Treatment
    treatmentId: null,
    // Timeline
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    history: [{
      status: REPORT_STATUS.PENDING,
      at: new Date().toISOString(),
      note: 'Report created',
    }],
  };

  sickReports.set(id, report);
  persist();

  console.log('🤒 Sick report:', id, '|', data.animalType, data.passportId);
  console.log('   Symptoms:', (data.symptoms || []).join(', '));
  console.log('   Urgency:', data.urgency);

  return report;
}

function getReport(id) {
  return sickReports.get(id);
}

function listReports(filter = {}) {
  let list = [...sickReports.values()];
  if (filter.status) list = list.filter(r => r.status === filter.status);
  if (filter.farmerId) list = list.filter(r => r.farmerId === filter.farmerId);
  if (filter.vetId) list = list.filter(r => r.acceptedBy === filter.vetId || r.dispatchedTo === filter.vetId);
  if (filter.county) list = list.filter(r => r.location?.county === filter.county);
  if (filter.urgency) list = list.filter(r => r.urgency === filter.urgency);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function addHistory(report, status, note) {
  report.status = status;
  report.history.push({
    status,
    at: new Date().toISOString(),
    note: note || '',
  });
}

// ═════════════════════════════════════════════════════
// VET MATCHING & DISPATCH
// ═════════════════════════════════════════════════════

function findNearestVets(report, limit = 5) {
  const animalCounty = report.location?.county;
  const animalWard = report.location?.ward;
  const animalType = report.animalType;

  if (!animalCounty) return [];

  // Map animal type to specialization
  const typeMap = {
    'Cow': 'cattle', 'Cattle': 'cattle',
    'Goat': 'goats', 'Sheep': 'goats',
    'Chicken': 'poultry', 'Turkey': 'poultry', 'Duck': 'poultry',
    'Pig': 'pigs',
    'Camel': 'camels',
  };
  const neededSpec = typeMap[animalType] || 'general';

  // Filter eligible vets
  const eligible = [...vets.values()].filter(v => {
    if (v.status !== 'active') return false;
    if (v.location?.county !== animalCounty) return false;
    // Must have needed specialization OR general
    if (!v.specializations.includes(neededSpec) && !v.specializations.includes('general')) return false;
    // Emergency vets get priority but non-emergency also eligible
    return true;
  });

  // Score
  const scored = eligible.map(v => {
    let score = 100;
    if (v.specializations.includes(neededSpec)) score += 50;
    if (v.location?.ward === animalWard) score += 40;
    if (v.isGovt) score += 10; // government vets cover wider areas
    if (report.urgency === 'critical' && v.acceptsEmergency) score += 30;
    score += v.rating * 5;
    score -= (v.activeCases || 0) * 3;
    return { vet: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.vet);
}


/**
 * Get health context for a vet dispatch (Session 6.16).
 * Includes the animal's recent health events so the vet arrives prepared.
 */
function getHealthContextForDispatch(animalPassport) {
  try {
    const healthEvents = require('./healthEvents');
    const list = healthEvents.listHealthEvents(animalPassport);
    const events = list.events || [];
    return {
      healthEvents: events.slice(0, 8),  // most recent 8
      healthSummary: {
        total: events.length,
        vetVerified: events.filter(e => e.tier === 'vet_verified').length,
        lastDeworming: events.find(e => e.eventType === 'deworming') || null,
        lastSpray: events.find(e => e.eventType === 'spray') || null,
        lastVaccination: events.find(e => e.eventType === 'vaccination') || null,
      },
    };
  } catch (e) {
    return { healthEvents: [], healthSummary: null };
  }
}

async function dispatchToVet(reportId, vetId) {
  const report = sickReports.get(reportId);
  const vet = vets.get(vetId);
  if (!report || !vet) return { error: 'Report or vet not found' };

  report.dispatchedTo = vetId;
  report.dispatchedAt = new Date().toISOString();
  addHistory(report, REPORT_STATUS.DISPATCHED, `Dispatched to ${vet.fullName}`);

  // Send SMS to vet
  const message = `FarmDirect — SICK ANIMAL REPORT
${report.animalType} (${report.animalBreed})
ID: ${report.passportId}
Symptoms: ${(report.symptoms || []).join(', ')}
Urgency: ${report.urgency.toUpperCase()}
Farmer: ${report.farmerName} (${report.farmerPhone})
Location: ${report.location?.ward || ''}, ${report.location?.county || ''}
Reply ACCEPT to take case.
Report: ${reportId}`;

  try {
    await sms.sendSms(vet.phone, message, {
      type: 'sick_dispatch',
      reportId,
      vetId,
    });
  } catch (err) {
    console.error('SMS dispatch failed:', err.message);
  }

  persist();
  console.log('📨 Dispatched to vet:', vet.fullName, '|', reportId);
  return { success: true, report, vet };
}

function acceptCase(reportId, vetId) {
  const report = sickReports.get(reportId);
  const vet = vets.get(vetId);
  if (!report || !vet) return { error: 'Report or vet not found' };

  if (report.status !== REPORT_STATUS.DISPATCHED) {
    return { error: 'Report not in dispatched state' };
  }

  report.acceptedBy = vetId;
  report.acceptedAt = new Date().toISOString();
  addHistory(report, REPORT_STATUS.ACCEPTED, `Accepted by ${vet.fullName}`);

  vet.activeCases = (vet.activeCases || 0) + 1;

  persist();
  console.log('✅ Vet accepted case:', vet.fullName, '|', reportId);
  return { success: true, report, vet };
}

function rejectCase(reportId, vetId, reason) {
  const report = sickReports.get(reportId);
  if (!report) return { error: 'Report not found' };

  if (!report.rejectedBy) report.rejectedBy = [];
  report.rejectedBy.push(vetId);
  addHistory(report, report.status, `Declined by vet ${vetId}${reason ? ' — ' + reason : ''}`);

  // Try next vet
  const nextVets = findNearestVets(report, 5).filter(v => !report.rejectedBy.includes(v.id));
  if (nextVets.length > 0) {
    dispatchToVet(reportId, nextVets[0].id);
  } else {
    addHistory(report, REPORT_STATUS.PENDING, 'No more vets available');
  }

  persist();
  console.log('❌ Vet declined case:', vetId, '|', reportId);
  return { success: true, report };
}

function startTreatment(reportId, vetId) {
  const report = sickReports.get(reportId);
  if (!report) return { error: 'Report not found' };
  addHistory(report, REPORT_STATUS.ON_SITE, `Vet ${vetId} on site`);
  persist();
  console.log('🚗 Vet on site:', vetId, '|', reportId);
  return { success: true, report };
}

// ═════════════════════════════════════════════════════
// TREATMENTS
// ═════════════════════════════════════════════════════

function generateTreatmentId() {
  return 'TRT-' + Date.now().toString(36).toUpperCase();
}

function completeTreatment(reportId, vetId, data) {
  const report = sickReports.get(reportId);
  const vet = vets.get(vetId);
  if (!report || !vet) return { error: 'Report or vet not found' };

  const id = generateTreatmentId();

  const treatment = {
    id,
    reportId,
    vetId,
    vetName: vet.fullName,
    passportId: report.passportId,
    farmerId: report.farmerId,
    // Clinical
    diagnosis: data.diagnosis,
    treatment: data.treatment,
    medicines: data.medicines || [],   // [{ name, dosage, duration }]
    notes: data.notes || '',
    // Outcome
    outcome: data.outcome || 'improving',  // improving | resolved | referred | deceased
    requiresQuarantine: !!data.requiresQuarantine,
    quarantineDays: data.quarantineDays || 0,
    followUpDate: data.followUpDate || null,
    // Cost
    cost: parseInt(data.cost) || 0,
    paidViaEscrow: !vet.isGovt,
    paymentStatus: vet.isGovt ? 'not_required' : 'pending',
    // Timestamps
    createdAt: new Date().toISOString(),
  };

  treatments.set(id, treatment);
  report.treatmentId = id;

  // Map outcome to report status
  const outcomeMap = {
    'improving': REPORT_STATUS.TREATED,
    'resolved': REPORT_STATUS.RESOLVED,
    'referred': REPORT_STATUS.REFERRED,
    'deceased': REPORT_STATUS.DECEASED,
  };
  addHistory(report, outcomeMap[treatment.outcome], `Treated: ${data.diagnosis}`);

  if (treatment.outcome === 'resolved') report.resolvedAt = new Date().toISOString();

  // Update vet stats
  vet.activeCases = Math.max(0, (vet.activeCases || 0) - 1);
  vet.completedCases = (vet.completedCases || 0) + 1;
  if (!vet.isGovt) vet.totalEarnings = (vet.totalEarnings || 0) + treatment.cost;

  // Quarantine if needed
  if (treatment.requiresQuarantine) {
    quarantineAnimal(report.passportId, `Treatment: ${data.diagnosis}`, vetId);
  }

  persist();
  console.log('💊 Treatment completed:', id, '|', data.diagnosis);
  console.log('   Outcome:', data.outcome, '| Cost: KES', treatment.cost);

  return { success: true, treatment, report };
}

function getTreatment(id) {
  return treatments.get(id);
}

function listTreatments(filter = {}) {
  let list = [...treatments.values()];
  if (filter.passportId) list = list.filter(t => t.passportId === filter.passportId);
  if (filter.vetId) list = list.filter(t => t.vetId === filter.vetId);
  if (filter.farmerId) list = list.filter(t => t.farmerId === filter.farmerId);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ═════════════════════════════════════════════════════
// QUARANTINE
// ═════════════════════════════════════════════════════

function quarantineAnimal(passportId, reason, vetId) {
  const shamba = require('./shamba');
  const animal = shamba._livestock ? shamba._livestock.get(passportId) : null;
  if (!animal) return { error: 'Animal not found' };

  animal.quarantine = {
    active: true,
    reason,
    vetId,
    startedAt: new Date().toISOString(),
    releasedAt: null,
    releaseNotes: null,
  };

  console.log('🚧 Animal quarantined:', passportId, '|', reason);
  return { success: true, animal };
}

function releaseFromQuarantine(passportId, vetId, notes) {
  const shamba = require('./shamba');
  const animal = shamba._livestock ? shamba._livestock.get(passportId) : null;
  if (!animal || !animal.quarantine) return { error: 'No quarantine record' };

  animal.quarantine.active = false;
  animal.quarantine.releasedAt = new Date().toISOString();
  animal.quarantine.releasedBy = vetId;
  animal.quarantine.releaseNotes = notes || 'Cleared by vet';

  console.log('✅ Released from quarantine:', passportId);
  return { success: true, animal };
}

// ═════════════════════════════════════════════════════
// STATS
// ═════════════════════════════════════════════════════

function getVetStats(vetId) {
  const vet = vets.get(vetId);
  if (!vet) return null;

  const myReports = [...sickReports.values()].filter(r => 
    r.acceptedBy === vetId || r.dispatchedTo === vetId
  );
  const myTreatments = [...treatments.values()].filter(t => t.vetId === vetId);

  return {
    vet,
    totalReports: myReports.length,
    activeCases: myReports.filter(r => 
      [REPORT_STATUS.ACCEPTED, REPORT_STATUS.EN_ROUTE, REPORT_STATUS.ON_SITE].includes(r.status)
    ).length,
    completedTreatments: myTreatments.length,
    totalEarnings: vet.totalEarnings || 0,
    avgCost: myTreatments.length > 0 
      ? Math.round(myTreatments.reduce((s, t) => s + t.cost, 0) / myTreatments.length)
      : 0,
  };
}

function getFarmerHealthHistory(farmerId) {
  const reports = [...sickReports.values()].filter(r => r.farmerId === farmerId);
  const treatmentsList = [...treatments.values()].filter(t => t.farmerId === farmerId);
  return { reports, treatments: treatmentsList };
}

function getStats() {
  const allVets = [...vets.values()];
  const allReports = [...sickReports.values()];
  const allTreatments = [...treatments.values()];

  return {
    vets: {
      total: allVets.length,
      active: allVets.filter(v => v.status === 'active').length,
      pending: allVets.filter(v => v.status === 'pending_verification').length,
      government: allVets.filter(v => v.isGovt).length,
      private: allVets.filter(v => !v.isGovt).length,
    },
    reports: {
      total: allReports.length,
      pending: allReports.filter(r => r.status === REPORT_STATUS.PENDING).length,
      dispatched: allReports.filter(r => r.status === REPORT_STATUS.DISPATCHED).length,
      active: allReports.filter(r => 
        [REPORT_STATUS.ACCEPTED, REPORT_STATUS.EN_ROUTE, REPORT_STATUS.ON_SITE].includes(r.status)
      ).length,
      resolved: allReports.filter(r => r.status === REPORT_STATUS.RESOLVED).length,
    },
    treatments: {
      total: allTreatments.length,
      totalCost: allTreatments.reduce((s, t) => s + t.cost, 0),
    },
  };
}

/**
 * KYC activation hook — called from kyc.js when a vet's KYC verifies.
 * userId is the vet's phone in our current scheme.
 */
function activateVetByUserId(userId, kycRecord) {
  if (!userId) return null;
  const cleanUserId = String(userId).replace(/\D/g, '').slice(-9);
  const vet = Array.from(vets.values()).find(v => {
    const vClean = String(v.phone || '').replace(/\D/g, '').slice(-9);
    return vClean && vClean === cleanUserId;
  });
  if (!vet) {
    console.warn('⚠️  activateVetByUserId: no vet found for', userId);
    return null;
  }
  vet.status = 'active';
  vet.verified = true;
  vet.verifiedAt = new Date().toISOString();
  vet.verifiedBy = 'kyc:' + (kycRecord?.provider || 'unknown');
  vet.kvbLicenseVerified = !!(kycRecord?.documents?.kvb_license?.url);
  vet.kycId = kycRecord?.id || null;
  vet.kycDocuments = kycRecord?.documents || {};
  persist();
  console.log('✅ Vet activated via KYC:', vet.id, '|', vet.fullName);
  return vet;
}

module.exports = {
  getHealthContextForDispatch,
  activateVetByUserId,
  // Constants
  SPECIALIZATIONS,
  VET_TYPES,
  SYMPTOMS,
  REPORT_STATUS,
  URGENCY_LEVELS,
  // Vet registration
  registerVet,
  verifyVet,
  getVet,
  getVetByPhone,
  listVets,
  // Sick reports
  reportSickAnimal,
  getReport,
  listReports,
  findNearestVets,
  dispatchToVet,
  acceptCase,
  rejectCase,
  startTreatment,
  // Treatments
  completeTreatment,
  getTreatment,
  listTreatments,
  // Quarantine
  quarantineAnimal,
  releaseFromQuarantine,
  // Stats
  getVetStats,
  getFarmerHealthHistory,
  getStats,
  // Exports for other services
  _vets: vets,
  _sickReports: sickReports,
  _treatments: treatments,
};
