const express = require('express');
const router = express.Router();
const discount = require('../services/discount');

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

// ═══════════════════════════════════════════════════
// SELLER ENDPOINTS
// ═══════════════════════════════════════════════════

/**
 * Seller creates a discount request
 */
router.post('/request', (req, res) => {
  try {
    const { sellerId, sellerName, sellerPhone, currentRate, requestedRate, requestedDiscountPercent, reason, expectedMonthlyVolume } = req.body;

    if (!sellerId || !sellerPhone) {
      return res.status(400).json({ success: false, message: 'Seller ID and phone required' });
    }

    const result = discount.createRequest({
      sellerId,
      sellerName,
      sellerPhone: normalizeKenyaPhone(sellerPhone),
      currentRate: parseFloat(currentRate) || 7,
      requestedRate: parseFloat(requestedRate),
      requestedDiscountPercent: parseFloat(requestedDiscountPercent),
      reason,
      expectedMonthlyVolume: parseInt(expectedMonthlyVolume),
    });

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({ 
      success: true, 
      request: result,
      message: result.status === 'auto_approved' 
        ? '✅ Auto-approved! Your new rate is now active.' 
        : '📋 Request submitted. Admin will review within 24 hours.',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Seller checks their active discount
 */
router.get('/active/:sellerId', (req, res) => {
  const active = discount.getActiveDiscount(req.params.sellerId);
  res.json({ success: true, discount: active });
});

/**
 * Seller views their request history
 */
router.get('/my/:sellerId', (req, res) => {
  const myRequests = discount.listRequests({ sellerId: req.params.sellerId });
  res.json({ success: true, requests: myRequests });
});

// ═══════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════

/**
 * Admin views all requests
 */
router.get('/list', (req, res) => {
  res.json({
    success: true,
    requests: discount.listRequests({
      status: req.query.status,
      pendingOnly: req.query.pending === 'true',
    }),
  });
});

/**
 * Admin views stats
 */
router.get('/stats', (req, res) => {
  res.json({ success: true, stats: discount.getStats() });
});

/**
 * Admin views single request
 */
router.get('/:id', (req, res) => {
  const discountReq = discount.getRequest(req.params.id);
  if (!discountReq) return res.status(404).json({ success: false, message: 'Request not found' });
  res.json({ success: true, request: discountReq });
});

/**
 * Admin approves
 */
router.post('/:id/approve', (req, res) => {
  const { adminId, notes } = req.body;
  const result = discount.approveRequest(req.params.id, adminId, notes);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, request: result.request });
});

/**
 * Admin rejects
 */
router.post('/:id/reject', (req, res) => {
  const { adminId, reason } = req.body;
  const result = discount.rejectRequest(req.params.id, adminId, reason);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, request: result.request });
});

/**
 * Admin revokes an existing discount
 */
router.post('/:id/revoke', (req, res) => {
  const { adminId, reason } = req.body;
  const result = discount.revokeDiscount(req.params.id, adminId, reason);
  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.json({ success: true, request: result.request });
});

module.exports = router;
