import TrackingScreen from "./pages/TrackingScreen";
import DeliveryScreen from "./pages/DeliveryScreen";
import EconomyScreen from "./pages/EconomyScreen";
import ChatScreen from "./pages/ChatScreen";
import FarmerRegister from "./components/FarmerRegister";
import ShambaSafi from "./components/ShambaSafi";
import Checkout from "./components/Checkout";
import BusinessDashboard from "./pages/BusinessDashboard";
import React, { useState, useEffect } from 'react';
import { ALL_PRODUCTS, CATEGORIES, CHAT_FARMERS, RIDERS } from './data/farmData';
import './App.css';
import AlertsScreen from './components/AlertsScreen';
import KYCModal from './components/KYCModal';

export default function App() {
  const [tab, setTab] = useState(0);
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showShamba, setShowShamba] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showBusiness, setShowBusiness] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showKYC, setShowKYC] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [kycTier, setKycTier] = useState(null);

  const [myFarmer, setMyFarmer] = useState(null);
  const [justRegistered, setJustRegistered] = useState(false);
  const [registeredProducts, setRegisteredProducts] = useState([]);

  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [messages, setMessages] = useState({});
  const [msgText, setMsgText] = useState('');

  const loadRegisteredFarmers = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/farmer/list');
      const data = await res.json();
      if (data.success && data.farmers) {
        const products = [];
        data.farmers.forEach(farmer => {
          (farmer.products || []).forEach((p, idx) => {
            products.push({
              id: `reg-${farmer.id}-${idx}`,
              name: p.name,
              farmer: farmer.fullName,
              price: parseInt(p.price),
              unit: p.unit || p.quantity || 'kg',
              location: farmer.location?.manual || 
                [farmer.location?.area, farmer.location?.locality, farmer.location?.ward, farmer.location?.county].filter(Boolean).join(', ') || 
                'Kenya',
              category: p.category || 'Others',
              subCategory: p.subCategory || null,
              image: p.image || '📦',
              rating: 4.5,
              phone: farmer.phone,
              isRegistered: true,
              farmerId: farmer.id,
              paymentMethod: farmer.payment?.method,
            });
          });
        });
        setRegisteredProducts(products);
        console.log('📍 Loaded', products.length, 'real farmer products');
      }
    } catch (err) {
      console.error('Failed to load registered farmers:', err);
    }
  };

  useEffect(() => {
    // Session 5A: Listen for livestock redirect from FarmerRegister
    const handler = (e) => {
      setShowShamba(true);
    };
    window.addEventListener('openShambaSafi', handler);
    return () => window.removeEventListener('openShambaSafi', handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === '1') setShowBusiness(true);
    try {
      const saved = localStorage.getItem('farmerRegistration');
      if (saved) setMyFarmer(JSON.parse(saved));
    } catch (e) {}
    loadRegisteredFarmers();
  }, []);

  // Load KYC status when farmer is set
  useEffect(() => {
    const phone = myFarmer?.farmer?.phone;
    if (!phone) return;

    fetch(`http://localhost:3001/api/kyc/status/${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(data => setKycVerified(data.verified || false))
      .catch(() => {});

    fetch(`http://localhost:3001/api/kyc/tier/${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(data => setKycTier(data.tier || null))
      .catch(() => {});
  }, [myFarmer]);

  const handleLogoTap = () => {
    const next = logoTaps + 1;
    if (next >= 5) { setShowBusiness(true); setLogoTaps(0); }
    else { setLogoTaps(next); setTimeout(() => setLogoTaps(0), 2000); }
  };

  const addToCart = (p) => {
    const e = cart.find(c => c.id === p.id);
    e ? setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c)) : setCart([...cart, {...p, qty: 1}]);
  };

  // ═══════════════════════════════════════════════════
  // REAL FARMERS REPLACE MOCK DATA
  // ═══════════════════════════════════════════════════
  const hasRealFarmers = registeredProducts.length > 0;
  const displayProducts = hasRealFarmers ? registeredProducts : ALL_PRODUCTS;
  const isDemoMode = !hasRealFarmers;

  const filtered = displayProducts.filter(p =>
    (cat === 'All' || p.category === cat) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.farmer.toLowerCase().includes(search.toLowerCase()))
  );

  const sendMsg = () => {
    if (!msgText.trim() || !selectedFarmer) return;
    const msgs = messages[selectedFarmer.id] || [];
    const updated = [...msgs, { text: msgText, isMe: true, time: Date.now() }];
    setMessages({...messages, [selectedFarmer.id]: updated});
    localStorage.setItem(`chat_${selectedFarmer.id}`, JSON.stringify(updated));
    setMsgText('');
  };

  const handleFarmerRegistered = (data) => {
    setMyFarmer(data);
    setJustRegistered(true);
    setShowRegister(false);
    loadRegisteredFarmers();
    setTimeout(() => setJustRegistered(false), 8000);
  };

  const logoutFarmer = () => {
    if (!confirm('Log out from your farmer account?\n\nNote: This only clears your device. Your products stay live on the marketplace.')) return;
    localStorage.removeItem('farmerRegistration');
    setMyFarmer(null);
  };

  if (showBusiness) {
    return (
      <div className="app" style={{ background: '#F5F7FA', minHeight: '100vh' }}>
        <button onClick={() => setShowBusiness(false)} style={{
          position: 'fixed', top: 12, right: 12, zIndex: 100,
          background: '#fff', border: '1px solid #ddd', borderRadius: 20,
          padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 'bold'
        }}>← Back to App</button>
        <BusinessDashboard />
      </div>
    );
  }

  const tabs = [
    { icon:'🏠', label:'Home' },
    { icon:'💬', label:'Chat' },
    { icon:'🏛️', label:'Economy' },
    { icon:'🚚', label:'Delivery' },
    { icon:'📍', label:'Track' },
    { icon:'⛅', label:'Weather' },
    { icon:'🔔', label:'Alerts' },
  ];

  return (
    <div className="app">
      {!selectedFarmer && (
        <header style={{background:'#4CAF50',color:'white',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div onClick={handleLogoTap} style={{width:36,height:36,background:'white',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,cursor:'pointer',userSelect:'none'}}>🌱</div>
            <div>
              <h1 style={{fontSize:18,margin:0}}>
                FarmDirect
                {kycVerified && <span style={{marginLeft:6,fontSize:12,background:'#4CAF50',color:'white',padding:'2px 6px',borderRadius:10}}>✅ VERIFIED</span>}
              </h1>
              <p style={{fontSize:10,margin:0,opacity:.8}}>
                {myFarmer 
                  ? `👨‍🌾 ${myFarmer.farmer?.fullName || 'Farmer'} • ${displayProducts.length} products live${kycTier ? ' • ' + kycTier.label : ''}`
                  : isDemoMode 
                    ? `${displayProducts.length} demo products • Register to go live`
                    : `${displayProducts.length} products • From ${new Set(registeredProducts.map(p => p.farmer)).size} real farmers`}
              </p>
            </div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {myFarmer && (
              <button onClick={logoutFarmer} title="Logout" style={{
                background:'rgba(255,255,255,0.2)', border:'none', color:'white',
                borderRadius:14, padding:'4px 10px', fontSize:11, cursor:'pointer'
              }}>Logout</button>
            )}
            <button onClick={() => setShowCart(true)} style={{background:'none',border:'none',color:'white',fontSize:20,cursor:'pointer',position:'relative'}}>
              🛒{cart.length > 0 && <span style={{position:'absolute',top:-6,right:-6,background:'#FFD600',color:'#000',borderRadius:'50%',width:18,height:18,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold'}}>{cart.reduce((s,i)=>s+i.qty,0)}</span>}
            </button>
          </div>
        </header>
      )}

      {myFarmer && !selectedFarmer && !justRegistered && (
        <div style={{
          background: '#E8F5E9', borderBottom: '1px solid #A5D6A7',
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 12, color: '#2E7D32'
        }}>
          <span style={{fontSize:18}}>✅</span>
          <div style={{flex:1}}>
            <strong>Registered Farmer</strong> — {myFarmer.products?.length || 0} product{myFarmer.products?.length !== 1 ? 's' : ''} live
          </div>
          <span style={{fontSize:10, opacity:.7}}>
            {myFarmer.payment?.method === 'till' && `🏪 Till ${myFarmer.payment.tillNumber}`}
            {myFarmer.payment?.method === 'paybill' && `🏦 Paybill ${myFarmer.payment.paybillNumber}`}
            {myFarmer.payment?.method === 'pochi' && `📱 Pochi ${myFarmer.payment.pochiPhone}`}
          </span>
        </div>
      )}

      {justRegistered && (
        <div style={{
          background: 'linear-gradient(135deg,#4CAF50,#2E7D32)',
          color: 'white', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <span style={{fontSize:32}}>🎉</span>
          <div style={{flex:1}}>
            <strong style={{fontSize:14}}>Karibu FarmDirect, {myFarmer?.farmer?.fullName}!</strong>
            <p style={{fontSize:11,margin:'2px 0 0',opacity:.9}}>
              Your {myFarmer?.products?.length || 0} product{myFarmer?.products?.length !== 1 ? 's' : ''} {myFarmer?.products?.length === 1 ? 'is' : 'are'} now live on the marketplace.
            </p>
          </div>
        </div>
      )}

      <main style={{paddingBottom:70}}>
        {tab === 0 && !selectedFarmer && (
          <div>
            <div style={{background:'#E8F5E9',margin:12,padding:12,borderRadius:12,display:'flex',gap:12,alignItems:'center'}}>
              <span style={{fontSize:40}}>🇰🇪</span>
              <div style={{flex:1}}>
                <strong>Karibu FarmDirect!</strong>
                <p style={{fontSize:11,margin:'2px 0'}}>Fresh produce directly from farmers</p>
                <p style={{fontSize:10,color:'#4CAF50',margin:0}}>🔒 ESCROW protected • M-Pesa</p>
              </div>
            </div>

            {/* Demo mode banner */}
            {isDemoMode && (
              <div style={{
                margin: '0 12px 12px', background: '#FFF8E1', border: '2px dashed #FFB74D',
                borderRadius: 12, padding: 14
              }}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <span style={{fontSize:24}}>🧪</span>
                  <div style={{flex:1}}>
                    <strong style={{fontSize:13,color:'#E65100'}}>Demo Marketplace</strong>
                    <p style={{fontSize:11,margin:'2px 0 0',color:'#666'}}>These are example products. Real farmers who register will replace them.</p>
                  </div>
                </div>
                <button onClick={() => setShowRegister(true)} style={{
                  background:'#FF6F00', color:'white', border:'none',
                  padding:'12px 16px', borderRadius:10, width:'100%',
                  fontSize:13, fontWeight:'bold', cursor:'pointer'
                }}>👨‍🌾 Register as Farmer — Be First Real Seller</button>
              </div>
            )}

            {/* Live mode banner */}
            {!isDemoMode && !myFarmer && (
              <div style={{
                margin:'0 12px 12px', background:'#E8F5E9', border:'1px solid #A5D6A7',
                borderRadius:12, padding:14, display:'flex', alignItems:'center', gap:10
              }}>
                <span style={{fontSize:24}}>✅</span>
                <div style={{flex:1}}>
                  <strong style={{fontSize:13,color:'#2E7D32'}}>Live Marketplace</strong>
                  <p style={{fontSize:11,margin:'2px 0 0',color:'#666'}}>
                    {registeredProducts.length} products from {new Set(registeredProducts.map(p => p.farmer)).size} real registered farmers
                  </p>
                </div>
                <button onClick={() => setShowRegister(true)} style={{
                  background:'#4CAF50', color:'white', border:'none',
                  padding:'10px 14px', borderRadius:10, fontSize:12,
                  fontWeight:'bold', cursor:'pointer'
                }}>Join Them</button>
              </div>
            )}

            {/* KYC VERIFICATION BANNER */}
            {myFarmer && !kycVerified && (
              <div style={{
                margin:'0 12px 12px', background:'linear-gradient(135deg, #1565C0, #0D47A1)',
                borderRadius:12, padding:14, color:'white',
                border:'1px solid #0D47A1'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <span style={{fontSize:28}}>🪪</span>
                  <div style={{flex:1}}>
                    <strong style={{fontSize:14}}>Get Verified to Sell More</strong>
                    <p style={{fontSize:11,margin:'2px 0 0',opacity:.9}}>
                      Unlock KES 500,000/month + verified badge
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowKYC(true)} style={{
                  width:'100%', padding:10, background:'white', color:'#1565C0',
                  border:'none', borderRadius:8, fontSize:13, fontWeight:'bold',
                  cursor:'pointer'
                }}>
                  🪪 Verify Now — KES 500
                </button>
              </div>
            )}

            {/* VERIFIED SELLER BADGE */}
            {myFarmer && kycVerified && (
              <div style={{
                margin:'0 12px 12px', background:'#E8F5E9', 
                borderRadius:12, padding:12, display:'flex', alignItems:'center', gap:10,
                border:'1px solid #A5D6A7'
              }}>
                <span style={{fontSize:24}}>✅</span>
                <div style={{flex:1}}>
                  <strong style={{fontSize:13,color:'#2E7D32'}}>
                    Verified Seller {kycTier ? '• ' + kycTier.label : ''}
                  </strong>
                  <p style={{fontSize:11,margin:'2px 0 0',color:'#666'}}>
                    {kycTier ? `Sell up to KES ${kycTier.monthlyLimit.toLocaleString()}/month` : 'Full selling limits unlocked'}
                  </p>
                </div>
              </div>
            )}

            {myFarmer && (
              <div style={{margin:'0 12px 12px', background:'#F0F4F8', borderRadius:12, padding:14, border:'1px solid #E0E0E0'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <strong style={{fontSize:13,color:'#1B5E20'}}>👨‍🌾 Your Farm</strong>
                  <span style={{fontSize:10,color:'#666'}}>{myFarmer.products?.length || 0} products live</span>
                </div>
                <p style={{fontSize:11,margin:'2px 0',color:'#333'}}>
                  📍 {myFarmer.farmer?.location?.manual || [myFarmer.farmer?.location?.area, myFarmer.farmer?.location?.locality, myFarmer.farmer?.location?.county].filter(Boolean).join(', ') || 'Location not set'}
                </p>
                <p style={{fontSize:11,margin:'2px 0',color:'#333'}}>
                  💳 {myFarmer.payment?.method === 'till' && `Till ${myFarmer.payment.tillNumber}`}
                  {myFarmer.payment?.method === 'paybill' && `Paybill ${myFarmer.payment.paybillNumber}`}
                  {myFarmer.payment?.method === 'pochi' && `Pochi ${myFarmer.payment.pochiPhone}`}
                </p>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>
                  {(myFarmer.products || []).slice(0,5).map((p,i) => (
                    <span key={i} style={{background:'white',padding:'3px 8px',borderRadius:10,fontSize:10,border:'1px solid #ddd'}}>
                      {p.image} {p.name} — KES {p.price}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{background:'white',margin:'0 12px',padding:12,borderRadius:12,display:'flex',alignItems:'center',gap:8,border:'1px solid #ddd'}}>
              <span>🔍</span><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{border:'none',outline:'none',flex:1,fontSize:14}} />
            </div>

            <div style={{display:'flex',gap:6,padding:12,overflowX:'auto'}}>
              {CATEGORIES.map(c => <button key={c} onClick={() => setCat(c)} style={{padding:'6px 12px',borderRadius:20,border:'1px solid #ddd',background:cat===c?'#4CAF50':'white',color:cat===c?'white':'#333',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',fontWeight:cat===c?'bold':'normal'}}>{c}</button>)}
            </div>

            <p style={{padding:'0 16px',fontSize:12,color:'gray'}}>
              📦 {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              {isDemoMode && <span style={{color:'#FF6F00',fontWeight:'bold'}}> (demo data)</span>}
              {!isDemoMode && <span style={{color:'#4CAF50',fontWeight:'bold'}}> • live</span>}
            </p>

            {filtered.map(p => (
              <div key={p.id} style={{
                background: p.isRegistered ? '#F0F9F0' : 'white',
                margin:'8px 12px',padding:12,borderRadius:12,display:'flex',gap:12,alignItems:'center',
                boxShadow:'0 1px 3px rgba(0,0,0,.08)',
                border: p.isRegistered ? '2px solid #A5D6A7' : '1px solid #E0E0E0'
              }}>
                <span style={{fontSize:45}}>{p.image}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <strong>{p.name}</strong>
                    <span style={{
                      background: p.isRegistered ? '#2E7D32' : '#9E9E9E',
                      color:'white',padding:'2px 6px',borderRadius:4,fontSize:8,fontWeight:'bold'
                    }}>
                      {p.isRegistered ? '✅ VERIFIED' : 'DEMO'}
                    </span>
                  </div>
                  {p.subCategory && <p style={{fontSize:10,color:'#FF6F00',fontWeight:'bold',margin:'2px 0'}}>{p.subCategory}</p>}
                  <p style={{fontSize:12,color:'gray',margin:0}}>{p.farmer}</p>
                  <p style={{fontSize:11,color:'gray',margin:0}}>⭐ {p.rating} • 📍 {p.location}</p>
                  <p style={{fontSize:10,color:'#4CAF50',margin:'2px 0'}}>{p.unit}</p>
                  <p style={{fontWeight:'bold',fontSize:16,color:'#4CAF50',margin:'4px 0'}}>KES {p.price.toLocaleString()}</p>
                  <div style={{display:'flex',gap:4}}>
                    <button style={{background:'none',border:'1px solid #ddd',padding:'4px 8px',borderRadius:4,fontSize:10,cursor:'pointer'}}>⭐ Reviews</button>
                    <button onClick={() => {if(confirm("⚠️ IMPORTANT: Never send money outside FarmDirect. Always use in-app ESCROW payment.\n\nDo you still want to call?")) window.open(`tel:+${p.phone}`)}} style={{background:'none',border:'1px solid #ddd',padding:'4px 8px',borderRadius:4,fontSize:10,cursor:'pointer'}}>📞 Call</button>
                  </div>
                </div>
                <button onClick={() => addToCart(p)} style={{background:'#4CAF50',color:'white',border:'none',padding:'8px 14px',borderRadius:8,cursor:'pointer',fontWeight:'bold'}}>Add</button>
              </div>
            ))}
          </div>
        )}

        {tab === 1 && <ChatScreen />}
        {tab === 2 && <EconomyScreen />}
        {tab === 3 && <DeliveryScreen />}
        {tab === 4 && <TrackingScreen />}
        {tab === 5 && <div style={{padding:20,textAlign:'center'}}><h2>📍 Nakuru</h2><span style={{fontSize:80}}>⛅</span><h1 style={{fontSize:56}}>24°C</h1></div>}
        {tab === 6 && <AlertsScreen />}
      </main>

      {showCart && (
        <div onClick={() => setShowCart(false)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.5)',zIndex:400,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div onClick={e => e.stopPropagation()} style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h2>🛒 Cart</h2><button onClick={() => setShowCart(false)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer'}}>✕</button></div>
            {cart.length === 0 ? <p>Empty</p> : cart.map(c => <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}><span>{c.image} {c.name}</span><span>x{c.qty} KES {(c.price*c.qty).toLocaleString()}</span></div>)}
            {cart.length > 0 && <><hr/><p><strong>Total: KES {cart.reduce((s,i) => s + i.price*i.qty, 0).toLocaleString()}</strong></p></>}
            <button onClick={() => { setShowCart(false); setShowCheckout(true); }} style={{background:'#4CAF50',color:'white',border:'none',padding:12,borderRadius:8,width:'100%',marginTop:8,cursor:'pointer',fontWeight:'bold'}}>Checkout</button>
            <button onClick={() => setCart([])} style={{background:'none',border:'1px solid #C62828',color:'#C62828',padding:8,borderRadius:8,width:'100%',marginTop:4,cursor:'pointer'}}>Clear</button>
          </div>
        </div>
      )}

      {/* KYC MODAL */}
      {showKYC && (
        <KYCModal 
          userId={myFarmer?.farmer?.phone}
          userType="farmer"
          userName={myFarmer?.farmer?.fullName}
          userPhone={myFarmer?.farmer?.phone}
          onClose={() => setShowKYC(false)}
          onVerified={(v) => {
            setKycVerified(true);
            setShowKYC(false);
            alert('✅ You are now a Verified Seller!');
            // Reload tier
            fetch(`http://localhost:3001/api/kyc/tier/${encodeURIComponent(myFarmer?.farmer?.phone)}`)
              .then(r => r.json())
              .then(data => setKycTier(data.tier || null))
              .catch(() => {});
          }}
        />
      )}

      {showCheckout && (
        <Checkout 
          cart={cart} 
          onClose={() => setShowCheckout(false)}
          onOrder={(order) => { 
            console.log('Order placed:', order); 
            setCart([]); 
            setShowCheckout(false);
            alert('Order placed! ' + (order.escrowId ? 'Escrow: ' + order.escrowId : 'Order: ' + order.orderId));
          }} 
        />
      )}

      {!selectedFarmer && <button onClick={() => setShowShamba(true)} style={{position:"fixed",bottom:80,right:16,background:"#FF6F00",color:"white",border:"none",width:56,height:56,borderRadius:"50%",fontSize:28,cursor:"pointer",boxShadow:"0 4px 15px rgba(0,0,0,.3)",zIndex:99}}>🛡️</button>}
      {showShamba && <ShambaSafi onClose={() => setShowShamba(false)} />}
      {showRegister && <FarmerRegister onClose={() => setShowRegister(false)} onRegister={handleFarmerRegistered} />}

      {!selectedFarmer && (
        <nav style={{position:'fixed',bottom:0,width:'100%',maxWidth:450,background:'#4CAF50',display:'flex',justifyContent:'space-around',padding:'8px 0 10px',zIndex:100}}>
          {tabs.map((t, i) => (
            <div key={i} onClick={() => setTab(i)} style={{display:'flex',flexDirection:'column',alignItems:'center',color:'white',fontSize:9,cursor:'pointer',opacity:tab===i?1:.7,fontWeight:tab===i?'bold':'normal'}}>
              <span style={{fontSize:20}}>{t.icon}</span>{t.label}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
