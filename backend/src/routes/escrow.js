/**
 * DEPRECATED — use /api/trades instead.
 *
 * The escrow flow is now orchestrated by trades.js, which handles:
 * - Escrow creation tied to a market offer
 * - Buyer funding via STK
 * - Release after delivery confirmation
 * - Ownership transfer + listing mark-sold
 *
 * This route is kept for backward compatibility and returns 410 Gone
 * with a redirect hint.
 */
const express = require('express');
const router = express.Router();

// Express 5: use middleware without a path pattern instead of router.all('*')
router.use((req, res) => {
  res.status(410).json({
    success: false,
    message: 'Gone — use /api/trades instead',
    migratedTo: '/api/trades',
    note: 'The escrow flow is now managed by the trades service.',
  });
});

module.exports = router;
