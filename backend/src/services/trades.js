/**
 * Trades Service — the orchestrator
 *
 * Ties together: shamba (animal), market (offer + unlock),
 * econfirm (escrow), riders + delivery (fulfillment).
 *
 * Money flow (no-splits assumption):
 *   Buyer pays KES 100 at contact unlock (already credited to trade)
 *   Buyer funds eConfirm escrow for the goods value
 *   eConfirm releases full amount to seller (minus their 1% fee)
 *   Buyer pays rider directly (negotiated fee, at handoff)
 *   FarmDirect keeps the KES 100 platform fee
 *
 * Lifecycle:
 *   draft → escrow_pending → awaiting_funding → funded →
 *   matching_rider → rider_assigned → in_transit →
 *   delivered → awaiting_release → releasing → completed
 */

const storage = require('./storage');
const shamba = require('./shamba');
const market = require('./market');
const riders = require('./riders');
const delivery = require('./delivery');
const econfirm = require('./econfirm');
const mpesa = require('./mpesa');
const sms = require('./sms');
const crypto = require('crypto');

const trades = storage.objectToMap(storage.load('trades', {}));

function persist() {
  storage.save('trades', storage.mapToObject(trades));
}

function generateId(prefix) {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 5).toUpperCase();
}

function hashObject(obj) {
  const canonical = JSON.stringify(obj, Object.keys(obj).sort());
  return 'SNAP-' + crypto.createHash('sha256').update(canonical).digest('hex').substring(0, 12).toUpperCase();
}

function generateReleaseCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const RELEASE_CODE_EXPIRY_DAYS = 14;
const MAX_CODE_ATTEMPTS = 5;

// ═══════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════

/**
 * Create a trade from an accepted offer.
 * Called by either buyer or seller after offer.accept.
 */
async function createTrade({ offerId, creatorId }) {
  const offer = market.getOffer(offerId);
  if (!offer) return { error: 'Offer not found' };
  if (offer.status !== 'accepted') return { error: 'Offer is not accepted' };

  // Only parties can create the trade
  if (creatorId !== offer.buyerId && creatorId !== offer.sellerId) {
    return { error: 'Only trade parties can create the trade' };
  }

  // Prevent duplicate trades from the same offer
  for (const t of trades.values()) {
    if (t.offerId === offerId && t.status !== 'cancelled' && t.status !== 'failed') {
      return { error: 'Trade already exists for this offer', trade: t };
    }
  }

  // Validate subject via plugin
  const plugin = shamba.livestockPlugin;
  const validation = await plugin.validateSubject({
    referenceId: offer.passportId,
    sellerId: offer.sellerId,
  });
  if (validation.error) return { error: 'Subject invalid: ' + validation.error };

  const animal = validation.subject;

  // Build frozen snapshot
  const snapshot = plugin.buildSnapshot(animal, offer.amount);
  const snapshotHash = hashObject(snapshot);

  // Get listing details
  const listing = market._listings.get(offer.listingId);
  if (!listing) return { error: 'Listing not found' };

  // Pickup = seller's location, dropoff = buyer's location (may need manual entry later)
  const pickup = {
    county: animal.location?.county || null,
    ward: animal.location?.ward || null,
    area: animal.location?.area || null,
  };

  // Dropoff — default to same county for now; the buyer can change in checkout
  const dropoff = {
    county: null,
    ward: null,
    area: null,
  };

  const id = generateId('TRADE');
  const now = new Date().toISOString();

  const trade = {
    id,
    vertical: 'livestock',
    subject: {
      referenceId: animal.passportId,
      referenceType: plugin.referenceType,
      snapshot,
      snapshotHash,
    },

    // Parties
    sellerId: offer.sellerId,
    sellerName: offer.sellerName,
    sellerPhone: animal.ownerPhone || null,
    buyerId: offer.buyerId,
    buyerName: offer.buyerName,
    buyerPhone: offer.buyerPhone,

    // Origin
    listingId: offer.listingId,
    offerId: offer.id,
    unlockId: null,                       // set when unlock is credited

    // Money
    currency: 'KES',
    subtotal: offer.amount,
    unlockCredit: 100,                    // FarmDirect's platform fee (collected at unlock)
    total: offer.amount,                  // buyer pays this to escrow (goods only)
    escrowAmount: offer.amount,

    // Escrow
    escrowId: null,
    escrowStatus: 'none',
    escrowConfirmationCode: null,
    escrowFundedAt: null,
    escrowReleasedAt: null,
    escrowReversedAt: null,

    // Release code (fraud prevention)
    releaseCode: null,
    releaseCodeSentAt: null,
    releaseCodeEnteredAt: null,
    releaseCodeExpiresAt: null,
    releaseCodeAttempts: 0,

    // Delivery
    delivery: {
      mode: 'rider',
      distanceKm: null,
      pickup,
      dropoff,
      riderId: null,
      riderName: null,
      riderPhone: null,
      agreedFee: null,
      riderPayment: {
        amount: null,
        paidAt: null,
        mpesaRef: null,
        confirmedByRiderAt: null,
      },
      attempts: [],
      status: null,
      deliveryId: null,
      pickedUpAt: null,
      deliveredAt: null,
      buyerConfirmedAt: null,
    },

    // Lifecycle
    status: 'escrow_pending',

    // Evidence
    history: [{
      at: now,
      event: 'created',
      by: creatorId,
      note: `Trade from offer ${offer.id} (KES ${offer.amount})`,
    }],
    dispute: null,

    ratings: {
      buyerRatesSeller: null,
      buyerRatesRider: null,
      sellerRatesBuyer: null,
      riderRatesBuyer: null,
    },

    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  trades.set(id, trade);

  // Credit the unlock (KES 100 counts as platform fee)
  try {
    const unlockResult = market.creditUnlockToTrade(offer.listingId, offer.buyerId, id);
    if (unlockResult.unlock) trade.unlockId = unlockResult.unlock.id;
  } catch (e) {
    console.warn('⚠️  Could not credit unlock:', e.message);
  }

  // Freeze the animal
  try {
    await plugin.freezeForTrade({ referenceId: animal.passportId, tradeId: id });
  } catch (e) {
    console.warn('⚠️  Could not freeze animal:', e.message);
  }

  // Check if eConfirm is configured
  const econfirmKey = process.env.ECONFIRM_API_KEY;
  const econfirmConfigured = econfirmKey && !econfirmKey.includes('your_');

  if (!econfirmConfigured) {
    console.log('⚠️  eConfirm not configured — simulating escrow');
    trade.escrowId = 'SIMULATED-ESCROW-' + Date.now();
    trade.escrowConfirmationCode = 'SIM-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    trade.escrowStatus = 'created';
    trade.status = 'awaiting_funding';
    trade.history.push({
      at: new Date().toISOString(),
      event: 'escrow_simulated',
      by: 'system',
      note: 'eConfirm not configured',
    });
    persist();
    console.log('🏪 Trade created:', id, '|', animal.passportId, '| KES', offer.amount);
    return { trade };
  }

  // Create real eConfirm escrow
  try {
    const escrowResult = await econfirm.createEscrow({
      buyerEmail: `${offer.buyerId}@farmdirect.ke`,
      sellerEmail: `${offer.sellerId}@farmdirect.ke`,
      sellerPhone: animal.ownerPhone,
      amount: offer.amount,
      description: `Trade ${id}: ${animal.type} ${animal.breed} (${animal.passportId})`,
      terms: 'Payment upon buyer confirmation of delivery',
    });

    if (escrowResult.success) {
      trade.escrowId = escrowResult.providerId;
      trade.escrowConfirmationCode = escrowResult.confirmationCode;
      trade.escrowStatus = 'created';
      trade.status = 'awaiting_funding';
      trade.history.push({
        at: new Date().toISOString(),
        event: 'escrow_created',
        by: 'system',
        note: `eConfirm escrow ${escrowResult.providerId}`,
      });
    } else {
      trade.status = 'failed';
      trade.history.push({
        at: new Date().toISOString(),
        event: 'escrow_failed',
        by: 'system',
        note: 'eConfirm rejected the escrow',
      });
      persist();
      return { error: 'Failed to create escrow', trade };
    }
  } catch (err) {
    console.error('❌ Escrow creation error:', err.message);
    trade.status = 'failed';
    trade.history.push({
      at: new Date().toISOString(),
      event: 'escrow_error',
      by: 'system',
      note: err.message,
    });
    persist();
    return { error: 'Escrow error: ' + err.message, trade };
  }

  persist();
  console.log('🏪 Trade created:', id, '|', animal.passportId, '| KES', offer.amount);

  return { trade };
}

// ═══════════════════════════════════════════════════════════
// FUND
// ═══════════════════════════════════════════════════════════

/**
 * Trigger the STK push for the buyer to fund the escrow.
 * In simulated mode, we skip eConfirm and immediately mark funded.
 */
async function fundTrade(tradeId, buyerPhone) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };
  if (trade.status !== 'awaiting_funding' && trade.status !== 'escrow_pending') {
    return { error: 'Trade is not awaiting funding' };
  }

  const phone = buyerPhone || trade.buyerPhone;
  if (!phone) return { error: 'Buyer phone required' };

  // Simulated path — either M-Pesa not configured, or escrow is simulated
  const isSimulatedEscrow = typeof trade.escrowId === 'string' &&
    trade.escrowId.startsWith('SIMULATED-');

  if (!mpesa.isConfigured() || isSimulatedEscrow || !trade.escrowId) {
    console.log('⚠️  Simulating trade funding (simulated escrow or M-Pesa not configured)');
    return await onEscrowFunded(tradeId, {
      simulated: true,
      mpesaRef: 'SIMULATED-' + Date.now(),
    });
  }

  // Real path — eConfirm handles the STK
  // (we call our own STK as a fallback since we don't yet know eConfirm's STK endpoint)
  try {
    const result = await mpesa.stkPush({
      phone,
      amount: trade.escrowAmount,
      accountRef: 'TRADE-' + tradeId,
      description: 'FarmDirect trade payment',
    });

    trade.escrowStkCheckoutId = result.CheckoutRequestID;
    trade.status = 'awaiting_funding';
    trade.history.push({
      at: new Date().toISOString(),
      event: 'stk_sent',
      by: 'system',
      note: 'STK push sent to buyer for escrow funding',
    });
    persist();

    return {
      trade,
      stk: {
        checkoutRequestId: result.CheckoutRequestID,
        customerMessage: result.CustomerMessage,
      },
      mode: mpesa.getMode(),
    };
  } catch (err) {
    return { error: 'Failed to send STK: ' + err.message };
  }
}

/**
 * Called when escrow is funded (from webhook or simulated).
 * Starts the rider matching process.
 */
async function onEscrowFunded(tradeId, data = {}) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };
  if (trade.status === 'funded' || trade.status === 'matching_rider') {
    return { trade };
  }

  const now = new Date().toISOString();
  trade.escrowFundedAt = now;
  trade.escrowStatus = 'funded';
  trade.status = 'matching_rider';
  trade.history.push({
    at: now,
    event: 'escrow_funded',
    by: 'system',
    note: data.simulated ? 'Simulated funding' : `M-Pesa: ${data.mpesaRef || 'unknown'}`,
  });

  // Generate buyer release code
  trade.releaseCode = generateReleaseCode();
  trade.releaseCodeSentAt = now;
  trade.releaseCodeExpiresAt = new Date(
    Date.now() + RELEASE_CODE_EXPIRY_DAYS * 86400000
  ).toISOString();

  persist();

  // Send SMS to buyer with release code
  if (trade.buyerPhone) {
    const msg = `FarmDirect: Cow trade ${tradeId} escrow funded (KES ${trade.escrowAmount}).\n\nYour release code: ${trade.releaseCode}\n\nEnter this code in the app when you have received the animal. Do NOT share it with the seller or rider.`;
    try { await sms.sendSms(trade.buyerPhone, msg); } catch (e) { /* ignore */ }
  }

  console.log('💰 Trade funded:', tradeId, '| Release code:', trade.releaseCode);

  // Start rider matching (async, don't await)
  matchRiderForTrade(tradeId).catch(err => {
    console.error('❌ Rider matching failed:', err.message);
  });

  return { trade };
}

/**
 * Called from the webhook when Safaricom confirms the STK.
 * Matches trades by escrowStkCheckoutId.
 */
async function confirmEscrowFromCallback(checkoutRequestId, parsed) {
  let matched = null;
  for (const trade of trades.values()) {
    if (trade.escrowStkCheckoutId === checkoutRequestId &&
        (trade.status === 'awaiting_funding' || trade.status === 'escrow_pending')) {
      matched = trade;
      break;
    }
  }
  if (!matched) return { error: 'No matching trade' };

  if (!parsed.success) {
    matched.status = 'failed';
    matched.history.push({
      at: new Date().toISOString(),
      event: 'funding_failed',
      by: 'system',
      note: parsed.resultDesc || 'M-Pesa failed',
    });
    persist();
    return { trade: matched };
  }

  return await onEscrowFunded(matched.id, {
    mpesaRef: parsed.mpesaReceipt,
  });
}

// ═══════════════════════════════════════════════════════════
// RIDER MATCHING (sequential, escalating radius + class)
// ═══════════════════════════════════════════════════════════

async function matchRiderForTrade(tradeId) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };
  if (trade.status !== 'matching_rider') return { error: 'Not matching' };

  const value = trade.subtotal;
  const phases = [
    { radiusKm: 15, limit: 3, label: 'near' },
    { radiusKm: 25, limit: 5, label: 'medium' },
    { radiusKm: 50, limit: 10, label: 'far' },
  ];

  for (const phase of phases) {
    const result = riders.getEligibleRiders({
      pickup: trade.delivery.pickup,
      valueKes: value,
      radiusKm: phase.radiusKm,
      limit: phase.limit,
    });

    if (result.riders.length === 0) continue;

    // Create delivery record for this trade
    const deliv = delivery.createDelivery({
      buyerId: trade.buyerId,
      buyerName: trade.buyerName,
      buyerPhone: trade.buyerPhone,
      farmerId: trade.sellerId,
      farmerName: trade.sellerName,
      farmerPhone: trade.sellerPhone,
      pickup: trade.delivery.pickup,
      dropoff: trade.delivery.dropoff,
      items: [{
        passportId: trade.subject.referenceId,
        description: trade.subject.snapshot.description || `${trade.subject.snapshot.type} ${trade.subject.snapshot.breed}`,
      }],
      weight: null,
      deliveryFee: 0,                    // buyer pays rider directly
      escrowId: trade.escrowId,
    });

    trade.delivery.deliveryId = deliv.id;
    trade.delivery.attempts.push({
      phase: phase.label,
      riderCount: result.riders.length,
      startedAt: new Date().toISOString(),
    });
    trade.status = 'matching_rider';
    persist();

    // Offer to the top rider
    const topRider = result.riders[0];
    try {
      await delivery.offerToRider(deliv.id, topRider);
      trade.delivery.attempts[trade.delivery.attempts.length - 1].offeredTo = topRider.id;
      persist();
      // The delivery.js SMS is sent; when the rider replies YES,
      // webhook.js -> delivery.handleRiderReply triggers our hook.
      return { trade, rider: topRider, deliveryId: deliv.id };
    } catch (err) {
      console.warn('⚠️  Failed to offer to rider:', err.message);
      continue;
    }
  }

  // No riders found across all phases
  trade.status = 'no_rider_available';
  trade.history.push({
    at: new Date().toISOString(),
    event: 'no_rider_found',
    by: 'system',
    note: 'No riders responded in any phase',
  });
  persist();

  return { error: 'No riders available', trade };
}

/**
 * Called when a rider accepts a delivery (from webhook.js).
 * Hook into the trade to update state.
 */
async function onRiderAccepted(tradeId, rider) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };

  const now = new Date().toISOString();
  trade.delivery.riderId = rider.id;
  trade.delivery.riderName = rider.rider?.fullName || rider.name;
  trade.delivery.riderPhone = rider.rider?.phone || rider.phone;
  trade.status = 'rider_assigned';
  trade.history.push({
    at: now,
    event: 'rider_assigned',
    by: rider.id,
    note: `Rider ${trade.delivery.riderName} accepted`,
  });
  persist();

  // Notify buyer + seller with rider contact
  const riderMsg = `FarmDirect: Rider ${trade.delivery.riderName} (${trade.delivery.riderPhone}) accepted trade ${tradeId}. They will contact you shortly.`;
  try { if (trade.buyerPhone) await sms.sendSms(trade.buyerPhone, riderMsg); } catch (e) {}
  try { if (trade.sellerPhone) await sms.sendSms(trade.sellerPhone, riderMsg); } catch (e) {}

  return { trade };
}

async function onDeliveryComplete(tradeId) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };

  const now = new Date().toISOString();
  trade.delivery.deliveredAt = now;
  trade.status = 'awaiting_release';
  trade.history.push({
    at: now,
    event: 'delivered',
    by: 'system',
    note: 'Delivered — awaiting buyer release',
  });
  persist();

  // Remind buyer with the release code
  const msg = `FarmDirect: Your animal has been delivered for trade ${tradeId}.\n\nEnter your release code to complete the trade: ${trade.releaseCode}\n\nAlso remember to pay the rider directly.`;
  try { if (trade.buyerPhone) await sms.sendSms(trade.buyerPhone, msg); } catch (e) {}

  return { trade };
}

// ═══════════════════════════════════════════════════════════
// RELEASE
// ═══════════════════════════════════════════════════════════

/**
 * Buyer enters release code + confirms rider payment.
 * On success, calls eConfirm to release escrow to seller.
 */
async function releaseTrade(tradeId, { code, buyerId, riderPaymentRef }) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };
  if (trade.buyerId !== buyerId) return { error: 'Only the buyer can release' };
  if (trade.status !== 'awaiting_release') {
    return { error: 'Trade is not awaiting release (status: ' + trade.status + ')' };
  }
  if (!trade.releaseCode) return { error: 'No release code set' };
  if (trade.releaseCodeExpiresAt && new Date(trade.releaseCodeExpiresAt) < new Date()) {
    return { error: 'Release code expired' };
  }
  if (trade.releaseCodeAttempts >= MAX_CODE_ATTEMPTS) {
    return { error: 'Too many attempts — trade locked for review' };
  }

  if (String(code) !== String(trade.releaseCode)) {
    trade.releaseCodeAttempts++;
    trade.history.push({
      at: new Date().toISOString(),
      event: 'release_code_wrong',
      by: buyerId,
      note: `Attempt ${trade.releaseCodeAttempts}`,
    });
    persist();
    return { error: 'Invalid release code', attempts: trade.releaseCodeAttempts };
  }

  // Correct code — record rider payment
  const now = new Date().toISOString();
  trade.releaseCodeEnteredAt = now;
  if (riderPaymentRef) {
    trade.delivery.riderPayment.mpesaRef = riderPaymentRef;
    trade.delivery.riderPayment.paidAt = now;
  }

  // Release escrow
  trade.status = 'releasing';
  trade.history.push({
    at: now,
    event: 'release_authorized',
    by: buyerId,
    note: `Buyer entered release code + riderRef=${riderPaymentRef || 'none'}`,
  });
  persist();

  // Release escrow (skip eConfirm if simulated)
  let releaseResult = null;
  const releaseIsSimulated = typeof trade.escrowId === 'string' &&
    trade.escrowId.startsWith('SIMULATED-');

  if (releaseIsSimulated || !trade.escrowId || !trade.escrowConfirmationCode) {
    // Simulated release
    trade.escrowStatus = 'released';
    trade.escrowReleasedAt = now;
    trade.history.push({
      at: now,
      event: 'escrow_simulated_release',
      by: 'system',
      note: 'Simulated escrow release',
    });
  } else {
    // Real eConfirm release
    try {
      releaseResult = await econfirm.release(
        trade.escrowId,
        trade.escrowConfirmationCode,
        `Buyer released trade ${tradeId}`
      );
      trade.escrowStatus = 'released';
      trade.escrowReleasedAt = now;
    } catch (err) {
      console.error('❌ eConfirm release failed:', err.message);
      trade.escrowStatus = 'releasing';
      trade.history.push({
        at: now,
        event: 'release_error',
        by: 'system',
        note: err.message,
      });
      persist();
      return { error: 'Escrow release failed: ' + err.message };
    }
  }

  // Transfer ownership in shamba
  const plugin = shamba.livestockPlugin;
  try {
    await plugin.transferOwnership({
      referenceId: trade.subject.referenceId,
      newOwner: {
        id: trade.buyerId,
        name: trade.buyerName,
        phone: trade.buyerPhone,
      },
      tradeId: trade.id,
      mpesaRef: releaseResult?.mpesaReceipt || 'TRADE-' + trade.id,
      soldPrice: trade.subtotal,
    });
    await plugin.unfreeze({ referenceId: trade.subject.referenceId });
  } catch (err) {
    console.error('❌ Ownership transfer failed:', err.message);
  }

  // Mark listing sold
  try {
    market.markListingSold(trade.listingId, {
      buyerId: trade.buyerId,
      tradeId: trade.id,
    });
  } catch (err) {
    console.error('❌ Listing mark-sold failed:', err.message);
  }

  // Complete
  trade.status = 'completed';
  trade.completedAt = now;
  trade.history.push({
    at: now,
    event: 'completed',
    by: 'system',
    note: 'Trade complete',
  });
  persist();

  // Notify both parties
  try {
    if (trade.sellerPhone) {
      await sms.sendSms(trade.sellerPhone,
        `FarmDirect: Trade ${tradeId} completed! Buyer confirmed. Funds released to your M-Pesa.`);
    }
    if (trade.buyerPhone) {
      await sms.sendSms(trade.buyerPhone,
        `FarmDirect: Trade ${tradeId} complete. Thank you.`);
    }
  } catch (e) {}

  console.log('✅ Trade completed:', tradeId);
  return { trade, releaseResult };
}

// ═══════════════════════════════════════════════════════════
// DISPUTE
// ═══════════════════════════════════════════════════════════

async function fileDispute(tradeId, { filedBy, reason, claims, requestedResolution, requestedAmount, evidence }) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };

  if (filedBy !== trade.buyerId && filedBy !== trade.sellerId) {
    return { error: 'Not a party to this trade' };
  }
  if (trade.status === 'completed' || trade.status === 'cancelled' || trade.status === 'reversed') {
    return { error: 'Trade is already ' + trade.status };
  }

  const now = new Date().toISOString();
  trade.dispute = {
    filedBy,
    filedAt: now,
    reason: reason || 'unspecified',
    claims: claims || [],
    requestedResolution: requestedResolution || 'release',
    requestedAmount: requestedAmount || null,
    evidence: evidence || [],
    status: 'open',
  };
  trade.status = 'disputed';
  trade.history.push({
    at: now,
    event: 'dispute_filed',
    by: filedBy,
    note: reason,
  });
  persist();

  console.log('⚠️  Dispute filed:', tradeId, '| by', filedBy);

  return { trade };
}

// ═══════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════

function getTrade(id) {
  return trades.get(id);
}

function listTradesByUser(userId, filter = {}) {
  const out = [];
  for (const t of trades.values()) {
    if (t.buyerId !== userId && t.sellerId !== userId) continue;
    if (filter.role === 'buyer' && t.buyerId !== userId) continue;
    if (filter.role === 'seller' && t.sellerId !== userId) continue;
    if (filter.status && t.status !== filter.status) continue;
    out.push(t);
  }
  out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return out;
}

function listTradesByRider(riderId) {
  const out = [];
  for (const t of trades.values()) {
    if (t.delivery?.riderId !== riderId) continue;
    out.push(t);
  }
  out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return out;
}

function getStats() {
  const statuses = {};
  let totalValue = 0;
  for (const t of trades.values()) {
    statuses[t.status] = (statuses[t.status] || 0) + 1;
    if (t.status === 'completed') totalValue += t.subtotal;
  }
  return {
    total: trades.size,
    byStatus: statuses,
    totalValueCompleted: totalValue,
  };
}

function listAwaitingPayment() {
  const out = [];
  for (const t of trades.values()) {
    if ((t.status === 'awaiting_funding' || t.status === 'escrow_pending') && t.escrowStkCheckoutId) {
      out.push(t);
    }
  }
  return out;
}


// DEV ONLY — flip a no_rider_available trade straight to awaiting_release
// so the buyer can enter the release code and complete the trade without
// a real rider. Gated by NODE_ENV check in the route.
async function devSkipRiderToRelease(tradeId) {
  const trade = trades.get(tradeId);
  if (!trade) return { error: 'Trade not found' };
  if (trade.status !== 'no_rider_available' && trade.status !== 'matching_rider') {
    return { error: 'Trade is not in a skippable state (status: ' + trade.status + ')' };
  }
  const now = new Date().toISOString();
  trade.delivery = trade.delivery || {};
  trade.delivery.status = 'delivered';
  trade.delivery.deliveredAt = now;
  trade.delivery.buyerConfirmedAt = now;
  trade.delivery.devSkippedRider = true;
  trade.status = 'awaiting_release';
  trade.history = trade.history || [];
  trade.history.push({
    at: now,
    event: 'delivery_completed',
    by: 'system',
    note: 'DEV: rider skipped, marked as delivered',
  });
  persist();
  return { trade };
}

module.exports = {
  devSkipRiderToRelease,
  // Core
  createTrade,
  fundTrade,
  onEscrowFunded,
  confirmEscrowFromCallback,
  releaseTrade,
  fileDispute,
  // Rider + delivery hooks
  matchRiderForTrade,
  onRiderAccepted,
  onDeliveryComplete,
  // Queries
  getTrade,
  listTradesByUser,
  listTradesByRider,
  getStats,
  listAwaitingPayment,
  // Testing
  _trades: trades,
  _persist: persist,
};
