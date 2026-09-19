const express = require('express');
const router = express.Router();
const revenue = require('../services/revenue');

// GET /api/business/revenue/summary
router.get('/revenue/summary', (req, res) => {
  const period = req.query.period || 'all';
  res.json({ success: true, summary: revenue.getSummary(period) });
});

// GET /api/business/revenue/log
router.get('/revenue/log', (req, res) => {
  res.json({ 
    success: true, 
    count: revenue.revenueLog.length,
    entries: revenue.revenueLog.slice(-50).reverse() 
  });
});

// POST /api/business/revenue/estimate
router.post('/revenue/estimate', (req, res) => {
  const { subtotal, deliveryFee } = req.body;
  const breakdown = revenue.calculateRevenue({ subtotal, deliveryFee });
  res.json({ success: true, breakdown });
});

module.exports = router;
