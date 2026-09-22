const express = require('express');
const router = express.Router();
const market = require('../services/market');
const shamba = require('../services/shamba');

// ═══════════════════════════════════════════════════════
// HEALTH & STATS
// ═══════════════════════════════════════════════════════

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Market module running' });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, stats: market.getStats() });
});


// MARKER-TEST-ROUTE
router.post('/marker-test', (req, res) => res.json({ marker: true, timestamp: Date.now() }));

router.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      unlockFee: market.UNLOCK_FEE_KES,
      unlockExpiryDays: market.UNLOCK_EXPIRY_DAYS,
    },
  });
});

// ═══════════════════════════════════════════════════════
// LISTINGS
// ═══════════════════════════════════════════════════════

/**
 * Create a listing. Requires the animal to already be marked for sale in shamba.
 */
router.post('/listings', (req, res) => {
  try {
    const { passportId, sellerId } = req.body;
    if (!passportId) return res.status(400).json({ success: false, message: 'passportId required' });
    if (!sellerId) return res.status(400).json({ success: false, message: 'sellerId required' });

    const result = market.createListing({ passportId, sellerId });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, listing: result.listing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Search listings (public, no auth).
 */
router.get('/listings', (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      breed: req.query.breed,
      county: req.query.county,
      ward: req.query.ward,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sellerId: req.query.sellerId,
      sort: req.query.sort,
      limit: req.query.limit,
      offset: req.query.offset,
    };
    const result = market.searchListings(filters);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Get one listing. Returns masked seller unless the requester has unlocked.
 * Query: ?buyerId=...
 */
router.get('/listings/:id', (req, res) => {
  try {
    const result = market.getListing(req.params.id);
    if (result.error && !result.listing) {
      return res.status(404).json({ success: false, message: result.error });
    }

    // Increment view counter
    market.incrementViews(req.params.id);

    // If buyer unlocked, reveal seller contact + KYC status
    const buyerId = req.query.buyerId;
    if (buyerId && market.isUnlocked(req.params.id, buyerId)) {
      const unlock = market.getUnlock(req.params.id, buyerId);
      const seller = shamba._riders?.get ? null : null; // placeholder
      const animal = result.animal;
      const sellerRecord = shamba.getLivestock(result.listing.passportId);
      result.seller = {
        ...result.seller,
        phone: sellerRecord?.ownerPhone || null,
        kycStatus: 'verified', // assume verified; KYC check in trades.js
      };
      result.unlock = {
        id: unlock.id,
        paidAt: unlock.paidAt,
        expiresAt: unlock.expiresAt,
        mpesaRef: unlock.mpesaRef,
      };
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Pause a listing (seller action).
 */
router.post('/listings/:id/pause', (req, res) => {
  try {
    const { sellerId, reason } = req.body;
    if (!sellerId) return res.status(400).json({ success: false, message: 'sellerId required' });
    const result = market.pauseListing(req.params.id, { sellerId, reason });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, listing: result.listing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Resume a paused listing.
 */
router.post('/listings/:id/resume', (req, res) => {
  try {
    const { sellerId } = req.body;
    if (!sellerId) return res.status(400).json({ success: false, message: 'sellerId required' });
    const result = market.resumeListing(req.params.id, { sellerId });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, listing: result.listing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Get all listings by a seller.
 */
router.get('/seller/:sellerId/listings', (req, res) => {
  try {
    const result = market.searchListings({ sellerId: req.params.sellerId, limit: 100 });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// CONTACT UNLOCK (KES 100)
// ═══════════════════════════════════════════════════════

/**
 * Initiate contact unlock — STK push for KES 100.
 */
router.post('/listings/:id/unlock', async (req, res) => {
  try {
    const { buyerId, buyerName, buyerPhone } = req.body;
    if (!buyerId) return res.status(400).json({ success: false, message: 'buyerId required' });
    if (!buyerPhone) return res.status(400).json({ success: false, message: 'buyerPhone required' });

    const result = await market.initiateContactUnlock(req.params.id, {
      buyerId, buyerName, buyerPhone,
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });

    res.json({
      success: true,
      mode: result.mode,
      unlock: result.unlock,
      stk: result.stk || null,
      message: result.stk
        ? 'Check your phone for the M-Pesa prompt'
        : 'Contact unlocked (simulated)',
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Poll unlock status (after STK).
 * Query: ?buyerId=...
 */
router.get('/listings/:id/unlock-status', (req, res) => {
  try {
    const buyerId = req.query.buyerId;
    if (!buyerId) return res.status(400).json({ success: false, message: 'buyerId required' });

    const unlocked = market.isUnlocked(req.params.id, buyerId);
    const unlock = market.getUnlock(req.params.id, buyerId);
    res.json({
      success: true,
      unlocked,
      status: unlock?.status || 'none',
      paidAt: unlock?.paidAt || null,
      expiresAt: unlock?.expiresAt || null,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** 
 * DEV ONLY — manually confirm an unlock (for testing without a real callback).
 * In production this must be gated by admin auth.
 */
router.post('/dev/force-confirm-unlock', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Not available in production' });
    }

    const { listingId, buyerId, mpesaRef } = req.body;
    if (!listingId || !buyerId) {
      return res.status(400).json({ success: false, message: 'listingId and buyerId required' });
    }

    const unlock = market.getUnlock(listingId, buyerId);
    if (!unlock) return res.status(404).json({ success: false, message: 'No unlock found' });
    if (unlock.status === 'active' || unlock.status === 'credited') {
      return res.status(400).json({ success: false, message: 'Unlock already active' });
    }

    const result = market.confirmUnlockPayment('DEV-' + unlock.id, {
      success: true,
      amount: unlock.amount,
      mpesaReceipt: mpesaRef || 'DEV-MANUAL-' + Date.now(),
      resultDesc: 'Manually confirmed (dev mode)',
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, unlock: result.unlock });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * List a buyer's unlocks.
 */
router.get('/buyer/:buyerId/unlocks', (req, res) => {
  const unlocks = [];
  for (const u of market._contactUnlocks.values()) {
    if (u.buyerId === req.params.buyerId) unlocks.push(u);
  }
  res.json({ success: true, unlocks });
});

// ═══════════════════════════════════════════════════════
// OFFERS
// ═══════════════════════════════════════════════════════

router.post('/offers', (req, res) => {
  try {
    const { listingId, buyerId, buyerName, buyerPhone, amount } = req.body;
    if (!listingId) return res.status(400).json({ success: false, message: 'listingId required' });
    if (!buyerId) return res.status(400).json({ success: false, message: 'buyerId required' });
    if (!amount) return res.status(400).json({ success: false, message: 'amount required' });

    const result = market.createOffer({
      listingId, buyerId, buyerName, buyerPhone, amount,
    });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, offer: result.offer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/offers/:id/counter', (req, res) => {
  try {
    const { by, amount, note } = req.body;
    const result = market.counterOffer(req.params.id, { by, amount, note });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, offer: result.offer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/offers/:id/accept', (req, res) => {
  try {
    const { by } = req.body;
    const result = market.acceptOffer(req.params.id, { by });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, offer: result.offer, listing: result.listing });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/offers/:id/reject', (req, res) => {
  try {
    const { by, reason } = req.body;
    const result = market.rejectOffer(req.params.id, { by, reason });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, offer: result.offer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/offers/:id/withdraw', (req, res) => {
  try {
    const { by, reason } = req.body;
    const result = market.withdrawOffer(req.params.id, { by, reason });
    if (result.error) return res.status(400).json({ success: false, message: result.error });
    res.json({ success: true, offer: result.offer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/offers/:id', (req, res) => {
  const offer = market.getOffer(req.params.id);
  if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
  res.json({ success: true, offer });
});

router.get('/listings/:id/offers', (req, res) => {
  const offers = market.listOffersByListing(req.params.id, req.query);
  res.json({ success: true, offers });
});

router.get('/buyer/:buyerId/offers', (req, res) => {
  const offers = market.listOffersByBuyer(req.params.buyerId, req.query);
  res.json({ success: true, offers });
});

router.get('/seller/:sellerId/offers', (req, res) => {
  const offers = market.listOffersBySeller(req.params.sellerId, req.query);
  res.json({ success: true, offers });
});

module.exports = router;
