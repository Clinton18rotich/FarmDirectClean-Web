// FILE: backend/src/services/exemptionProviders/dvs.js
// Real DVS API — stub, ready when credentials arrive.
const DVS_API_URL = process.env.DVS_API_URL;
const DVS_API_KEY = process.env.DVS_API_KEY;
const DVS_TIMEOUT_MS = Number(process.env.DVS_API_TIMEOUT_MS) || 10000;

async function dvsFetch(path, method = 'GET', body = null) {
  if (!DVS_API_URL || !DVS_API_KEY) {
    throw new Error('DVS API not configured (DVS_API_URL / DVS_API_KEY missing)');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DVS_TIMEOUT_MS);
  try {
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${DVS_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(DVS_API_URL + path, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`DVS API ${res.status}: ${json.message || 'unknown error'}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  name: 'dvs',
  requiresManualReview: false,

  async submitExemption(request, data) {
    const response = await dvsFetch('/exemption/verify', 'POST', {
      animalPassport: request.animalPassport,
      animalType: request.animalType,
      ownerId: request.ownerId,
      ownerConsentAt: request.ownerRespondedAt,
      facilityId: request.slaughterhouseId,
      referenceNumber: data.referenceNumber,
      documentType: data.documentType,
    });
    return {
      required: true,
      approved: response.status === 'approved',
      status: response.status || 'pending',
      documentType: data.documentType || null,
      document: data.document || null,
      referenceNumber: response.reference || data.referenceNumber || null,
      issuedBy: response.issuedBy || null,
      issuedAt: response.issuedAt || null,
      validUntil: response.validUntil || null,
      reason: response.reason || null,
      notes: response.notes || data.notes || null,
      submittedBy: data.submittedBy || null,
      submittedAt: new Date().toISOString(),
      reviewedBy: response.reviewedBy || null,
      reviewedAt: response.reviewedAt || new Date().toISOString(),
      rejectionReason: response.rejectionReason || null,
      providerRef: response.id || null,
      provider: 'dvs',
      raw: response,
    };
  },

  async checkExemptionStatus(request) {
    if (!request.exemption?.providerRef) return request.exemption || null;
    const response = await dvsFetch(`/exemption/${request.exemption.providerRef}`);
    return { ...request.exemption, ...response, provider: 'dvs' };
  },
};
