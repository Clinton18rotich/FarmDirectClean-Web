import React, { useState } from 'react';

export default function Checkout({ cart, onClose, onOrder }) {
  const [step, setStep] = useState('review'); // review, payment, confirmed
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = 300;
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryFee + serviceFee;

  const handlePay = () => {
    if (phone.length < 9) return alert('Enter valid M-Pesa number');
    setStep('confirmed');
    onOrder && onOrder({ cart, phone, location, note, total, orderId: 'ORD-' + Date.now().toString(36).toUpperCase().slice(-6) });
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
            
            {cart.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>{c.image} {c.name} x{c.qty}</span>
                <span>KES {(c.price * c.qty).toLocaleString()}</span>
              </div>
            ))}
            
            <div style={{ background: '#F5F7FA', borderRadius: 10, padding: 12, margin: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>🚚 Delivery</span><span>KES {deliveryFee}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>🔒 ESCROW Service (5%)</span><span>KES {serviceFee}</span></div>
              <hr />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 18, color: '#2E7D32' }}><span>TOTAL</span><span>KES {total.toLocaleString()}</span></div>
            </div>

            <div style={{ background: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <strong style={{ color: '#1565C0' }}>🔒 ESCROW Protection:</strong>
              <p style={{ fontSize: 11, margin: '4px 0 0', color: '#1565C0' }}>Your money is held securely. Seller only gets paid AFTER you confirm delivery.</p>
            </div>

            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Delivery Location (County, Town)" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 8, fontSize: 13 }} />
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note to seller (optional)" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 12, fontSize: 13, minHeight: 50 }} />

            <button onClick={() => setStep('payment')} disabled={!location} style={{ width: '100%', padding: 16, background: location ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: location ? 'pointer' : 'not-allowed' }}>
              📱 Pay with M-Pesa → KES {total.toLocaleString()}
            </button>
          </>
        )}

        {step === 'payment' && (
          <>
            <h3 style={{ color: '#4CAF50' }}>💳 M-Pesa Payment</h3>
            <p style={{ fontWeight: 'bold', fontSize: 18, color: '#2E7D32' }}>KES {total.toLocaleString()}</p>
            <p style={{ fontSize: 12, color: '#666' }}>🔒 Payment held in ESCROW until delivery</p>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="M-Pesa Number (0712345678)" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', margin: '12px 0', fontSize: 14 }} />
            <button onClick={handlePay} disabled={phone.length < 9} style={{ width: '100%', padding: 16, background: phone.length >= 9 ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 16, fontWeight: 'bold', cursor: phone.length >= 9 ? 'pointer' : 'not-allowed' }}>
              💳 Pay KES {total.toLocaleString()}
            </button>
            <button onClick={() => setStep('review')} style={{ width: '100%', padding: 10, background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginTop: 4 }}>← Back</button>
          </>
        )}

        {step === 'confirmed' && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <span style={{ fontSize: 60 }}>✅</span>
            <h2 style={{ color: '#2E7D32' }}>Order Confirmed!</h2>
            <p>Payment held in ESCROW</p>
            <p style={{ fontSize: 12, color: '#666' }}>Seller will deliver to: {location}</p>
            <p style={{ fontSize: 12, color: '#666' }}>You'll receive delivery confirmation</p>
            <p style={{ fontSize: 11, color: '#FF6F00' }}>⚠️ Never send money outside FarmDirect</p>
            <button onClick={onClose} style={{ width: '100%', padding: 14, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 25, marginTop: 16, fontWeight: 'bold', cursor: 'pointer' }}>Continue Shopping</button>
          </div>
        )}
      </div>
    </div>
  );
}
