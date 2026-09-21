const express = require('express');
const router = express.Router();
const pricing = require('../services/pricing');

/**
 * GET /api/pricing/tiers
 * Show all commission tiers (transparency for farmers)
 */
router.get('/tiers', (req, res) => {
  res.json({
    success: true,
    tiers: pricing.getTiers(),
    escrowFee: {
      percent: pricing.ESCROW_FEE_PERCENT,
      minimum: 10,
      note: 'Held by eConfirm escrow provider',
    },
    notes: [
      'Fees are paid by the seller from proceeds by default',
      'Escrow fee covers buyer protection',
      'Larger transactions pay a slightly higher rate to fund platform growth',
    ],
  });
});

/**
 * POST /api/pricing/estimate
 * Calculate fees for a specific amount
 */
router.post('/estimate', (req, res) => {
  try {
    const { amount, payer, includeEscrow } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount required' });
    }

    const fees = pricing.calculateOrderFees(parseFloat(amount), {
      payer: payer || 'seller',
      includeEscrow: includeEscrow !== false,
    });

    res.json({ success: true, fees });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/pricing/cart
 * Calculate fees for a full cart
 */
router.post('/cart', (req, res) => {
  try {
    const { items, deliveryFee, payer } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items required' });
    }

    const fees = pricing.calculateCartFees(items, {
      deliveryFee: parseInt(deliveryFee) || 0,
      payer: payer || 'seller',
    });

    res.json({ success: true, fees });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/pricing/estimate/:amount
 * Simple seller estimate
 */
router.get('/estimate/:amount', (req, res) => {
  const amount = parseFloat(req.params.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount required' });
  }
  const estimate = pricing.estimateSellerEarnings(amount, req.query.payer);
  res.json({ success: true, estimate });
});

/**
 * GET /api/pricing/compare
 * Show what sellers earn at different price points
 */
router.get('/compare', (req, res) => {
  res.json({
    success: true,
    comparison: pricing.compareTiers(),
  });
});

module.exports = router;
