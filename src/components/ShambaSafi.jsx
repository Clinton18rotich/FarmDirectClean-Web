import React, { useState } from 'react';

const SHAMBA_ANIMALS = [
  { passportId:'KE-COW-MRQDF769', type:'Cow', breed:'Friesian', status:'alive', location:'Nakuru', aiCoat:'#A7F3B2' },
  { passportId:'KE-GOAT-MRQDF7CD', type:'Goat', breed:'Galla', status:'alive', location:'Kitui', aiCoat:'#C4D8E1' },
  { passportId:'KE-SHEEP-003', type:'Sheep', breed:'Dorper', status:'alive', location:'Narok', aiCoat:'#D4E8F1' },
];

export default function ShambaSafi({ onClose }) {
  const [activeModule, setActiveModule] = useState(null);
  const [showQR, setShowQR] = useState(false);

  const modules = [
    {
      id: 'land',
      icon: '🏠',
      title: 'Module A: Digital Land Vault',
      desc: 'GPS boundary mapping • Title deed protection • 3 witnesses',
      color: '#4CAF50',
      content: (
        <div>
          <div style={{background:'#E8F5E9',padding:16,borderRadius:12,textAlign:'center',margin:'8px 0'}}>
            <span style={{fontSize:50}}>🗺️</span>
            <p style={{fontWeight:'bold',color:'#2E7D32'}}>GPS Polygon Active</p>
            <p style={{fontSize:13}}>2.5 Hectares • Nakuru County</p>
            <p style={{fontSize:11,color:'#666'}}>Coordinates: -0.3031, 36.0800</p>
          </div>
          <div style={{background:'white',borderRadius:10,padding:12,margin:'8px 0',border:'1px solid #E0E0E0'}}>
            <p><strong>📜 Title Deed:</strong> NBI/2024/12345</p>
            <p><strong>📍 County:</strong> Nakuru</p>
            <p><strong>📏 Area:</strong> 2.5 Hectares</p>
            <p><strong>👥 Witnesses:</strong> 3 trusted neighbors</p>
          </div>
          <div style={{background:'#E8F5E9',padding:12,borderRadius:10,border:'1px solid #A5D6A7'}}>
            <strong>🛡️ Court Evidence:</strong> "This family has been farming at these exact GPS coordinates for years."
          </div>
        </div>
      )
    },
    {
      id: 'livestock',
      icon: '🐄',
      title: 'Module B: Livestock Passport',
      desc: 'AI coat recognition • UUID digital ID • SMS slaughter approval',
      color: '#FF6F00',
      content: (
        <div>
          <div style={{background:'#FFEBEE',padding:10,borderRadius:8,margin:'8px 0',border:'1px solid #EF9A9A'}}>
            <strong style={{color:'#C62828'}}>🚫 ANTI-THEFT:</strong> Slaughterhouse requires owner SMS approval. Stolen animals cannot be sold.
          </div>
          {SHAMBA_ANIMALS.map(a => (
            <div key={a.passportId} style={{background:'white',borderRadius:10,padding:12,margin:'6px 0',border:'1px solid #E0E0E0'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <strong>🆔 {a.passportId}</strong>
                <span style={{background:'#E8F5E9',color:'#2E7D32',padding:'2px 8px',borderRadius:8,fontSize:10,fontWeight:'bold'}}>✅ {a.status}</span>
              </div>
              <p style={{fontSize:13,margin:'4px 0'}}>{a.type} • {a.breed}</p>
              <p style={{fontSize:11,color:'#666'}}>📍 {a.location}</p>
              <span style={{background:'#E3F2FD',color:'#1565C0',padding:'2px 6px',borderRadius:6,fontSize:9}}>AI Coat: {a.aiCoat}</span>
              <button onClick={() => alert(`🚨 ${a.passportId} reported stolen! Slaughterhouses notified.`)} style={{display:'block',marginTop:6,background:'#FFEBEE',color:'#C62828',border:'1px solid #EF9A9A',padding:'4px 10px',borderRadius:6,fontSize:10,cursor:'pointer'}}>🚨 Report Stolen</button>
            </div>
          ))}
          <button onClick={() => {
            const id = 'KE-COW-' + Date.now().toString(36).toUpperCase().slice(-8);
            alert('✅ Animal Registered!\nPassport: ' + id + '\nAI Coat Pattern generated.');
          }} style={{width:'100%',padding:10,background:'#4CAF50',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold',marginTop:8}}>
            ➕ Register New Animal
          </button>
        </div>
      )
    },
    {
      id: 'health',
      icon: '🏥',
      title: 'Module C: Health & Vet Network',
      desc: '6AM daily SMS check • Auto vet dispatch • Quarantine lock',
      color: '#1565C0',
      content: (
        <div>
          <div style={{background:'#FFF8E1',padding:12,borderRadius:10,margin:'8px 0',border:'1px solid #FFE082'}}>
            <strong>📱 Daily SMS (6:00 AM):</strong>
            <p style={{fontSize:13,margin:'4px 0'}}>"Is your herd healthy today? Reply 1=Yes, 2=No"</p>
          </div>
          <div style={{background:'white',borderRadius:10,padding:12,margin:'6px 0',border:'1px solid #E0E0E0'}}>
            <strong>✅ If Reply "1":</strong> Health check recorded. All good!
          </div>
          <div style={{background:'#FFEBEE',borderRadius:10,padding:12,margin:'6px 0',border:'1px solid #EF9A9A'}}>
            <strong>🚑 If Reply "2":</strong>
            <p style={{fontSize:13}}>• Webhook triggers GPS calculation</p>
            <p style={{fontSize:13}}>• Nearest vet found & dispatched</p>
            <p style={{fontSize:13}}>• Animal placed under Quarantine</p>
            <p style={{fontSize:13,color:'#C62828',fontWeight:'bold'}}>• Slaughter BLOCKED until cleared</p>
          </div>
          <button onClick={() => {
            const vets = ['Dr. Muthoka (0.3km, 2min)', 'Dr. Wanjiru (0.3km, 2min)', 'Dr. Omondi (1.4km, 7min)'];
            alert('🚑 VET DISPATCHED!\n\nNearest: ' + vets[0] + '\n\nAnimal quarantined. Slaughter blocked.');
          }} style={{width:'100%',padding:10,background:'#C62828',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold',marginTop:8}}>
            🚨 Report Sick Animal (Reply 2)
          </button>
        </div>
      )
    },
    {
      id: 'meat',
      icon: '🥩',
      title: 'Module D: Meat Traceability',
      desc: 'JWT QR codes • Self-destruct tokens • SMS 334 verification',
      color: '#E65100',
      content: (
        <div>
          <div style={{border:'2px dashed #4CAF50',borderRadius:12,padding:20,textAlign:'center',margin:'8px 0',cursor:'pointer'}} onClick={() => setShowQR(!showQR)}>
            <span style={{fontSize:60}}>📦</span>
            <h3 style={{fontSize:28,color:'#4CAF50',letterSpacing:4}}>458291</h3>
            <p style={{color:'#C62828',fontSize:10}}>⚠️ ONE-TIME TOKEN • Self-destructs after scan</p>
            <p style={{fontSize:11,color:'#666'}}>📱 Scan QR | 📞 Text box number to 334 (Toll-Free)</p>
          </div>
          
          {showQR && (
            <div style={{background:'#E8F5E9',padding:12,borderRadius:10,textAlign:'center'}}>
              <p><strong>🐄 Source:</strong> KE-COW-MRQAF2UY (Friesian)</p>
              <p><strong>🏠 Farm:</strong> Green Valley • Nakuru</p>
              <p><strong>🏥 Vet:</strong> Dr. Muthoka ✅</p>
              <p style={{color:'#2E7D32',fontWeight:'bold'}}>🟢 SAFE FOR CONSUMPTION</p>
            </div>
          )}

          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={() => {
              alert('✅ VERIFIED!\n\nCow from Green Valley Farm, Nakuru.\nSlaughtered today. Vet inspected.\n🟢 SAFE FOR CONSUMPTION\n\nQR Token: SELF-DESTRUCTED');
            }} style={{flex:1,padding:10,background:'#4CAF50',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}}>
              ✅ Verify Meat
            </button>
            <button onClick={() => {
              alert('🚨 FRAUD REPORTED!\n\nCase ID: CASE-' + Date.now().toString(36).toUpperCase() + '\nPolice notified.\nBox flagged.');
            }} style={{flex:1,padding:10,background:'#C62828',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}}>
              🚨 Report Fraud
            </button>
          </div>

          <div style={{background:'#FFEBEE',padding:10,borderRadius:8,marginTop:8,border:'1px solid #EF9A9A'}}>
            <strong style={{color:'#C62828'}}>🚨 If butcher swapped meat:</strong>
            <p style={{fontSize:12}}>SMS reply: "⚠️ WARNING: This box does not match records. Reply REPORT to alert authorities."</p>
            <p style={{fontSize:11,color:'#C62828'}}>→ Police automatically notified</p>
          </div>
        </div>
      )
    },
  ];

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'85vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h2 style={{margin:0,color:'#2E7D32'}}>🛡️ Shamba & Mfugo Safi</h2>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0 0'}}>Digital Livestock & Land Sovereignty System</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{background:'#E3F2FD',padding:10,borderRadius:8,marginBottom:12,border:'1px solid #90CAF9'}}>
          <strong>🛡️ Bottom-Up Model:</strong> Community owns data • Government verifies
        </div>

        {!activeModule ? (
          <div>
            {modules.map(m => (
              <div key={m.id} onClick={() => setActiveModule(m.id)} style={{background:'white',borderRadius:12,padding:14,margin:'8px 0',borderLeft:'4px solid ' + m.color,boxShadow:'0 1px 3px rgba(0,0,0,0.08)',cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:36}}>{m.icon}</span>
                  <div style={{flex:1}}>
                    <h4 style={{margin:0,fontSize:14}}>{m.title}</h4>
                    <p style={{fontSize:11,color:'#666',margin:'2px 0 0 0'}}>{m.desc}</p>
                  </div>
                  <span style={{color:'#4CAF50'}}>→</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => setActiveModule(null)} style={{background:'none',border:'none',color:'#4CAF50',fontWeight:'bold',cursor:'pointer',marginBottom:8}}>← Back to Modules</button>
            {modules.find(m => m.id === activeModule)?.content}
          </div>
        )}

        <div style={{background:'#E3F2FD',padding:10,borderRadius:8,marginTop:12,fontSize:11}}>
          <strong>🔐 Blockchain-Lite:</strong> Records hashed on farmer's phone + 3 elder phones. Government cannot delete. Data is immutable.
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:10}}>
          <span style={{background:'#E8F5E9',padding:'4px 10px',borderRadius:10,fontSize:10}}>📱 Smartphone App</span>
          <span style={{background:'#E8F5E9',padding:'4px 10px',borderRadius:10,fontSize:10}}>📞 USSD *384#</span>
          <span style={{background:'#E8F5E9',padding:'4px 10px',borderRadius:10,fontSize:10}}>💬 SMS 334 (Toll-Free)</span>
        </div>
      </div>
    </div>
  );
}
