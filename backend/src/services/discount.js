/**
 * Discount Request Service
 * Handles seller self-service discount requests + admin approval
 */

const storage = require('./storage');

const requests = storage.objectToMap(storage.load('discount_requests', {}));

function persist() {
  storage.save('discount_requests', storage.mapToObject(requests));
}

// ═════════════════════════════════════════════════════
// AUTO-QUALIFICATION RULES
// ═════════════════════════════════════════════════════

const AUTO_APPROVE_RULES = {
  minTransactions: 5,        // Must have completed 5+ orders
  minTotalVolume: 100000,    // Must have done KES 100,000+ in sales
  minDaysActive: 30,         // Must have been registered 30+ days
  maxDiscountPercent: 20,    // Can't ask for more than 20% off
  maxActiveRequests: 1,      // Only one open request at a time
};

// ═════════════════════════════════════════════════════
// CREATE DISCOUNT REQUEST
// ═════════════════════════════════════════════════════

function createRequest(data) {
  const {
    sellerId, sellerName, sellerPhone,
    currentRate, requestedRate, requestedDiscountPercent,
    reason, expectedMonthlyVolume,
  } = data;

  // Validation
  if (!sellerId || !sellerPhone) {
    return { error: 'Seller ID and phone required' };
  }
  if (!requestedRate || requestedRate < 0.5 || requestedRate > 20) {
    return { error: 'Requested rate must be between 0.5% and 20%' };
  }
  if (!expectedMonthlyVolume || expectedMonthlyVolume < 10000) {
    return { error: 'Expected monthly volume must be at least KES 10,000' };
  }

  // Check for existing active request
  const existing = [...requests.values()].find(r => 
    r.sellerId === sellerId && ['pending', 'auto_pending'].includes(r.status)
  );
  if (existing) {
    return { error: 'You already have a pending request. Wait for approval.' };
  }

  // Auto-review
  const autoReview = checkAutoQualification(sellerId, {
    requestedRate,
    expectedMonthlyVolume,
  });

  const id = 'DISC-' + Date.now().toString(36).toUpperCase();

  const request = {
    id,
    sellerId,
    sellerName,
    sellerPhone,
    currentRate,
    requestedRate: parseFloat(requestedRate),
    discountPercent: parseFloat(requestedDiscountPercent) || (currentRate - requestedRate),
    reason: reason || '',
    expectedMonthlyVolume: parseInt(expectedMonthlyVolume),
    
    // Auto-review results
    autoReview,
    status: autoReview.autoApproved ? 'auto_approved' : 'pending',
    
    // Admin review
    reviewedBy: null,
    reviewedAt: null,
    adminNotes: null,
    
    // Timeline
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    
    // History
    history: [{
      status: 'created',
      at: new Date().toISOString(),
      note: `Requested ${requestedRate}% (from ${currentRate}%)`,
    }],
  };

  if (autoReview.autoApproved) {
    request.history.push({
      status: 'auto_approved',
      at: new Date().toISOString(),
      note: 'Auto-approved by system',
    });
    request.reviewedBy = 'system';
    request.reviewedAt = new Date().toISOString();
  }

  requests.set(id, request);
  persist();

  console.log('💰 Discount request:', id, '|', sellerName);
  console.log('   From', currentRate + '% →', requestedRate + '%');
  console.log('   Status:', request.status);

  return request;
}

/**
 * Auto-qualification rules
 */
function checkAutoQualification(sellerId, requestData) {
  // In a real system, we'd query actual seller stats
  // For now, we return a structure that shows what would be checked
  
  const checks = {
    hasTransactionHistory: {
      passed: false, // Would check actual transactions
      required: `${AUTO_APPROVE_RULES.minTransactions} completed orders`,
      note: 'Feature coming when order tracking is complete',
    },
    hasVolumeHistory: {
      passed: false,
      required: `KES ${AUTO_APPROVE_RULES.minTotalVolume.toLocaleString()} total volume`,
      note: 'Feature coming when order tracking is complete',
    },
    reasonableDiscount: {
      passed: requestData.requestedRate >= 1,
      required: `Rate ≥ 1%`,
      note: `Requested ${requestData.requestedRate}%`,
    },
    reasonableVolume: {
      passed: requestData.expectedMonthlyVolume >= 50000,
      required: `Expected volume ≥ KES 50,000/month`,
      note: `Expected KES ${requestData.expectedMonthlyVolume.toLocaleString()}/month`,
    },
  };

  const autoApproved = Object.values(checks).every(c => c.passed);

  return {
    autoApproved,
    checks,
    recommendedAction: autoApproved 
      ? 'Approved automatically' 
      : 'Sent to admin for manual review',
  };
}

// ═════════════════════════════════════════════════════
// LIST & RETRIEVE
// ═════════════════════════════════════════════════════

function getRequest(id) {
  return requests.get(id);
}

function listRequests(filter = {}) {
  let list = [...requests.values()];
  if (filter.status) list = list.filter(r => r.status === filter.status);
  if (filter.sellerId) list = list.filter(r => r.sellerId === filter.sellerId);
  if (filter.pendingOnly) {
    list = list.filter(r => ['pending', 'auto_pending'].includes(r.status));
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getActiveDiscount(sellerId) {
  return [...requests.values()].find(r => 
    r.sellerId === sellerId && ['auto_approved', 'approved'].includes(r.status)
  ) || null;
}

// ═════════════════════════════════════════════════════
// ADMIN APPROVAL
// ═════════════════════════════════════════════════════

function approveRequest(id, adminId, notes) {
  const req = requests.get(id);
  if (!req) return { error: 'Request not found' };
  if (!['pending', 'auto_pending'].includes(req.status)) {
    return { error: 'Request already ' + req.status };
  }

  req.status = 'approved';
  req.reviewedBy = adminId || 'admin';
  req.reviewedAt = new Date().toISOString();
  req.adminNotes = notes || '';

  req.history.push({
    status: 'approved',
    at: new Date().toISOString(),
    note: notes || `Approved by admin`,
  });

  persist();
  console.log('✅ Discount approved:', id, '|', req.sellerName);
  return { success: true, request: req };
}

function rejectRequest(id, adminId, reason) {
  const req = requests.get(id);
  if (!req) return { error: 'Request not found' };
  if (!['pending', 'auto_pending'].includes(req.status)) {
    return { error: 'Request already ' + req.status };
  }

  req.status = 'rejected';
  req.reviewedBy = adminId || 'admin';
  req.reviewedAt = new Date().toISOString();
  req.adminNotes = reason || 'Rejected';

  req.history.push({
    status: 'rejected',
    at: new Date().toISOString(),
    note: reason || 'Rejected by admin',
  });

  persist();
  console.log('❌ Discount rejected:', id, '|', req.sellerName);
  return { success: true, request: req };
}

function revokeDiscount(id, adminId, reason) {
  const req = requests.get(id);
  if (!req) return { error: 'Request not found' };

  req.status = 'revoked';
  req.reviewedBy = adminId || 'admin';
  req.reviewedAt = new Date().toISOString();
  req.adminNotes = reason || 'Revoked';

  req.history.push({
    status: 'revoked',
    at: new Date().toISOString(),
    note: reason || 'Revoked by admin',
  });

  persist();
  console.log('⚠️  Discount revoked:', id);
  return { success: true, request: req };
}

// ═════════════════════════════════════════════════════
// STATS
// ═════════════════════════════════════════════════════

function getStats() {
  const all = [...requests.values()];
  return {
    total: all.length,
    pending: all.filter(r => ['pending', 'auto_pending'].includes(r.status)).length,
    autoApproved: all.filter(r => r.status === 'auto_approved').length,
    approved: all.filter(r => r.status === 'approved').length,
    rejected: all.filter(r => r.status === 'rejected').length,
    revoked: all.filter(r => r.status === 'revoked').length,
    totalDiscountGiven: all
      .filter(r => ['auto_approved', 'approved'].includes(r.status))
      .reduce((s, r) => s + (r.discountPercent || 0), 0),
  };
}

module.exports = {
  AUTO_APPROVE_RULES,
  createRequest,
  getRequest,
  listRequests,
  getActiveDiscount,
  approveRequest,
  rejectRequest,
  revokeDiscount,
  getStats,
  _requests: requests,
};
