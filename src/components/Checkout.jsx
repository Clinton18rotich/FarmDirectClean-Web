import React, { useState } from 'react';

const MPESA_TILL = '4123456'; // Your FarmDirect Till Number
const MPESA_PAYBILL = '247247'; // Business Paybill
const MPESA_ACCOUNT = 'FARMDIRECT';

export default function Checkout({ cart, onClose, onOrder }) {
  const [step, setStep] = useState('review');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // wallet, till, paybill
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(2500); // Demo balance

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = 300;
  const serviceFee = Math.round(subtotal * 0.05);
  const mpesaFee = paymentMethod !== 'wallet' ? Math.round((subtotal + deliveryFee + serviceFee) * 0.02) : 0;
  const total = subtotal + deliveryFee + serviceFee + mpesaFee;
  const walletAfter = walletBalance - total;

  const handlePay = () => {
    if (paymentMethod === 'wallet') {
      if (walletBalance < total) return alert('Insufficient wallet balance. Deposit KES ' + (total - walletBalance).toLocaleString() + ' more.');
      setIsProcessing(true);
      setTimeout(() => {
        setWalletBalance(walletBalance - total);
        setIsProcessing(false);
        setStep('confirmed');
        onOrder && onOrder({ cart, phone, location, note, total, paymentMethod, orderId: 'ORD-' + Date.now().toString(36).toUpperCase().slice(-6) });
      }, 1000);
    } else {
      if (phone.length < 9) return alert('Enter valid M-Pesa number');
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setStep('confirmed');
        onOrder && onOrder({ cart, phone, location, note, total, paymentMethod, orderId: 'ORD-' + Date.now().toString(36).toUpperCase().slice(-6) });
      }, 2000);
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

            {/* PAYMENT METHOD SELECTION */}
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
                  <p style={{ fontWeight: 'bold', fontSize: 10, margin: '4px 0' }}>Till Number</p>
                  <p style={{ fontSize: 9, color: '#666' }}>Buy Goods</p>
                </div>
                <div onClick={() => setPaymentMethod('paybill')} style={{
                  background: paymentMethod === 'paybill' ? '#E8F5E9' : '#F5F7FA', borderRadius: 10, padding: 10, textAlign: 'center', cursor: 'pointer',
                  border: paymentMethod === 'paybill' ? '2px solid #4CAF50' : '1px solid #E0E0E0'
                }}>
                  <span style={{ fontSize: 24 }}>🏦</span>
                  <p style={{ fontWeight: 'bold', fontSize: 10, margin: '4px 0' }}>Paybill</p>
                  <p style={{ fontSize: 9, color: '#666' }}>Business</p>
                </div>
              </div>
            </div>

            {/* ESCROW BANNER */}
            <div style={{ background: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #90CAF9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>🔒</span>
                <div>
                  <strong style={{ color: '#0D47A1', fontSize: 13 }}>ESCROW PROTECTED</strong>
                  <p style={{ fontSize: 10, color: '#1565C0', margin: '2px 0 0' }}>Money held securely. Seller paid AFTER you confirm delivery.</p>
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

            <div style={{ background: '#FFF8E1', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <strong style={{ color: '#E65100', fontSize: 11 }}>⚠️ NEVER SEND MONEY OUTSIDE FARMDIRECT</strong>
            </div>

            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Delivery Location *" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 8, fontSize: 13 }} />
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note to seller (optional)" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 12, fontSize: 13, minHeight: 40, resize: 'vertical' }} />

            <button onClick={() => setStep('payment')} disabled={!location || (paymentMethod === 'wallet' && walletBalance < total)} 
              style={{ width: '100%', padding: 16, background: location && !(paymentMethod === 'wallet' && walletBalance < total) ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: location ? 'pointer' : 'not-allowed' }}>
              {paymentMethod === 'wallet' ? `💰 Pay KES ${total.toLocaleString()} from Wallet` : `💳 Pay KES ${total.toLocaleString()} via M-Pesa`}
            </button>
          </>
        )}

        {step === 'payment' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#4CAF50' }}>
                {paymentMethod === 'wallet' ? '💰 Wallet Payment' : paymentMethod === 'till' ? '🏪 Lipa Na M-Pesa (Till)' : '🏦 Paybill'}
              </h3>
              <button onClick={() => setStep('review')} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: '#1B5E20', borderRadius: 16, padding: 20, color: 'white', textAlign: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 28 }}>KES {total.toLocaleString()}</h2>
              <p style={{ opacity: .8, fontSize: 12 }}>
                {paymentMethod === 'wallet' ? 'Deduct from FarmDirect Wallet' : paymentMethod === 'till' ? 'Lipa Na M-Pesa - Buy Goods & Services' : 'M-Pesa Paybill'}
              </p>
            </div>

            {paymentMethod === 'wallet' ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p style={{ fontSize: 14 }}>Wallet Balance: <strong>KES {walletBalance.toLocaleString()}</strong></p>
                <p style={{ fontSize: 14 }}>Amount: <strong style={{ color: '#C62828' }}>KES {total.toLocaleString()}</strong></p>
                <p style={{ fontSize: 14 }}>Remaining: <strong style={{ color: '#2E7D32' }}>KES {(walletBalance - total).toLocaleString()}</strong></p>
                <button onClick={handlePay} disabled={isProcessing}
                  style={{ width: '100%', padding: 16, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 16 }}>
                  {isProcessing ? '⏳ Processing...' : '✅ Confirm Payment from Wallet'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <strong>📱 {paymentMethod === 'till' ? 'Till Number' : 'Paybill'}:</strong>
                  <p style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2, margin: '8px 0', color: '#2E7D32' }}>
                    {paymentMethod === 'till' ? MPESA_TILL : MPESA_PAYBILL}
                  </p>
                  {paymentMethod === 'paybill' && <p style={{ fontSize: 12 }}>Account: <strong>{MPESA_ACCOUNT}</strong></p>}
                  <p style={{ fontSize: 11, color: '#666' }}>
                    {paymentMethod === 'till' ? 'Select "Buy Goods & Services" on M-Pesa' : 'Select "Paybill" on M-Pesa'}
                  </p>
                </div>

                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your M-Pesa Number (e.g. 0712345678)" type="tel" 
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: '2px solid #4CAF50', marginBottom: 12, fontSize: 16, textAlign: 'center' }} />

                <button onClick={handlePay} disabled={phone.length < 9 || isProcessing}
                  style={{ width: '100%', padding: 16, background: phone.length >= 9 && !isProcessing ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: phone.length >= 9 && !isProcessing ? 'pointer' : 'not-allowed' }}>
                  {isProcessing ? '⏳ Processing...' : `✅ I've Sent KES ${total.toLocaleString()} to ${paymentMethod === 'till' ? 'Till ' + MPESA_TILL : 'Paybill ' + MPESA_PAYBILL}`}
                </button>
              </>
            )}

            <button onClick={() => setStep('review')} style={{ width: '100%', padding: 10, background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginTop: 4 }}>← Back</button>
          </>
        )}

        {step === 'confirmed' && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 70 }}>✅</span>
            <h2 style={{ color: '#2E7D32', margin: '12px 0' }}>Payment Successful!</h2>
            <div style={{ background: '#E3F2FD', borderRadius: 12, padding: 16, margin: '12px 0' }}>
              <strong style={{ color: '#0D47A1' }}>🔒 KES {total.toLocaleString()} Held in ESCROW</strong>
              <p style={{ fontSize: 12, color: '#1565C0', margin: '8px 0 0' }}>Released to seller after delivery confirmation</p>
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: 16, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginTop: 16 }}>✅ Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
