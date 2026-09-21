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

module.exports = router;
