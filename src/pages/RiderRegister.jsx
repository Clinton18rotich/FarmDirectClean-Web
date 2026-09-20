import React, { useState } from 'react';
import LocationPicker from '../components/LocationPicker';
import { api } from '../services/api';
import { normalizeKenyaPhone, isValidKenyaPhone, formatKenyaPhone } from '../utils/phone';

const ALL_VEHICLES = [
  { type: 'Motorcycle', icon: '🏍️', maxWeight: '100kg', priceRange: 'KES 200-500' },
  { type: 'Boda Boda', icon: '🛵', maxWeight: '80kg', priceRange: 'KES 100-300' },
  { type: 'Tuk Tuk', icon: '🛺', maxWeight: '300kg', priceRange: 'KES 300-800' },
  { type: 'Probox', icon: '🚗', maxWeight: '500kg', priceRange: 'KES 500-1,500' },
  { type: 'Pickup', icon: '🛻', maxWeight: '1000kg', priceRange: 'KES 800-3,000' },
  { type: 'Van', icon: '🚐', maxWeight: '1500kg', priceRange: 'KES 500-2,000' },
  { type: 'Matatu', icon: '🚌', maxWeight: '2000kg', priceRange: 'KES 1,000-3,000' },
  { type: 'Canter', icon: '🚛', maxWeight: '4000kg', priceRange: 'KES 2,500-8,000' },
  { type: 'Fuso', icon: '🚚', maxWeight: '7000kg', priceRange: 'KES 5,000-15,000' },
  { type: 'Tractor', icon: '🚜', maxWeight: '5000kg', priceRange: 'KES 3,000-10,000' },
  { type: 'Trailer', icon: '🚒', maxWeight: '20000kg', priceRange: 'KES 15,000-50,000' },
  { type: 'Bicycle', icon: '🚲', maxWeight: '30kg', priceRange: 'KES 50-150' },
  { type: 'Hand Cart', icon: '🛒', maxWeight: '200kg', priceRange: 'KES 100-300' },
  { type: 'Donkey Cart', icon: '🫏', maxWeight: '400kg', priceRange: 'KES 200-500' },
  { type: 'Boat/Ferry', icon: '⛴️', maxWeight: '5000kg', priceRange: 'KES 1,000-5,000' },
];

const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:8 };
const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:16, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const primaryBtn = { width:'100%', padding:16, color:'white', border:'none', borderRadius:25, fontSize:16, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const methodBox = { background:'#F9FAFB', borderRadius:12, padding:16, marginBottom:12, border:'1px solid #E0E0E0' };
const reviewBox = { background:'#F9FAFB', borderRadius:12, padding:14, marginBottom:12, border:'1px solid #E0E0E0' };
const reviewLine = { fontSize:12, margin:'4px 0', color:'#333' };

export default function RiderRegister({ onClose, onRegister }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [rider, setRider] = useState({
    fullName: '',
    phone: '',
    email: '',
    location: null,
    vehicleType: '',
    pricePerDelivery: '',
    availability: 'Full-time (Always available)',
    radiusKm: 10,
    // Payment
    paymentMethod: 'pochi',
    tillNumber: '',
    paybillNumber: '',
    paybillAccount: '',
    pochiPhone: '',
  });

  const selectedVehicle = ALL_VEHICLES.find(v => v.type === rider.vehicleType);

  const isPaymentValid = () => {
    if (rider.paymentMethod === 'till') return rider.tillNumber.length >= 5;
    if (rider.paymentMethod === 'paybill') return rider.paybillNumber.length >= 5 && rider.paybillAccount.length >= 3;
    if (rider.paymentMethod === 'pochi') return isValidKenyaPhone(rider.pochiPhone);
    return false;
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const registration = {
        rider: {
          fullName: rider.fullName,
          phone: rider.phone,
          email: rider.email,
        },
        vehicle: {
          type: rider.vehicleType,
          icon: selectedVehicle?.icon,
          maxWeight: selectedVehicle?.maxWeight,
          priceRange: selectedVehicle?.priceRange,
        },
        location: rider.location,
        radiusKm: rider.radiusKm,
        pricePerDelivery: parseInt(rider.pricePerDelivery),
        availability: rider.availability,
        payment: {
          method: rider.paymentMethod,
          tillNumber: rider.paymentMethod === 'till' ? rider.tillNumber : null,
          paybillNumber: rider.paymentMethod === 'paybill' ? rider.paybillNumber : null,
          paybillAccount: rider.paymentMethod === 'paybill' ? rider.paybillAccount : null,
          pochiPhone: rider.paymentMethod === 'pochi' ? rider.pochiPhone : null,
        },
        registeredAt: new Date().toISOString(),
      };

      const result = await api.registerRider(registration);
      if (!result.success) throw new Error(result.message || 'Registration failed');

      localStorage.setItem('riderRegistration', JSON.stringify(registration));
      onRegister && onRegister(registration);

      const locationLabel = rider.location?.manual || 
        [rider.location?.area, rider.location?.locality, rider.location?.ward, rider.location?.county].filter(Boolean).join(', ');

      alert(`✅ Karibu ${rider.fullName}!\n\nYou will receive delivery requests in ${locationLabel}.\n\nVehicle: ${selectedVehicle?.icon} ${selectedVehicle?.type}\nPayment: ${rider.paymentMethod.toUpperCase()}`);

      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, maxWidth: 450, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#1565C0', fontSize: 20 }}>🏍️ Register as Rider</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{ flex: 1, height: 5, borderRadius: 3, background: s <= step ? '#1565C0' : '#E0E0E0' }} />
          ))}
        </div>

        {error && (
          <div style={{ background: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <strong style={{ color: '#C62828', fontSize: 13 }}>⚠️ {error}</strong>
          </div>
        )}

        {/* STEP 1: Personal + Location */}
        {step === 1 && (
          <div>
            <h4 style={{ marginBottom: 14, fontSize: 16 }}>📋 Your Details & Location</h4>

            <label style={labelStyle}>Full Name *</label>
            <input value={rider.fullName} onChange={e => setRider({ ...rider, fullName: e.target.value })} placeholder="e.g. James Mwangi" style={inputStyle} />

            <label style={labelStyle}>Phone Number *</label>
            <input
              value={rider.phone}
              onChange={e => setRider({ ...rider, phone: e.target.value })}
              onBlur={e => { if (e.target.value) setRider({ ...rider, phone: normalizeKenyaPhone(e.target.value) }); }}
              placeholder="0712345678"
              type="tel"
              style={{ ...inputStyle, borderColor: rider.phone && !isValidKenyaPhone(rider.phone) ? '#C62828' : '#E0E0E0' }}
            />
            {rider.phone && !isValidKenyaPhone(rider.phone) && (
              <p style={{ fontSize: 11, color: '#C62828', margin: '-4px 0 8px' }}>⚠️ Enter a valid Kenya number</p>
            )}
            {rider.phone && isValidKenyaPhone(rider.phone) && (
              <p style={{ fontSize: 11, color: '#4CAF50', margin: '-4px 0 8px' }}>✅ {formatKenyaPhone(rider.phone)}</p>
            )}

            <label style={labelStyle}>Email (optional)</label>
            <input value={rider.email} onChange={e => setRider({ ...rider, email: e.target.value })} placeholder="you@example.com" type="email" style={inputStyle} />

            <div style={{ marginTop: 12 }}>
              <LocationPicker
                value={rider.location}
                onChange={loc => setRider({ ...rider, location: loc })}
                required
                label="Where are you based?"
              />
            </div>

            <label style={labelStyle}>Service Radius: {rider.radiusKm} km</label>
            <input
              type="range"
              min="3"
              max="50"
              value={rider.radiusKm}
              onChange={e => setRider({ ...rider, radiusKm: parseInt(e.target.value) })}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <p style={{ fontSize: 11, color: '#666', margin: '0 0 12px' }}>
              How far can you deliver from your base?
            </p>

            <button
              onClick={() => setStep(2)}
              disabled={!rider.fullName || !isValidKenyaPhone(rider.phone) || !rider.location}
              style={{ ...primaryBtn, background: (rider.fullName && isValidKenyaPhone(rider.phone) && rider.location) ? '#1565C0' : '#ccc' }}
            >
              Next: Vehicle →
            </button>
          </div>
        )}

        {/* STEP 2: Vehicle */}
        {step === 2 && (
          <div>
            <h4 style={{ marginBottom: 8, fontSize: 16 }}>🚛 Choose Your Vehicle</h4>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>What do you use for deliveries?</p>

            {ALL_VEHICLES.map(v => (
              <div key={v.type} onClick={() => setRider({ ...rider, vehicleType: v.type })} style={{
                background: rider.vehicleType === v.type ? '#E3F2FD' : 'white',
                borderRadius: 10, padding: 12, marginBottom: 6, cursor: 'pointer',
                border: rider.vehicleType === v.type ? '2px solid #1565C0' : '1px solid #E0E0E0',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <span style={{ fontSize: 28 }}>{v.icon}</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13 }}>{v.type}</strong>
                  <p style={{ fontSize: 10, color: 'gray', margin: '2px 0 0' }}>Max: {v.maxWeight} • {v.priceRange}</p>
                </div>
                <span style={{ fontSize: 18 }}>{rider.vehicleType === v.type ? '✅' : '○'}</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setStep(1)} style={{ ...primaryBtn, background: '#F0F0F0', color: '#666', flex: 1 }}>← Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!rider.vehicleType}
                style={{ ...primaryBtn, background: rider.vehicleType ? '#1565C0' : '#ccc', flex: 2 }}
              >
                Next: Pricing →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Pricing */}
        {step === 3 && (
          <div>
            <h4 style={{ marginBottom: 8, fontSize: 16 }}>💰 Pricing & Availability</h4>

            {selectedVehicle && (
              <div style={{ background: '#E3F2FD', borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 40 }}>{selectedVehicle.icon}</span>
                <p style={{ fontWeight: 'bold', margin: '4px 0 0', fontSize: 14 }}>{selectedVehicle.type}</p>
                <p style={{ fontSize: 11, color: 'gray', margin: 0 }}>Typical: {selectedVehicle.priceRange}</p>
              </div>
            )}

            <p style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
              📍 You'll serve: <strong>{rider.location?.manual || [rider.location?.area, rider.location?.locality, rider.location?.ward, rider.location?.county].filter(Boolean).join(', ')}</strong>
            </p>

            <label style={labelStyle}>Your Price Per Delivery (KES) *</label>
            <input
              value={rider.pricePerDelivery}
              onChange={e => setRider({ ...rider, pricePerDelivery: e.target.value })}
              placeholder="e.g. 300"
              type="number"
              style={inputStyle}
            />

            <label style={labelStyle}>Availability</label>
            <select
              value={rider.availability}
              onChange={e => setRider({ ...rider, availability: e.target.value })}
              style={{ ...inputStyle, background: 'white' }}
            >
              {['Full-time (Always available)', 'Part-time (Weekdays)', 'Part-time (Weekends)', 'On-call (When notified)', 'Market days only'].map(a => (
                <option key={a}>{a}</option>
              ))}
            </select>

            <div style={{ background: '#FFF8E1', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <strong style={{ color: '#E65100', fontSize: 12 }}>🔒 Payment Protection</strong>
              <p style={{ fontSize: 11, color: '#E65100', margin: '4px 0 0' }}>
                All delivery fees go through FarmDirect escrow. You get paid after delivery is confirmed.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)} style={{ ...primaryBtn, background: '#F0F0F0', color: '#666', flex: 1 }}>← Back</button>
              <button
                onClick={() => setStep(4)}
                disabled={!rider.pricePerDelivery}
                style={{ ...primaryBtn, background: rider.pricePerDelivery ? '#1565C0' : '#ccc', flex: 2 }}
              >
                Next: Payment →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Payment (NEW) */}
        {step === 4 && (
          <div>
            <h4 style={{ marginBottom: 4, fontSize: 16 }}>💳 Where should we send your earnings?</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
              You'll receive delivery fees here after each completed delivery.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { id: 'pochi', label: 'Pochi', icon: '📱', desc: 'Fastest' },
                { id: 'till', label: 'Till', icon: '🏪', desc: 'Lipa na M-Pesa' },
                { id: 'paybill', label: 'Paybill', icon: '🏦', desc: 'Business' },
              ].map(m => (
                <div key={m.id} onClick={() => setRider({ ...rider, paymentMethod: m.id })} style={{
                  background: rider.paymentMethod === m.id ? '#E3F2FD' : '#F5F7FA',
                  borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer',
                  border: rider.paymentMethod === m.id ? '2px solid #1565C0' : '1px solid #E0E0E0'
                }}>
                  <div style={{ fontSize: 26 }}>{m.icon}</div>
                  <div style={{ fontWeight: 'bold', fontSize: 13, margin: '4px 0', color: '#333' }}>{m.label}</div>
                  <div style={{ fontSize: 9, color: '#666' }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {rider.paymentMethod === 'pochi' && (
              <div style={methodBox}>
                <strong style={{ fontSize: 13, color: '#1565C0' }}>📱 Pochi la Biashara</strong>
                <p style={{ fontSize: 11, color: '#666', margin: '6px 0 12px' }}>
                  Dial *334# to activate if not already done. Best for instant payments.
                </p>
                <label style={labelStyle}>Pochi Phone Number *</label>
                <input
                  value={rider.pochiPhone}
                  onChange={e => setRider({ ...rider, pochiPhone: e.target.value })}
                  onBlur={e => { if (e.target.value) setRider({ ...rider, pochiPhone: normalizeKenyaPhone(e.target.value) }); }}
                  placeholder="0712345678"
                  type="tel"
                  style={{ ...inputStyle, borderColor: rider.pochiPhone && !isValidKenyaPhone(rider.pochiPhone) ? '#C62828' : '#E0E0E0' }}
                />
                {rider.pochiPhone && !isValidKenyaPhone(rider.pochiPhone) && (
                  <p style={{ fontSize: 11, color: '#C62828', margin: '-4px 0 8px' }}>⚠️ Enter a valid Kenya number</p>
                )}
                {rider.pochiPhone && isValidKenyaPhone(rider.pochiPhone) && (
                  <p style={{ fontSize: 11, color: '#4CAF50', margin: '-4px 0 8px' }}>✅ {formatKenyaPhone(rider.pochiPhone)}</p>
                )}
              </div>
            )}

            {rider.paymentMethod === 'till' && (
              <div style={methodBox}>
                <strong style={{ fontSize: 13, color: '#1565C0' }}>🏪 Till Number (Lipa na M-Pesa)</strong>
                <p style={{ fontSize: 11, color: '#666', margin: '6px 0 12px' }}>Get from *334# or M-Pesa Business app</p>
                <label style={labelStyle}>Till Number *</label>
                <input
                  value={rider.tillNumber}
                  onChange={e => setRider({ ...rider, tillNumber: e.target.value })}
                  placeholder="e.g. 4123456"
                  type="tel"
                  style={inputStyle}
                />
              </div>
            )}

            {rider.paymentMethod === 'paybill' && (
              <div style={methodBox}>
                <strong style={{ fontSize: 13, color: '#1565C0' }}>🏦 Paybill Details</strong>
                <p style={{ fontSize: 11, color: '#666', margin: '6px 0 12px' }}>Get from M-Pesa Business or your bank</p>
                <label style={labelStyle}>Paybill Number *</label>
                <input
                  value={rider.paybillNumber}
                  onChange={e => setRider({ ...rider, paybillNumber: e.target.value })}
                  placeholder="e.g. 247247"
                  type="tel"
                  style={inputStyle}
                />
                <label style={labelStyle}>Account Number *</label>
                <input
                  value={rider.paybillAccount}
                  onChange={e => setRider({ ...rider, paybillAccount: e.target.value })}
                  placeholder="e.g. YOURNAME"
                  style={inputStyle}
                />
              </div>
            )}

            <div style={{ background: '#E3F2FD', borderRadius: 10, padding: 12, marginTop: 12, border: '1px solid #90CAF9' }}>
              <strong style={{ color: '#0D47A1', fontSize: 12 }}>💰 How You Earn</strong>
              <p style={{ fontSize: 11, color: '#1565C0', margin: '4px 0 0' }}>
                You keep 85% of the delivery fee. FarmDirect takes 15% for platform + escrow protection.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setStep(3)} style={{ ...primaryBtn, background: '#F0F0F0', color: '#666', flex: 1 }}>← Back</button>
              <button
                onClick={handleSubmit}
                disabled={!isPaymentValid() || isSubmitting}
                style={{ ...primaryBtn, background: (isPaymentValid() && !isSubmitting) ? '#1565C0' : '#ccc', flex: 2 }}
              >
                {isSubmitting ? '⏳ Submitting...' : '✅ Submit Registration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
