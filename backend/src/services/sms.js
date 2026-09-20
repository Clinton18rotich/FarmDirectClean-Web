const storage = require('./storage');

const AT_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AT_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';
const AT_ENABLED = !!(AT_API_KEY && AT_USERNAME);

// Load SMS log from disk, keep last 200
let sentMessages = storage.load('sms', []);
if (!Array.isArray(sentMessages)) sentMessages = [];

function persist() {
  // Keep only last 200 messages
  if (sentMessages.length > 200) {
    sentMessages = sentMessages.slice(-200);
  }
  storage.save('sms', sentMessages);
}

async function sendSms(to, message, options = {}) {
  const normalized = to.startsWith('+') ? to : '+' + to;
  const entry = {
    id: 'SMS-' + Date.now().toString(36).toUpperCase(),
    to: normalized,
    message,
    channel: 'sms',
    status: AT_ENABLED ? 'pending' : 'stub',
    sentAt: new Date().toISOString(),
    ...options,
  };

  if (AT_ENABLED) {
    try {
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'apiKey': AT_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          username: AT_USERNAME,
          to: normalized,
          message: message,
          from: options.senderId || 'FARMDIRECT',
        }),
      });
      const data = await response.json();
      entry.status = 'sent';
      entry.providerResponse = data;
      console.log('📱 SMS SENT to', normalized);
    } catch (err) {
      entry.status = 'failed';
      entry.error = err.message;
      console.error('❌ SMS failed:', err.message);
    }
  } else {
    console.log('');
    console.log('════════════════════════════════════════');
    console.log('📱 SMS STUB');
    console.log('   To:', normalized);
    console.log('   Message:', message.replace(/\n/g, ' | '));
    console.log('════════════════════════════════════════');
    console.log('');
  }

  sentMessages.push(entry);
  persist();
  return entry;
}

function getSentMessages(limit = 50) {
  return sentMessages.slice(-limit).reverse();
}

function getStats() {
  return {
    total: sentMessages.length,
    sent: sentMessages.filter(m => m.status === 'sent').length,
    stub: sentMessages.filter(m => m.status === 'stub').length,
    failed: sentMessages.filter(m => m.status === 'failed').length,
    mode: AT_ENABLED ? 'LIVE' : 'STUB',
  };
}

module.exports = {
  sendSms,
  getSentMessages,
  getStats,
  isLive: () => AT_ENABLED,
};
