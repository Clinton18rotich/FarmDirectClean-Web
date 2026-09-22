const express = require('express');
const router = express.Router();
const storage = require('../services/storage');

const pochiPayments = storage.objectToMap(storage.load('pochi_payments', {}));

function persist() {
  storage.save('pochi_payments', storage.mapToObject(pochiPayments));
}

router.post('/record', (req, res) => {
  const { orderId, sellerPhone, amount, mpesaCode, buyerPhone } = req.body;
  
  if (!orderId || !mpesaCode || !amount) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  
  const payment = {
    orderId,
    sellerPhone,
    amount,
    mpesaCode,
    buyerPhone,
    status: 'recorded',
    recordedAt: new Date().toISOString()
  };
  
  pochiPayments.set(orderId, payment);
  persist();
  console.log('📱 Pochi payment recorded:', orderId, mpesaCode, 'KES', amount);
  
  res.json({ success: true, orderId, payment });
});

router.get('/order/:orderId', (req, res) => {
  const payment = pochiPayments.get(req.params.orderId);
  if (!payment) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, payment });
});

router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Pochi module running',
    payments: pochiPayments.size 
  });
});

module.exports = router;
