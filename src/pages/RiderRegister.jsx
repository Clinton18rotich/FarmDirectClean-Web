import React, { useState } from 'react';
import { KENYA_COUNTIES, getSubCounties, getWards, getVillages } from '../data/kenyaLocations';

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

const inp = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 8, fontSize: 13 };
const sel = { ...inp, background: 'white' };

export default function RiderRegister({ onClose, onRegister }) {
  const [step, setStep] = useState(1);
  const [rider, setRider] = useState({
    fullName: '', phone: '+254',
    county: '', subCounty: '', ward: '', village: '',
    vehicleType: '', pricePerDelivery: '', availability: 'Full-time',
  });

  const subCounties = getSubCounties(rider.county);
  const wards = getWards(rider.county, rider.subCounty);
  const villages = getVillages(rider.county, rider.subCounty, rider.ward);

  const selectedVehicle = ALL_VEHICLES.find(v => v.type === rider.vehicleType);

  const handleSubmit = () => {
    const reg = { ...rider, registeredAt: new Date().toISOString() };
    localStorage.setItem('riderRegistration', JSON.stringify(reg));
    onRegister && onRegister(reg);
    onClose();
    alert('✅ Registered! You will receive delivery requests in ' + [rider.village, rider.ward, rider.subCounty, rider.county].filter(Boolean).join(', ') + '.');
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, maxWidth: 450, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#2E7D32' }}>🏍️ Register as Rider</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2, 3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? '#4CAF50' : '#E0E0E0' }} />)}
        </div>

        {/* STEP 1: Personal & Location */}
        {step === 1 && (
          <div>
            <h4 style={{ marginBottom: 8 }}>📋 Your Details & Location</h4>
            <input value={rider.fullName} onChange={e => setRider({ ...rider, fullName: e.target.value })} placeholder="Full Name *" style={inp} />
            <input value={rider.phone} onChange={e => setRider({ ...rider, phone: e.target.value })} placeholder="Phone Number *" type="tel" style={inp} />

            <label style={{ fontSize: 11, fontWeight: 'bold', color: '#555', display: 'block', marginBottom: 4 }}>📍 Where are you based?</label>
            <select value={rider.county} onChange={e => setRider({ ...rider, county: e.target.value, subCounty: '', ward: '', village: '' })} style={sel}>
              <option value="">County *</option>
              {KENYA_COUNTIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            {rider.county && (
              <select value={rider.subCounty} onChange={e => setRider({ ...rider, subCounty: e.target.value, ward: '', village: '' })} style={sel}>
                <option value="">Sub-County</option>
                {subCounties.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            )}
            {rider.subCounty && (
              <select value={rider.ward} onChange={e => setRider({ ...rider, ward: e.target.value, village: '' })} style={sel}>
                <option value="">Ward</option>
                {wards.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
              </select>
            )}
            {rider.ward && (
              <select value={rider.village} onChange={e => setRider({ ...rider, village: e.target.value })} style={sel}>
                <option value="">Village/Estate</option>
                {villages.map(v => <option key={v}>{v}</option>)}
              </select>
            )}

            <button onClick={() => setStep(2)} disabled={!rider.fullName || !rider.phone || !rider.county}
              style={{ width: '100%', padding: 14, background: rider.fullName && rider.phone && rider.county ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 14, fontWeight: 'bold', cursor: rider.fullName ? 'pointer' : 'not-allowed', marginTop: 8 }}>
              Next: Select Vehicle →
            </button>
          </div>
        )}

        {/* STEP 2: Vehicle */}
        {step === 2 && (
          <div>
            <h4 style={{ marginBottom: 8 }}>🚛 Choose Your Vehicle</h4>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Select the type of vehicle you use for deliveries</p>
            {ALL_VEHICLES.map(v => (
              <div key={v.type} onClick={() => setRider({ ...rider, vehicleType: v.type })} style={{
                background: rider.vehicleType === v.type ? '#E8F5E9' : 'white',
                borderRadius: 10, padding: 10, marginBottom: 6, cursor: 'pointer',
                border: rider.vehicleType === v.type ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span style={{ fontSize: 28 }}>{v.icon}</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12 }}>{v.type}</strong>
                  <p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Max: {v.maxWeight} • {v.priceRange}</p>
                </div>
                <span>{rider.vehicleType === v.type ? '✅' : '○'}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: 12, background: '#F0F0F0', border: 'none', borderRadius: 25, fontSize: 14, cursor: 'pointer' }}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!rider.vehicleType} style={{ flex: 1, padding: 12, background: rider.vehicleType ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 14, fontWeight: 'bold', cursor: rider.vehicleType ? 'pointer' : 'not-allowed' }}>Next: Pricing →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Pricing */}
        {step === 3 && (
          <div>
            <h4 style={{ marginBottom: 8 }}>💰 Pricing & Submit</h4>
            {selectedVehicle && (
              <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 40 }}>{selectedVehicle.icon}</span>
                <p style={{ fontWeight: 'bold', margin: 0 }}>{selectedVehicle.type}</p>
                <p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Typical: {selectedVehicle.priceRange}</p>
              </div>
            )}
            <p style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
              📍 You'll serve: <strong>{[rider.village, rider.ward, rider.subCounty, rider.county].filter(Boolean).join(', ')}</strong>
            </p>
            <input value={rider.pricePerDelivery} onChange={e => setRider({ ...rider, pricePerDelivery: e.target.value })} placeholder="Your Price Per Delivery (KES) *" type="number" style={inp} />
            <select value={rider.availability} onChange={e => setRider({ ...rider, availability: e.target.value })} style={sel}>
              {['Full-time (Always available)', 'Part-time (Weekdays)', 'Part-time (Weekends)', 'On-call (When notified)', 'Market days only'].map(a => <option key={a}>{a}</option>)}
            </select>
            <div style={{ background: '#FFF8E1', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <strong style={{ color: '#E65100', fontSize: 12 }}>🔒 SAFETY:</strong>
              <p style={{ fontSize: 10, color: '#E65100', margin: '4px 0 0' }}>All payments through FarmDirect ESCROW. Never accept direct M-Pesa.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: 12, background: '#F0F0F0', border: 'none', borderRadius: 25, fontSize: 14, cursor: 'pointer' }}>← Back</button>
              <button onClick={handleSubmit} disabled={!rider.pricePerDelivery} style={{ flex: 1, padding: 12, background: rider.pricePerDelivery ? '#4CAF50' : '#ccc', color: 'white', border: 'none', borderRadius: 25, fontSize: 14, fontWeight: 'bold', cursor: rider.pricePerDelivery ? 'pointer' : 'not-allowed' }}>
                ✅ Register
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
