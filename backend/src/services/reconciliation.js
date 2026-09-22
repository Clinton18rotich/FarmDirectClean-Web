/**
 * Payment Reconciliation Cron
 *
 * Problem: If Safaricom's STK callback doesn't reach our server
 * (network issue, ngrok expired, server was down), a payment sits
 * in 'awaiting_payment' forever — even though the farmer paid.
 *
 * Solution: Every 2 minutes, scan for records stuck in
 * 'awaiting_payment' for >3 minutes, query Safaricom directly
 * via the STK Query API, and update the record if payment succeeded.
 *
 * Runs only when MPESA is configured (skipped in simulated mode).
 */

const mpesa = require('./mpesa');

const SCAN_INTERVAL_MS = 2 * 60 * 1000;     // every 2 min
const STUCK_AFTER_MS   = 3 * 60 * 1000;     // 3 min grace period
const MAX_AGE_MS       = 24 * 60 * 60 * 1000; // give up after 24h

let intervalHandle = null;
let running = false;

async function reconcileKyc() {
  let kyc;
  try {
    kyc = require('./kyc');
  } catch (e) { return; }

  const records = kyc.listAwaitingPayment ? kyc.listAwaitingPayment() : [];
  const now = Date.now();

  for (const record of records) {
    const startedAt = new Date(record.stkInitiatedAt || record.createdAt).getTime();
    const age = now - startedAt;

    if (age < STUCK_AFTER_MS) continue;         // still in grace
    if (age > MAX_AGE_MS) {                     // too old, stop trying
      console.log(`⏰ KYC ${record.id} expired (24h+), abandoning`);
      continue;
    }

    try {
      console.log(`🔄 Reconciling KYC ${record.id} | ${record.checkoutRequestId}`);
      const status = await mpesa.queryStkStatus(record.checkoutRequestId);

      // Safaricom returns ResultCode as string or number depending on endpoint
      const code = Number(status.ResultCode);

      if (code === 0) {
        // Payment actually succeeded — simulate the callback
        const parsed = {
          checkoutRequestId: record.checkoutRequestId,
          success: true,
          amount: Number(status.Amount) || record.fee,
          mpesaReceipt: status.MpesaReceiptNumber || 'RECONCILED-' + Date.now(),
          resultDesc: status.ResultDesc,
          resultCode: 0,
        };
        await kyc.confirmPaymentFromCallback(record.checkoutRequestId, parsed);
        console.log(`✅ Reconciled KYC ${record.id} → paid (${parsed.mpesaReceipt})`);
      } else if (code === 1032 || code === 1037 || code === 2001) {
        // User cancelled / timeout / insufficient funds — mark failed
        console.log(`❌ KYC ${record.id} failed per Safaricom (code ${code})`);
        await kyc.confirmPaymentFromCallback(record.checkoutRequestId, {
          checkoutRequestId: record.checkoutRequestId,
          success: false,
          resultCode: code,
          resultDesc: status.ResultDesc,
        });
      }
      // Other codes (still processing) — leave for next cycle
    } catch (err) {
      console.warn(`⚠️  KYC reconcile failed for ${record.id}:`, err.message);
    }
  }
}

async function reconcileLand() {
  let land;
  try {
    land = require('./landProtection');
  } catch (e) { return; }

  const records = land.listAwaitingPayment ? land.listAwaitingPayment() : [];
  const now = Date.now();

  for (const record of records) {
    const startedAt = new Date(record.stkInitiatedAt || record.createdAt).getTime();
    const age = now - startedAt;

    if (age < STUCK_AFTER_MS) continue;
    if (age > MAX_AGE_MS) {
      console.log(`⏰ Parcel ${record.id} expired (24h+), abandoning`);
      continue;
    }

    try {
      console.log(`🔄 Reconciling parcel ${record.id} | ${record.checkoutRequestId}`);
      const status = await mpesa.queryStkStatus(record.checkoutRequestId);
      const code = Number(status.ResultCode);

      if (code === 0) {
        const parsed = {
          checkoutRequestId: record.checkoutRequestId,
          success: true,
          amount: Number(status.Amount) || record.fee,
          mpesaReceipt: status.MpesaReceiptNumber || 'RECONCILED-' + Date.now(),
          resultDesc: status.ResultDesc,
          resultCode: 0,
        };
        await land.confirmParcelPayment(record.checkoutRequestId, parsed);
        console.log(`✅ Reconciled parcel ${record.id} → paid (${parsed.mpesaReceipt})`);
      } else if (code === 1032 || code === 1037 || code === 2001) {
        console.log(`❌ Parcel ${record.id} failed per Safaricom (code ${code})`);
        await land.confirmParcelPayment(record.checkoutRequestId, {
          checkoutRequestId: record.checkoutRequestId,
          success: false,
          resultCode: code,
          resultDesc: status.ResultDesc,
        });
      }
    } catch (err) {
      console.warn(`⚠️  Parcel reconcile failed for ${record.id}:`, err.message);
    }
  }
}

async function reconcileMarket() {
  let market;
  try {
    market = require('./market');
  } catch (e) { return; }

  const records = market.listAwaitingPayment ? market.listAwaitingPayment() : [];
  const now = Date.now();

  for (const record of records) {
    const startedAt = new Date(record.stkInitiatedAt || record.createdAt).getTime();
    const age = now - startedAt;

    if (age < STUCK_AFTER_MS) continue;
    if (age > MAX_AGE_MS) continue;

    try {
      const status = await mpesa.queryStkStatus(record.checkoutRequestId);
      const code = Number(status.ResultCode);

      if (code === 0) {
        const parsed = {
          checkoutRequestId: record.checkoutRequestId,
          success: true,
          amount: Number(status.Amount) || record.amount,
          mpesaReceipt: status.MpesaReceiptNumber || 'RECONCILED-' + Date.now(),
          resultDesc: status.ResultDesc,
          resultCode: 0,
        };
        market.confirmUnlockPayment(record.checkoutRequestId, parsed);
        console.log(`✅ Reconciled unlock ${record.id} → active`);
      } else if (code === 1032 || code === 1037 || code === 2001) {
        market.confirmUnlockPayment(record.checkoutRequestId, {
          checkoutRequestId: record.checkoutRequestId,
          success: false,
          resultCode: code,
          resultDesc: status.ResultDesc,
        });
        console.log(`❌ Unlock ${record.id} failed per Safaricom`);
      }
    } catch (err) {
      console.warn(`⚠️  Unlock reconcile failed for ${record.id}:`, err.message);
    }
  }
}

async function reconcileTrades() {
  let trades;
  try {
    trades = require('./trades');
  } catch (e) { return; }

  const records = trades.listAwaitingPayment ? trades.listAwaitingPayment() : [];
  const now = Date.now();

  for (const record of records) {
    const startedAt = new Date(record.escrowStkInitiatedAt || record.createdAt).getTime();
    const age = now - startedAt;

    if (age < STUCK_AFTER_MS) continue;
    if (age > MAX_AGE_MS) continue;

    try {
      const status = await mpesa.queryStkStatus(record.escrowStkCheckoutId);
      const code = Number(status.ResultCode);

      if (code === 0) {
        const parsed = {
          checkoutRequestId: record.escrowStkCheckoutId,
          success: true,
          amount: Number(status.Amount) || record.escrowAmount,
          mpesaReceipt: status.MpesaReceiptNumber || 'RECONCILED-' + Date.now(),
          resultDesc: status.ResultDesc,
          resultCode: 0,
        };
        await trades.confirmEscrowFromCallback(record.escrowStkCheckoutId, parsed);
        console.log(`✅ Reconciled trade ${record.id} → funded`);
      } else if (code === 1032 || code === 1037 || code === 2001) {
        await trades.confirmEscrowFromCallback(record.escrowStkCheckoutId, {
          checkoutRequestId: record.escrowStkCheckoutId,
          success: false,
          resultCode: code,
          resultDesc: status.ResultDesc,
        });
        console.log(`❌ Trade ${record.id} funding failed per Safaricom`);
      }
    } catch (err) {
      console.warn(`⚠️  Trade reconcile failed for ${record.id}:`, err.message);
    }
  }
}

async function runReconciliation() {
  if (running) return;                 // avoid overlapping runs
  if (!mpesa.isConfigured()) return;   // simulated mode, nothing to reconcile

  running = true;
  try {
    await reconcileKyc();
    await reconcileLand();
    await reconcileMarket();
    await reconcileTrades();
  } catch (err) {
    console.error('❌ Reconciliation error:', err.message);
  } finally {
    running = false;
  }
}

function start() {
  if (intervalHandle) return;
  intervalHandle = setInterval(runReconciliation, SCAN_INTERVAL_MS);
  console.log(`🔄 Reconciliation cron started (scan every ${SCAN_INTERVAL_MS / 1000}s, stuck after ${STUCK_AFTER_MS / 1000}s)`);
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  start,
  stop,
  runReconciliation,
  // Exposed for testing
  SCAN_INTERVAL_MS,
  STUCK_AFTER_MS,
};
