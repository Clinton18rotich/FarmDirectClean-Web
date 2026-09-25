// FILE: backend/src/services/exemptionProviders/index.js
// Provider selector for legal exemption verification.
// Flip EXEMPTION_PROVIDER=dvs when the real DVS API is available.
const manual = require('./manual');

let dvs = null;
try { dvs = require('./dvs'); } catch (e) { dvs = null; }

const mode = (process.env.EXEMPTION_PROVIDER || 'manual').toLowerCase();
const provider = (mode === 'dvs' && dvs) ? dvs : manual;

module.exports = {
  name: () => provider.name,
  requiresManualReview: () => provider.requiresManualReview,

  async submitExemption(request, exemptionData) {
    try {
      return await provider.submitExemption(request, exemptionData);
    } catch (err) {
      if (provider.name !== 'manual') {
        console.warn('⚠️  Exemption provider failed, falling back to manual:', err.message);
        const result = await manual.submitExemption(request, exemptionData);
        result.fallbackFromProvider = provider.name;
        result.fallbackReason = err.message;
        return result;
      }
      throw err;
    }
  },

  async checkExemptionStatus(request) {
    if (provider.name === 'manual') return request.exemption || null;
    try {
      return await provider.checkExemptionStatus(request);
    } catch (err) {
      console.warn('⚠️  Exemption status check failed:', err.message);
      return request.exemption || null;
    }
  },
};
