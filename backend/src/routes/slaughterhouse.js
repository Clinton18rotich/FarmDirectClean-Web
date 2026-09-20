const express = require('express');
const router = express.Router();
const shamba = require('../services/shamba');
const sms = require('../services/sms');

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

// ═════════════════════════════════════════════════════
// SLAUGHTERHOUSE REGISTRATION
// ═════════════════════════════════════════════════════

router.post('/register', (req, res) => {
  try {
    const { businessName, operatorName, operatorPhone, operatorEmail, location, licenseNumber, capacityPerDay, accepts, payment } = req.body;

    if (!businessName || !operatorName || !operatorPhone) {
      return res.status(400).json({ success: false, message: 'Business name, operator, and phone required' });
    }
    if (!location) return res.status(400).json({ success: false, message: 'Location required' });
    if (!licenseNumber) return res.status(400).json({ success: false, message: 'Ministry license number required' });

    const facility = shamba.registerSlaughterhouse({
      businessName,
      operatorName,
      operatorPhone: normalizeKenyaPhone(operatorPhone),
      operatorEmail,
      location,
      licenseNumber,
      capacityPerDay,
      accepts,
      payment,
    });

    res.json({ success: true, slaughterhouse: facility });
  } catch (error) {
    console.error('❌ Slaughterhouse register:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/list', (req, res) => {
  res.json({
    success: true,
    slaughterhouses: shamba.listSlaughterhouses({
      status: req.query.status,
      county: req.query.county,
    }),
  });
});

router.get('/:id', (req, res) => {
  const facility = shamba.getSlaughterhouse(req.params.id);
  if (!facility) return res.status(404).json({ success: false, message: 'Slaughterhouse not found' });
  res.json({ success: true, slaughterhouse: facility });
});

// Admin verifies license
router.post('/:id/verify', (req, res) => {
  const { verifiedBy } = req.body;
  const facility = shamba.verifySlaughterhouse(req.params.id, verifiedBy || 'admin');
  if (!facility) return res.status(404).json({ success: false, message: 'Slaughterhouse not found' });
  res.json({ success: true, slaughterhouse: facility });
});

// ═════════════════════════════════════════════════════
// ANIMAL LOOKUP (scan passport)
// ═════════════════════════════════════════════════════

router.get('/lookup/:passportId', (req, res) => {
  const result = shamba.lookupAnimal(req.params.passportId);
  if (!result.found) {
    return res.status(404).json({ success: false, message: 'Animal not found in system' });
  }
  res.json({ success: true, ...result });
});

// ═════════════════════════════════════════════════════
// SLAUGHTER REQUEST FLOW
// ═════════════════════════════════════════════════════

/**
 * Slaughterhouse creates request
 * SMS goes to owner with approval code
 */
router.post('/slaughter/request', async (req, res) => {
  try {
    const { slaughterhouseId, animalPassport, numberOfPackages } = req.body;

    if (!slaughterhouseId || !animalPassport) {
      return res.status(400).json({ success: false, message: 'Slaughterhouse and animal required' });
    }

    const facility = shamba.getSlaughterhouse(slaughterhouseId);
    if (!facility) return res.status(404).json({ success: false, message: 'Slaughterhouse not found' });
    if (facility.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Slaughterhouse not yet verified (status: ' + facility.status + ')' });
    }

    // Look up animal
    const lookup = shamba.lookupAnimal(animalPassport);
    if (!lookup.found) return res.status(404).json({ success: false, message: 'Animal not found' });
    if (lookup.blocked) return res.status(400).json({ success: false, message: lookup.message, reason: lookup.reason });

    const animal = lookup.animal;

    // Create request
    const request = shamba.createSlaughterRequest({
      slaughterhouseId: facility.id,
      slaughterhouseName: facility.businessName,
      slaughterhousePhone: facility.operatorPhone,
      animalPassport: animal.passportId,
      animalType: animal.type,
      animalBreed: animal.breed,
      ownerId: animal.ownerId,
      ownerName: animal.ownerName,
      ownerPhone: animal.ownerPhone,
    });

    // Send SMS to owner with approval code
    const smsMessage =
      `FarmDirect: ${facility.businessName} wants to slaughter your ${animal.type} (${animal.passportId}).\n\n` +
      `If you approve, reply:\nYES ${request.approvalCode}\n\n` +
      `If you DO NOT approve, reply:\nNO\n\n` +
      `Do NOT share this code with anyone.`;

    await sms.sendSms(animal.ownerPhone, smsMessage, { requestId: request.id });

    res.json({ success: true, request, message: 'SMS sent to owner with approval code' });
  } catch (error) {
    console.error('❌ Slaughter request error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Owner approves (via SMS webhook or web)
 */
router.post('/slaughter/:id/approve', (req, res) => {
  const { code } = req.body;
  const result = shamba.approveSlaughter(req.params.id, code);
  if (!result.success) return res.status(400).json(result);

  // Notify slaughterhouse
  const request = result.request;
  sms.sendSms(
    request.slaughterhousePhone,
    `FarmDirect: Owner APPROVED slaughter of ${request.animalPassport}. You may proceed.`,
    { requestId: request.id }
  );

  res.json({ success: true, request });
});

/**
 * Owner rejects
 */
router.post('/slaughter/:id/reject', (req, res) => {
  const { reason } = req.body;
  const result = shamba.rejectSlaughter(req.params.id, reason);
  if (!result.success) return res.status(400).json(result);

  const request = result.request;
  sms.sendSms(
    request.slaughterhousePhone,
    `FarmDirect: Owner DECLINED slaughter of ${request.animalPassport}. Do not proceed.`,
    { requestId: request.id }
  );

  res.json({ success: true, request });
});

/**
 * Complete slaughter + generate meat tokens
 */
router.post('/slaughter/:id/complete', (req, res) => {
  const { numberOfPackages } = req.body;
  const result = shamba.completeSlaughter(req.params.id, parseInt(numberOfPackages) || 1);
  if (!result.success) return res.status(400).json(result);

  res.json({
    success: true,
    request: result.request,
    meatTokens: result.tokens,
    message: `Slaughter completed. ${result.tokens.length} meat tokens generated.`,
  });
});

/**
 * List requests (filtered)
 */
router.get('/slaughter/list', (req, res) => {
  res.json({
    success: true,
    requests: shamba.listSlaughterRequests({
      status: req.query.status,
      slaughterhouseId: req.query.slaughterhouseId,
      ownerId: req.query.ownerId,
    }),
  });
});

router.get('/slaughter/:id', (req, res) => {
  const request = shamba.getSlaughterRequest(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  res.json({ success: true, request });
});

// ═════════════════════════════════════════════════════
// MEAT TRACEABILITY
// ═════════════════════════════════════════════════════

/**
 * Verify meat token (consumer scans QR)
 */
router.get('/meat/verify/:token', (req, res) => {
  const result = shamba.verifyMeat(req.params.token);
  res.json(result);
});

/**
 * Report meat fraud
 */
router.post('/meat/:token/report', (req, res) => {
  const { reportedBy, description, contactPhone } = req.body;
  const record = shamba.reportMeatFraud(req.params.token, {
    reportedBy,
    description,
    contactPhone: contactPhone ? normalizeKenyaPhone(contactPhone) : null,
  });
  if (!record) return res.status(404).json({ success: false, message: 'Meat token not found' });
  res.json({ success: true, message: 'Fraud reported. Authorities notified.' });
});

module.exports = router;
