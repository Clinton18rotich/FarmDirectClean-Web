const express = require('express');
const router = express.Router();
const econfirm = require('../services/econfirm');
const revenue = require('../services/revenue');

const escrows = new Map();

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
    const { buyerEmail, sellerEmail, sellerPhone, amount, description, subtotal, deliveryFee } = req.body;

    // Calculate revenue breakdown BEFORE calling eConfirm
    const breakdown = revenue.calculateRevenue({ 
      subtotal: subtotal || amount,
      deliveryFee: deliveryFee || 0,
      total: amount 
    });

    const result = await econfirm.createEscrow({
      buyerEmail, sellerEmail, sellerPhone, amount, description
    });

    escrows.set(result.providerId, {
      ...result,
      buyerEmail, sellerEmail, sellerPhone, amount,
      breakdown,
      createdAt: new Date().toISOString()
    });

    // Log revenue
    revenue.logRevenue({
      orderId: 'ORD-' + Date.now().toString(36).toUpperCase(),
      escrowId: result.providerId,
      amount,
      breakdown
    });

    res.json({ 
      success: true, 
      escrow: result,
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
