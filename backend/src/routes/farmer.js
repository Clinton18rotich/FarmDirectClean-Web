const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

const farmers = storage.objectToMap(storage.load('farmers', {}));

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
  storage.save('farmers', storage.mapToObject(farmers));
}

router.post('/register', (req, res) => {
  try {
    const { farmer, payment, products } = req.body;

    if (!farmer?.fullName || !farmer?.phone) return res.status(400).json({ success: false, message: 'Name and phone required' });
    if (!payment?.method) return res.status(400).json({ success: false, message: 'Payment method required' });

    const normalizedFarmerPhone = normalizeKenyaPhone(farmer.phone);
    const normalizedPochiPhone = payment.pochiPhone ? normalizeKenyaPhone(payment.pochiPhone) : null;

    if (payment.method === 'till' && !payment.tillNumber) return res.status(400).json({ success: false, message: 'Till number required' });
    if (payment.method === 'paybill' && (!payment.paybillNumber || !payment.paybillAccount)) return res.status(400).json({ success: false, message: 'Paybill required' });
    if (payment.method === 'pochi' && !normalizedPochiPhone) return res.status(400).json({ success: false, message: 'Pochi phone required' });

    const id = 'FARM-' + Date.now().toString(36).toUpperCase();
    const record = {
      id,
      ...farmer,
      phone: normalizedFarmerPhone,
      payment: { ...payment, pochiPhone: normalizedPochiPhone },
      products,
      registeredAt: new Date().toISOString(),
      status: 'active',
    };

    farmers.set(id, record);
    persist();

    console.log('👨‍🌾 Farmer registered:', id, farmer.fullName, '| Saved to disk');

    res.json({ success: true, farmerId: id, farmer: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/list', (req, res) => {
  res.json({ success: true, farmers: [...farmers.values()] });
});

router.get('/:id', (req, res) => {
  const farmer = farmers.get(req.params.id);
  if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
  res.json({ success: true, farmer });
});

module.exports = router;
module.exports._farmers = farmers;
