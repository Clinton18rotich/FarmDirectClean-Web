const express = require('express');
const router = express.Router();
const meatHandler = require('../services/meatHandler');
const shamba = require('../services/shamba');

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

// ═════════════════════════════════════════════════════
// HANDLER REGISTRATION
// ═════════════════════════════════════════════════════

router.post('/register', (req, res) => {
  try {
    const { businessName, type, ownerName, ownerPhone, ownerEmail, location, licenseNumber, payment } = req.body;

    if (!businessName || !ownerName || !ownerPhone) {
      return res.status(400).json({ success: false, message: 'Business name, owner, and phone required' });
    }
    if (!location) return res.status(400).json({ success: false, message: 'Location required' });
    if (!licenseNumber) return res.status(400).json({ success: false, message: 'Business license required' });
    if (type && !meatHandler.HANDLER_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid handler type. Must be one of: ' + meatHandler.HANDLER_TYPES.join(', ') });
    }

    const handler = meatHandler.registerHandler({
      businessName,
      type: type || 'butchery',
      ownerName,
      ownerPhone: normalizeKenyaPhone(ownerPhone),
      ownerEmail,
      location,
      licenseNumber,
      payment,
    });

    res.json({ success: true, handler });
  } catch (error) {
    console.error('❌ Handler register:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/list', (req, res) => {
  res.json({
    success: true,
    handlers: meatHandler.listHandlers({
      status: req.query.status,
      type: req.query.type,
      county: req.query.county,
    }),
  });
});

router.get('/types', (req, res) => {
  res.json({ success: true, types: meatHandler.HANDLER_TYPES });
});

router.get('/:id', (req, res) => {
  const handler = meatHandler.getHandler(req.params.id);
  if (!handler) return res.status(404).json({ success: false, message: 'Handler not found' });
  res.json({ success: true, handler });
});

router.post('/:id/verify', (req, res) => {
  const { verifiedBy } = req.body;
  const handler = meatHandler.verifyHandler(req.params.id, verifiedBy || 'admin');
  if (!handler) return res.status(404).json({ success: false, message: 'Handler not found' });
  res.json({ success: true, handler });
});

// ═════════════════════════════════════════════════════
// MEAT CHAIN ACTIONS
// ═════════════════════════════════════════════════════

/**
 * Handler receives meat
 */
router.post('/meat/receive', (req, res) => {
  try {
    const { token, handlerId, notes } = req.body;
    if (!token || !handlerId) {
      return res.status(400).json({ success: false, message: 'Token and handlerId required' });
    }

    const handler = meatHandler.getHandler(handlerId);
    if (!handler) return res.status(404).json({ success: false, message: 'Handler not found' });
    if (handler.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Handler not yet verified (status: ' + handler.status + ')' });
    }

    const result = shamba.receiveMeatAtHandler(token, handler, notes);
    if (!result.success) return res.status(400).json(result);

    // Update handler stats
    meatHandler.updateHandlerStats(handlerId, {
      totalReceived: (handler.totalReceived || 0) + 1,
    });

    res.json({ success: true, meat: result.meat, message: 'Meat received at ' + handler.businessName });
  } catch (error) {
    console.error('❌ Receive meat:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Handler sells meat to consumer
 */
router.post('/meat/sell', (req, res) => {
  try {
    const { token, handlerId, notes } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const result = shamba.sellMeat(token, { notes });
    if (!result.success) return res.status(400).json(result);

    // Update handler stats
    if (handlerId) {
      const handler = meatHandler.getHandler(handlerId);
      if (handler) {
        meatHandler.updateHandlerStats(handlerId, {
          totalSold: (handler.totalSold || 0) + 1,
        });
      }
    }

    res.json({ success: true, meat: result.meat, message: 'Meat marked as sold' });
  } catch (error) {
    console.error('❌ Sell meat:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Handler returns meat to slaughterhouse
 */
router.post('/meat/return', (req, res) => {
  try {
    const { token, handlerId, reason } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });

    const result = shamba.returnMeat(token, reason);
    if (!result.success) return res.status(400).json(result);

    if (handlerId) {
      const handler = meatHandler.getHandler(handlerId);
      if (handler) {
        meatHandler.updateHandlerStats(handlerId, {
          totalReturned: (handler.totalReturned || 0) + 1,
        });
      }
    }

    res.json({ success: true, meat: result.meat, message: 'Meat returned' });
  } catch (error) {
    console.error('❌ Return meat:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Get full meat chain (public — for consumers)
 */
router.get('/meat/chain/:token', (req, res) => {
  const chain = shamba.getMeatChain(req.params.token);
  if (!chain) return res.status(404).json({ success: false, message: 'Meat token not found' });
  res.json({ success: true, chain });
});

/**
 * Get all meat received by a handler
 */
router.get('/:id/received', (req, res) => {
  const handler = meatHandler.getHandler(req.params.id);
  if (!handler) return res.status(404).json({ success: false, message: 'Handler not found' });

  const allMeat = [...shamba._meatTokens.values()];
  const received = allMeat.filter(m => m.currentHolderId === req.params.id);
  const chainHistory = allMeat.filter(m =>
    m.chain && m.chain.some(c => c.id === req.params.id)
  );

  res.json({ success: true, received, chainHistory });
});

/**
 * Get all meat sold by a handler
 */
router.get('/:id/sold', (req, res) => {
  const handler = meatHandler.getHandler(req.params.id);
  if (!handler) return res.status(404).json({ success: false, message: 'Handler not found' });

  const allMeat = [...shamba._meatTokens.values()];
  const sold = allMeat.filter(m =>
    m.soldBy === handler.businessName
  );

  res.json({ success: true, sold });
});

module.exports = router;
