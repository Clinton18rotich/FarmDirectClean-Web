const express = require('express');
const router = express.Router();
const deliveryLegs = require('../services/deliveryLegs');

// Strip buyer-only fields (releaseCode) unless requester is the buyer.
// Same privacy pattern as 6.18 (meat traceability masking).
function sanitizeTradeForViewer(trade, viewerId) {
  if (!trade) return trade;
  const isBuyer = viewerId && trade.buyerId === viewerId;
  if (isBuyer) return trade;
  const safe = { ...trade };
  delete safe.releaseCode;
  delete safe.releaseCodeSentAt;
  delete safe.releaseCodeEnteredAt;
  delete safe.releaseCodeExpiresAt;
  delete safe.releaseCodeAttempts;
  // Also strip escrowConfirmationCode — internal only
  delete safe.escrowConfirmationCode;
  return safe;
}


const trades = require('../services/trades');

// ═══════════════════════════════════════════════════════
// HEALTH & STATS
// ═══════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Trades module running' });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: trades.getStats() });
});

// ═══════════════════════════════════════════════════════
// CREATE / FUND
// ═══════════════════════════════════════════════════════

/**
 * Create a trade from an accepted offer.
 * Body: { offerId, creatorId }
 */
router.post('/create', async (req, res) => {
  try {
    const { offerId, creatorId } = req.body;
    if (!offerId) return res.status(400).json({ success: false, message: 'offerId required' });
    if (!creatorId) return res.status(400).json({ success: false, message: 'creatorId required' });

    const result = await trades.createTrade({ offerId, creatorId });
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error, trade: result.trade || null });
    }
    res.json({ success: true, trade: result.trade });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Fund the escrow (buyer triggers STK for the goods value).
 * Body: { buyerPhone } (optional — defaults to buyerPhone on record)
 */
router.post('/:id/fund', async (req, res) => {
  try {
    const { buyerPhone } = req.body;
    const result = await trades.fundTrade(req.params.id, buyerPhone);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({
      success: true,
      mode: result.mode || 'simulated',
      trade: result.trade,
      stk: result.stk || null,
      message: result.stk
        ? 'Check your phone for the M-Pesa prompt'
        : 'Trade funded (simulated)',
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════

/**
 * Buyer enters release code + rider payment ref → releases escrow.
 * Body: { code, buyerId, riderPaymentRef }
 */
router.post('/:id/release', async (req, res) => {
  try {
    const { code, buyerId, riderPaymentRef } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'code required' });
    if (!buyerId) return res.status(400).json({ success: false, message: 'buyerId required' });

    const result = await trades.releaseTrade(req.params.id, { code, buyerId, riderPaymentRef });
    if (result.error) return res.status(400).json({ success: false, message: result.error, attempts: result.attempts });
    res.json({ success: true, trade: result.trade });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * File a dispute (buyer or seller).
 * Body: { filedBy, reason, claims, requestedResolution, requestedAmount, evidence }
 */
router.post('/:id/dispute', async (req, res) => {
  try {
    const { filedBy, reason, claims, requestedResolution, requestedAmount, evidence } = req.body;
    if (!filedBy) return res.status(400).json({ success: false, message: 'filedBy required' });

    const result = await trades.fileDispute(req.params.id, {
      filedBy, reason, claims, requestedResolution, requestedAmount, evidence,
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, trade: result.trade });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// RIDER HOOKS (called from delivery.js / webhook.js)
// ═══════════════════════════════════════════════════════

/**
 * Mark a rider as accepted for a trade.
 * Body: { riderId, riderName, riderPhone }
 */
router.post('/:id/rider-accepted', async (req, res) => {
  try {
    const { riderId, riderName, riderPhone } = req.body;
    if (!riderId) return res.status(400).json({ success: false, message: 'riderId required' });

    const result = await trades.onRiderAccepted(req.params.id, {
      id: riderId,
      rider: { fullName: riderName, phone: riderPhone },
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, trade: result.trade });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Mark delivery as complete.
 */
router.post('/:id/delivery-complete', async (req, res) => {
  try {
    const result = await trades.onDeliveryComplete(req.params.id);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, trade: result.trade });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Manually trigger rider matching (dev/testing).
 */
router.post('/:id/match-rider', async (req, res) => {
  try {
    const result = await trades.matchRiderForTrade(req.params.id);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DEV ONLY — skip rider and jump to awaiting_release
router.post('/:id/dev-skip-rider', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Not available in production' });
    }
    const result = await trades.devSkipRiderToRelease(req.params.id);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, trade: result.trade });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════

/**
 * Get a single trade.
 */
router.get('/:id', (req, res) => {
  const trade = trades.getTrade(req.params.id);
  if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
  res.json({ success: true, trade });
});

/**
 * List trades for a user.
 * Query: ?role=buyer|seller
 */
router.get('/user/:userId', (req, res) => {
  const list = trades.listTradesByUser(req.params.userId, req.query);
  const sanitized = (list || []).map(t => sanitizeTradeForViewer(t, req.params.userId));
  res.json({ success: true, trades: sanitized, total: sanitized.length });
});

/**
 * List trades for a rider.
 */
router.get('/rider/:riderId', (req, res) => {
  const list = trades.listTradesByRider(req.params.riderId);
  res.json({ success: true, trades: list, total: list.length });
});

/**
 * Session 4B — Multi-leg shipment tracking.
 * Legs = hops of the delivery (farm → office → bus → stage → buyer).
 * Anyone on the trade can add; the last-in-progress leg is the active one.
 */

/**
 * GET /api/trades/:id/legs — get full leg chain + config for UI.
 */
router.get('/:id/legs', (req, res) => {
  try {
    const trades = require('../services/trades');
    const trade = trades.getTrade(req.params.id);
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
    const result = deliveryLegs.getLegs(trade);
    res.json({
      success: true,
      legs: result.legs,
      currentLegIndex: result.currentLegIndex,
      overallStatus: result.overallStatus,
      config: deliveryLegs.getConfig(),
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/trades/:id/legs — add a new leg to the chain.
 * Body: { from: {county,ward,area,label}, to: {...}, method, carrier?, trackingCode?, notes? }
 *      byRole: 'seller' | 'buyer' | 'rider'
 */
router.post('/:id/legs', (req, res) => {
  try {
    const trades = require('../services/trades');
    const trade = trades.getTrade(req.params.id);
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
    const { from, to, method, carrier, trackingCode, notes, byRole } = req.body || {};
    const result = deliveryLegs.addLeg(trade, { from, to, method, carrier, trackingCode, notes }, byRole || 'seller');
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    trades._persist();
    res.json({ success: true, leg: result.leg, legs: result.legs, currentLegIndex: result.currentLegIndex });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/trades/:id/legs/:legId — update status.
 * Body: { status: 'in_transit' | 'arrived' | 'failed', notes?, byRole? }
 */
router.patch('/:id/legs/:legId', (req, res) => {
  try {
    const trades = require('../services/trades');
    const trade = trades.getTrade(req.params.id);
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
    const { status, notes, byRole } = req.body || {};
    if (!status) return res.status(400).json({ success: false, message: 'status required' });
    const result = deliveryLegs.updateLegStatus(trade, req.params.legId, { status, notes, byRole });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    trades._persist();
    res.json({ success: true, leg: result.leg, legs: result.legs, currentLegIndex: result.currentLegIndex });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/trades/:id/legs/:legId — remove a pending leg.
 * Body: { byRole }
 */
router.delete('/:id/legs/:legId', (req, res) => {
  try {
    const trades = require('../services/trades');
    const trade = trades.getTrade(req.params.id);
    if (!trade) return res.status(404).json({ success: false, message: 'Trade not found' });
    const byRole = (req.body && req.body.byRole) || req.query.byRole || null;
    const result = deliveryLegs.removeLeg(trade, req.params.legId, byRole);
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    trades._persist();
    res.json({ success: true, legs: result.legs, currentLegIndex: result.currentLegIndex });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
