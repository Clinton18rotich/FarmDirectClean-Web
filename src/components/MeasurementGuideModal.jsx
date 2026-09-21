import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import MeasurementDiagram from './MeasurementDiagram';

export default function MeasurementGuideModal({ onClose, animalType = 'Cow' }) {
  const [lang, setLang] = useState('en');
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcGirth, setCalcGirth] = useState('');
  const [calcLength, setCalcLength] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.shamba.measurementGuide(lang)
      .then(r => setGuide(r.guide))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [lang]);

  const computeWeight = () => {
    const g = parseFloat(calcGirth);
    const l = parseFloat(calcLength);
    if (!g || !l || g < 30 || l < 30) {
      setCalcResult({ error: 'Enter valid measurements (must be > 30 cm)' });
      return;
    }
    let divisor = 30000;
    if (['Goat', 'Sheep', 'Pig'].includes(animalType)) divisor = 40000;
    const weight = Math.round((g * g * l) / divisor);
    setCalcResult({
      weight,
      formula: `(${g} × ${g} × ${l}) ÷ ${divisor.toLocaleString()}`,
    });
  };

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:700,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:480,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div>
            <h3 style={{margin:0,color:'#1565C0',fontSize:18}}>📏 Measure Weight Guide</h3>
            <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{animalType} — tape formula</p>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#666'}}>✕</button>
        </div>

        {/* Language toggle */}
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          <button onClick={() => setLang('en')} style={{
            flex:1,padding:8,borderRadius:8,border:'none',
            background: lang === 'en' ? '#1565C0' : '#F0F0F0',
            color: lang === 'en' ? 'white' : '#555',
            fontSize:12,fontWeight:'bold',cursor:'pointer',
          }}>English</button>
          <button onClick={() => setLang('sw')} style={{
            flex:1,padding:8,borderRadius:8,border:'none',
            background: lang === 'sw' ? '#1565C0' : '#F0F0F0',
            color: lang === 'sw' ? 'white' : '#555',
            fontSize:12,fontWeight:'bold',cursor:'pointer',
          }}>Kiswahili</button>
        </div>

        {/* Live Calculator */}
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          style={{
            width:'100%',padding:12,borderRadius:10,border:'2px solid #4CAF50',
            background:'#E8F5E9',color:'#2E7D32',fontWeight:'bold',fontSize:13,
            cursor:'pointer',marginBottom:12,
          }}
        >
          {showCalculator ? '▼ Hide Calculator' : '▶ Open Live Calculator'}
        </button>

        {showCalculator && (
          <div style={{background:'#F9FAFB',borderRadius:10,padding:12,marginBottom:12,border:'1px solid #E0E0E0'}}>
            <strong style={{fontSize:13,color:'#333'}}>Enter your measurements:</strong>

            <label style={{fontSize:11,fontWeight:'bold',color:'#555',display:'block',marginTop:10,marginBottom:4}}>Heart Girth (cm)</label>
            <input
              type="number"
              value={calcGirth}
              onChange={e => setCalcGirth(e.target.value)}
              placeholder="e.g. 180"
              style={{width:'100%',padding:10,borderRadius:8,border:'2px solid #E0E0E0',fontSize:15,boxSizing:'border-box'}}
            />

            <label style={{fontSize:11,fontWeight:'bold',color:'#555',display:'block',marginTop:10,marginBottom:4}}>Body Length (cm)</label>
            <input
              type="number"
              value={calcLength}
              onChange={e => setCalcLength(e.target.value)}
              placeholder="e.g. 140"
              style={{width:'100%',padding:10,borderRadius:8,border:'2px solid #E0E0E0',fontSize:15,boxSizing:'border-box'}}
            />

            <button onClick={computeWeight} style={{
              width:'100%',padding:12,borderRadius:10,border:'none',
              background:'#4CAF50',color:'white',fontSize:14,fontWeight:'bold',
              cursor:'pointer',marginTop:12,
            }}>Calculate Weight</button>

            {calcResult && calcResult.error && (
              <div style={{background:'#FFEBEE',padding:10,borderRadius:8,marginTop:10,color:'#C62828',fontSize:12}}>
                ⚠️ {calcResult.error}
              </div>
            )}
            {calcResult && calcResult.weight && (
              <div style={{background:'#E8F5E9',padding:12,borderRadius:10,marginTop:10,border:'1px solid #A5D6A7'}}>
                <strong style={{fontSize:16,color:'#2E7D32'}}>✓ {calcResult.weight} kg</strong>
                <p style={{fontSize:10,color:'#666',margin:'4px 0 0',fontFamily:'monospace'}}>{calcResult.formula}</p>
              </div>
            )}
          </div>
        )}

        {loading && <p style={{textAlign:'center',color:'#999',padding:20}}>Loading guide...</p>}

        {guide && (
          <>
            <div style={{background:'#E3F2FD',padding:12,borderRadius:10,marginBottom:12}}>
              <strong style={{fontSize:13,color:'#1565C0'}}>{guide.title}</strong>
              <p style={{fontSize:11,color:'#666',margin:'4px 0 0',lineHeight:1.4}}>{guide.intro}</p>
            </div>

            {[guide.heartGirth, guide.bodyLength].map((section, i) => (
              <div key={i} style={{background:'white',borderRadius:12,padding:14,marginBottom:12,border:'1px solid #E0E0E0'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:28}}>{section.icon}</span>
                  <div>
                    <strong style={{fontSize:14,color:'#1B5E20'}}>{section.title}</strong>
                    <p style={{fontSize:11,color:'#666',margin:'2px 0 0'}}>{section.what}</p>
                  </div>
                </div>

                <div style={{background:'#F9FAFB',borderRadius:10,padding:8,margin:'10px 0'}}>
                  <MeasurementDiagram type={i === 0 ? 'heartGirth' : 'bodyLength'} color={i === 0 ? '#C62828' : '#1565C0'} />
                </div>

                <p style={{fontSize:12,fontWeight:'bold',color:'#333',margin:'10px 0 4px'}}>Steps:</p>
                <ol style={{margin:0,paddingLeft:20,fontSize:12,color:'#333',lineHeight:1.6}}>
                  {section.steps.map((s, j) => <li key={j}>{s}</li>)}
                </ol>

                <p style={{fontSize:12,fontWeight:'bold',color:'#4CAF50',margin:'12px 0 4px'}}>💡 Tips:</p>
                <ul style={{margin:0,paddingLeft:20,fontSize:12,color:'#333',lineHeight:1.6}}>
                  {section.tips.map((t, j) => <li key={j}>{t}</li>)}
                </ul>

                <p style={{fontSize:12,fontWeight:'bold',color:'#C62828',margin:'12px 0 4px'}}>⚠️ Avoid these mistakes:</p>
                <ul style={{margin:0,paddingLeft:20,fontSize:12,color:'#333',lineHeight:1.6}}>
                  {section.mistakes.map((m, j) => <li key={j}>{m}</li>)}
                </ul>
              </div>
            ))}

            {/* FAQ */}
            {guide.faq && (
              <div style={{background:'#F9FAFB',borderRadius:12,padding:14,marginBottom:12}}>
                <strong style={{fontSize:13,color:'#333'}}>❓ Common Questions</strong>
                {guide.faq.map((f, i) => (
                  <div key={i} style={{marginTop:10,paddingTop:10,borderTop:'1px solid #E0E0E0'}}>
                    <p style={{fontSize:12,fontWeight:'bold',color:'#1565C0',margin:0}}>{f.q}</p>
                    <p style={{fontSize:11,color:'#555',margin:'4px 0 0',lineHeight:1.4}}>{f.a}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button onClick={onClose} style={{
          width:'100%',padding:14,borderRadius:10,border:'none',
          background:'#1565C0',color:'white',fontSize:14,fontWeight:'bold',
          cursor:'pointer',marginTop:8,
        }}>✓ Got it</button>
      </div>
    </div>
  );
}
