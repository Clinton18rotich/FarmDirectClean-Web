// Revenue tracking for FarmDirect
// Every transaction logs its fee breakdown here

const REVENUE_MODEL = {
  escrow:    { rate: 0.01, label: 'Escrow fee (eConfirm)', passThrough: true },
  logistics: { rate: 0.15, label: 'Logistics fee (15% of delivery)', passThrough: false },
  service:   { rate: 0.05, label: 'Service fee (5% of subtotal)', passThrough: false },
  featured:  { flat: 300,  label: 'Featured listing', passThrough: false },
  pochi:     { rate: 0.05, label: 'Pochi airtime commission', passThrough: false },
  academy:   { rate: 0.30, label: 'Academy course co-share', passThrough: false },
};

// In-memory revenue log (replace with DB later)
const revenueLog = [];

/**
 * Calculate the revenue breakdown for an order
 * @param {Object} order - { subtotal, deliveryFee, total }
 * @returns {Object} - breakdown of fees and net revenue
 */
function calculateRevenue(order) {
  const subtotal = order.subtotal || 0;
  const deliveryFee = order.deliveryFee || 0;
  const total = order.total || (subtotal + deliveryFee);

  const escrowFee = Math.round(total * REVENUE_MODEL.escrow.rate);
  const logisticsFee = Math.round(deliveryFee * REVENUE_MODEL.logistics.rate);
  const serviceFee = Math.round(subtotal * REVENUE_MODEL.service.rate);

  const grossRevenue = escrowFee + logisticsFee + serviceFee;
  const netRevenue = logisticsFee + serviceFee; // escrow fee passes to eConfirm

  return {
    escrowFee,
    logisticsFee,
    serviceFee,
    grossRevenue,
    netRevenue,
    marketingBudget: Math.round(netRevenue * 0.20), // 20% for growth
  };
}

/**
 * Log a transaction's revenue
 */
function logRevenue({ orderId, escrowId, amount, breakdown }) {
  const entry = {
    orderId,
    escrowId,
    amount,
    ...breakdown,
    timestamp: new Date().toISOString(),
  };
  revenueLog.push(entry);
  console.log('💰 Revenue logged:', entry);
  return entry;
}

/**
 * Get revenue summary
 */
function getSummary(period = 'all') {
  const now = new Date();
  let filtered = revenueLog;

  if (period === 'today') {
    const today = now.toISOString().split('T')[0];
    filtered = revenueLog.filter(e => e.timestamp.startsWith(today));
  } else if (period === 'month') {
    const month = now.toISOString().slice(0, 7);
    filtered = revenueLog.filter(e => e.timestamp.startsWith(month));
  }

  const totals = filtered.reduce((acc, e) => ({
    grossRevenue: acc.grossRevenue + e.grossRevenue,
    netRevenue: acc.netRevenue + e.netRevenue,
    logisticsFee: acc.logisticsFee + e.logisticsFee,
    serviceFee: acc.serviceFee + e.serviceFee,
    marketingBudget: acc.marketingBudget + e.marketingBudget,
    transactions: acc.transactions + 1,
  }), {
    grossRevenue: 0, netRevenue: 0, logisticsFee: 0,
    serviceFee: 0, marketingBudget: 0, transactions: 0,
  });

  return { period, ...totals };
}

module.exports = {
  REVENUE_MODEL,
  calculateRevenue,
  logRevenue,
  getSummary,
  revenueLog,
};
