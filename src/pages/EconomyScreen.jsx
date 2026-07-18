import React, { useState } from 'react';
import { ALL_COUNTIES } from '../data/farmData';

// ====== DATA ======
const SECTORS = ['Agriculture', 'Livestock', 'Trade', 'Savings'];
const COOP_ICONS = { Agriculture: '🌾', Livestock: '🐄', Trade: '🛒', Savings: '💰' };

const generateCoops = () => {
  const coops = [];
  ALL_COUNTIES.forEach(county => {
    SECTORS.forEach(sector => {
      const members = Math.floor(Math.random() * 40) + 5;
      const targetMembers = [50, 100, 200, 500][Math.floor(Math.random() * 4)];
      coops.push({
        id: county + '-' + sector,
        name: county + ' ' + sector + ' Cooperative',
        sector, county,
        icon: COOP_ICONS[sector],
        goal: 'Pool resources for ' + sector.toLowerCase(),
        members, targetMembers,
        progress: Math.round((members / targetMembers) * 100),
        status: members >= targetMembers ? 'REGISTERED' : members >= targetMembers / 2 ? 'BUILDING' : 'FORMING',
        minSave: [50, 100, 200, 500][Math.floor(Math.random() * 4)],
      });
    });
  });
  return coops;
};

const ALL_COOPS = generateCoops();

const DEALS = [
  { product: 'White Maize 90kg', icon: '🌽', supplier: 'Nakuru Co-op', normalPrice: 3500, groupPrice: 2800, needed: 10, joined: 6, hoursLeft: 12 },
  { product: 'Fresh Beans 50kg', icon: '🫘', supplier: 'Kirinyaga Co-op', normalPrice: 4500, groupPrice: 3600, needed: 8, joined: 3, hoursLeft: 18 },
  { product: 'Potatoes 50kg', icon: '🥔', supplier: 'Nyandarua Farmers', normalPrice: 3000, groupPrice: 2400, needed: 12, joined: 7, hoursLeft: 24 },
  { product: 'Pishori Rice 25kg', icon: '🍚', supplier: 'Mwea Rice Co-op', normalPrice: 8000, groupPrice: 6400, needed: 6, joined: 2, hoursLeft: 8 },
];

const FACTORY_TYPES = [
  { type: 'Grain Mill', icon: '🌽', cost: 'KES 5M', jobs: 50, roi: '15-20%', desc: 'Mill maize, wheat. Stop importing flour.' },
  { type: 'Dairy Plant', icon: '🥛', cost: 'KES 8M', jobs: 80, roi: '18-25%', desc: 'Cheese, yoghurt, butter from local milk.' },
  { type: 'Coffee Roastery', icon: '☕', cost: 'KES 3M', jobs: 30, roi: '20-30%', desc: 'Roast coffee. Earn 10x more than raw beans.' },
  { type: 'Fruit Processor', icon: '🍍', cost: 'KES 6M', jobs: 70, roi: '22-30%', desc: 'Juice, dried fruits. Stop wasting harvest.' },
  { type: 'Tannery', icon: '🪶', cost: 'KES 7M', jobs: 60, roi: '20-28%', desc: 'Turn hides into leather. Make shoes locally.' },
  { type: 'Cold Storage', icon: '❄️', cost: 'KES 4M', jobs: 25, roi: '12-18%', desc: 'Store produce. Sell when prices are better.' },
];

const COUNTY_FACTORIES = [];
ALL_COUNTIES.forEach(county => {
  const num = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < num; i++) {
    const type = FACTORY_TYPES[Math.floor(Math.random() * FACTORY_TYPES.length)];
    const progress = Math.floor(Math.random() * 60) + 5;
    const totalShares = Math.floor(Math.random() * 50000) + 5000;
    COUNTY_FACTORIES.push({
      ...type, id: county + '-f' + i, county, progress, totalShares,
      soldShares: Math.floor(totalShares * progress / 100),
      investors: Math.floor(Math.random() * 200) + 10,
      monthlyReturn: Math.floor(Math.random() * 500) + 200,
    });
  }
});

// ====== STYLES ======
const s = {
  page: { padding: 16 },
  backBtn: { background: 'none', border: 'none', color: '#4CAF50', fontWeight: 'bold', cursor: 'pointer', marginBottom: 12, fontSize: 14 },
  card: { background: 'white', borderRadius: 12, padding: 14, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  hero: { background: 'linear-gradient(180deg,#1B5E20,#000)', padding: 24, color: 'white' },
  heroTitle: { color: 'white', margin: '8px 0 4px', fontSize: 20 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0 },
  statBar: { background: '#1B5E20', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' },
  statNum: { color: 'white', fontSize: 16 },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 9, margin: 0 },
  sectionCard: { background: 'white', borderRadius: 12, padding: 14, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #4CAF50' },
  input: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 8, fontSize: 13 },
  select: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 8, fontSize: 13, background: 'white' },
  btn: { width: '100%', padding: 14, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 25, fontSize: 14, fontWeight: 'bold', cursor: 'pointer', marginTop: 8 },
  btnOutline: { width: '100%', padding: 10, background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginTop: 4 },
  greenBox: { background: '#E8F5E9', padding: 16, borderRadius: 12, marginBottom: 12 },
  progressBar: { background: '#E0E0E0', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: (pct) => ({ width: Math.min(pct, 100) + '%', height: '100%', background: pct >= 100 ? '#4CAF50' : '#FF6F00', borderRadius: 3 }),
};

export default function EconomyScreen() {
  const [view, setView] = useState('hub');
  const [userPoints] = useState(1250);
  const [coops, setCoops] = useState(ALL_COOPS);
  const [deals, setDeals] = useState(DEALS);
  const [filterCounty, setFilterCounty] = useState('All');
  const [investCounty, setInvestCounty] = useState('');
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCoop, setNewCoop] = useState({ name: '', county: '', sector: 'Agriculture' });

  const userLevel = userPoints >= 5000 ? 'PLATINUM' : userPoints >= 2000 ? 'GOLD' : userPoints >= 500 ? 'SILVER' : 'BRONZE';
  const totalMembers = coops.reduce((sum, c) => sum + c.members, 0);
  const regCoops = coops.filter(c => c.status === 'REGISTERED').length;
  const filteredCoops = coops.filter(c => (filterCounty === 'All' || c.county === filterCounty));
  const countyFactories = investCounty ? COUNTY_FACTORIES.filter(f => f.county === investCounty) : [];

  // ====== COOPERATIVES ======
  if (view === 'cooperatives') {
    return (
      <div style={s.page}>
        <button onClick={() => setView('hub')} style={s.backBtn}>← Back</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: '#E8F5E9', padding: 12, borderRadius: 10, textAlign: 'center' }}><strong style={{ fontSize: 20, color: '#2E7D32' }}>{coops.length}</strong><p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Cooperatives</p></div>
          <div style={{ background: '#E3F2FD', padding: 12, borderRadius: 10, textAlign: 'center' }}><strong style={{ fontSize: 20, color: '#1565C0' }}>{regCoops}</strong><p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Registered</p></div>
          <div style={{ background: '#FFF3E0', padding: 12, borderRadius: 10, textAlign: 'center' }}><strong style={{ fontSize: 20, color: '#E65100' }}>{totalMembers.toLocaleString()}</strong><p style={{ fontSize: 10, color: 'gray', margin: 0 }}>Members</p></div>
        </div>
        <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)} style={s.select}>
          <option value="All">All 47 Counties</option>
          {ALL_COUNTIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <p style={{ fontSize: 11, color: 'gray', marginBottom: 8 }}>{filteredCoops.length} cooperatives</p>
        {filteredCoops.slice(0, 20).map(c => (
          <div key={c.id} style={{ ...s.card, borderLeft: '4px solid #4CAF50' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 13 }}>{c.name}</strong>
                  <span style={{ background: c.status === 'REGISTERED' ? '#E8F5E9' : '#FFF3E0', padding: '2px 8px', borderRadius: 8, fontSize: 9, fontWeight: 'bold', color: c.status === 'REGISTERED' ? '#2E7D32' : '#E65100' }}>{c.status}</span>
                </div>
                <p style={{ fontSize: 10, color: 'gray', margin: '2px 0' }}>📍 {c.county} • {c.sector} • 💰 KES {c.minSave}/mo</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={s.progressBar}><div style={s.progressFill(c.progress)} /></div>
                  <span style={{ fontSize: 10 }}>{c.members}/{c.targetMembers}</span>
                </div>
              </div>
            </div>
            <button onClick={() => {
              const updated = [...coops];
              const idx = updated.findIndex(x => x.id === c.id);
              updated[idx] = { ...c, members: c.members + 1 };
              setCoops(updated);
              alert('✅ Joined ' + c.name + '!');
            }} style={{ width: '100%', padding: 8, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 12, marginTop: 8 }}>🤝 Join • KES {c.minSave}/mo</button>
          </div>
        ))}
        <button onClick={() => setShowCreate(true)} style={{ ...s.btn, background: '#FF6F00' }}>+ Start New Cooperative</button>
        {showCreate && (
          <div onClick={() => setShowCreate(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: 20, maxWidth: 450, width: '100%' }}>
              <h3 style={{ color: '#2E7D32' }}>Start a Cooperative</h3>
              <input value={newCoop.name} onChange={e => setNewCoop({ ...newCoop, name: e.target.value })} placeholder="Cooperative Name" style={s.input} />
              <select value={newCoop.county} onChange={e => setNewCoop({ ...newCoop, county: e.target.value })} style={s.select}><option value="">Select County</option>{ALL_COUNTIES.map(c => <option key={c}>{c}</option>)}</select>
              <button onClick={() => {
                if (!newCoop.name || !newCoop.county) return alert('Fill all fields');
                setCoops([...coops, { id: Date.now().toString(), name: newCoop.name, sector: newCoop.sector, county: newCoop.county, icon: COOP_ICONS[newCoop.sector], goal: 'Build together', members: 1, targetMembers: 50, progress: 2, status: 'FORMING', minSave: 100 }]);
                setShowCreate(false);
                alert('✅ Cooperative started!');
              }} style={s.btn}>Register</button>
              <button onClick={() => setShowCreate(false)} style={s.btnOutline}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====== GROUP BUY ======
  if (view === 'groupbuy') {
    return (
      <div style={s.page}>
        <button onClick={() => setView('hub')} style={s.backBtn}>← Back</button>
        <div style={s.greenBox}><strong>👥 Buy Together, Save Together</strong><p style={{ fontSize: 12, margin: '4px 0 0' }}>Pool with other buyers to get wholesale prices. Save 20-30%.</p></div>
        {deals.map((d, i) => {
          const prog = (d.joined / d.needed) * 100;
          return (
            <div key={i} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{d.icon} {d.product}</strong><span style={{ background: d.hoursLeft < 6 ? '#FFEBEE' : '#E8F5E9', color: d.hoursLeft < 6 ? '#C62828' : '#2E7D32', padding: '4px 10px', borderRadius: 10, fontSize: 10, fontWeight: 'bold' }}>{d.hoursLeft}h left</span></div>
              <p style={{ fontSize: 11, color: 'gray' }}>🏛️ {d.supplier}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ textDecoration: 'line-through', fontSize: 13, color: 'gray' }}>KES {d.normalPrice.toLocaleString()}</span>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: '#2E7D32' }}>KES {d.groupPrice.toLocaleString()}</span>
                <span style={{ background: '#2E7D32', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>20% OFF</span>
              </div>
              <div style={{ ...s.progressBar, height: 8, borderRadius: 4, margin: '8px 0' }}><div style={{ width: prog + '%', height: '100%', background: '#4CAF50', borderRadius: 4 }} /></div>
              <span style={{ fontSize: 10 }}>{d.joined}/{d.needed} joined</span>
              <button onClick={() => { const u = [...deals]; u[i] = { ...d, joined: d.joined + 1 }; setDeals(u); alert('✅ Joined!'); }} style={{ width: '100%', padding: 10, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 12, marginTop: 6 }}>👥 Join • KES {d.groupPrice.toLocaleString()}</button>
            </div>
          );
        })}
      </div>
    );
  }

  // ====== LOYALTY ======
  if (view === 'loyalty') {
    const levels = [
      { name: 'BRONZE', points: 0, discount: '0%', icon: '🥉', color: '#CD7F32', benefits: 'Basic access' },
      { name: 'SILVER', points: 500, discount: '2%', icon: '🥈', color: '#C0C0C0', benefits: '2% off + free delivery' },
      { name: 'GOLD', points: 2000, discount: '5%', icon: '🥇', color: '#FFD700', benefits: '5% off + priority support' },
      { name: 'PLATINUM', points: 5000, discount: '10%', icon: '💎', color: '#E5E4E2', benefits: '10% off + VIP' },
    ];
    const curr = [...levels].reverse().find(l => userPoints >= l.points) || levels[0];
    const next = levels.find(l => l.points > userPoints) || levels[3];
    const prog = next.points > curr.points ? ((userPoints - curr.points) / (next.points - curr.points)) * 100 : 100;
    return (
      <div style={s.page}>
        <button onClick={() => setView('hub')} style={s.backBtn}>← Back</button>
        <div style={{ background: 'linear-gradient(135deg,' + curr.color + ',#1B5E20)', padding: 24, borderRadius: 16, color: 'white', textAlign: 'center', marginBottom: 16 }}>
          <h2>{curr.icon} {curr.name}</h2>
          <h1 style={{ fontSize: 48, margin: '8px 0' }}>{userPoints.toLocaleString()}</h1>
          <p>Loyalty Points</p>
          {next.points > userPoints && <div style={{ marginTop: 8 }}><div style={{ background: 'rgba(255,255,255,0.3)', height: 8, borderRadius: 4, overflow: 'hidden' }}><div style={{ width: Math.min(prog, 100) + '%', height: '100%', background: '#FFD700', borderRadius: 4 }} /></div><p style={{ fontSize: 11 }}>{next.points - userPoints} pts to {next.name}</p></div>}
          <p style={{ fontSize: 10, marginTop: 8, opacity: .8 }}>Earn: Sell +10 • Review +5 • Refer +50 • On-time delivery +20</p>
        </div>
        {levels.map(l => (
          <div key={l.name} style={{ background: userPoints >= l.points ? '#E8F5E9' : 'white', borderRadius: 12, padding: 12, marginBottom: 6, border: userPoints >= l.points ? '2px solid #4CAF50' : '1px solid #E0E0E0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 24 }}>{l.icon}</span><div style={{ flex: 1 }}><strong>{l.name}</strong> • {l.discount} • {l.benefits}</div><span style={{ fontSize: 11 }}>{l.points} pts</span>{userPoints >= l.points && <span>✅</span>}</div>
          </div>
        ))}
      </div>
    );
  }

  // ====== INVEST ======
  if (view === 'invest') {
    if (selectedFactory) {
      const f = selectedFactory;
      const yearly = f.monthlyReturn * 12;
      return (
        <div style={s.page}>
          <button onClick={() => setSelectedFactory(null)} style={s.backBtn}>← Back to {f.county}</button>
          <div style={{ background: 'linear-gradient(135deg,#1B5E20,#4CAF50)', padding: 24, borderRadius: 16, color: 'white', textAlign: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 50 }}>{f.icon}</span>
            <h3 style={{ color: 'white' }}>{f.type}</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>📍 {f.county} County</p>
          </div>
          <div style={{ background: '#E8F5E9', borderRadius: 12, padding: 16, marginBottom: 8, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>INVEST KES {f.minShare} → EARN</p>
            <h2 style={{ color: '#2E7D32', fontSize: 36, margin: '4px 0' }}>KES {f.monthlyReturn.toLocaleString()}<span style={{ fontSize: 14 }}>/month</span></h2>
            <p style={{ color: '#2E7D32', fontWeight: 'bold' }}>KES {yearly.toLocaleString()}/year ({f.roi} return)</p>
          </div>
          <div style={s.card}><strong>🏭 About this Factory</strong><p style={{ fontSize: 12, margin: '4px 0' }}>{f.desc}</p><p>👷 {f.jobs} jobs • 💰 {f.cost} needed</p></div>
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>KES {(f.soldShares * f.minShare / 1000000).toFixed(1)}M raised</span><span>KES {(f.totalShares * f.minShare / 1000000).toFixed(1)}M target</span></div>
            <div style={{ ...s.progressBar, height: 12, borderRadius: 6 }}><div style={{ width: f.progress + '%', height: '100%', background: f.progress > 70 ? '#4CAF50' : '#FF6F00', borderRadius: 6 }} /></div>
            <p style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 6, fontSize: 18 }}>{f.progress}% Funded</p>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#FF6F00' }}>🔥 {f.investors} investors • {f.totalShares - f.soldShares} shares left</p>
          </div>
          <button onClick={() => { alert('🎉 You invested in ' + f.type + ' in ' + f.county + '! Expected: KES ' + f.monthlyReturn.toLocaleString() + '/month'); setSelectedFactory(null); }} style={{ ...s.btn, fontSize: 18 }}>💰 INVEST KES {f.minShare} NOW → Earn KES {f.monthlyReturn.toLocaleString()}/mo</button>
          <p style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 8 }}>🔒 ESCROW protected. Money held until factory is fully funded.</p>
        </div>
      );
    }

    return (
      <div style={s.page}>
        <button onClick={() => setView('hub')} style={s.backBtn}>← Back</button>
        <div style={{ background: 'linear-gradient(135deg,#1B5E20,#000)', padding: 20, borderRadius: 16, color: 'white', textAlign: 'center', marginBottom: 12 }}>
          <h2 style={{ color: 'white' }}>🇰🇪 Own Kenya, County by County</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Select your county. Invest in local factories from KES 100.</p>
        </div>
        <div style={{ ...s.greenBox, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
          <div><strong style={{ fontSize: 18 }}>1 💰</strong><p style={{ fontSize: 10, margin: 0 }}>Invest KES 100</p></div>
          <div><strong style={{ fontSize: 18 }}>2 🏭</strong><p style={{ fontSize: 10, margin: 0 }}>Factory Built</p></div>
          <div><strong style={{ fontSize: 18 }}>3 📈</strong><p style={{ fontSize: 10, margin: 0 }}>Earn Monthly</p></div>
        </div>
        <select value={investCounty} onChange={e => setInvestCounty(e.target.value)} style={{ ...s.select, padding: 14, fontSize: 16, fontWeight: 'bold' }}>
          <option value="">👇 Select Your County</option>
          {ALL_COUNTIES.map(c => <option key={c} value={c}>{c} ({COUNTY_FACTORIES.filter(f => f.county === c).length} factories)</option>)}
        </select>
        {investCounty && countyFactories.length === 0 && <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>No factories in {investCounty} yet. Be the first to suggest one!</p>}
        {countyFactories.map(f => (
          <div key={f.id} onClick={() => setSelectedFactory(f)} style={{ ...s.card, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 36 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <strong>{f.type}</strong>
                <p style={{ fontSize: 10, color: 'gray' }}>👷 {f.jobs} jobs • 💰 {f.cost} • 📈 {f.roi}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={s.progressBar}><div style={s.progressFill(f.progress)} /></div>
                  <span style={{ fontSize: 10 }}>{f.progress}%</span>
                </div>
                <p style={{ fontSize: 10, color: '#2E7D32', marginTop: 4 }}>💰 KES {f.monthlyReturn}/mo return • {f.investors} investors</p>
              </div>
              <span style={{ fontSize: 20, color: '#4CAF50' }}>→</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ====== MAIN HUB ======
  const sections = [
    { id: 'cooperatives', icon: '🏛️', title: 'Cooperatives (SACCOs)', desc: 'Every county, every sector. Join or start one.', count: coops.length + ' across Kenya' },
    { id: 'groupbuy', icon: '👥', title: 'Sambaza (Group Buy)', desc: 'Buy together at wholesale prices. Save 20-30%', count: deals.length + ' deals' },
    { id: 'loyalty', icon: '⭐', title: 'Loyalty Rewards', desc: 'Earn points. Unlock discounts.', count: userPoints + ' pts • ' + userLevel },
    { id: 'invest', icon: '📈', title: 'Invest Kenya', desc: 'Select your county. Own factories from KES 100.', count: COUNTY_FACTORIES.length + ' factories' },
  ];

  return (
    <div>
      <div style={s.hero}>
        <span style={{ fontSize: 40 }}>🇰🇪</span>
        <h2 style={s.heroTitle}>Building Kenya's Economy</h2>
        <p style={s.heroSub}>Bottom-up. Community-owned. Every county, every sector.</p>
      </div>
      <div style={s.statBar}>
        <div><strong style={s.statNum}>{coops.length}</strong><p style={s.statLabel}>Cooperatives</p></div>
        <div><strong style={s.statNum}>{totalMembers.toLocaleString()}</strong><p style={s.statLabel}>Members</p></div>
        <div><strong style={s.statNum}>{COUNTY_FACTORIES.length}</strong><p style={s.statLabel}>Factories</p></div>
      </div>
      <div style={{ padding: 12 }}>
        {sections.map(sec => (
          <div key={sec.id} onClick={() => setView(sec.id)} style={s.sectionCard}>
            <span style={{ fontSize: 32 }}>{sec.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 14 }}>{sec.title}</strong>
                <span style={{ fontSize: 10, color: '#4CAF50', fontWeight: 'bold' }}>{sec.count}</span>
              </div>
              <p style={{ fontSize: 11, color: '#666', margin: 0 }}>{sec.desc}</p>
            </div>
            <span style={{ fontSize: 20, color: '#999' }}>→</span>
          </div>
        ))}
      </div>
    </div>
  );
}
