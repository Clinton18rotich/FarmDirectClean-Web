const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

// Load riders from disk on startup
const riders = storage.objectToMap(storage.load('riders', {}));

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

function persist() {
  storage.save('riders', storage.mapToObject(riders));
}

router.post('/register', (req, res) => {
  try {
    const { rider, vehicle, location, radiusKm, pricePerDelivery, availability, payment } = req.body;

    if (!rider?.fullName || !rider?.phone) {
      return res.status(400).json({ success: false, message: 'Name and phone required' });
    }
    if (!vehicle?.type) return res.status(400).json({ success: false, message: 'Vehicle type required' });
    if (!location) return res.status(400).json({ success: false, message: 'Location required' });
    if (!pricePerDelivery) return res.status(400).json({ success: false, message: 'Price per delivery required' });
    if (!payment?.method) return res.status(400).json({ success: false, message: 'Payment method required' });

    const normalizedPhone = normalizeKenyaPhone(rider.phone);
    const normalizedPochiPhone = payment.pochiPhone ? normalizeKenyaPhone(payment.pochiPhone) : null;

    if (payment.method === 'till' && !payment.tillNumber) return res.status(400).json({ success: false, message: 'Till number required' });
    if (payment.method === 'paybill' && (!payment.paybillNumber || !payment.paybillAccount)) return res.status(400).json({ success: false, message: 'Paybill details required' });
    if (payment.method === 'pochi' && !normalizedPochiPhone) return res.status(400).json({ success: false, message: 'Pochi phone required' });

    const id = 'RDR-' + Date.now().toString(36).toUpperCase();
    const record = {
      id,
      rider: { ...rider, phone: normalizedPhone },
      vehicle,
      location,
      radiusKm: radiusKm || 10,
      pricePerDelivery: parseInt(pricePerDelivery),
      availability,
      payment: { ...payment, pochiPhone: normalizedPochiPhone },
      status: 'active',
      isOnline: false,
      currentOrderId: null,
      totalDeliveries: 0,
      rating: 5.0,
      lastActiveAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
    };

    riders.set(id, record);
    persist();

    console.log('🏍️  Rider registered:', id, rider.fullName, '| Saved to disk');

    res.json({ success: true, riderId: id, rider: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/list', (req, res) => {
  res.json({ success: true, riders: [...riders.values()] });
});

router.get('/online', (req, res) => {
  const online = [...riders.values()].filter(r => r.isOnline && !r.currentOrderId);
  res.json({ success: true, riders: online });
});

router.get('/:id', (req, res) => {
  const rider = riders.get(req.params.id);
  if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
  res.json({ success: true, rider });
});

router.patch('/:id/status', (req, res) => {
  const rider = riders.get(req.params.id);
  if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
  rider.isOnline = !!req.body.isOnline;
  rider.lastActiveAt = new Date().toISOString();
  persist();
  console.log('🏍️  Rider', req.params.id, 'is now', rider.isOnline ? 'ONLINE' : 'OFFLINE');
  res.json({ success: true, rider });
});

module.exports = router;
module.exports._riders = riders;
