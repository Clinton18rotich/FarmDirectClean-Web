import React, { useState } from 'react';
import LocationPicker from './LocationPicker';
import { api } from '../services/api';
import { normalizeKenyaPhone, isValidKenyaPhone, formatKenyaPhone } from '../utils/phone';

const PRODUCT_OPTIONS = {
  'Cereals': [
    { name:'White Maize', unit:'90kg bag', avgPrice:3500, image:'🌽' },
    { name:'Yellow Maize', unit:'90kg bag', avgPrice:3200, image:'🌽' },
    { name:'Green Maize', unit:'1 dozen', avgPrice:1500, image:'🌽' },
    { name:'Wheat', unit:'90kg bag', avgPrice:4500, image:'🌾' },
    { name:'Sorghum', unit:'90kg bag', avgPrice:3500, image:'🌾' },
    { name:'Finger Millet', unit:'50kg bag', avgPrice:4000, image:'🌾' },
    { name:'Brown Rice', unit:'50kg bag', avgPrice:6000, image:'🍚' },
    { name:'Pishori Rice', unit:'25kg bag', avgPrice:8000, image:'🍚' },
  ],
  'Legumes': [
    { name:'Red Beans (Rosecoco)', unit:'90kg bag', avgPrice:4500, image:'🫘' },
    { name:'Green Grams (Ndengu)', unit:'50kg bag', avgPrice:5000, image:'🫘' },
    { name:'Cowpeas (Kunde)', unit:'50kg bag', avgPrice:4000, image:'🫘' },
    { name:'Chickpeas', unit:'25kg bag', avgPrice:5500, image:'🫘' },
    { name:'Black Beans (Njahi)', unit:'50kg bag', avgPrice:4800, image:'🫘' },
    { name:'Groundnuts', unit:'50kg bag', avgPrice:6000, image:'🥜' },
  ],
  'Tubers & Roots': [
    { name:'Irish Potatoes', unit:'50kg bag', avgPrice:3000, image:'🥔' },
    { name:'Sweet Potatoes', unit:'20kg bag', avgPrice:1500, image:'🍠' },
    { name:'Cassava', unit:'10kg bunch', avgPrice:800, image:'🥔' },
    { name:'Arrowroots (Nduma)', unit:'1kg bunch', avgPrice:1200, image:'🥔' },
    { name:'Ginger', unit:'1kg', avgPrice:3000, image:'🫚' },
  ],
  'Vegetables': [
    { name:'Tomatoes', unit:'1kg crate', avgPrice:2500, image:'🍅' },
    { name:'Onions (Red)', unit:'5kg bag', avgPrice:2000, image:'🧅' },
    { name:'Cabbages', unit:'1 piece', avgPrice:500, image:'🥬' },
    { name:'Kales (Sukuma Wiki)', unit:'1 bunch', avgPrice:300, image:'🥬' },
    { name:'Spinach', unit:'1 bunch', avgPrice:400, image:'🥬' },
    { name:'Carrots', unit:'1kg bag', avgPrice:800, image:'🥕' },
    { name:'Capsicum (Hoho)', unit:'1kg crate', avgPrice:1800, image:'🫑' },
    { name:'French Beans (Mishiri)', unit:'1kg', avgPrice:1200, image:'🫛' },
  ],
  'Fruits': [
    { name:'Avocados (Hass)', unit:'90kg bag', avgPrice:4500, image:'🥑' },
    { name:'Mangoes (Apple)', unit:'Crate', avgPrice:3200, image:'🥭' },
    { name:'Bananas', unit:'Bunch', avgPrice:1500, image:'🍌' },
    { name:'Pineapples', unit:'1 piece', avgPrice:800, image:'🍍' },
    { name:'Oranges', unit:'Crate', avgPrice:2000, image:'🍊' },
    { name:'Watermelon', unit:'1 piece', avgPrice:500, image:'🍉' },
    { name:'Passion Fruit', unit:'1kg', avgPrice:1200, image:'🍇' },
  ],
  'Fish & Seafood': [
    { name:'Fresh Tilapia', unit:'1 kg', avgPrice:500, image:'🐟' },
    { name:'Fresh Nile Perch', unit:'1 kg', avgPrice:800, image:'🐟' },
    { name:'Fresh Trout', unit:'1 kg', avgPrice:1200, image:'🐟' },
    { name:'Dried Omena', unit:'1 kg', avgPrice:300, image:'🐟' },
    { name:'Prawns', unit:'1 kg', avgPrice:1500, image:'🦐' },
  ],
  'Livestock': [
    { name:'Fresian Cow', unit:'1 cow', avgPrice:85000, image:'🐄' },
    { name:'Jersey Cow', unit:'1 cow', avgPrice:80000, image:'🐄' },
    { name:'Boran Bull', unit:'1 bull', avgPrice:65000, image:'🐂' },
    { name:'Dairy Goat (Toggenburg)', unit:'1 goat', avgPrice:15000, image:'🐐' },
    { name:'Meat Goat (Boer)', unit:'1 goat', avgPrice:12000, image:'🐐' },
    { name:'Dorper Sheep', unit:'1 sheep', avgPrice:14000, image:'🐑' },
    { name:'Large White Piglet', unit:'1 piglet', avgPrice:4500, image:'🐷' },
    { name:'New Zealand White Rabbit', unit:'1 rabbit', avgPrice:2000, image:'🐰' },
  ],
  'Poultry': [
    { name:'Kienyeji Chicken', unit:'1 bird', avgPrice:1200, image:'🐔' },
    { name:'Broiler Chicken', unit:'1 bird', avgPrice:800, image:'🐔' },
    { name:'Improved Kienyeji', unit:'1 bird', avgPrice:1500, image:'🐔' },
    { name:'Fertile Kienyeji Eggs', unit:'1 tray', avgPrice:150, image:'🥚' },
    { name:'Table Eggs', unit:'1 tray', avgPrice:350, image:'🥚' },
    { name:'Day Old Broiler Chicks', unit:'1 chick', avgPrice:120, image:'🐣' },
    { name:'Turkey (Bronze)', unit:'1 bird', avgPrice:3500, image:'🦃' },
    { name:'Muscovy Duck', unit:'1 bird', avgPrice:1500, image:'🦆' },
  ],
};

const ALL_CATEGORIES = [...Object.keys(PRODUCT_OPTIONS), '➕ Custom'];

export default function FarmerRegister({ onClose, onRegister }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [farmer, setFarmer] = useState({
    fullName: '',
    phone: '',
    email: '',
    location: null,
    farmName: '',
    deliveryAvailable: false,
    deliveryFee: '',
    additionalInfo: '',
    // Payment fields (CRITICAL)
    paymentMethod: 'till', // 'till' | 'paybill' | 'pochi'
    tillNumber: '',
    paybillNumber: '',
    paybillAccount: '',
    pochiPhone: '',
  });

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Cereals');

  const toggleProduct = (product) => {
    const exists = selectedProducts.find(p => p.name === product.name);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.name !== product.name));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, price: product.avgPrice, quantity: product.unit }]);
    }
  };

  const updateProductField = (name, field, value) => {
    setSelectedProducts(selectedProducts.map(p => p.name === name ? {...p, [field]: value} : p));
  };

  // Validate payment info based on selected method
  const isPaymentValid = () => {
    if (farmer.paymentMethod === 'till') return farmer.tillNumber.length >= 5;
    if (farmer.paymentMethod === 'paybill') return farmer.paybillNumber.length >= 5 && farmer.paybillAccount.length >= 3;
    if (farmer.paymentMethod === 'pochi') return isValidKenyaPhone(farmer.pochiPhone);
    return false;
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const registration = {
        farmer: {
          fullName: farmer.fullName,
          phone: farmer.phone,
          email: farmer.email,
          location: farmer.location,
          farmName: farmer.farmName,
          deliveryAvailable: farmer.deliveryAvailable,
          deliveryFee: farmer.deliveryFee,
          additionalInfo: farmer.additionalInfo,
        },
        payment: {
          method: farmer.paymentMethod,
          tillNumber: farmer.paymentMethod === 'till' ? farmer.tillNumber : null,
          paybillNumber: farmer.paymentMethod === 'paybill' ? farmer.paybillNumber : null,
          paybillAccount: farmer.paymentMethod === 'paybill' ? farmer.paybillAccount : null,
          pochiPhone: farmer.paymentMethod === 'pochi' ? farmer.pochiPhone : null,
        },
        products: selectedProducts,
        registeredAt: new Date().toISOString(),
      };

      // Send to backend
      const result = await api.registerFarmer(registration);

      if (!result.success) throw new Error(result.message || 'Registration failed');

      // Store locally too (for the demo)
      localStorage.setItem('farmerRegistration', JSON.stringify(registration));

      onRegister && onRegister(registration);
      onClose();

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{margin:0,color:'#2E7D32',fontSize:20}}>👨‍🌾 Register as Farmer</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{display:'flex',gap:6,marginBottom:20}}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{flex:1,height:5,borderRadius:3,background: s <= step ? '#4CAF50' : '#E0E0E0'}} />
          ))}
        </div>

        {error && (
          <div style={{background:'#FFEBEE',borderRadius:10,padding:12,marginBottom:12}}>
            <strong style={{color:'#C62828',fontSize:13}}>⚠️ {error}</strong>
          </div>
        )}

        {/* STEP 1: Personal + Location */}
        {step === 1 && (
          <div>
            <h4 style={{marginBottom:14,fontSize:16}}>📋 Your Details</h4>

            <label style={labelStyle}>Full Name *</label>
            <input value={farmer.fullName} onChange={e => setFarmer({...farmer, fullName: e.target.value})} placeholder="e.g. John Kimani" style={inputStyle} />

            <label style={labelStyle}>Phone Number *</label>
            <input 
              value={farmer.phone} 
              onChange={e => setFarmer({...farmer, phone: e.target.value})} 
              onBlur={e => { if (e.target.value) setFarmer({...farmer, phone: normalizeKenyaPhone(e.target.value)}); }}
              placeholder="0712345678" 
              type="tel" 
              style={{
                ...inputStyle,
                borderColor: farmer.phone && !isValidKenyaPhone(farmer.phone) ? '#C62828' : '#E0E0E0'
              }} 
            />
            {farmer.phone && !isValidKenyaPhone(farmer.phone) && (
              <p style={{fontSize:11,color:'#C62828',margin:'-4px 0 8px'}}>⚠️ Enter a valid Kenya number (e.g. 0712345678)</p>
            )}
            {farmer.phone && isValidKenyaPhone(farmer.phone) && (
              <p style={{fontSize:11,color:'#4CAF50',margin:'-4px 0 8px'}}>✅ {formatKenyaPhone(farmer.phone)}</p>
            )}

            <label style={labelStyle}>Email (optional)</label>
            <input value={farmer.email} onChange={e => setFarmer({...farmer, email: e.target.value})} placeholder="you@example.com" type="email" style={inputStyle} />

            <label style={labelStyle}>Farm Name (optional)</label>
            <input value={farmer.farmName} onChange={e => setFarmer({...farmer, farmName: e.target.value})} placeholder="e.g. Kimani Family Farm" style={inputStyle} />

            <div style={{marginTop:12}}>
              <LocationPicker value={farmer.location} onChange={loc => setFarmer({...farmer, location: loc})} required />
            </div>

            <button onClick={() => setStep(2)} disabled={!farmer.fullName || farmer.phone.length < 9 || !farmer.location}
              style={{...primaryBtn, background: (farmer.fullName && farmer.phone.length >= 9 && farmer.location) ? '#4CAF50' : '#ccc'}}>
              Next: Payment Setup →
            </button>
          </div>
        )}

        {/* STEP 2: Payment Info (CRITICAL) */}
        {step === 2 && (
          <div>
            <h4 style={{marginBottom:4,fontSize:16}}>💳 How do you want to receive money?</h4>
            <p style={{fontSize:12,color:'#666',marginBottom:16}}>Buyers will send payments to this account. Choose one:</p>

            {/* Method selector */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
              {[
                { id:'till', label:'Till', icon:'🏪', desc:'Lipa na M-Pesa' },
                { id:'paybill', label:'Paybill', icon:'🏦', desc:'Business' },
                { id:'pochi', label:'Pochi', icon:'📱', desc:'Small sales' },
              ].map(m => (
                <div key={m.id} onClick={() => setFarmer({...farmer, paymentMethod: m.id})} style={{
                  background: farmer.paymentMethod === m.id ? '#E8F5E9' : '#F5F7FA',
                  borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer',
                  border: farmer.paymentMethod === m.id ? '2px solid #4CAF50' : '1px solid #E0E0E0'
                }}>
                  <div style={{fontSize:26}}>{m.icon}</div>
                  <div style={{fontWeight:'bold',fontSize:13,margin:'4px 0',color:'#333'}}>{m.label}</div>
                  <div style={{fontSize:9,color:'#666'}}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* Till fields */}
            {farmer.paymentMethod === 'till' && (
              <div style={methodBox}>
                <strong style={{fontSize:13,color:'#2E7D32'}}>🏪 Till Number (Lipa na M-Pesa Buy Goods)</strong>
                <p style={{fontSize:11,color:'#666',margin:'6px 0 12px'}}>Dial *334# or use M-Pesa Business app to get your Till number</p>
                <input value={farmer.tillNumber} onChange={e => setFarmer({...farmer, tillNumber: e.target.value})} placeholder="e.g. 4123456" type="tel" style={inputStyle} />
              </div>
            )}

            {/* Paybill fields */}
            {farmer.paymentMethod === 'paybill' && (
              <div style={methodBox}>
                <strong style={{fontSize:13,color:'#2E7D32'}}>🏦 Paybill Details</strong>
                <p style={{fontSize:11,color:'#666',margin:'6px 0 12px'}}>Get from M-Pesa Business or your bank</p>
                <label style={labelStyle}>Paybill Number</label>
                <input value={farmer.paybillNumber} onChange={e => setFarmer({...farmer, paybillNumber: e.target.value})} placeholder="e.g. 247247" type="tel" style={inputStyle} />
                <label style={labelStyle}>Account Number</label>
                <input value={farmer.paybillAccount} onChange={e => setFarmer({...farmer, paybillAccount: e.target.value})} placeholder="e.g. FARMDIRECT or your business name" style={inputStyle} />
              </div>
            )}

            {/* Pochi fields */}
            {farmer.paymentMethod === 'pochi' && (
              <div style={methodBox}>
                <strong style={{fontSize:13,color:'#2E7D32'}}>📱 Pochi la Biashara</strong>
                <p style={{fontSize:11,color:'#666',margin:'6px 0 12px'}}>Dial *334# to activate Pochi. Best for small sales under KES 1,000</p>
                <input 
                  value={farmer.pochiPhone} 
                  onChange={e => setFarmer({...farmer, pochiPhone: e.target.value})} 
                  onBlur={e => { if (e.target.value) setFarmer({...farmer, pochiPhone: normalizeKenyaPhone(e.target.value)}); }}
                  placeholder="0712345678" 
                  type="tel" 
                  style={{
                    ...inputStyle,
                    borderColor: farmer.pochiPhone && !isValidKenyaPhone(farmer.pochiPhone) ? '#C62828' : '#E0E0E0'
                  }} 
                />
                {farmer.pochiPhone && !isValidKenyaPhone(farmer.pochiPhone) && (
                  <p style={{fontSize:11,color:'#C62828',margin:'-4px 0 8px'}}>⚠️ Enter a valid Kenya number (e.g. 0712345678)</p>
                )}
                {farmer.pochiPhone && isValidKenyaPhone(farmer.pochiPhone) && (
                  <p style={{fontSize:11,color:'#4CAF50',margin:'-4px 0 8px'}}>✅ {formatKenyaPhone(farmer.pochiPhone)}</p>
                )}
              </div>
            )}

            {/* Safety note */}
            <div style={{background:'#E3F2FD',borderRadius:10,padding:12,marginTop:12,border:'1px solid #90CAF9'}}>
              <strong style={{color:'#0D47A1',fontSize:12}}>🔒 Buyer Protection</strong>
              <p style={{fontSize:11,color:'#1565C0',margin:'4px 0 0'}}>All payments go through FarmDirect escrow. You get paid after buyer confirms delivery.</p>
            </div>

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onClick={() => setStep(1)} style={{...primaryBtn,background:'white',color:'#666',border:'1px solid #ddd',flex:1}}>← Back</button>
              <button onClick={() => setStep(3)} disabled={!isPaymentValid()}
                style={{...primaryBtn,background: isPaymentValid() ? '#4CAF50' : '#ccc',flex:2}}>
                Next: Select Products →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Products */}
        {step === 3 && (
          <div>
            <h4 style={{marginBottom:4,fontSize:16}}>🌾 What do you sell?</h4>
            <p style={{fontSize:12,color:'#666',marginBottom:8}}>Tap to select. Change price or unit after.</p>
            <p style={{fontSize:12,color:'#4CAF50',marginBottom:12,fontWeight:'bold'}}>✅ {selectedProducts.length} selected</p>

            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:12,borderBottom:'1px solid #eee'}}>
              {ALL_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                  padding:'8px 14px', borderRadius:16, border:'none',
                  background: selectedCategory===cat ? '#4CAF50' : '#F0F0F0',
                  color: selectedCategory===cat ? 'white' : '#555',
                  fontSize:12, cursor:'pointer', whiteSpace:'nowrap', fontWeight:'bold'
                }}>{cat}</button>
              ))}
            </div>

            {selectedCategory !== '➕ Custom' && (
              <div style={{maxHeight:300,overflowY:'auto',marginBottom:12}}>
                {PRODUCT_OPTIONS[selectedCategory]?.map(p => {
                  const selected = selectedProducts.find(x => x.name === p.name);
                  return (
                    <div key={p.name} onClick={() => toggleProduct(p)} style={{
                      background: selected ? '#E8F5E9' : 'white',
                      border: selected ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                      borderRadius:10, padding:12, marginBottom:8, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:10
                    }}>
                      <span style={{fontSize:28}}>{p.image}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:'bold',fontSize:13}}>{p.name}</div>
                        <div style={{fontSize:11,color:'#666'}}>{p.unit} • avg KES {p.avgPrice.toLocaleString()}</div>
                      </div>
                      <span style={{fontSize:20,color:selected?'#4CAF50':'#ccc'}}>{selected ? '✓' : '+'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedProducts.length > 0 && (
              <div style={{background:'#F0F4F8',borderRadius:10,padding:12,marginBottom:12}}>
                <strong style={{fontSize:12,color:'#333'}}>Set your prices:</strong>
                <div style={{maxHeight:200,overflowY:'auto',marginTop:8}}>
                  {selectedProducts.map(p => (
                    <div key={p.name} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
                      <span style={{fontSize:16}}>{p.image}</span>
                      <span style={{flex:1,fontSize:11,fontWeight:'bold'}}>{p.name}</span>
                      <input type="number" value={p.price} onChange={e => updateProductField(p.name,'price',e.target.value)}
                        style={{width:80,padding:6,borderRadius:6,border:'1px solid #ddd',fontSize:12,textAlign:'right'}} />
                      <span style={{fontSize:10,color:'#666',width:50}}>{p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={() => setStep(2)} style={{...primaryBtn,background:'white',color:'#666',border:'1px solid #ddd',flex:1}}>← Back</button>
              <button onClick={() => setStep(4)} disabled={selectedProducts.length === 0}
                style={{...primaryBtn,background: selectedProducts.length > 0 ? '#4CAF50' : '#ccc',flex:2}}>
                Review → ({selectedProducts.length})
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <div>
            <h4 style={{marginBottom:14,fontSize:16}}>✅ Review & Submit</h4>

            <div style={reviewBox}>
              <strong style={{fontSize:13,color:'#2E7D32'}}>👤 Farmer Details</strong>
              <p style={reviewLine}><strong>Name:</strong> {farmer.fullName}</p>
              <p style={reviewLine}><strong>Phone:</strong> {farmer.phone}</p>
              {farmer.farmName && <p style={reviewLine}><strong>Farm:</strong> {farmer.farmName}</p>}
              <p style={reviewLine}><strong>Location:</strong> {farmer.location?.manual || [farmer.location?.area, farmer.location?.locality, farmer.location?.ward, farmer.location?.county].filter(Boolean).join(', ')}</p>
            </div>

            <div style={reviewBox}>
              <strong style={{fontSize:13,color:'#2E7D32'}}>💳 Payment Method</strong>
              {farmer.paymentMethod === 'till' && <p style={reviewLine}><strong>Till:</strong> {farmer.tillNumber}</p>}
              {farmer.paymentMethod === 'paybill' && <>
                <p style={reviewLine}><strong>Paybill:</strong> {farmer.paybillNumber}</p>
                <p style={reviewLine}><strong>Account:</strong> {farmer.paybillAccount}</p>
              </>}
              {farmer.paymentMethod === 'pochi' && <p style={reviewLine}><strong>Pochi Phone:</strong> {farmer.pochiPhone}</p>}
            </div>

            <div style={reviewBox}>
              <strong style={{fontSize:13,color:'#2E7D32'}}>🌾 Products ({selectedProducts.length})</strong>
              {selectedProducts.slice(0, 5).map(p => (
                <p key={p.name} style={reviewLine}>{p.image} {p.name} — KES {p.price} / {p.unit}</p>
              ))}
              {selectedProducts.length > 5 && <p style={{...reviewLine,color:'#666',fontSize:11}}>+ {selectedProducts.length - 5} more</p>}
            </div>

            <div style={{background:'#E8F5E9',borderRadius:10,padding:12,marginBottom:12,border:'1px solid #A5D6A7'}}>
              <strong style={{color:'#2E7D32',fontSize:12}}>✅ You're ready to sell on FarmDirect!</strong>
              <p style={{fontSize:11,color:'#2E7D32',margin:'4px 0 0'}}>Buyers will pay via escrow. You receive money after delivery is confirmed.</p>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setStep(3)} disabled={isSubmitting} style={{...primaryBtn,background:'white',color:'#666',border:'1px solid #ddd',flex:1}}>← Back</button>
              <button onClick={handleSubmit} disabled={isSubmitting} style={{...primaryBtn,background:isSubmitting?'#ccc':'#4CAF50',flex:2}}>
                {isSubmitting ? '⏳ Submitting...' : '✅ Submit Registration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const labelStyle = { fontSize:12, fontWeight:'bold', color:'#555', display:'block', marginBottom:4, marginTop:8 };
const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:10, border:'2px solid #E0E0E0', fontSize:16, marginBottom:8, boxSizing:'border-box', fontFamily:'inherit', color:'#333' };
const primaryBtn = { width:'100%', padding:16, color:'white', border:'none', borderRadius:25, fontSize:16, fontWeight:'bold', cursor:'pointer', marginTop:8, boxSizing:'border-box' };
const methodBox = { background:'#F9FAFB', borderRadius:12, padding:16, marginBottom:12, border:'1px solid #E0E0E0' };
const reviewBox = { background:'#F9FAFB', borderRadius:12, padding:14, marginBottom:12, border:'1px solid #E0E0E0' };
const reviewLine = { fontSize:12, margin:'4px 0', color:'#333' };
