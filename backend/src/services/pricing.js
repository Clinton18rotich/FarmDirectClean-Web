/**
 * FarmDirect Pricing & Commission Engine
 * Tiered commission + escrow fees
 * Seller pays fees from proceeds
 */

// ═════════════════════════════════════════════════════
// COMMISSION TIERS
// ═════════════════════════════════════════════════════

const COMMISSION_TIERS = [
  { 
    id: 'micro',
    min: 0, 
    max: 1000, 
    type: 'flat', 
    value: 20,
    label: 'Micro sale',
    description: 'Small produce, single items',
  },
  { 
    id: 'small',
    min: 1000, 
    max: 20000, 
    type: 'percent', 
    value: 3.5,
    label: 'Small sale',
    description: 'Chickens, goats, small crops',
  },
  { 
    id: 'medium',
    min: 20000, 
    max: 100000, 
    type: 'percent', 
    value: 5.0,
    label: 'Medium sale',
    description: 'Cows, bulk produce',
  },
  { 
    id: 'large',
    min: 100000, 
    max: 500000, 
    type: 'percent', 
    value: 6.0,
    label: 'Large sale',
    description: 'High-value livestock, bulls',
  },
  { 
    id: 'wholesale',
    min: 500000, 
    max: Infinity, 
    type: 'percent', 
    value: 7.0,
    label: 'Wholesale',
    description: 'Trucks, bulk exports',
  },
];

// eConfirm escrow fee (external provider)
const ESCROW_FEE_PERCENT = 1.0;
const ESCROW_MIN_FEE = 10;

// ═════════════════════════════════════════════════════
// CALCULATION FUNCTIONS
// ═════════════════════════════════════════════════════

/**
 * Find the applicable commission tier for an amount
 */
function findTier(amount) {
  return COMMISSION_TIERS.find(t => amount >= t.min && amount < t.max) || COMMISSION_TIERS[COMMISSION_TIERS.length - 1];
}

/**
 * Calculate FarmDirect's platform commission
 */
function calculatePlatformFee(amount) {
  const tier = findTier(amount);
  if (tier.type === 'flat') return tier.value;
  return Math.round(amount * (tier.value / 100));
}

/**
 * Calculate eConfirm escrow fee
 */
function calculateEscrowFee(amount) {
  const fee = Math.round(amount * (ESCROW_FEE_PERCENT / 100));
  return Math.max(ESCROW_MIN_FEE, fee);
}

/**
 * Calculate full breakdown for an order
 * Default: seller pays fees from proceeds
 */
function calculateOrderFees(amount, options = {}) {
  const {
    payer = 'seller', // 'seller' | 'buyer' | 'split'
    includeEscrow = true,
    category = null,
  } = options;

  const platformFee = calculatePlatformFee(amount);
  const escrowFee = includeEscrow ? calculateEscrowFee(amount) : 0;
  const totalFees = platformFee + escrowFee;

  // Default: seller pays from proceeds
  let sellerPays = totalFees;
  let buyerPays = 0;

  if (payer === 'buyer') {
    sellerPays = 0;
    buyerPays = totalFees;
  } else if (payer === 'split') {
    sellerPays = Math.round(totalFees / 2);
    buyerPays = totalFees - sellerPays;
  }

  const sellerReceives = amount - sellerPays;
  const buyerTotal = amount + buyerPays;

  return {
    orderAmount: amount,
    category,
    tier: findTier(amount),
    platformFee,
    escrowFee,
    totalFees,
    payer,
    sellerPays,
    buyerPays,
    sellerReceives,
    buyerTotal,
    breakdown: {
      productPrice: amount,
      farmdirectCommission: platformFee,
      escrowFee,
      sellerNetIncome: sellerReceives,
      buyerTotalPaid: buyerTotal,
    },
  };
}

/**
 * Calculate fees for cart with multiple items
 * Uses total cart value for tier determination
 */
function calculateCartFees(cartItems, options = {}) {
  const subtotal = cartItems.reduce((s, i) => s + (i.price * i.qty), 0);
  const deliveryFee = options.deliveryFee || 0;
  
  // Tier is based on product subtotal only (not delivery)
  const orderFees = calculateOrderFees(subtotal, options);
  
  return {
    ...orderFees,
    subtotal,
    deliveryFee,
    grandTotal: orderFees.buyerTotal + deliveryFee,
  };
}

/**
 * Get all tiers (for display/transparency)
 */
function getTiers() {
  return COMMISSION_TIERS.map(t => ({
    id: t.id,
    min: t.min,
    max: t.max === Infinity ? null : t.max,
    type: t.type,
    value: t.value,
    label: t.label,
    description: t.description,
    displayRange: t.max === Infinity 
      ? `Above KES ${t.min.toLocaleString()}` 
      : t.min === 0 
        ? `Under KES ${t.max.toLocaleString()}`
        : `KES ${t.min.toLocaleString()} - ${t.max.toLocaleString()}`,
    displayFee: t.type === 'flat' 
      ? `KES ${t.value} flat` 
      : `${t.value}%`,
  }));
}

/**
 * Estimate what a seller would receive
 */
function estimateSellerEarnings(amount, payer = 'seller') {
  const fees = calculateOrderFees(amount, { payer });
  return {
    grossAmount: amount,
    platformFee: fees.platformFee,
    escrowFee: fees.escrowFee,
    totalFees: fees.totalFees,
    netEarnings: fees.sellerReceives,
    effectiveRate: ((fees.totalFees / amount) * 100).toFixed(2) + '%',
  };
}

/**
 * Compare tier scenarios (for seller transparency)
 */
function compareTiers() {
  const samples = [500, 2000, 10000, 50000, 200000, 1000000];
  return samples.map(amount => {
    const fees = calculateOrderFees(amount);
    return {
      amount,
      tier: fees.tier.label,
      commissionRate: fees.tier.type === 'flat' 
        ? `KES ${fees.tier.value}` 
        : `${fees.tier.value}%`,
      platformFee: fees.platformFee,
      escrowFee: fees.escrowFee,
      sellerGets: fees.sellerReceives,
      effectiveRate: ((fees.totalFees / amount) * 100).toFixed(2) + '%',
    };
  });
}

module.exports = {
  COMMISSION_TIERS,
  ESCROW_FEE_PERCENT,
  findTier,
  calculatePlatformFee,
  calculateEscrowFee,
  calculateOrderFees,
  calculateCartFees,
  getTiers,
  estimateSellerEarnings,
  compareTiers,
};
