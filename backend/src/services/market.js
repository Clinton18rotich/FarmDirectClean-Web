/**
 * Market Service — the listings and offers layer
 *
 * A listing is a view over a livestock passport (shamba.js).
 * The animal lives in shamba; the market layer only knows:
 *   - it's for sale
 *   - at what price
 *   - who's offering
 *   - who unlocked contact
 *
 * The animal data is fetched LIVE from shamba on every read, so
 * a stolen animal reported after listing immediately suspends it.
 *
 * Three storages:
 *   listings        — commercial view over a shamba passport
 *   offers          — buyer-seller negotiation records
 *   contactUnlocks  — KES 100 payments from buyers to see seller contact
 *
 * Offers require a prior contact unlock.
 */

const storage = require('./storage');
const shamba = require('./shamba');
const mpesa = require('./mpesa');

const listings = storage.objectToMap(storage.load('market_listings', {}));
const offers = storage.objectToMap(storage.load('market_offers', {}));
const contactUnlocks = storage.objectToMap(storage.load('market_contact_unlocks', {}));

function persist() {
  storage.save('market_listings', storage.mapToObject(listings));
  storage.save('market_offers', storage.mapToObject(offers));
  storage.save('market_contact_unlocks', storage.mapToObject(contactUnlocks));
}

function generateId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 5).toUpperCase();
}

const UNLOCK_FEE_KES = 100;
const UNLOCK_EXPIRY_DAYS = 30;

// ═══════════════════════════════════════════════════════════
// LISTINGS
// ═══════════════════════════════════════════════════════════

/**
 * Create a listing for a shamba passport.
 * The animal must already be marked "for sale" in shamba.
 */
function createListing({ passportId, sellerId }) {
  const animal = shamba.getLivestock(passportId);
  if (!animal) return { error: 'Animal not found' };
  if (animal.ownerId !== sellerId) return { error: 'Not the owner' };

  // Prevent duplicate active listing for the same passport
  for (const existing of listings.values()) {
    if (existing.passportId === passportId &&
        existing.sellerId === sellerId &&
        existing.status === 'active') {
      return { error: 'This animal is already listed for sale' };
    }
  }
  if (!animal.forSale || animal.forSale.status !== 'active') {
    return { error: 'Animal is not marked for sale in shamba' };
  }

  // Already listed?
  if (animal.forSale.listingId && listings.has(animal.forSale.listingId)) {
    const existing = listings.get(animal.forSale.listingId);
    if (existing.status === 'active' || existing.status === 'pending_sale') {
      return { error: 'Listing already exists', listing: existing };
    }
  }

  const id = generateId('LIST');
  const now = new Date().toISOString();

  const listing = {
    id,
    passportId,
    sellerId: animal.ownerId,
    sellerName: animal.ownerName,
    sellerPhone: animal.ownerPhone,
    askingPrice: Number(animal.forSale.askingPrice),
    negotiable: animal.forSale.negotiable !== false,
    listedAt: now,
    status: 'active',                 // active | pending_sale | sold | paused
    acceptedOfferId: null,
    offerIds: [],
    views: 0,
    // Preview snapshot for fast search — never authoritative
    preview: {
      photoUrl: animal.photoUrl,
      type: animal.type,
      breed: animal.breed,
      county: animal.location?.county || null,
      ward: animal.location?.ward || null,
    },
    createdAt: now,
    updatedAt: now,
  };

  listings.set(id, listing);

  // Link back in shamba
  animal.forSale.listingId = id;
  shamba._persist && shamba._persist();

  persist();
  console.log('📋 Listing created:', id, '|', passportId, '| KES', listing.askingPrice);
  return { listing };
}

/**
 * Get a listing with LIVE animal data from shamba.
 * Suspends the listing if the animal is reported stolen.
 */
function getListing(id) {
  const listing = listings.get(id);
  if (!listing) return { error: 'Listing not found' };

  const animal = shamba.getLivestock(listing.passportId);
  if (!animal) {
    return { error: 'Animal no longer exists', listing };
  }

  // Auto-suspend stolen
  if (animal.isReportedStolen && listing.status === 'active') {
    listing.status = 'paused';
    listing.pausedAt = new Date().toISOString();
    listing.pausedReason = 'Animal reported stolen';
    persist();
    console.warn('🚨 Listing auto-suspended (stolen):', id);
  }

  // Health events for this animal (buyer-visible trust signals)
  let healthEvents = [];
  let healthSummary = null;
  try {
    const healthEventsSvc = require('./healthEvents');
    const list = healthEventsSvc.listHealthEvents(listing.passportId);
    healthEvents = list.events || [];
    const vetVerified = healthEvents.filter(e => e.tier === 'vet_verified').length;
    healthSummary = {
      total: healthEvents.length,
      vetVerified,
      selfOrCommunity: healthEvents.length - vetVerified,
      lastEvent: healthEvents[0] || null,
    };
  } catch (e) {
    console.warn('healthEvents lookup failed:', e.message);
  }

  // Build the full response: listing + live animal + seller info (masked)
  return {
    listing: {
      id: listing.id,
      passportId: listing.passportId,
      askingPrice: listing.askingPrice,
      negotiable: listing.negotiable,
      listedAt: listing.listedAt,
      status: listing.status,
      views: listing.views,
      offerCount: listing.offerIds.length,
    },
    healthEvents,
    healthSummary,
    animal: {
      passportId: animal.passportId,
      type: animal.type,
      breed: animal.breed,
      age: animal.age,
      gender: animal.gender,
      color: animal.color,
      health: animal.health,
      photoUrl: animal.photoUrl,
      photos: animal.photos || [],
      location: animal.location,
      vaccinations: animal.vaccinations || [],
      ownershipHistory: animal.ownershipHistory || [],
      isReportedStolen: animal.isReportedStolen || false,
      registeredAt: animal.registeredAt,
      recordHash: animal.recordHash,
    },
    seller: {
      id: listing.sellerId,
      name: listing.sellerName,
      phone: null,        // hidden until unlock
      kycStatus: null,    // resolved by caller (routes layer) if needed
    },
  };
}

/**
 * Increment view count for a listing.
 */
function incrementViews(id) {
  const listing = listings.get(id);
  if (!listing) return;
  listing.views = (listing.views || 0) + 1;
  persist();
}

/**
 * Search listings with filters.
 * Returns listing previews + minimal animal data (no seller contact).
 */
function searchListings(filter = {}) {
  const out = [];

  for (const listing of listings.values()) {
    if (listing.status !== 'active') continue;

    // Skip if animal became stolen
    const animal = shamba.getLivestock(listing.passportId);
    if (!animal || animal.isReportedStolen || animal.status !== 'alive') continue;
    if (!animal.forSale || animal.forSale.status !== 'active') continue;

    // Filters
    if (filter.type && animal.type !== filter.type) continue;
    if (filter.breed && animal.breed !== filter.breed) continue;
    if (filter.county && animal.location?.county !== filter.county) continue;
    if (filter.ward && animal.location?.ward !== filter.ward) continue;
    if (filter.minPrice && listing.askingPrice < Number(filter.minPrice)) continue;
    if (filter.maxPrice && listing.askingPrice > Number(filter.maxPrice)) continue;
    if (filter.sellerId && listing.sellerId !== filter.sellerId) continue;

    let healthCount = 0;
    let vetVerifiedCount = 0;
    try {
      const healthEventsSvc = require('./healthEvents');
      const events = healthEventsSvc.listHealthEvents(listing.passportId).events || [];
      healthCount = events.length;
      vetVerifiedCount = events.filter(e => e.tier === 'vet_verified').length;
    } catch (e) { /* silent */ }

    out.push({
      id: listing.id,
      passportId: listing.passportId,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      status: listing.status,
      healthCount,
      vetVerifiedCount,
      askingPrice: listing.askingPrice,
      negotiable: listing.negotiable,
      listedAt: listing.listedAt,
      views: listing.views,
      preview: listing.preview,
      // Fresh animal basics
      type: animal.type,
      breed: animal.breed,
      age: animal.age,
      gender: animal.gender,
      health: animal.health,
      photoUrl: animal.photoUrl,
      location: animal.location,
    });
  }

  // Sort: newest first by default
  out.sort((a, b) => new Date(b.listedAt) - new Date(a.listedAt));

  // Optional sort overrides
  if (filter.sort === 'price_asc') out.sort((a, b) => a.askingPrice - b.askingPrice);
  if (filter.sort === 'price_desc') out.sort((a, b) => b.askingPrice - a.askingPrice);

  const limit = Math.min(Number(filter.limit) || 30, 100);
  const offset = Number(filter.offset) || 0;

  return { total: out.length, limit, offset, items: out.slice(offset, offset + limit) };
}

/**
 * Pause a listing (seller action).
 */
function pauseListing(listingId, { sellerId, reason }) {
  const listing = listings.get(listingId);
  if (!listing) return { error: 'Listing not found' };
  if (listing.sellerId !== sellerId) return { error: 'Not the seller' };
  if (listing.status === 'sold') return { error: 'Already sold' };

  listing.status = 'paused';
  listing.pausedAt = new Date().toISOString();
  listing.pausedReason = reason || 'Paused by seller';
  listing.updatedAt = listing.pausedAt;

  // Also pause in shamba
  shamba.withdrawFromSale(listing.passportId, { ownerId: sellerId, reason: 'Listing paused' });

  persist();
  return { listing };
}

/**
 * Resume a paused listing (seller action).
 */
function resumeListing(listingId, { sellerId }) {
  const listing = listings.get(listingId);
  if (!listing) return { error: 'Listing not found' };
  if (listing.sellerId !== sellerId) return { error: 'Not the seller' };
  if (listing.status !== 'paused') return { error: 'Listing is not paused' };

  // Re-check animal state
  const animal = shamba.getLivestock(listing.passportId);
  if (!animal || animal.isReportedStolen || animal.status !== 'alive') {
    return { error: 'Animal cannot be re-listed' };
  }

  listing.status = 'active';
  listing.resumedAt = new Date().toISOString();
  listing.updatedAt = listing.resumedAt;

  // Re-mark for sale in shamba if needed
  if (!animal.forSale || animal.forSale.status !== 'active') {
    shamba.markForSale(listing.passportId, {
      ownerId: sellerId,
      askingPrice: listing.askingPrice,
      negotiable: listing.negotiable,
    });
  }

  persist();
  return { listing };
}

/**
 * Mark listing as sold — called by trades.js after a completed trade.
 */
function markListingSold(listingId, { buyerId, tradeId }) {
  const listing = listings.get(listingId);
  if (!listing) return { error: 'Listing not found' };

  listing.status = 'sold';
  listing.soldAt = new Date().toISOString();
  listing.soldToBuyerId = buyerId;
  listing.tradeId = tradeId;
  listing.updatedAt = listing.soldAt;

  persist();
  return { listing };
}

// ═══════════════════════════════════════════════════════════
// CONTACT UNLOCKS (KES 100)
// ═══════════════════════════════════════════════════════════

function unlockKey(listingId, buyerId) {
  return listingId + '::' + buyerId;
}

/**
 * Check whether a buyer has unlocked a listing.
 */
function isUnlocked(listingId, buyerId) {
  const unlock = contactUnlocks.get(unlockKey(listingId, buyerId));
  if (!unlock) return false;
  if (unlock.status === 'expired') return false;
  if (unlock.status === 'credited') return true;
  if (unlock.status === 'active') {
    if (new Date(unlock.expiresAt) < new Date()) {
      unlock.status = 'expired';
      persist();
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Initiate a contact unlock — STK push for KES 100.
 */
async function initiateContactUnlock(listingId, { buyerId, buyerName, buyerPhone }) {
  const listing = listings.get(listingId);
  if (!listing) return { error: 'Listing not found' };
  if (listing.status !== 'active') return { error: 'Listing is not active' };

  const key = unlockKey(listingId, buyerId);
  const existing = contactUnlocks.get(key);
  if (existing && isUnlocked(listingId, buyerId)) {
    return { error: 'Already unlocked', unlock: existing };
  }

  const id = generateId('UNLK');
  const now = new Date().toISOString();

  const unlock = {
    id,
    listingId,
    passportId: listing.passportId,
    sellerId: listing.sellerId,
    buyerId,
    buyerName: buyerName || null,
    buyerPhone,
    amount: UNLOCK_FEE_KES,
    paidAt: null,
    mpesaRef: null,
    status: 'pending',              // pending | active | credited | expired
    expiresAt: null,                // set on payment
    creditedToTradeId: null,
    checkoutRequestId: null,
    stkInitiatedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  // Simulated mode
  if (!mpesa.isConfigured()) {
    console.log('⚠️  M-Pesa not configured — simulating contact unlock');
    unlock.status = 'active';
    unlock.paidAt = now;
    unlock.mpesaRef = 'SIMULATED-' + Date.now();
    unlock.expiresAt = new Date(Date.now() + UNLOCK_EXPIRY_DAYS * 86400000).toISOString();

    contactUnlocks.set(key, unlock);
    persist();
    return { unlock, stk: null, mode: 'not_configured' };
  }

  // Real STK
  try {
    const result = await mpesa.stkPush({
      phone: buyerPhone,
      amount: UNLOCK_FEE_KES,
      accountRef: 'UNLOCK-' + id,
      description: 'FarmDirect contact unlock',
    });

    unlock.checkoutRequestId = result.CheckoutRequestID;
    unlock.stkInitiatedAt = now;
    unlock.status = 'awaiting_payment';
    contactUnlocks.set(key, unlock);
    persist();

    return {
      unlock,
      stk: {
        checkoutRequestId: result.CheckoutRequestID,
        customerMessage: result.CustomerMessage,
      },
      mode: mpesa.getMode(),
    };
  } catch (err) {
    return { error: 'Failed to send M-Pesa prompt: ' + err.message };
  }
}

/**
 * Confirm unlock payment — called from webhook on M-Pesa callback.
 * Matches by checkoutRequestId.
 */
function confirmUnlockPayment(checkoutRequestId, callbackData) {
  let matched = null;

  // Match by real Safaricom checkoutRequestId
  for (const unlock of contactUnlocks.values()) {
    if (unlock.checkoutRequestId === checkoutRequestId &&
        (unlock.status === 'awaiting_payment' || unlock.status === 'pending')) {
      matched = unlock;
      break;
    }
  }

  // Fallback: match by 'DEV-<unlockId>' (for force-confirm in dev mode)
  if (!matched && checkoutRequestId.startsWith('DEV-')) {
    const targetId = checkoutRequestId.slice(4);
    for (const unlock of contactUnlocks.values()) {
      if (unlock.id === targetId &&
          (unlock.status === 'awaiting_payment' || unlock.status === 'pending')) {
        matched = unlock;
        break;
      }
    }
  }

  if (!matched) return { error: 'No matching unlock' };

  if (!callbackData.success) {
    matched.status = 'failed';
    matched.failureReason = callbackData.resultDesc;
    persist();
    return { unlock: matched };
  }

  matched.status = 'active';
  matched.paidAt = new Date().toISOString();
  matched.mpesaRef = callbackData.mpesaReceipt;
  matched.expiresAt = new Date(Date.now() + UNLOCK_EXPIRY_DAYS * 86400000).toISOString();
  matched.updatedAt = matched.paidAt;
  persist();

  console.log('🔓 Contact unlocked:', matched.id, '|', matched.buyerId, '→', matched.listingId);
  return { unlock: matched };
}

/**
 * List unlocks that are pending (for the reconciliation cron).
 */
function listAwaitingPayment() {
  const out = [];
  for (const unlock of contactUnlocks.values()) {
    if (unlock.status === 'awaiting_payment' && unlock.checkoutRequestId) {
      out.push(unlock);
    }
  }
  return out;
}

/**
 * Get a buyer's unlock for a listing (used when creating trades).
 */
function getUnlock(listingId, buyerId) {
  return contactUnlocks.get(unlockKey(listingId, buyerId)) || null;
}

/**
 * Mark unlock as credited to a trade (KES 100 counts toward platform fee).
 */
function creditUnlockToTrade(listingId, buyerId, tradeId) {
  const unlock = getUnlock(listingId, buyerId);
  if (!unlock) return { error: 'No unlock found' };
  unlock.status = 'credited';
  unlock.creditedToTradeId = tradeId;
  unlock.creditedAt = new Date().toISOString();
  persist();
  return { unlock };
}

// ═══════════════════════════════════════════════════════════
// OFFERS
// ═══════════════════════════════════════════════════════════

/**
 * Create an offer. Requires contact unlock.
 */
function createOffer({ listingId, buyerId, buyerName, buyerPhone, amount }) {
  const listing = listings.get(listingId);
  if (!listing) return { error: 'Listing not found' };
  if (listing.status !== 'active') return { error: 'Listing is not active' };

  if (!isUnlocked(listingId, buyerId)) {
    return { error: 'Contact unlock required before making an offer' };
  }

  const amt = Number(amount);
  if (!amt || amt <= 0) return { error: 'Valid amount required' };

  const id = generateId('OFF');
  const now = new Date().toISOString();

  const offer = {
    id,
    listingId,
    passportId: listing.passportId,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    buyerId,
    buyerName: buyerName || null,
    buyerPhone: buyerPhone || null,
    amount: amt,
    status: 'pending',                   // pending | countered | accepted | rejected | withdrawn
    currentTurn: 'seller',               // whose turn to respond
    history: [
      { amount: amt, by: buyerId, role: 'buyer', at: now, note: 'Initial offer' },
    ],
    createdAt: now,
    updatedAt: now,
  };

  offers.set(id, offer);
  listing.offerIds.push(id);
  listing.updatedAt = now;
  persist();

  console.log('💰 Offer created:', id, '|', listingId, '| KES', amt, 'from', buyerId);
  return { offer };
}

/**
 * Counter an offer — flips currentTurn.
 */
function counterOffer(offerId, { by, amount, note }) {
  const offer = offers.get(offerId);
  if (!offer) return { error: 'Offer not found' };
  if (offer.status === 'accepted' || offer.status === 'rejected' || offer.status === 'withdrawn') {
    return { error: 'Offer is ' + offer.status };
  }

  const isSeller = by === offer.sellerId;
  const isBuyer = by === offer.buyerId;
  if (!isSeller && !isBuyer) return { error: 'Not a party to this offer' };

  // Verify it's their turn
  if (offer.currentTurn === 'seller' && !isSeller) return { error: 'Waiting for seller' };
  if (offer.currentTurn === 'buyer' && !isBuyer) return { error: 'Waiting for buyer' };

  const amt = Number(amount);
  if (!amt || amt <= 0) return { error: 'Valid amount required' };

  const now = new Date().toISOString();
  offer.amount = amt;
  offer.status = 'countered';
  offer.currentTurn = isSeller ? 'buyer' : 'seller';
  offer.history.push({
    amount: amt,
    by,
    role: isSeller ? 'seller' : 'buyer',
    at: now,
    note: note || (isSeller ? 'Seller counter' : 'Buyer counter'),
  });
  offer.updatedAt = now;
  persist();

  return { offer };
}

/**
 * Accept an offer — locks the listing to pending_sale.
 */
function acceptOffer(offerId, { by }) {
  const offer = offers.get(offerId);
  if (!offer) return { error: 'Offer not found' };
  if (offer.status === 'accepted') return { error: 'Already accepted' };
  if (offer.status === 'rejected' || offer.status === 'withdrawn') {
    return { error: 'Offer is ' + offer.status };
  }

  const listing = listings.get(offer.listingId);
  if (!listing) return { error: 'Listing not found' };
  if (listing.status !== 'active') return { error: 'Listing is not active' };

  const isSeller = by === offer.sellerId;
  const isBuyer = by === offer.buyerId;
  if (!isSeller && !isBuyer) return { error: 'Not a party to this offer' };

  // Whose turn?
  if (offer.currentTurn === 'seller' && !isSeller) return { error: 'Waiting for seller' };
  if (offer.currentTurn === 'buyer' && !isBuyer) return { error: 'Waiting for buyer' };

  const now = new Date().toISOString();

  // Accept this offer
  offer.status = 'accepted';
  offer.acceptedAt = now;
  offer.acceptedBy = by;
  offer.history.push({
    amount: offer.amount,
    by,
    role: isSeller ? 'seller' : 'buyer',
    at: now,
    note: 'Accepted',
  });
  offer.updatedAt = now;

  // Lock the listing
  listing.status = 'pending_sale';
  listing.acceptedOfferId = offerId;
  listing.updatedAt = now;

  // Expire other offers for this listing
  for (const otherId of listing.offerIds) {
    if (otherId === offerId) continue;
    const other = offers.get(otherId);
    if (other && (other.status === 'pending' || other.status === 'countered')) {
      other.status = 'rejected';
      other.rejectedAt = now;
      other.rejectionReason = 'Another offer was accepted';
      other.history.push({
        amount: other.amount,
        by: 'system',
        role: 'system',
        at: now,
        note: 'Auto-rejected: another offer was accepted',
      });
      other.updatedAt = now;
    }
  }

  persist();
  console.log('✅ Offer accepted:', offerId, '|', listing.id, '→ pending_sale');
  return { offer, listing };
}

function rejectOffer(offerId, { by, reason }) {
  const offer = offers.get(offerId);
  if (!offer) return { error: 'Offer not found' };
  if (offer.status === 'accepted') return { error: 'Cannot reject an accepted offer' };
  if (offer.status === 'rejected' || offer.status === 'withdrawn') {
    return { error: 'Offer is already ' + offer.status };
  }

  const isSeller = by === offer.sellerId;
  const isBuyer = by === offer.buyerId;
  if (!isSeller && !isBuyer) return { error: 'Not a party to this offer' };

  const now = new Date().toISOString();
  offer.status = 'rejected';
  offer.rejectedAt = now;
  offer.rejectedBy = by;
  offer.rejectionReason = reason || 'Rejected';
  offer.history.push({
    amount: offer.amount,
    by,
    role: isSeller ? 'seller' : 'buyer',
    at: now,
    note: reason || 'Rejected',
  });
  offer.updatedAt = now;
  persist();

  return { offer };
}

function withdrawOffer(offerId, { by, reason }) {
  const offer = offers.get(offerId);
  if (!offer) return { error: 'Offer not found' };
  if (offer.status === 'accepted') return { error: 'Cannot withdraw an accepted offer' };

  if (by !== offer.buyerId && by !== offer.sellerId) {
    return { error: 'Not a party to this offer' };
  }

  const now = new Date().toISOString();
  offer.status = 'withdrawn';
  offer.withdrawnAt = now;
  offer.withdrawnBy = by;
  offer.withdrawalReason = reason || 'Withdrawn';
  offer.updatedAt = now;
  persist();

  return { offer };
}

function getOffer(id) {
  return offers.get(id) || null;
}

function listOffersByListing(listingId, filter = {}) {
  const out = [];
  for (const offer of offers.values()) {
    if (offer.listingId !== listingId) continue;
    if (filter.status && offer.status !== filter.status) continue;
    out.push(offer);
  }
  out.sort((a, b) => b.amount - a.amount);
  return out;
}

function listOffersByBuyer(buyerId, filter = {}) {
  const out = [];
  for (const offer of offers.values()) {
    if (offer.buyerId !== buyerId) continue;
    if (filter.status && offer.status !== filter.status) continue;
    out.push(offer);
  }
  out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return out;
}

function listOffersBySeller(sellerId, filter = {}) {
  const out = [];
  for (const offer of offers.values()) {
    if (offer.sellerId !== sellerId) continue;
    if (filter.status && offer.status !== filter.status) continue;
    out.push(offer);
  }
  out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return out;
}

// ═══════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════

function getStats() {
  let activeListings = 0;
  let pendingSale = 0;
  let soldListings = 0;
  let totalViews = 0;

  for (const l of listings.values()) {
    if (l.status === 'active') activeListings++;
    if (l.status === 'pending_sale') pendingSale++;
    if (l.status === 'sold') soldListings++;
    totalViews += l.views || 0;
  }

  let pendingOffers = 0;
  let acceptedOffers = 0;
  let activeUnlocks = 0;

  for (const o of offers.values()) {
    if (o.status === 'pending' || o.status === 'countered') pendingOffers++;
    if (o.status === 'accepted') acceptedOffers++;
  }
  for (const u of contactUnlocks.values()) {
    if (u.status === 'active' || u.status === 'credited') activeUnlocks++;
  }

  return {
    listings: {
      total: listings.size,
      active: activeListings,
      pendingSale,
      sold: soldListings,
      totalViews,
    },
    offers: {
      total: offers.size,
      pending: pendingOffers,
      accepted: acceptedOffers,
    },
    unlocks: {
      total: contactUnlocks.size,
      active: activeUnlocks,
      revenue: activeUnlocks * UNLOCK_FEE_KES,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
  // Listings
  createListing,
  getListing,
  incrementViews,
  searchListings,
  pauseListing,
  resumeListing,
  markListingSold,
  // Unlocks
  isUnlocked,
  initiateContactUnlock,
  confirmUnlockPayment,
  listAwaitingPayment,
  getUnlock,
  creditUnlockToTrade,
  // Offers
  createOffer,
  counterOffer,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  getOffer,
  listOffersByListing,
  listOffersByBuyer,
  listOffersBySeller,
  // Stats
  getStats,
  // Constants
  UNLOCK_FEE_KES,
  UNLOCK_EXPIRY_DAYS,
  // Testing
  _listings: listings,
  _offers: offers,
  _contactUnlocks: contactUnlocks,
  _persist: persist,
};
