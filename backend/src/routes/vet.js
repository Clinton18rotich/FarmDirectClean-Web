const express = require('express');
const router = express.Router();
const vet = require('../services/vet');

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

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

router.get('/constants', (req, res) => {
  res.json({
    success: true,
    specializations: vet.SPECIALIZATIONS,
    vetTypes: vet.VET_TYPES,
    symptoms: vet.SYMPTOMS,
    urgencyLevels: vet.URGENCY_LEVELS,
    reportStatus: vet.REPORT_STATUS,
  });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: vet.getStats() });
});

// ═══════════════════════════════════════════════════
// VET REGISTRATION
// ═══════════════════════════════════════════════════

router.post('/register', (req, res) => {
  try {
    const { fullName, phone, email, kvaLicenseNumber, vetType, specializations, location, coverageRadius, acceptsEmergency, availableHours, payment, consultationFee } = req.body;

    if (!fullName || !phone) return res.status(400).json({ success: false, message: 'Name and phone required' });
    if (!location) return res.status(400).json({ success: false, message: 'Location required' });
    if (vetType === 'private' && !kvaLicenseNumber) {
      return res.status(400).json({ success: false, message: 'KVB license required for private vets' });
    }

    const v = vet.registerVet({
      fullName,
      phone: normalizeKenyaPhone(phone),
      email,
      kvaLicenseNumber,
      vetType: vetType || 'private',
      specializations: specializations || ['general'],
      location,
      coverageRadius: parseInt(coverageRadius) || 20,
      acceptsEmergency,
      availableHours,
      payment,
      consultationFee: parseInt(consultationFee) || 500,
    });

    res.json({ success: true, vet: v });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/list', (req, res) => {
  res.json({
    success: true,
    vets: vet.listVets({
      status: req.query.status,
      county: req.query.county,
      specialization: req.query.specialization,
      vetType: req.query.vetType,
      isGovt: req.query.isGovt === 'true' ? true : req.query.isGovt === 'false' ? false : undefined,
    }),
  });
});

router.get('/by-phone/:phone', (req, res) => {
  const v = vet.getVetByPhone(normalizeKenyaPhone(req.params.phone));
  if (!v) return res.status(404).json({ success: false, message: 'Vet not found' });
  res.json({ success: true, vet: v });
});

router.get('/:id/stats', (req, res) => {
  const stats = vet.getVetStats(req.params.id);
  if (!stats) return res.status(404).json({ success: false, message: 'Vet not found' });
  res.json({ success: true, stats });
});

router.get('/:id', (req, res) => {
  const v = vet.getVet(req.params.id);
  if (!v) return res.status(404).json({ success: false, message: 'Vet not found' });
  res.json({ success: true, vet: v });
});

router.post('/:id/verify', (req, res) => {
  const { verifiedBy } = req.body;
  const v = vet.verifyVet(req.params.id, verifiedBy);
  if (!v) return res.status(404).json({ success: false, message: 'Vet not found' });
  res.json({ success: true, vet: v });
});

// ═══════════════════════════════════════════════════
// SICK ANIMAL REPORTS
// ═══════════════════════════════════════════════════

router.post('/sick/report', async (req, res) => {
  try {
    const { passportId, farmerId, farmerName, farmerPhone, location, symptoms, symptomDetails, urgency, photoUrls } = req.body;

    if (!passportId) return res.status(400).json({ success: false, message: 'Animal passport required' });
    if (!farmerName || !farmerPhone) return res.status(400).json({ success: false, message: 'Farmer name and phone required' });
    if (!symptoms || symptoms.length === 0) return res.status(400).json({ success: false, message: 'At least one symptom required' });

    // Look up animal
    const shamba = require('../services/shamba');
    const animal = shamba._livestock ? shamba._livestock.get(passportId) : null;
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found in system' });
    if (animal.status === 'dead') return res.status(400).json({ success: false, message: 'Cannot report deceased animal' });

    const cleanPhone = normalizeKenyaPhone(farmerPhone);
    const reporterPhone = String(cleanPhone || farmerPhone || '').replace(/\D/g, '');
    const ownerPhone = String(animal.ownerPhone || animal.ownerId || '').replace(/\D/g, '');

    // ─── Session 6.21: Multi-role gate ───
    // If reporter is BOTH a verified vet AND the owner of this animal,
    // offer self-service instead of dispatching.
    const reporterIsOwner = reporterPhone && ownerPhone &&
      reporterPhone.slice(-9) === ownerPhone.slice(-9);
    let reporterVet = null;
    try {
      reporterVet = vet.getVetByPhone(farmerPhone) || vet.getVetByPhone(cleanPhone);
    } catch (e) { /* silent */ }
    const reporterIsVerifiedVet = !!(reporterVet && reporterVet.verified);

    if (reporterIsOwner && reporterIsVerifiedVet) {
      console.log('🩺 Multi-role gate: reporter is verified vet + owner → self-service offered');
      return res.json({
        success: true,
        selfServiceAvailable: true,
        reporterVetId: reporterVet.id,
        reporterVetName: reporterVet.fullName,
        animal: {
          passportId: animal.passportId,
          type: animal.type,
          breed: animal.breed,
        },
        message: 'You are a KVB-verified vet. Record your own treatment, or request another vet.',
      });
    }

    const report = vet.reportSickAnimal({
      passportId,
      animalType: animal.type,
      animalBreed: animal.breed,
      animalAge: animal.age,
      farmerId: farmerId || animal.ownerId,
      farmerName,
      farmerPhone: normalizeKenyaPhone(farmerPhone),
      location: location || animal.location,
      symptoms,
      symptomDetails,
      urgency: urgency || 'medium',
      photoUrls,
    });

    // Auto-dispatch to nearest vet
    const nearestVets = vet.findNearestVets(report, 3);
    if (nearestVets.length > 0) {
      await vet.dispatchToVet(report.id, nearestVets[0].id);
    }

    res.json({ 
      success: true, 
      selfServiceAvailable: false,
      report: vet.getReport(report.id),
      vetsFound: nearestVets.length,
      message: nearestVets.length > 0 
        ? `Dispatched to ${nearestVets[0].fullName}`
        : 'No vets available in your area yet',
    });
  } catch (error) {
    console.error('❌ Sick report error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/sick/list', (req, res) => {
  res.json({
    success: true,
    reports: vet.listReports({
      status: req.query.status,
      farmerId: req.query.farmerId,
      vetId: req.query.vetId,
      county: req.query.county,
      urgency: req.query.urgency,
    }),
  });
});

router.get('/sick/:id', (req, res) => {
  const report = vet.getReport(req.params.id);
  if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
  const treatment = report.treatmentId ? vet.getTreatment(report.treatmentId) : null;
  res.json({ success: true, report, treatment });
});

router.post('/sick/:id/accept', (req, res) => {
  const { vetId } = req.body;
  if (!vetId) return res.status(400).json({ success: false, message: 'Vet ID required' });
  const result = vet.acceptCase(req.params.id, vetId);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json(result);
});

router.post('/sick/:id/reject', (req, res) => {
  const { vetId, reason } = req.body;
  if (!vetId) return res.status(400).json({ success: false, message: 'Vet ID required' });
  const result = vet.rejectCase(req.params.id, vetId, reason);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json(result);
});

router.post('/sick/:id/start', (req, res) => {
  const { vetId } = req.body;
  const result = vet.startTreatment(req.params.id, vetId);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json(result);
});

router.post('/sick/:id/complete', (req, res) => {
  const { vetId, diagnosis, treatment, medicines, notes, outcome, requiresQuarantine, quarantineDays, followUpDate, cost } = req.body;
  if (!vetId || !diagnosis) {
    return res.status(400).json({ success: false, message: 'Vet ID and diagnosis required' });
  }
  const result = vet.completeTreatment(req.params.id, vetId, {
    diagnosis, treatment, medicines, notes, outcome,
    requiresQuarantine, quarantineDays, followUpDate, cost,
  });
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json(result);
});

// ═══════════════════════════════════════════════════
// QUARANTINE
// ═══════════════════════════════════════════════════

router.post('/quarantine/:passportId', (req, res) => {
  const { reason, vetId } = req.body;
  const result = vet.quarantineAnimal(req.params.passportId, reason, vetId);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json(result);
});

router.post('/quarantine/:passportId/release', (req, res) => {
  const { vetId, notes } = req.body;
  const result = vet.releaseFromQuarantine(req.params.passportId, vetId, notes);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json(result);
});

// ═══════════════════════════════════════════════════
// FARMER HEALTH HISTORY
// ═══════════════════════════════════════════════════

router.get('/farmer/:farmerId/health', (req, res) => {
  res.json({ success: true, ...vet.getFarmerHealthHistory(req.params.farmerId) });
});

module.exports = router;
