const express = require('express');
const router = express.Router();
const delivery = require('../services/delivery');
const sms = require('../services/sms');
const riderRoute = require('./rider');

/**
 * POST /api/webhook/sms
 * Africa's Talking sends inbound SMS here
 * Reply format: "YES DEL-XXX" or "NO DEL-XXX"
 */
router.post('/sms', async (req, res) => {
  try {
    const { from, to, text } = req.body;
    console.log('📨 Inbound SMS from', from, ':', text);

    const parts = (text || '').trim().toUpperCase().split(/\s+/);
    const response = parts[0];  // YES | NO | WEIGH | HELP

    // ═══ WEIGH COMMAND HANDLER ═══
    if (response === 'WEIGH') {
      const measurementGuide = require('../services/measurementGuide');
      const result = measurementGuide.processSMSWeigh(text);
      
      if (result.success) {
        const reply = `FarmDirect — Weight Estimate\n` +
          `Animal: ${result.animalType}\n` +
          `Girth: ${result.girth}cm\n` +
          `Length: ${result.length}cm\n\n` +
          `Estimated weight: ${result.weight} kg\n\n` +
          `Formula: ${result.formula}`;
        await sms.sendSms(from, reply);
        console.log('📏 SMS weigh:', from, '->', result.weight, 'kg');
        return res.json({ success: true, type: 'weigh', result });
      } else {
        const errorMsg = `FarmDirect — Weigh Command\n\n` +
          `Format: WEIGH [girth] [length] [animal]\n` +
          `Example: WEIGH 180 140 Cow\n\n` +
          `Girth and length must be in cm.\n` +
          `Reply HELP for measurement guide.`;
        await sms.sendSms(from, errorMsg);
        return res.json({ success: false, message: result.error });
      }
    }

    // ═══ HELP COMMAND HANDLER ═══
    if (response === 'HELP' || response === 'GUIDE') {
      const measurementGuide = require('../services/measurementGuide');
      const smsGuide = measurementGuide.getSMSGuide('en');
      await sms.sendSms(from, smsGuide);
      return res.json({ success: true, type: 'help' });
    }

    // ═══ INHERITANCE COMMAND HANDLER ═══
    // CONFIRM <CODE>          — beneficiary or elder confirms
    // DISPUTE <CODE> [reason] — beneficiary disputes
    // OBJECT  <CODE> [reason] — elder refuses
    if (['CONFIRM', 'DISPUTE', 'OBJECT'].includes(response)) {
      const code = parts[1];
      const rest = parts.slice(2).join(' ').trim();

      if (!code) {
        await sms.sendSms(from, 'FarmDirect: Please include the code from your invitation SMS.\nExample: CONFIRM ABC123');
        return res.json({ success: true, message: 'Missing code' });
      }

      try {
        const inheritance = require('../services/inheritance');
        const result = inheritance.handleSmsReply(from, response, code, rest);

        if (result.error) {
          await sms.sendSms(from, 'FarmDirect: ' + result.error + '\nCheck the code and try again.');
          return res.json({ success: false, message: result.error });
        }

        // Build confirmation reply
        let reply;
        if (response === 'CONFIRM') {
          reply = result.planStatus === 'activated'
            ? 'FarmDirect: Thank you. All parties have confirmed — the inheritance plan is now ACTIVE.'
            : 'FarmDirect: Thank you. Your confirmation is recorded.';
        } else if (response === 'DISPUTE') {
          reply = 'FarmDirect: Your dispute is recorded. The inheritance plan is now on hold pending family resolution.';
        } else if (response === 'OBJECT') {
          reply = 'FarmDirect: Your objection is recorded. The parent will be notified.';
        }

        await sms.sendSms(from, reply);
        console.log('🏠 Inheritance SMS:', response, code, '| from', from);
        return res.json({ success: true, type: 'inheritance', result });
      } catch (err) {
        console.error('❌ Inheritance SMS handler error:', err.message);
        return res.json({ success: false, message: err.message });
      }
    }

    if (!['YES', 'NO', 'ACCEPT', 'DECLINE'].includes(response)) {
      // Unknown command
      await sms.sendSms(from, 'FarmDirect: Reply YES or NO to delivery offer.');
      return res.json({ success: true, message: 'Unknown command' });
    }

    // Find rider by phone
    const allRiders = [...riderRoute._riders.values()];
    const rider = allRiders.find(r => r.rider.phone === from || r.rider.phone === '+'+from);

    if (!rider) {
      await sms.sendSms(from, 'FarmDirect: Phone not registered. Register at farmdirect.co.ke/rider');
      return res.json({ success: true, message: 'Rider not found' });
    }

    const result = await delivery.handleRiderReply(rider.id, orderId, response);
    await sms.sendSms(from, result.success ? 'FarmDirect: ' + result.message : 'FarmDirect: ' + result.message);

    res.json(result);
  } catch (error) {
    console.error('❌ SMS webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/webhook/ussd
 * Africa's Talking USSD callback (stub for now)
 */
router.post('/ussd', (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  console.log('📱 USSD from', phoneNumber, ':', text);

  // Simple menu — will expand later
  let response = '';
  if (!text || text === '') {
    response = 'CON Welcome to FarmDirect\n1. Check my delivery\n2. Mark delivered\n3. My earnings';
  } else if (text === '1') {
    response = 'END Checking deliveries...';
  } else if (text === '2') {
    response = 'END Which order?';
  } else if (text === '3') {
    response = 'END Your earnings: KES 0';
  } else {
    response = 'END Invalid option';
  }
  res.send(response);
});

/**
 * GET /api/webhook/sms-log
 * View all sent SMS (for debugging)
 */
router.get('/sms-log', (req, res) => {
  res.json({ success: true, stats: sms.getStats(), messages: sms.getSentMessages(50) });
});


/**
 * POST /api/webhook/mpesa
 * Safaricom Daraja STK callback
 * Routes payment results to the KYC service
 */
// ═══════════════════════════════════════════════════════
// SAFARICOM IP WHITELIST (production only)
// ═══════════════════════════════════════════════════════

// Official Safaricom M-Pesa API source ranges (partial list, expand from docs)
const SAFARICOM_IPS = [
  '196.201.214.200', '196.201.214.206', '196.201.214.207', '196.201.214.208',
  '196.201.214.209', '196.201.213.114', '196.201.213.44',
];

function isSafaricomIP(ip) {
  const clean = String(ip || '').replace('::ffff:', '');
  return SAFARICOM_IPS.includes(clean);
}

function requireSafaricomIP(req, res, next) {
  // Allow bypass in dev so local curl tests work
  if (process.env.NODE_ENV !== 'production' && process.env.MPESA_ENV !== 'production') {
    return next();
  }
  if (!isSafaricomIP(req.ip)) {
    console.warn('🚫 Blocked non-Safaricom IP hitting /mpesa:', req.ip);
    return res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
  }
  next();
}

/**
 * POST /api/webhook/mpesa
 * Safaricom Daraja STK callback
 * Routes payment results to the KYC + Land services
 */
router.post('/mpesa', requireSafaricomIP, (req, res) => {
  // Respond 200 immediately — Safaricom retries on timeout
  res.json({ ResultCode: 0, ResultDesc: 'OK' });

  const cb = req.body?.Body?.stkCallback;
  if (!cb) {
    console.warn('⚠️  Invalid M-Pesa callback payload');
    return;
  }

  console.log('');
  console.log('📞 M-Pesa callback received');
  console.log('   CheckoutRequestID:', cb.CheckoutRequestID);
  console.log('   ResultCode:', cb.ResultCode, '|', cb.ResultDesc);
  console.log('');

  // Parse via mpesa service
  let parsed = null;
  try {
    const mpesa = require('../services/mpesa');
    parsed = mpesa.parseCallback(req.body);
  } catch (err) {
    console.error('❌ Failed to parse callback:', err.message);
    return;
  }

  if (!parsed) return;

  // Route to KYC service
  try {
    const kyc = require('../services/kyc');
    kyc.confirmPaymentFromCallback(parsed.checkoutRequestId, parsed)
      .then(result => {
        if (result?.error) {
          console.warn('⚠️  KYC callback:', result.error);
        } else if (result?.record) {
          console.log('✅ KYC verification:', result.record.status);
        }
      })
      .catch(err => console.error('❌ KYC callback error:', err.message));
  } catch (err) {
    console.error('❌ Callback handler error:', err.message);
  }

  // Route to Land Protection (parcel registration fee — KES 500 / premium KES 2000)
  try {
    const land = require('../services/landProtection');
    land.confirmParcelPayment(parsed.checkoutRequestId, parsed)
      .then(r => {
        if (r?.error) {
          console.warn('ℹ️  Land callback (may be non-land txn):', r.error);
        } else if (r?.record) {
          console.log('✅ Land parcel:', r.record.status, '| tier:', r.record.tier);
        }
      })
      .catch(err => console.error('❌ Land callback error:', err.message));
  } catch (err) {
    console.error('❌ Land callback route error:', err.message);
  }

  // Route to Market service (contact unlock fees — KES 100)
  try {
    const market = require('../services/market');
    market.confirmUnlockPayment(parsed.checkoutRequestId, parsed)
      .then(r => {
        if (r?.error) {
          console.warn('ℹ️  Market callback (may be non-market txn):', r.error);
        } else if (r?.unlock) {
          console.log('✅ Contact unlock confirmed:', r.unlock.id);
        }
      })
      .catch(err => console.error('❌ Market callback error:', err.message));
  } catch (err) {
    console.error('❌ Market callback route error:', err.message);
  }

  // Route to Trades service (escrow funding for live trades)
  try {
    const trades = require('../services/trades');
    trades.confirmEscrowFromCallback(parsed.checkoutRequestId, parsed)
      .then(r => {
        if (r?.error) {
          console.warn('ℹ️  Trade callback (may be non-trade txn):', r.error);
        } else if (r?.trade) {
          console.log('✅ Trade escrow funded:', r.trade.id, '| status:', r.trade.status);
        }
      })
      .catch(err => console.error('❌ Trade callback error:', err.message));
  } catch (err) {
    console.error('❌ Trade callback route error:', err.message);
  }

  // NOTE: Order escrow is handled entirely by eConfirm (see services/econfirm.js).
  // The two money flows do not intersect.
});

module.exports = router;
