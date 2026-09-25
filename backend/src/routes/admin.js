// FILE: backend/src/routes/admin.js
// Admin review endpoints for manual exemption approval.
// Dev-mode: always accessible. Production: require X-Admin-Secret header.
const express = require('express');
const router = express.Router();
const shamba = require('../services/shamba');

function requireAdmin(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

/**
 * List slaughter requests awaiting exemption review (manual provider).
 */
router.get('/exemption/queue', requireAdmin, (req, res) => {
  const all = Array.from(shamba._slaughterRequests.values());
  const queue = all.filter(r =>
    r.isDonkey &&
    r.status === 'awaiting_exemption' &&
    r.exemption &&
    r.exemption.provider === 'manual' &&
    !r.exemption.approved
  );
  res.json({ success: true, count: queue.length, requests: queue });
});

/**
 * Approve a manual exemption.
 */
router.post('/exemption/:requestId/approve', requireAdmin, (req, res) => {
  try {
    const { adminId, notes } = req.body || {};
    const result = shamba.approveExemption(req.params.requestId, adminId, notes);
    if (!result.success) return res.status(400).json({ success: false, message: result.message });
    res.json({ success: true, request: result.request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Reject a manual exemption.
 */
router.post('/exemption/:requestId/reject', requireAdmin, (req, res) => {
  try {
    const { adminId, reason } = req.body || {};
    const result = shamba.rejectExemption(req.params.requestId, adminId, reason);
    if (!result.success) return res.status(400).json({ success: false, message: result.message });
    res.json({ success: true, request: result.request });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
