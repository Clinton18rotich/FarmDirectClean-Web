const express = require('express');
const router = express.Router();
const econfirm = require('../services/econfirm');
const storage = require('../services/storage');
const revenue = require('../services/revenue');

const escrows = storage.objectToMap(storage.load('escrows', {}));

function persist() {
  storage.save('escrows', storage.mapToObject(escrows));
}

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Escrow module is running',
    provider: 'eConfirm',
    escrows: escrows.size,
    revenueLogged: revenue.revenueLog.length
  });
});

router.post('/create', async (req, res) => {
  try {
    const {
      buyerEmail, sellerEmail, sellerPhone, amount, description,
      subtotal, deliveryFee, orderId, paymentMethod
    } = req.body;

    const breakdown = revenue.calculateRevenue({
      subtotal: subtotal || amount,
      deliveryFee: deliveryFee || 0,
      total: amount
    });

    const result = await econfirm.createEscrow({
      buyerEmail, sellerEmail, sellerPhone, amount, description
    });

    const escrowRecord = {
      ...result,
      buyerEmail, sellerEmail, sellerPhone, amount,
      orderId: orderId || result.providerId,
      paymentMethod: paymentMethod || 'wallet',
      breakdown,
      createdAt: new Date().toISOString()
    };
    escrows.set(result.providerId, escrowRecord);
    persist();

    revenue.logRevenue({
      orderId: orderId || ('ORD-' + Date.now().toString(36).toUpperCase()),
      escrowId: result.providerId,
      amount,
      breakdown,
      paymentMethod: paymentMethod || 'wallet'
    });

    res.json({
      success: true,
      escrow: {
        ...result,
        orderId: orderId || result.providerId,
        paymentMethod: paymentMethod || 'wallet'
      },
      revenue: breakdown
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const status = await econfirm.getStatus(req.params.id);
    res.json({ success: true, escrow: status });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Lookup by account number (orderId) — for Paybill reconciliation
router.get('/lookup/:accountNumber', (req, res) => {
  const found = [...escrows.values()].find(
    e => e.orderId === req.params.accountNumber
  );
  if (!found) {
    return res.status(404).json({ success: false, message: 'Account number not found' });
  }
  res.json({ success: true, escrow: found });
});

router.post('/:id/release', async (req, res) => {
  try {
    const { notes } = req.body;
    const localEscrow = escrows.get(req.params.id);
    if (!localEscrow) {
      return res.status(404).json({ success: false, message: 'Escrow not found locally' });
    }
    const result = await econfirm.release(
      req.params.id, localEscrow.confirmationCode, notes
    );
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
