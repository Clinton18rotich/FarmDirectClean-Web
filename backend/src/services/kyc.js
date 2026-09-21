/**
 * KYC (Know Your Customer) Service
 * Verifies user identity against Kenya's IPRS database
 * 
 * Provider is selected via KYC_PROVIDER env variable:
 * - 'mock' (default) → dev mode, always approves
 * - 'didit' → production, queries IPRS
 * - 'smileid' → production alternative
 * - 'dojah' → production alternative
 */

const storage = require('./storage');
const mpesa = require('./mpesa');

const verifications = storage.objectToMap(storage.load('kyc_verifications', {}));

// ═════════════════════════════════════════════════════
// PRICING & TIERS
// ═════════════════════════════════════════════════════

const KYC_FEE_KES = 500;

const SELLER_TIERS = {
  basic: {
    id: 'basic',
    label: 'Basic',
    monthlyLimit: 5000,
    kycRequired: false,
    fee: 0,
    features: [
      'Browse marketplace',
      'Chat with buyers',
      'Sell up to KES 5,000/month',
      'List up to 3 products',
    ],
  },
  verified: {
    id: 'verified',
    label: 'Verified Seller',
    monthlyLimit: 500000,
    kycRequired: true,
    fee: KYC_FEE_KES,   // One-time
    features: [
      'Sell up to KES 500,000/month',
      'Unlimited product listings',
      'Verified badge ✅',
      'Escrow protection',
      'Priority support',
    ],
  },
  premium: {
    id: 'premium',
    label: 'Premium Seller',
    monthlyLimit: 5000000,
    kycRequired: true,
    fee: 200,   // Monthly
    features: [
      'Everything in Verified',
      'Sell up to KES 5M/month',
      'Featured listings',
      'Advanced analytics',
      'Priority rider matching',
      'Custom commission rates',
    ],
  },
};

function persist() {
  storage.save('kyc_verifications', storage.mapToObject(verifications));
}

// ═════════════════════════════════════════════════════
// ID NUMBER VALIDATION (Kenya format)
// ═════════════════════════════════════════════════════

/**
 * Kenya National ID: 7-8 digits typically, up to 9
 * Smile ID regex: /^[0-9]{1,9}$/  but we require 7-9
 */
function isValidKenyaId(idNumber) {
  if (!idNumber) return false;
  const cleaned = String(idNumber).replace(/\s+/g, '');
  return /^[0-9]{7,9}$/.test(cleaned);
}

/**
 * Clean/normalize ID number
 */
function normalizeIdNumber(idNumber) {
  if (!idNumber) return null;
  return String(idNumber).replace(/\D/g, '').slice(0, 9);
}

// ═════════════════════════════════════════════════════
// PROVIDER: MOCK (Development)
// ═════════════════════════════════════════════════════

const mockProvider = {
  name: 'mock',
  async verify({ idNumber, fullName, dateOfBirth }) {
    // Simulate check
    await new Promise(r => setTimeout(r, 500));
    
    // Special test IDs
    if (idNumber === '00000000') {
      return { verified: false, reason: 'ID not found in IPRS (test)' };
    }
    if (idNumber === '11111111') {
      return { verified: false, reason: 'Name mismatch (test)' };
    }
    
    // Everything else "passes" in mock mode
    return {
      verified: true,
      confidence: 0.95,
      officialRecord: {
        fullName: fullName || 'Mock User',
        dateOfBirth: dateOfBirth || '1990-01-01',
        gender: 'Unknown',
        photoUrl: null,
      },
      note: 'Mock verification — not a real IPRS check',
    };
  },
};

// ═════════════════════════════════════════════════════
// PROVIDER: DIDIT (Production)
// ═════════════════════════════════════════════════════

const diditProvider = {
  name: 'didit',
  async verify({ idNumber, fullName, dateOfBirth }) {
    const apiKey = process.env.DIDIT_API_KEY;
    if (!apiKey) {
      return { verified: false, reason: 'DIDIT_API_KEY not configured' };
    }
    
    try {
      // Didit API endpoint (as documented)
      // POST https://verification.didit.me/v1/kyc/ke-id
      const response = await fetch('https://verification.didit.me/v1/kyc/ke-id', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_number: idNumber,
          full_name: fullName,
          date_of_birth: dateOfBirth,
        }),
      });
      
      const data = await response.json();
      
      // Didit returns: MATCH | PARTIAL_MATCH | NO_MATCH
      const status = data.status || data.result?.status;
      
      if (status === 'MATCH') {
        return {
          verified: true,
          confidence: 0.98,
          officialRecord: data.record || data.data,
        };
      }
      
      if (status === 'PARTIAL_MATCH') {
        return {
          verified: false,
          partial: true,
          reason: data.reason || 'Partial match — some fields did not match',
          officialRecord: data.record || data.data,
        };
      }
      
      return {
        verified: false,
        reason: data.reason || 'ID not found or mismatch',
      };
    } catch (err) {
      return {
        verified: false,
        error: true,
        reason: 'KYC provider error: ' + err.message,
      };
    }
  },
};

// ═════════════════════════════════════════════════════
// PROVIDER: SMILE ID (Alternative)
// ═════════════════════════════════════════════════════

const smileIdProvider = {
  name: 'smileid',
  async verify({ idNumber, fullName, dateOfBirth }) {
    const apiKey = process.env.SMILEID_API_KEY;
    const partnerId = process.env.SMILEID_PARTNER_ID;
    
    if (!apiKey || !partnerId) {
      return { verified: false, reason: 'Smile ID credentials not configured' };
    }
    
    // Smile ID has an SDK — see their docs for exact API
    // This is a placeholder showing the structure
    return {
      verified: false,
      reason: 'Smile ID integration not yet implemented',
    };
  },
};

// ═════════════════════════════════════════════════════
// PROVIDER: DOJAH (Alternative)
// ═════════════════════════════════════════════════════

const dojahProvider = {
  name: 'dojah',
  async verify({ idNumber, fullName, dateOfBirth }) {
    const apiKey = process.env.DOJAH_API_KEY;
    const appId = process.env.DOJAH_APP_ID;
    
    if (!apiKey || !appId) {
      return { verified: false, reason: 'Dojah credentials not configured' };
    }
    
    return {
      verified: false,
      reason: 'Dojah integration not yet implemented',
    };
  },
};

// ═════════════════════════════════════════════════════
// PROVIDER SELECTION
// ═════════════════════════════════════════════════════

const providers = {
  mock: mockProvider,
  didit: diditProvider,
  smileid: smileIdProvider,
  dojah: dojahProvider,
};

function getProvider() {
  const name = process.env.KYC_PROVIDER || 'mock';
  return providers[name] || providers.mock;
}

// ═════════════════════════════════════════════════════
// MAIN VERIFICATION FUNCTION
// ═════════════════════════════════════════════════════

/**
 * Verify a user's identity
 * 
 * @param {Object} data
 * @param {string} data.idNumber - Kenya national ID
 * @param {string} data.fullName - Full name as on ID
 * @param {string} data.dateOfBirth - YYYY-MM-DD
 * @param {string} data.userId - Internal user identifier
 * @param {string} data.userType - farmer | rider | vet | slaughterhouse
 * @returns {Promise<Object>} verification result
 */
/**
 * Create a KYC verification request (before payment)
 * Status: pending_payment
 */
async function createVerificationRequest(data) {
  const { idNumber, fullName, dateOfBirth, userId, userType } = data;

  // 1. Validate input
  if (!idNumber) return { error: 'ID number required' };
  if (!fullName) return { error: 'Full name required' };

  const cleanId = normalizeIdNumber(idNumber);
  if (!isValidKenyaId(cleanId)) {
    return { error: 'Invalid Kenya ID format (must be 7-9 digits)' };
  }

  // 2. Check for duplicate verification
  const existing = Object.values(verifications).find(
    v => v.idNumber === cleanId && v.userId !== userId && v.verified
  );
  if (existing) {
    return {
      error: 'This ID is already registered to another account',
      duplicate: true,
    };
  }

  // 3. Check if user already has a paid verification
  const ownExisting = Object.values(verifications).find(
    v => v.userId === userId && (v.status === 'pending_payment' || v.status === 'paid' || v.verified)
  );
  if (ownExisting) {
    return { existing: ownExisting };
  }

  // 4. Create request with pending_payment status
  const id = 'KYC-' + Date.now().toString(36).toUpperCase();
  const record = {
    id,
    userId,
    userType: userType || 'unknown',
    idNumber: cleanId,
    idNumberMasked: '****' + cleanId.slice(-4),
    fullName,
    dateOfBirth: dateOfBirth || null,
    provider: getProvider().name,
    status: 'pending_payment',
    verified: false,
    fee: KYC_FEE_KES,
    paidAt: null,
    paymentRef: null,
    processedAt: null,
    reason: null,
    confidence: null,
    officialRecord: null,
    createdAt: new Date().toISOString(),
  };

  verifications[id] = record;
  persist();

  console.log('🪪 KYC request created:', id, '|', userType, '|', record.idNumberMasked, '| fee: KES', KYC_FEE_KES);

  return { record };
}

/**
 * Mark payment as received, then run verification
 */
async function processPaymentAndVerify(verificationId, paymentRef) {
  const record = verifications[verificationId];
  if (!record) return { error: 'Verification not found' };
  if (record.status !== 'pending_payment') {
    return { error: 'Already processed: ' + record.status };
  }

  // Mark as paid
  record.status = 'paid';
  record.paidAt = new Date().toISOString();
  record.paymentRef = paymentRef || 'manual';
  persist();

  console.log('💰 KYC payment received:', verificationId, '| KES', record.fee);

  // Now run actual verification
  return await runVerification(verificationId);
}

/**
 * Run the actual KYC provider check (called after payment)
 */
async function runVerification(verificationId) {
  const record = verifications[verificationId];
  if (!record) return { error: 'Verification not found' };

  record.status = 'processing';
  record.processedAt = new Date().toISOString();
  persist();

  // Call provider
  const provider = getProvider();
  const providerResult = await provider.verify({
    idNumber: record.idNumber,
    fullName: record.fullName,
    dateOfBirth: record.dateOfBirth,
  });

  record.verified = providerResult.verified;
  record.partial = providerResult.partial || false;
  record.reason = providerResult.reason || null;
  record.confidence = providerResult.confidence || null;
  record.officialRecord = providerResult.officialRecord || null;

  if (providerResult.verified) {
    record.status = 'verified';
  } else if (providerResult.error) {
    record.status = 'error';
  } else {
    record.status = 'failed';
  }

  persist();

  console.log('🪪 KYC', record.status.toUpperCase() + ':', verificationId, '|', record.idNumberMasked, '|', providerResult.verified ? 'PASS' : 'FAIL');

  return { record };
}

/**
 * LEGACY: direct verify (bypasses payment — use only for testing)
 */
async function verifyIdentity(data) {
  const { idNumber, fullName, dateOfBirth, userId, userType } = data;

  // Create request + process immediately (no payment gate)
  const createResult = await createVerificationRequest({
    idNumber, fullName, dateOfBirth, userId, userType,
  });

  if (createResult.error) return { verified: false, reason: createResult.error };
  if (createResult.existing) return createResult.existing;

  const record = createResult.record;
  const verifyResult = await runVerification(record.id);
  return verifyResult.record || verifyResult;
}

// ═════════════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════════════

function getVerification(id) {
  return verifications[id];
}

function getVerificationByUser(userId) {
  return Object.values(verifications)
    .filter(v => v.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
}

function isVerified(userId) {
  const v = getVerificationByUser(userId);
  return v && v.verified === true;
}

function listVerifications(filter = {}) {
  let list = Object.values(verifications);
  if (filter.userType) list = list.filter(v => v.userType === filter.userType);
  if (filter.verified !== undefined) list = list.filter(v => v.verified === filter.verified);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getStats() {
  const all = Object.values(verifications);
  return {
    total: all.length,
    verified: all.filter(v => v.verified).length,
    failed: all.filter(v => !v.verified).length,
    duplicates: all.filter(v => v.duplicate).length,
    provider: getProvider().name,
    byUserType: {
      farmer: all.filter(v => v.userType === 'farmer').length,
      rider: all.filter(v => v.userType === 'rider').length,
      vet: all.filter(v => v.userType === 'vet').length,
      slaughterhouse: all.filter(v => v.userType === 'slaughterhouse').length,
    },
  };
}

function getSellerTier(userId) {
  const v = getVerificationByUser(userId);
  if (!v || !v.verified) return SELLER_TIERS.basic;
  if (v.tier === 'premium') return SELLER_TIERS.premium;
  return SELLER_TIERS.verified;
}

function canSell(userId, amount = 0) {
  const v = getVerificationByUser(userId);
  const tier = getSellerTier(userId);

  if (!v || !v.verified) {
    // Basic tier — check amount
    if (amount > SELLER_TIERS.basic.monthlyLimit) {
      return {
        allowed: false,
        reason: `Basic sellers can only sell up to KES ${SELLER_TIERS.basic.monthlyLimit.toLocaleString()}/month. Verify your ID to unlock higher limits.`,
        tier: 'basic',
        upgradeCost: KYC_FEE_KES,
      };
    }
    return { allowed: true, tier: 'basic' };
  }

  return { allowed: true, tier: tier.id };
}

module.exports = {
  // Constants
  KYC_FEE_KES,
  SELLER_TIERS,
  // Main
  createVerificationRequest,
  processPaymentAndVerify,
  runVerification,
  verifyIdentity,  // legacy (bypasses payment)
  isValidKenyaId,
  normalizeIdNumber,
  // Queries
  getVerification,
  getVerificationByUser,
  isVerified,
  getSellerTier,
  canSell,
  listVerifications,
  getStats,
  // Debug
  getProvider: () => getProvider().name,
  _verifications: verifications,
};


// ═════════════════════════════════════════════════════
// STK PUSH PAYMENT
// ═════════════════════════════════════════════════════

/**
 * Initiate M-Pesa STK push for KYC fee
 * Called after user submits ID
 */
async function initiateKYCPayment(verificationId, phone) {
  const record = verifications[verificationId];
  if (!record) return { error: 'Verification not found' };
  if (record.status !== 'pending_payment') {
    return { error: 'Already processed: ' + record.status };
  }

  // If M-Pesa not configured, simulate success (dev mode)
  if (!mpesa.isConfigured()) {
    console.log('⚠️  M-Pesa not configured — simulating payment success');
    record.status = 'paid';
    record.paidAt = new Date().toISOString();
    record.paymentRef = 'SIMULATED-' + Date.now();
    persist();

    // Run verification immediately
    return await runVerification(verificationId);
  }

  // Real STK push
  try {
    const result = await mpesa.stkPush({
      phone,
      amount: record.fee,
      accountRef: record.id,
      description: 'FarmDirect KYC verification',
    });

    // Store the CheckoutRequestID for matching callback
    record.checkoutRequestId = result.CheckoutRequestID;
    record.merchantRequestId = result.MerchantRequestID;
    record.stkInitiatedAt = new Date().toISOString();
    record.status = 'awaiting_payment';
    persist();

    console.log('📱 KYC STK pushed:', verificationId, '| CheckoutID:', result.CheckoutRequestID);

    return {
      record,
      stk: {
        checkoutRequestId: result.CheckoutRequestID,
        customerMessage: result.CustomerMessage,
        responseCode: result.ResponseCode,
      },
    };
  } catch (err) {
    console.error('❌ STK push failed:', err.message);
    return { error: 'Failed to send M-Pesa prompt: ' + err.message };
  }
}

/**
 * Confirm payment from M-Pesa callback
 * Matches by CheckoutRequestID (never by phone — Safaricom masks it)
 */
async function confirmPaymentFromCallback(checkoutRequestId, callbackData) {
  const record = Object.values(verifications).find(
    v => v.checkoutRequestId === checkoutRequestId && v.status === 'awaiting_payment'
  );

  if (!record) {
    console.warn('⚠️  KYC callback for unknown CheckoutRequestID:', checkoutRequestId);
    return { error: 'No matching KYC request' };
  }

  if (!callbackData.success) {
    record.status = 'payment_failed';
    record.paymentFailureReason = callbackData.resultDesc;
    persist();
    console.log('❌ KYC payment failed:', record.id, '|', callbackData.resultDesc);
    return { record };
  }

  // Payment successful
  record.status = 'paid';
  record.paidAt = new Date().toISOString();
  record.paymentRef = callbackData.mpesaReceipt;
  record.paidAmount = callbackData.amount;
  persist();

  console.log('💰 KYC payment received:', record.id, '| Receipt:', callbackData.mpesaReceipt, '| KES', callbackData.amount);

  // Run IPRS verification
  return await runVerification(record.id);
}

module.exports.initiateKYCPayment = initiateKYCPayment;
module.exports.confirmPaymentFromCallback = confirmPaymentFromCallback;
