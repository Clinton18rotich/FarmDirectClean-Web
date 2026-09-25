// FILE: backend/src/services/exemptionProviders/manual.js
module.exports = {
  name: 'manual',
  requiresManualReview: true,

  async submitExemption(request, data) {
    return {
      required: true,
      approved: false,
      status: 'pending',
      documentType: data.documentType || null,
      document: data.document || null,
      referenceNumber: data.referenceNumber || null,
      issuedBy: data.issuedBy || null,
      issuedAt: data.issuedAt || null,
      validUntil: data.validUntil || null,
      reason: data.reason || null,
      notes: data.notes || null,
      submittedBy: data.submittedBy || null,
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      providerRef: null,
      provider: 'manual',
      raw: data,
    };
  },

  async checkExemptionStatus(request) {
    return request.exemption || null;
  },
};
