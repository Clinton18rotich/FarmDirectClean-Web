const express = require('express');
const router = express.Router();
const landProtection = require('../services/landProtection');

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
// HEALTH & STATS
// ═══════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Land Protection running', stats: landProtection.getStats() });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: landProtection.getStats() });
});

// ═══════════════════════════════════════════════════
// G1: PARCELS & GPS BOUNDARIES
// ═══════════════════════════════════════════════════

router.post('/parcels/register', (req, res) => {
  try {
    const { ownerId, ownerName, ownerPhone, county, subCounty, ward, village, titleDeed, areaHectares, landUse, description, waypoints } = req.body;

    if (!ownerName || !ownerPhone) {
      return res.status(400).json({ success: false, message: 'Owner name and phone required' });
    }
    if (!county) {
      return res.status(400).json({ success: false, message: 'County required' });
    }

    const parcel = landProtection.registerParcel({
      ownerId,
      ownerName,
      ownerPhone: normalizeKenyaPhone(ownerPhone),
      county, subCounty, ward, village,
      titleDeed, areaHectares, landUse, description,
      waypoints,
    });

    res.json({ success: true, parcel });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/parcels/:id/waypoint', (req, res) => {
  const result = landProtection.addWaypoint(req.params.id, req.body);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, parcel: result });
});

router.get('/parcels/list', (req, res) => {
  res.json({
    success: true,
    parcels: landProtection.listParcels({
      ownerId: req.query.ownerId,
      county: req.query.county,
      status: req.query.status,
    }),
  });
});

router.get('/parcels/:id', (req, res) => {
  const parcel = landProtection.getParcelEnriched(req.params.id);
  if (!parcel) return res.status(404).json({ success: false, message: 'Parcel not found' });
  res.json({ success: true, parcel });
});

// ═══════════════════════════════════════════════════
// G2: TITLE DEED VAULT
// ═══════════════════════════════════════════════════

router.post('/parcels/:id/title-deed', (req, res) => {
  const { photoBase64, titleDeedNumber } = req.body;
  const result = landProtection.uploadTitleDeed(req.params.id, { photoBase64, titleDeedNumber });
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, parcel: result });
});

router.get('/parcels/:id/title-deed', (req, res) => {
  const deed = landProtection.getDeedFromVault(req.params.id);
  if (!deed) return res.status(404).json({ success: false, message: 'No title deed in vault' });
  res.json({ success: true, deed });
});

// ═══════════════════════════════════════════════════
// G3: WITNESS VERIFICATION
// ═══════════════════════════════════════════════════

router.post('/parcels/:id/witness', (req, res) => {
  try {
    const { name, phone, relationship } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Witness name and phone required' });
    }
    const result = landProtection.inviteWitness(req.params.id, {
      name,
      phone: normalizeKenyaPhone(phone),
      relationship,
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/witnesses/:id/confirm', (req, res) => {
  const { code, location } = req.body;
  const result = landProtection.confirmWitness(req.params.id, code, location);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, ...result });
});

router.post('/witnesses/:id/decline', (req, res) => {
  const result = landProtection.declineWitness(req.params.id, req.body.reason);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, ...result });
});

module.exports = router;


// ═══════════════════════════════════════════════════
// G4: EVICTION SOS
// ═══════════════════════════════════════════════════

router.post('/parcels/:id/sos', async (req, res) => {
  try {
    const { reporterName, reporterPhone, situation, photoUrl } = req.body;
    const result = await landProtection.triggerEvictionSOS(req.params.id, {
      reporterName,
      reporterPhone: reporterPhone ? normalizeKenyaPhone(reporterPhone) : undefined,
      situation,
      photoUrl,
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/sos/list', (req, res) => {
  res.json({
    success: true,
    alerts: landProtection.listSOSAlerts({
      status: req.query.status,
      ownerId: req.query.ownerId,
      county: req.query.county,
    }),
  });
});

router.get('/sos/:id', (req, res) => {
  const sos = landProtection.getSOS(req.params.id);
  if (!sos) return res.status(404).json({ success: false, message: 'SOS not found' });
  res.json({ success: true, sos });
});

router.post('/sos/:id/resolve', (req, res) => {
  const result = landProtection.resolveSOS(req.params.id, req.body.notes);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, ...result });
});

router.get('/emergency-contacts/:ownerId', (req, res) => {
  res.json({ success: true, ...landProtection.getEmergencyContacts(req.params.ownerId) });
});

router.post('/emergency-contacts/:ownerId', (req, res) => {
  const result = landProtection.saveEmergencyContacts(req.params.ownerId, req.body.contacts);
  res.json({ success: true, ...result });
});

// ═══════════════════════════════════════════════════
// G5: LAND-LIVESTOCK MATCH
// ═══════════════════════════════════════════════════

router.post('/parcels/:id/verify-with-livestock', (req, res) => {
  const { livestockPassports } = req.body;
  if (!livestockPassports || !Array.isArray(livestockPassports)) {
    return res.status(400).json({ success: false, message: 'livestockPassports array required' });
  }
  const result = landProtection.landLivestockMatch(req.params.id, livestockPassports);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, ...result });
});

// ═══════════════════════════════════════════════════
// G6: RENTAL GRAZING LEASE
// ═══════════════════════════════════════════════════

router.post('/leases/create', (req, res) => {
  try {
    const { parcelId, landownerId, landownerName, landownerPhone, tenantId, tenantName, tenantPhone, purpose, monthlyFee, startDate, endDate, terms } = req.body;
    if (!landownerName || !landownerPhone || !tenantName || !tenantPhone) {
      return res.status(400).json({ success: false, message: 'Landowner and tenant required' });
    }
    const lease = landProtection.createLease({
      parcelId, landownerId, landownerName,
      landownerPhone: normalizeKenyaPhone(landownerPhone),
      tenantId, tenantName,
      tenantPhone: normalizeKenyaPhone(tenantPhone),
      purpose, monthlyFee, startDate, endDate, terms,
    });
    res.json({ success: true, lease });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/leases/:id/approve', (req, res) => {
  const result = landProtection.approveLease(req.params.id, req.body.code);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, ...result });
});

router.post('/leases/:id/reject', (req, res) => {
  const result = landProtection.rejectLease(req.params.id, req.body.reason);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, ...result });
});

router.get('/leases/list', (req, res) => {
  res.json({
    success: true,
    leases: landProtection.listLeases({
      landownerId: req.query.landownerId,
      tenantId: req.query.tenantId,
      parcelId: req.query.parcelId,
      status: req.query.status,
    }),
  });
});

// ═══════════════════════════════════════════════════
// G7: NOMADIC HERD EXEMPTION
// ═══════════════════════════════════════════════════

router.post('/livestock/:passportId/nomadic', (req, res) => {
  const result = landProtection.markNomadic(req.params.passportId, req.body);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, ...result });
});
