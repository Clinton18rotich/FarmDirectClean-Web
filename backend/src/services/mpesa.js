/**
 * M-Pesa Daraja Service
 * Handles STK Push (C2B) for KYC payments + escrow
 * 
 * ENV VARIABLES REQUIRED:
 *   MPESA_ENV=sandbox|production
 *   CONSUMER_KEY=xxx
 *   CONSUMER_SECRET=xxx
 *   SHORT_CODE=174379 (sandbox) or your paybill
 *   PASSKEY=xxx
 *   BASE_URL=https://sandbox.safaricom.co.ke (or production URL)
 *   CALLBACK_URL=https://your-ngrok.ngrok.io/api/webhook/mpesa
 */

const axios = require('axios');

// ═════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════

function getTimestamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
}

function getPassword(shortCode, passkey, timestamp) {
  return Buffer.from(shortCode + passkey + timestamp).toString('base64');
}

async function getAccessToken() {
  const auth = Buffer.from(
    process.env.CONSUMER_KEY + ':' + process.env.CONSUMER_SECRET
  ).toString('base64');

  const res = await axios.get(
    `${process.env.BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  return res.data.access_token;
}

function normalizePhone(phone) {
  let fp = String(phone).replace(/^0+/, '').replace(/^\+254/, '');
  if (!fp.startsWith('254')) fp = '254' + fp;
  return fp;
}

/**
 * Check if M-Pesa is configured
 */
function isConfigured() {
  return !!(
    process.env.CONSUMER_KEY &&
    process.env.CONSUMER_SECRET &&
    process.env.SHORT_CODE &&
    process.env.PASSKEY &&
    process.env.BASE_URL &&
    process.env.CALLBACK_URL &&
    !process.env.CONSUMER_KEY.includes('your_')
  );
}

/**
 * Get current mode: 'sandbox' | 'production' | 'not_configured'
 */
function getMode() {
  if (!isConfigured()) return 'not_configured';
  return process.env.MPESA_ENV || 'sandbox';
}

// ═════════════════════════════════════════════════════
// STK PUSH (Customer to Business)
// ═════════════════════════════════════════════════════

/**
 * Send STK Push to customer's phone
 * 
 * @param {Object} data
 * @param {string} data.phone - Customer phone (07xx or +2547xx or 2547xx)
 * @param {number} data.amount - Amount in KES
 * @param {string} data.accountRef - Reference (e.g. KYC-XXXXX)
 * @param {string} data.description - Description
 * @returns {Promise<Object>} Safaricom response
 */
async function stkPush(data) {
  const { phone, amount, accountRef, description } = data;

  if (!isConfigured()) {
    throw new Error('M-Pesa not configured. Set credentials in .env');
  }

  const fp = normalizePhone(phone);
  const token = await getAccessToken();
  const ts = getTimestamp();

  const response = await axios.post(
    `${process.env.BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: process.env.SHORT_CODE,
      Password: getPassword(process.env.SHORT_CODE, process.env.PASSKEY, ts),
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: fp,
      PartyB: process.env.SHORT_CODE,
      PhoneNumber: fp,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: accountRef || 'FarmDirect',
      TransactionDesc: description || 'Payment',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('📱 STK Push sent:', response.data.CheckoutRequestID, '| Phone:', fp, '| Amount: KES', amount);

  return response.data;
}

/**
 * Query STK Push status
 */
async function queryStkStatus(checkoutRequestId) {
  if (!isConfigured()) {
    throw new Error('M-Pesa not configured');
  }

  const token = await getAccessToken();
  const ts = getTimestamp();

  const response = await axios.post(
    `${process.env.BASE_URL}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: process.env.SHORT_CODE,
      Password: getPassword(process.env.SHORT_CODE, process.env.PASSKEY, ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

// ═════════════════════════════════════════════════════
// B2C (Business to Customer) — for escrow releases
// ═════════════════════════════════════════════════════

async function b2cPayment(data) {
  const { phone, amount, remarks, occasion } = data;

  if (!isConfigured()) {
    throw new Error('M-Pesa not configured');
  }

  // B2C requires separate credentials usually
  if (!process.env.B2C_INITIATOR_NAME || !process.env.B2C_SECURITY_CREDENTIAL) {
    throw new Error('B2C not configured (requires B2C_INITIATOR_NAME + B2C_SECURITY_CREDENTIAL)');
  }

  const fp = normalizePhone(phone);
  const token = await getAccessToken();

  const response = await axios.post(
    `${process.env.BASE_URL}/mpesa/b2c/v1/paymentrequest`,
    {
      InitiatorName: process.env.B2C_INITIATOR_NAME,
      SecurityCredential: process.env.B2C_SECURITY_CREDENTIAL,
      CommandID: 'BusinessPayment',
      Amount: Math.round(amount),
      PartyA: process.env.SHORT_CODE,
      PartyB: fp,
      Remarks: remarks || 'Payment',
      QueueTimeOutURL: `${process.env.CALLBACK_URL}/timeout`,
      ResultURL: `${process.env.CALLBACK_URL}/result`,
      Occasion: occasion || '',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

// ═════════════════════════════════════════════════════
// CALLBACK PARSER
// ═════════════════════════════════════════════════════

/**
 * Parse Safaricom STK callback
 * Returns standardized result
 */
function parseCallback(body) {
  const cb = body.Body?.stkCallback;
  if (!cb) return null;

  const result = {
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: cb.MerchantRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    success: cb.ResultCode === 0,
    amount: null,
    mpesaReceipt: null,
    phone: null,
    transactionDate: null,
  };

  if (cb.ResultCode === 0 && cb.CallbackMetadata?.Item) {
    const items = cb.CallbackMetadata.Item;
    result.amount = items.find(i => i.Name === 'Amount')?.Value;
    result.mpesaReceipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
    result.phone = items.find(i => i.Name === 'PhoneNumber')?.Value;
    result.transactionDate = items.find(i => i.Name === 'TransactionDate')?.Value;
  }

  return result;
}

module.exports = {
  stkPush,
  queryStkStatus,
  b2cPayment,
  parseCallback,
  isConfigured,
  getMode,
  normalizePhone,
  getAccessToken,
};
