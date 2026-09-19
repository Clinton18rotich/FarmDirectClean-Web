const axios = require('axios');

class EConfirmProvider {
  constructor() {
    this.baseUrl = process.env.ECONFIRM_BASE_URL || 'https://econfirm.co.ke/api/v1';
    this.apiKey = process.env.ECONFIRM_API_KEY;
  }

  // 1. Create Escrow Transaction
  async createEscrow({ buyerEmail, sellerEmail, sellerPhone, amount, description, terms }) {
    try {
      const response = await axios.post(`${this.baseUrl}/transactions`, {
        buyer_email: buyerEmail,
        seller_email: sellerEmail,
        receiver_phone: sellerPhone,
        amount: Math.round(amount),
        currency: 'KES',
        description: description,
        terms: terms || 'Payment upon delivery confirmation'
      }, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });

      // SAVE the confirmation_code - needed for release later
      return {
        success: true,
        providerId: response.data.data.id,
        status: response.data.data.status,
        confirmationCode: response.data.data.confirmation_code,
        maxPrincipal: response.data.data.integration.max_principal_kes
      };
    } catch (error) {
      console.error('❌ eConfirm create error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create escrow');
    }
  }

  // 2. Check Status
  async getStatus(transactionId) {
    const response = await axios.get(`${this.baseUrl}/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });
    return response.data.data;
  }

  // 3. Release Funds
  async release(transactionId, confirmationCode, notes) {
    const response = await axios.post(
      `${this.baseUrl}/transactions/${transactionId}/release`,
      { confirmation_code: confirmationCode, notes },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    return response.data.data;
  }
}

module.exports = new EConfirmProvider();
