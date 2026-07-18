import EconomyScreen from "./pages/EconomyScreen";
import ChatScreen from "./pages/ChatScreen";
import FarmerRegister from "./components/FarmerRegister";
import ShambaSafi from "./components/ShambaSafi";
import React, { useState } from 'react';
import { ALL_PRODUCTS, CATEGORIES, CHAT_FARMERS, RIDERS } from './data/farmData';
import './App.css';

export default function App() {
  const [tab, setTab] = useState(0);
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showShamba, setShowShamba] = useState(false);
const [showRegister, setShowRegister] = useState(false);
  
  // Chat state
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [messages, setMessages] = useState({});
  const [msgText, setMsgText] = useState('');

  const addToCart = (p) => {
    const e = cart.find(c => c.id === p.id);
    e ? setCart(cart.map(c => c.id === p.id ? {...c, qty: c.qty + 1} : c)) : setCart([...cart, {...p, qty: 1}]);
  };

  const filtered = ALL_PRODUCTS.filter(p => 
    (cat === 'All' || p.category === cat) && 
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.farmer.toLowerCase().includes(search.toLowerCase()))
  );

  const selectFarmer = (f) => {
    setSelectedFarmer(f);
    try { const s = localStorage.getItem(`chat_${f.id}`); setMessages(prev => ({...prev, [f.id]: s ? JSON.parse(s) : []})); } catch(e) { setMessages(prev => ({...prev, [f.id]: []})); }
  };

  const sendMsg = () => {
    if (!msgText.trim() || !selectedFarmer) return;
    const msgs = messages[selectedFarmer.id] || [];
    const updated = [...msgs, { text: msgText, isMe: true, time: Date.now() }];
    setMessages({...messages, [selectedFarmer.id]: updated});
    localStorage.setItem(`chat_${selectedFarmer.id}`, JSON.stringify(updated));
    setMsgText('');
  };

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
      {/* HEADER - matches Android TopAppBar */}
      {!selectedFarmer && (
        <header style={{background:'#4CAF50',color:'white',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:36,height:36,background:'white',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🌱</div>
            <div><h1 style={{fontSize:18,margin:0}}>FarmDirect</h1><p style={{fontSize:10,margin:0,opacity:.8}}>73 products • Fresh from Kenyan farms</p></div>
          </div>
          <button onClick={() => setShowCart(true)} style={{background:'none',border:'none',color:'white',fontSize:20,cursor:'pointer',position:'relative'}}>
            🛒{cart.length > 0 && <span style={{position:'absolute',top:-6,right:-6,background:'#FFD600',color:'#000',borderRadius:'50%',width:18,height:18,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold'}}>{cart.reduce((s,i)=>s+i.qty,0)}</span>}
          </button>
        </header>
      )}

      <main style={{paddingBottom:70}}>
        {/* ====== HOME TAB ====== */}
        {tab === 0 && !selectedFarmer && (
          <div>
            <div style={{background:'#E8F5E9',margin:12,padding:12,borderRadius:12,display:'flex',gap:12,alignItems:'center'}}>
              <span style={{fontSize:40}}>🇰🇪</span>
              <div><strong>Karibu FarmDirect!</strong><p style={{fontSize:11}}>Fresh produce directly from farmers</p><p style={{fontSize:10,color:'#4CAF50'}}>🔒 ESCROW protected • M-Pesa</p></div>
              <button onClick={() => setShowRegister(true)} style={{marginTop:8,background:"#FF6F00",color:"white",border:"none",padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:"bold",cursor:"pointer",width:"100%"}}>👨‍🌾 Register as Farmer - List Your Products</button>
            </div>

            <div style={{background:'white',margin:'0 12px',padding:12,borderRadius:12,display:'flex',alignItems:'center',gap:8,border:'1px solid #ddd'}}>
              <span>🔍</span><input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{border:'none',outline:'none',flex:1,fontSize:14}} />
            </div>

            <div style={{display:'flex',gap:6,padding:12,overflowX:'auto'}}>
              {CATEGORIES.map(c => <button key={c} onClick={() => setCat(c)} style={{padding:'6px 12px',borderRadius:20,border:'1px solid #ddd',background:cat===c?'#4CAF50':'white',color:cat===c?'white':'#333',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',fontWeight:cat===c?'bold':'normal'}}>{c}</button>)}
            </div>

            <p style={{padding:'0 16px',fontSize:12,color:'gray'}}>📦 {filtered.length} products</p>

            {filtered.map(p => (
              <div key={p.id} style={{background:'white',margin:'8px 12px',padding:12,borderRadius:12,display:'flex',gap:12,alignItems:'center',boxShadow:'0 1px 3px rgba(0,0,0,.08)'}}>
                <span style={{fontSize:45}}>{p.image}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <strong>{p.name}</strong>
                    <span style={{background:'#4CAF50',color:'white',padding:'2px 6px',borderRadius:4,fontSize:8,fontWeight:'bold'}}>FARMER</span>
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

        {/* ====== CHAT TAB - New ChatScreen ====== */}
        {tab === 1 && <ChatScreen />}
        {tab === 2 && <EconomyScreen />}
        {tab === 3 && <div style={{padding:12}}><h2>🚚 Delivery</h2>{RIDERS.map(r => <div key={r.id} style={{background:'white',borderRadius:12,padding:12,marginBottom:6}}><strong>{r.name}</strong> - {r.vehicle} - KES {r.price}</div>)}</div>}
        {tab === 4 && <div style={{padding:12,textAlign:'center'}}><h2>📍 Live Tracking</h2><div style={{background:'#E8F5E9',height:300,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center'}}>🗺️ OpenStreetMap</div></div>}
        {tab === 5 && <div style={{padding:20,textAlign:'center'}}><h2>📍 Nakuru</h2><span style={{fontSize:80}}>⛅</span><h1 style={{fontSize:56}}>24°C</h1></div>}
        {tab === 6 && <div style={{padding:12}}><h2>🔔 Notifications</h2><div style={{background:'#E8F5E9',padding:12,borderRadius:10,marginBottom:6}}>✅ Order #4521 delivered <span style={{fontSize:10,color:'gray'}}>5m ago</span></div></div>}
      </main>

      {/* CART MODAL */}
      {showCart && (
        <div onClick={() => setShowCart(false)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.5)',zIndex:400,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div onClick={e => e.stopPropagation()} style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}><h2>🛒 Cart</h2><button onClick={() => setShowCart(false)} style={{background:'none',border:'none',fontSize:24,cursor:'pointer'}}>✕</button></div>
            {cart.length === 0 ? <p>Empty</p> : cart.map(c => <div key={c.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}><span>{c.image} {c.name}</span><span>x{c.qty} KES {(c.price*c.qty).toLocaleString()}</span></div>)}
            {cart.length > 0 && <><hr/><p><strong>Total: KES {cart.reduce((s,i) => s + i.price*i.qty, 0).toLocaleString()}</strong></p></>}
            <button onClick={() => { setShowCart(false); alert('Go to Delivery tab to checkout!'); }} style={{background:'#4CAF50',color:'white',border:'none',padding:12,borderRadius:8,width:'100%',marginTop:8,cursor:'pointer',fontWeight:'bold'}}>Checkout</button>
            <button onClick={() => setCart([])} style={{background:'none',border:'1px solid #C62828',color:'#C62828',padding:8,borderRadius:8,width:'100%',marginTop:4,cursor:'pointer'}}>Clear</button>
          </div>
        </div>
      )}

      {!selectedFarmer && <button onClick={() => setShowShamba(true)} style={{position:"fixed",bottom:80,right:16,background:"#FF6F00",color:"white",border:"none",width:56,height:56,borderRadius:"50%",fontSize:28,cursor:"pointer",boxShadow:"0 4px 15px rgba(0,0,0,.3)",zIndex:99}}>🛡️</button>}
      {showShamba && <ShambaSafi onClose={() => setShowShamba(false)} />}
      {showRegister && <FarmerRegister onClose={() => setShowRegister(false)} onRegister={(data) => { console.log("Farmer registered:", data); alert("✅ Registration submitted! Your products will be reviewed within 24 hours."); }} />}
      {/* BOTTOM NAV - 7 TABS MATCHING ANDROID */}
      {!selectedFarmer && (
        <nav style={{position:'fixed',bottom:0,width:'100%',maxWidth:450,background:'#4CAF50',display:'flex',justifyContent:'space-around',padding:'8px 0 10px',zIndex:100}}>
          {tabs.map((t, i) => (
            <div key={i} onClick={() => setTab(i)} style={{display:'flex',flexDirection:'column',alignItems:'center',color:'white',fontSize:9,cursor:'pointer',opacity:tab===i?1:.7,fontWeight:tab===i?'bold':'normal'}}>
              <span style={{fontSize:20}}>{t.icon}</span>{t.label}
              {i === 6 && <span style={{position:'absolute',top:0,right:12,background:'red',color:'white',borderRadius:'50%',width:16,height:16,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center'}}>2</span>}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
