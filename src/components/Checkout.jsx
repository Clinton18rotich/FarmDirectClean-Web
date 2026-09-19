import React, { useState } from 'react';
import { api } from '../services/api';
import { getSellerPaymentInfo } from '../data/farmData';
import LocationPicker from './LocationPicker';

export default function Checkout({ cart, onClose, onOrder }) {
  const [step, setStep] = useState('review');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState(null);
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(2500);
  const [escrowData, setEscrowData] = useState(null);
  const [mpesaCode, setMpesaCode] = useState('');
  const [error, setError] = useState(null);

  // Unique order ID — also used as Paybill account number
  const [orderId] = useState(() =>
    'ORD-' + Date.now().toString(36).toUpperCase().slice(-6)
  );

  const primaryFarmer = cart[0]?.farmer || 'John Kimani';
  const seller = getSellerPaymentInfo(primaryFarmer);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = 300;
  const serviceFee = Math.round(subtotal * 0.05);
  const mpesaFee = (paymentMethod !== 'wallet' && paymentMethod !== 'pochi')
    ? Math.round((subtotal + deliveryFee + serviceFee) * 0.02)
    : 0;
  const total = subtotal + deliveryFee + serviceFee + mpesaFee;
  const walletAfter = walletBalance - total;
  const canUsePochi = total < 1000;

  const handlePay = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      if (paymentMethod === 'pochi') {
        if (mpesaCode.length < 8) throw new Error('Please enter a valid M-Pesa confirmation code');
        if (phone.length < 9) throw new Error('Please enter your M-Pesa phone number');

        const result = await api.recordPochiPayment({
          orderId,
          sellerPhone: seller.pochi,
          amount: total,
          mpesaCode,
          buyerPhone: phone
        });

        if (!result.success) throw new Error(result.message || 'Failed to record payment');

        setStep('confirmed');
        onOrder && onOrder({
          cart, phone, location, note, total, paymentMethod: 'pochi',
          mpesaCode, orderId, sellerPhone: seller.pochi
        });
        return;
      }

      const result = await api.createEscrow({
        buyerEmail: 'buyer@farmdirect.ke',
        sellerEmail: `${primaryFarmer.toLowerCase().replace(/\s+/g, '.')}@farmdirect.ke`,
        sellerPhone: seller.pochi,
        amount: total,
        description: `Order ${orderId}: ${cart.map(c => c.name).join(', ')}`,
        orderId,
        paymentMethod,
        subtotal,
        deliveryFee
      });

      if (!result.success) throw new Error(result.message || 'Failed to create escrow');

      setEscrowData(result.escrow);

      if (paymentMethod === 'wallet') {
        setWalletBalance(walletBalance - total);
      }

      setStep('confirmed');
      onOrder && onOrder({
        cart, phone, location, note, total, paymentMethod,
        escrowId: result.escrow.providerId,
        confirmationCode: result.escrow.confirmationCode,
        orderId
      });

    } catch (err) {
      console.error('Payment failed:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, maxWidth: 450, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

        {step === 'review' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>🛒 Checkout</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            {error && (
              <div style={{ background: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <strong style={{ color: '#C62828', fontSize: 12 }}>⚠️ {error}</strong>
              </div>
            )}

            <div style={{ background: '#F0F4F8', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 11 }}>
              <strong>👨‍🌾 Seller:</strong> {primaryFarmer} &nbsp;•&nbsp;
              <strong>Order:</strong> {orderId}
            </div>

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>Select Payment Method:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div onClick={() => setPaymentMethod('wallet')} style={{
                  background: paymentMethod === 'wallet' ? '#E8F5E9' : '#F5F7FA', borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer',
                  border: paymentMethod === 'wallet' ? '2px solid #4CAF50' : '1px solid #E0E0E0'
                }}>
                  <span style={{ fontSize: 24 }}>💰</span>
                  <p style={{ fontWeight: 'bold', fontSize: 10, margin: '4px 0' }}>Wallet</p>
                  <p style={{ fontSize: 9, color: '#2E7D32' }}>KES {walletBalance.toLocaleString()}</p>
                </div>
                <div onClick={() => setPaymentMethod('till')} style={{
                  background: paymentMethod === 'till' ? '#E8F5E9' : '#F5F7FA', borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer',
                  border: paymentMethod === 'till' ? '2px solid #4CAF50' : '1px solid #E0E0E0'
                }}>
                  <span style={{ fontSize: 24 }}>🏪</span>
                  <p style={{ fontWeight: 'bold', fontSize: 10, margin: '4px 0' }}>Till</p>
                  <p style={{ fontSize: 9, color: '#666' }}>{seller.till}</p>
                </div>
                <div onClick={() => setPaymentMethod('paybill')} style={{
                  background: paymentMethod === 'paybill' ? '#E8F5E9' : '#F5F7FA', borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer',
                  border: paymentMethod === 'paybill' ? '2px solid #4CAF50' : '1px solid #E0E0E0'
                }}>
                  <span style={{ fontSize: 24 }}>🏦</span>
                  <p style={{ fontWeight: 'bold', fontSize: 10, margin: '4px 0' }}>Paybill</p>
                  <p style={{ fontSize: 9, color: '#666' }}>{seller.paybill}</p>
                </div>
              </div>

              {canUsePochi && (
                <div onClick={() => setPaymentMethod('pochi')} style={{
                  background: paymentMethod === 'pochi' ? '#E8F5E9' : '#F5F7FA', borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer',
                  border: paymentMethod === 'pochi' ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                  marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                }}>
                  <span style={{ fontSize: 20 }}>📱</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 'bold', fontSize: 11, margin: 0 }}>Pochi la Biashara</p>
                    <p style={{ fontSize: 9, color: '#666', margin: 0 }}>Quick pay for small orders (under KES 1,000)</p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: paymentMethod === 'pochi' ? '#FFF3E0' : '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 12, border: paymentMethod === 'pochi' ? '1px solid #FFB74D' : '1px solid #90CAF9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>{paymentMethod === 'pochi' ? '⚠️' : '🔒'}</span>
                <div>
                  <strong style={{ color: paymentMethod === 'pochi' ? '#E65100' : '#0D47A1', fontSize: 13 }}>
                    {paymentMethod === 'pochi' ? 'NO ESCROW PROTECTION' : 'ESCROW PROTECTED'}
                  </strong>
                  <p style={{ fontSize: 10, color: paymentMethod === 'pochi' ? '#BF360C' : '#1565C0', margin: '2px 0 0' }}>
                    {paymentMethod === 'pochi'
                      ? 'Pochi payments are final. Only use for small orders with trusted sellers.'
                      : 'Money held securely by eConfirm. Seller paid AFTER you confirm delivery.'}
                  </p>
                </div>
              </div>
            </div>

            {cart.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                <span>{c.image} {c.name} x{c.qty}</span>
                <span>KES {(c.price * c.qty).toLocaleString()}</span>
              </div>
            ))}

            <div style={{ background: '#F5F7FA', borderRadius: 10, padding: 12, margin: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span>🚚 Delivery</span><span>KES {deliveryFee}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span>🔒 ESCROW (5%)</span><span>KES {serviceFee}</span></div>
              {mpesaFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span>💳 M-Pesa (2%)</span><span>KES {mpesaFee}</span></div>}
              <hr />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 18, color: '#2E7D32', padding: '4px 0' }}><span>TOTAL</span><span>KES {total.toLocaleString()}</span></div>
              {paymentMethod === 'wallet' && (
                <p style={{ fontSize: 10, color: walletAfter >= 0 ? '#2E7D32' : '#C62828', textAlign: 'right', margin: 0 }}>
                  Balance after: KES {walletAfter.toLocaleString()}
                </p>
              )}
            </div>

            {paymentMethod === 'wallet' && walletBalance < total && (
              <div style={{ background: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <strong style={{ color: '#C62828' }}>⚠️ Insufficient Balance</strong>
                <p style={{ fontSize: 11, margin: '4px 0' }}>Deposit KES {(total - walletBalance).toLocaleString()} more or use Till/Paybill</p>
                <button onClick={() => setWalletBalance(walletBalance + 10000)} style={{ padding: '8px 16px', background: '#FF6F00', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 11, marginTop: 4 }}>
                  💰 Demo: Add KES 10,000
                </button>
              </div>
            )}

            <LocationPicker value={location} onChange={setLocation} required />
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note to seller (optional)" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 12, fontSize: 13, minHeight: 40, resize: 'vertical' }} />

            <button onClick={() => setStep('payment')} disabled={!location || (!location?.county && !location?.manual) || (paymentMethod === 'wallet' && walletBalance < total)}
              style={{ width: '100%', padding: 16, background: (location && (location.county || location.manual)) && !(paymentMethod === 'wallet' && walletBalance < total) ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: (location && (location.county || location.manual)) ? 'pointer' : 'not-allowed' }}>
              Continue to Payment
            </button>
          </>
        )}

        {step === 'payment' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#4CAF50' }}>
                {paymentMethod === 'wallet' ? '💰 Wallet Payment' : paymentMethod === 'pochi' ? '📱 Pochi la Biashara' : paymentMethod === 'till' ? '🏪 Lipa Na M-Pesa (Till)' : '🏦 Paybill'}
              </h3>
              <button onClick={() => setStep('review')} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            {error && (
              <div style={{ background: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <strong style={{ color: '#C62828', fontSize: 12 }}>⚠️ {error}</strong>
              </div>
            )}

            <div style={{ background: paymentMethod === 'pochi' ? '#E65100' : '#1B5E20', borderRadius: 16, padding: 20, color: 'white', textAlign: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 28 }}>KES {total.toLocaleString()}</h2>
              <p style={{ opacity: .8, fontSize: 12 }}>Paying {primaryFarmer}</p>
            </div>

            {paymentMethod === 'wallet' && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p style={{ fontSize: 14 }}>Wallet Balance: <strong>KES {walletBalance.toLocaleString()}</strong></p>
                <p style={{ fontSize: 14 }}>Amount: <strong style={{ color: '#C62828' }}>KES {total.toLocaleString()}</strong></p>
                <p style={{ fontSize: 14 }}>Remaining: <strong style={{ color: '#2E7D32' }}>KES {(walletBalance - total).toLocaleString()}</strong></p>
                <button onClick={handlePay} disabled={isProcessing}
                  style={{ width: '100%', padding: 16, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 16 }}>
                  {isProcessing ? '⏳ Creating escrow...' : '✅ Confirm Payment from Wallet'}
                </button>
              </div>
            )}

            {paymentMethod === 'till' && (
              <>
                <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <strong style={{ fontSize: 13 }}>🏪 Till Number (Buy Goods)</strong>

                  <p style={{ fontSize: 11, margin: '12px 0 4px', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Till Number</p>
                  <p style={{ fontSize: 26, fontWeight: 'bold', letterSpacing: 2, margin: '4px 0', color: '#2E7D32', textAlign: 'center' }}>
                    {seller.till}
                  </p>

                  <p style={{ fontSize: 11, margin: '12px 0 4px', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Amount</p>
                  <p style={{ fontSize: 20, fontWeight: 'bold', margin: '4px 0', color: '#E65100', textAlign: 'center' }}>
                    KES {total.toLocaleString()}
                  </p>

                  <p style={{ fontSize: 11, color: '#666', marginTop: 12, lineHeight: 1.6 }}>
                    <strong>📱 Steps on M-Pesa:</strong><br />
                    1. M-Pesa → <strong>Lipa na M-Pesa</strong><br />
                    2. <strong>Buy Goods & Services</strong><br />
                    3. Till Number: <strong>{seller.till}</strong><br />
                    4. Amount: <strong>KES {total.toLocaleString()}</strong><br />
                    5. Enter PIN
                  </p>
                </div>

                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your M-Pesa Number (0712345678)" type="tel"
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: '2px solid #4CAF50', marginBottom: 12, fontSize: 16, textAlign: 'center' }} />

                <button onClick={handlePay} disabled={phone.length < 9 || isProcessing}
                  style={{ width: '100%', padding: 16, background: phone.length >= 9 && !isProcessing ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold' }}>
                  {isProcessing ? '⏳ Processing...' : "✅ I've Sent the Money"}
                </button>
              </>
            )}

            {paymentMethod === 'paybill' && (
              <>
                <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <strong style={{ fontSize: 13 }}>🏦 Paybill Details</strong>

                  <p style={{ fontSize: 11, margin: '12px 0 4px', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Business Number</p>
                  <p style={{ fontSize: 24, fontWeight: 'bold', letterSpacing: 2, margin: '4px 0', color: '#2E7D32', textAlign: 'center' }}>
                    {seller.paybill}
                  </p>

                  <p style={{ fontSize: 11, margin: '12px 0 4px', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Account Number</p>
                  <p style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 1, margin: '4px 0', color: '#0D47A1', textAlign: 'center', fontFamily: 'monospace' }}>
                    {orderId}
                  </p>
                  <p style={{ fontSize: 10, color: '#666', textAlign: 'center', margin: '2px 0' }}>
                    👆 Use this exact account number
                  </p>

                  <p style={{ fontSize: 11, margin: '12px 0 4px', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Amount</p>
                  <p style={{ fontSize: 20, fontWeight: 'bold', margin: '4px 0', color: '#E65100', textAlign: 'center' }}>
                    KES {total.toLocaleString()}
                  </p>

                  <p style={{ fontSize: 11, color: '#666', marginTop: 12, lineHeight: 1.6 }}>
                    <strong>📱 Steps on M-Pesa:</strong><br />
                    1. M-Pesa → <strong>Paybill</strong><br />
                    2. Business Number: <strong>{seller.paybill}</strong><br />
                    3. Account Number: <strong>{orderId}</strong><br />
                    4. Amount: <strong>KES {total.toLocaleString()}</strong><br />
                    5. Enter PIN
                  </p>
                </div>

                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your M-Pesa Number (0712345678)" type="tel"
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: '2px solid #4CAF50', marginBottom: 12, fontSize: 16, textAlign: 'center' }} />

                <button onClick={handlePay} disabled={phone.length < 9 || isProcessing}
                  style={{ width: '100%', padding: 16, background: phone.length >= 9 && !isProcessing ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold' }}>
                  {isProcessing ? '⏳ Processing...' : "✅ I've Sent the Money"}
                </button>
              </>
            )}

            {paymentMethod === 'pochi' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <strong style={{ color: '#2E7D32', fontSize: 13 }}>📱 Pochi la Biashara</strong>

                  <p style={{ fontSize: 11, margin: '12px 0 4px', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Seller Phone</p>
                  <p style={{ fontSize: 22, fontWeight: 'bold', color: '#2E7D32', letterSpacing: 1, margin: '4px 0' }}>
                    {seller.pochi}
                  </p>

                  <p style={{ fontSize: 11, margin: '12px 0 4px', color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Amount</p>
                  <p style={{ fontSize: 20, fontWeight: 'bold', margin: '4px 0', color: '#E65100' }}>
                    KES {total.toLocaleString()}
                  </p>

                  <p style={{ fontSize: 11, color: '#666', marginTop: 12, textAlign: 'left', lineHeight: 1.6 }}>
                    <strong>📱 Steps on M-Pesa:</strong><br />
                    1. M-Pesa → <strong>Lipa na M-Pesa</strong><br />
                    2. <strong>Pochi la Biashara</strong><br />
                    3. Seller Phone: <strong>{seller.pochi}</strong><br />
                    4. Amount: <strong>KES {total.toLocaleString()}</strong><br />
                    5. Copy the confirmation code from SMS
                  </p>
                </div>

                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your M-Pesa Number" type="tel"
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: '2px solid #4CAF50', marginBottom: 10, fontSize: 16, textAlign: 'center' }} />

                <input value={mpesaCode} onChange={e => setMpesaCode(e.target.value.toUpperCase())} placeholder="M-Pesa confirmation code (QGH7XYZ123)"
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: '2px solid #4CAF50', marginBottom: 12, fontSize: 16, textAlign: 'center', textTransform: 'uppercase' }} />

                <p style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
                  ⚠️ Pochi has no escrow protection. Only use for small, trusted transactions.
                </p>

                <button onClick={handlePay} disabled={mpesaCode.length < 8 || phone.length < 9 || isProcessing}
                  style={{ width: '100%', padding: 16, background: mpesaCode.length >= 8 && phone.length >= 9 && !isProcessing ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold' }}>
                  {isProcessing ? '⏳ Recording...' : '✅ Confirm Payment'}
                </button>
              </div>
            )}

            <button onClick={() => setStep('review')} style={{ width: '100%', padding: 10, background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginTop: 4 }}>← Back</button>
          </>
        )}

        {step === 'confirmed' && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 70 }}>✅</span>
            <h2 style={{ color: '#2E7D32', margin: '12px 0' }}>
              {paymentMethod === 'pochi' ? 'Payment Recorded!' : 'Escrow Created!'}
            </h2>
            <div style={{ background: paymentMethod === 'pochi' ? '#FFF3E0' : '#E3F2FD', borderRadius: 12, padding: 16, margin: '12px 0' }}>
              <strong style={{ color: paymentMethod === 'pochi' ? '#E65100' : '#0D47A1' }}>
                {paymentMethod === 'pochi' ? `📱 KES ${total.toLocaleString()} via Pochi` : `🔒 KES ${total.toLocaleString()} Protected`}
              </strong>
              <p style={{ fontSize: 12, color: paymentMethod === 'pochi' ? '#BF360C' : '#1565C0', margin: '8px 0 0' }}>
                {paymentMethod === 'pochi' ? 'Seller should have received the payment' : 'Seller paid after delivery confirmation'}
              </p>
              <div style={{ marginTop: 12, padding: 12, background: 'white', borderRadius: 8, textAlign: 'left' }}>
                <p style={{ fontSize: 11, margin: '2px 0' }}><strong>Order ID:</strong> {orderId}</p>
                {escrowData && (
                  <>
                    <p style={{ fontSize: 11, margin: '2px 0' }}><strong>Escrow ID:</strong> {escrowData.providerId}</p>
                    <p style={{ fontSize: 11, margin: '2px 0' }}><strong>Confirmation:</strong> {escrowData.confirmationCode}</p>
                  </>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: 16, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 16 }}>✅ Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
