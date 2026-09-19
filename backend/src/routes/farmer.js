const express = require('express');
const router = express.Router();

const farmers = new Map();

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

router.post('/register', (req, res) => {
  try {
    const { farmer, payment, products } = req.body;

    if (!farmer?.fullName || !farmer?.phone) {
      return res.status(400).json({ success: false, message: 'Name and phone required' });
    }
    if (!payment?.method) {
      return res.status(400).json({ success: false, message: 'Payment method required' });
    }

    const normalizedFarmerPhone = normalizeKenyaPhone(farmer.phone);
    const normalizedPochiPhone = payment.pochiPhone ? normalizeKenyaPhone(payment.pochiPhone) : null;

    if (payment.method === 'till' && !payment.tillNumber) {
      return res.status(400).json({ success: false, message: 'Till number required' });
    }
    if (payment.method === 'paybill' && (!payment.paybillNumber || !payment.paybillAccount)) {
      return res.status(400).json({ success: false, message: 'Paybill number and account required' });
    }
    if (payment.method === 'pochi' && !normalizedPochiPhone) {
      return res.status(400).json({ success: false, message: 'Pochi phone required' });
    }

    const id = 'FARM-' + Date.now().toString(36).toUpperCase();
    const record = {
      id,
      ...farmer,
      phone: normalizedFarmerPhone,
      payment: {
        ...payment,
        pochiPhone: normalizedPochiPhone,
      },
      products,
      registeredAt: new Date().toISOString(),
      status: 'active',
    };

    farmers.set(id, record);

    console.log('👨‍🌾 Farmer registered:', id, farmer.fullName);
    console.log('   Phone:', normalizedFarmerPhone);
    console.log('   Payment:', payment.method,
      payment.method === 'till' ? payment.tillNumber :
      payment.method === 'paybill' ? payment.paybillNumber + '/' + payment.paybillAccount :
      normalizedPochiPhone);
    console.log('   Products:', products?.length || 0);

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
