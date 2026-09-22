const express = require('express');
const router = express.Router();
const ridersService = require('../services/riders');

// ═══════════════════════════════════════════════════════════
// REGISTRATION
// ═══════════════════════════════════════════════════════════

router.post('/register', (req, res) => {
  try {
    const result = ridersService.registerRider(req.body);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, riderId: result.rider.id, rider: result.rider });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// KYC
// ═══════════════════════════════════════════════════════════

router.post('/:id/kyc/submit', (req, res) => {
  try {
    const result = ridersService.submitKyc(req.params.id, req.body);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, rider: result.rider });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/kyc/approve', (req, res) => {
  try {
    const result = ridersService.approveKyc(req.params.id, req.body);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, rider: result.rider });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/kyc/reject', (req, res) => {
  try {
    const result = ridersService.rejectKyc(req.params.id, req.body);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, rider: result.rider });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// AVAILABILITY
// ═══════════════════════════════════════════════════════════

router.post('/:id/availability', (req, res) => {
  try {
    const result = ridersService.setAvailability(req.params.id, req.body);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, rider: result.rider });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/online', (req, res) => {
  try {
    const { isOnline } = req.body;
    const result = ridersService.setOnline(req.params.id, isOnline);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, rider: result.rider });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// RELIABILITY
// ═══════════════════════════════════════════════════════════

router.post('/:id/recompute', (req, res) => {
  try {
    const result = ridersService.computeReliability(req.params.id);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    const promoted = ridersService.promoteTier(req.params.id);
    res.json({ success: true, rider: result.rider, score: result.score, tier: promoted.tier });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// MATCHING (used by delivery.js)
// ═══════════════════════════════════════════════════════════

router.post('/match', (req, res) => {
  try {
    const { pickup, valueKes, radiusKm, limit } = req.body;
    const result = ridersService.getEligibleRiders({ pickup, valueKes, radiusKm, limit });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// LISTS & LOOKUPS
// ═══════════════════════════════════════════════════════════

router.get('/list', (req, res) => {
  const riders = ridersService.listRiders(req.query);
  res.json({ success: true, riders });
});

router.get('/online', (req, res) => {
  const riders = ridersService.listRiders({ isOnline: true });
  res.json({ success: true, riders });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: ridersService.getStats() });
});

router.get('/classes', (req, res) => {
  const { VEHICLE_CLASSES } = require('../services/vehicleClasses');
  res.json({ success: true, classes: VEHICLE_CLASSES });
});

router.get('/:id', (req, res) => {
  const rider = ridersService.getRider(req.params.id);
  if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
  res.json({ success: true, rider });
});

// Legacy alias — keep working
router.patch('/:id/status', (req, res) => {
  const result = ridersService.setOnline(req.params.id, req.body.isOnline);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, rider: result.rider });
});

module.exports = router;
module.exports._riders = ridersService._riders;
