const express = require('express');
const router = express.Router();
const delivery = require('../services/delivery');
const matching = require('../services/matching');
const sms = require('../services/sms');

// Import riders from rider route (shared in-memory store)
// For now, we'll re-query via a shared export
const riderRoute = require('./rider');

/**
 * POST /api/delivery/create
 * Create a new delivery order (called from Checkout after escrow)
 */
router.post('/create', async (req, res) => {
  try {
    const { 
      buyerId, buyerName, buyerPhone,
      farmerId, farmerName, farmerPhone,
      pickup, dropoff,
      items, weight, deliveryFee, escrowId,
    } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({ success: false, message: 'Pickup and dropoff required' });
    }
    if (!buyerPhone || !farmerPhone) {
      return res.status(400).json({ success: false, message: 'Buyer and farmer phones required' });
    }

    const order = delivery.createDelivery({
      buyerId, buyerName, buyerPhone,
      farmerId, farmerName, farmerPhone,
      pickup, dropoff,
      items, weight, deliveryFee, escrowId,
    });

    // Immediately try to find a rider
    const allRiders = [...riderRoute._riders.values()];
    const eligible = matching.findEligibleRiders(order, allRiders);

    if (eligible.length > 0) {
      // Offer to first rider
      await delivery.offerToRider(order.id, eligible[0]);
      console.log('📨 Offered to', eligible[0].rider.fullName, '|', eligible.length, 'riders eligible');
    } else {
      console.log('⚠️  No eligible riders found for', order.id);
      delivery.updateStatus(order.id, delivery.STATUS.PENDING, 'No riders available, will retry');
    }

    res.json({
      success: true,
      delivery: order,
      eligibleRiders: eligible.length,
    });
  } catch (error) {
    console.error('❌ Delivery create error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/delivery/:id
 */
router.get('/:id', (req, res) => {
  const d = delivery.getDelivery(req.params.id);
  if (!d) return res.status(404).json({ success: false, message: 'Delivery not found' });
  res.json({ success: true, delivery: d });
});

/**
 * GET /api/delivery/list
 */
router.get('/list', (req, res) => {
  const list = delivery.listDeliveries({
    status: req.query.status,
    riderId: req.query.riderId,
    buyerId: req.query.buyerId,
    farmerId: req.query.farmerId,
  });
  res.json({ success: true, deliveries: list });
});

/**
 * GET /api/delivery/stats
 */
router.get('/stats', (req, res) => {
  res.json({ success: true, stats: delivery.getStats() });
});

/**
 * POST /api/delivery/:id/rider-reply
 * Simulates rider SMS reply (for testing)
 */
router.post('/:id/rider-reply', async (req, res) => {
  try {
    const { riderId, response } = req.body;
    if (!riderId || !response) {
      return res.status(400).json({ success: false, message: 'riderId and response required' });
    }
    const result = await delivery.handleRiderReply(riderId, req.params.id, response);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/delivery/:id/status
 * Update delivery status (for rider dashboard)
 */
router.post('/:id/status', (req, res) => {
  const { status, note } = req.body;
  const d = delivery.updateStatus(req.params.id, status, note);
  if (!d) return res.status(404).json({ success: false, message: 'Delivery not found' });
  res.json({ success: true, delivery: d });
});

module.exports = router;
module.exports._deliveries = delivery._deliveries;
