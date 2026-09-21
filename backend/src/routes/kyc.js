const express = require('express');
const router = express.Router();
const kyc = require('../services/kyc');

/**
 * POST /api/kyc/verify
 * Submit identity for verification
 */
router.post('/verify', async (req, res) => {
  try {
    const { idNumber, fullName, dateOfBirth, userId, userType } = req.body;

    if (!idNumber || !fullName) {
      return res.status(400).json({ success: false, message: 'ID number and full name required' });
    }
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const result = await kyc.verifyIdentity({
      idNumber,
      fullName,
      dateOfBirth,
      userId,
      userType,
    });

    res.json({
      success: true,
      verification: {
        id: result.id,
        verified: result.verified,
        partial: result.partial,
        reason: result.reason,
        confidence: result.confidence,
        provider: result.provider,
        idNumberMasked: result.idNumberMasked,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/kyc/status/:userId
 * Check if a user is verified
 */
router.get('/status/:userId', (req, res) => {
  const verification = kyc.getVerificationByUser(req.params.userId);
  res.json({
    success: true,
    verified: verification?.verified || false,
    verification: verification ? {
      id: verification.id,
      verified: verification.verified,
      verifiedAt: verification.createdAt,
      idNumberMasked: verification.idNumberMasked,
    } : null,
  });
});

/**
 * GET /api/kyc/stats
 * Admin: verification statistics
 */
router.get('/stats', (req, res) => {
  res.json({ success: true, stats: kyc.getStats() });
});

/**
 * GET /api/kyc/list
 * Admin: list all verifications
 */
router.get('/list', (req, res) => {
  res.json({
    success: true,
    verifications: kyc.listVerifications({
      userType: req.query.userType,
      verified: req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined,
    }),
  });
});

/**
 * GET /api/kyc/config
 * Public: which provider is active (for frontend display)
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    provider: kyc.getProvider(),
    enabled: true,
    requiresVerification: ['farmer', 'rider', 'vet', 'slaughterhouse'],
  });
});

module.exports = router;


// ═══════════════════════════════════════════════════
// PAYMENT-GATED VERIFICATION FLOW
// ═══════════════════════════════════════════════════

/**
 * Step 1: Create verification request (before payment)
 * Returns KES 500 fee + record ID
 */
router.post('/request', async (req, res) => {
  try {
    const { idNumber, fullName, dateOfBirth, userId, userType } = req.body;

    if (!idNumber || !fullName || !userId) {
      return res.status(400).json({ success: false, message: 'ID number, full name, and user ID required' });
    }

    const result = await kyc.createVerificationRequest({
      idNumber, fullName, dateOfBirth, userId, userType,
    });

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error, duplicate: result.duplicate });
    }

    if (result.existing) {
      return res.json({
        success: true,
        existing: true,
        verification: result.existing,
      });
    }

    res.json({
      success: true,
      verification: result.record,
      payment: {
        amount: kyc.KYC_FEE_KES,
        currency: 'KES',
        description: 'Identity verification',
        nextStep: 'Pay via M-Pesa to complete verification',
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Step 2: Confirm payment received (called from M-Pesa callback)
 * Then runs actual verification
 */
router.post('/:id/confirm-payment', async (req, res) => {
  try {
    const { paymentRef } = req.body;
    const result = await kyc.processPaymentAndVerify(req.params.id, paymentRef);

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      verification: result.record,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Check if a user can sell at a given amount
 */
router.post('/can-sell/:userId', (req, res) => {
  const { amount } = req.body;
  const result = kyc.canSell(req.params.userId, parseInt(amount) || 0);
  res.json({ success: true, ...result });
});

/**
 * Get seller tier for a user
 */
router.get('/tier/:userId', (req, res) => {
  const tier = kyc.getSellerTier(req.params.userId);
  res.json({ success: true, tier });
});

/**
 * Get all tier options
 */
router.get('/tiers', (req, res) => {
  res.json({
    success: true,
    tiers: Object.values(kyc.SELLER_TIERS),
    kycFee: kyc.KYC_FEE_KES,
  });
});


// ═══════════════════════════════════════════════════
// M-PESA STK PUSH PAYMENT
// ═══════════════════════════════════════════════════

/**
 * Initiate M-Pesa STK push for KYC fee
 * User receives prompt on their phone
 */
router.post('/:id/pay', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    const result = await kyc.initiateKYCPayment(req.params.id, phone);

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      mode: require('../services/mpesa').getMode(),
      verification: result.record,
      stk: result.stk || null,
      message: result.stk 
        ? 'Check your phone for the M-Pesa prompt'
        : 'Payment simulated (M-Pesa not configured)',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * Poll KYC status (frontend calls this after STK)
 */
router.get('/:id/status', (req, res) => {
  const v = kyc.getVerification(req.params.id);
  if (!v) return res.status(404).json({ success: false, message: 'Verification not found' });

  res.json({
    success: true,
    status: v.status,
    verified: v.verified,
    reason: v.reason,
    paidAt: v.paidAt,
    paymentRef: v.paymentRef,
  });
});
