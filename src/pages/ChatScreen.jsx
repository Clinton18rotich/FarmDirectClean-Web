import React, { useState, useRef, useEffect } from 'react';
import VideoCall from '../components/VideoCall';

const chatFarmers = [
  { id:1, name:'John Kimani', product:'Fresh Maize', image:'🌽', location:'Kitale', phone:'254712345678', online:true },
  { id:2, name:'Ruth Wanjiku', product:'Kienyeji Chicken', image:'🐔', location:'Kiambu', phone:'254722345678', online:true },
  { id:3, name:'James Otieno', product:'Fresh Tilapia', image:'🐟', location:'Kisumu', phone:'254732345678', online:false },
  { id:4, name:'Joseph Kiprono', product:'Fresian Cow', image:'🐄', location:'Eldoret', phone:'254742345678', online:true },
  { id:5, name:'Mary Wanjiku', product:'Irish Potatoes', image:'🥔', location:'Nyandarua', phone:'254752345678', online:false },
];

const QUICK_REPLIES = ['Still available?', 'What\'s the price?', 'Can you deliver?', 'I\'m interested', 'Location please?'];

export default function ChatScreen() {
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState({});
  const [text, setText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showFullImage, setShowFullImage] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [searchFarmers, setSearchFarmers] = useState('');
  const [pinnedChats, setPinnedChats] = useState([]);
  const [mutedChats, setMutedChats] = useState([]);
  const [showOptions, setShowOptions] = useState(null);
  const [toast, setToast] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const chatEnd = useRef(null);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, selected]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const selectFarmer = (f) => {
    setSelected(f);
    try { const s = localStorage.getItem(`chat_${f.id}`); setMessages(prev => ({...prev, [f.id]: s ? JSON.parse(s) : []})); } catch(e) { setMessages(prev => ({...prev, [f.id]: []})); }
  };

  const sendMsg = (msgText = text, isMe = true, imageUrl = null, type = 'text') => {
    if ((!msgText.trim() && !imageUrl) || !selected) return;
    const msgs = messages[selected.id] || [];
    const newMsg = { text: msgText || '📸 Photo', isMe, time: Date.now(), imageUrl, type, status: 'sent' };
    const updated = [...msgs, newMsg];
    setMessages({...messages, [selected.id]: updated});
    localStorage.setItem(`chat_${selected.id}`, JSON.stringify(updated));
    setText('');
  };

  // REAL CAMERA capture
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Create video element to show preview
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Take photo after 1 second
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Stop camera
        stream.getTracks().forEach(t => t.stop());
        
        // Send photo
        sendMsg('📸 Camera photo', true, dataUrl, 'photo');
        setShowAttach(false);
        setToast('📸 Photo captured!');
      }, 1000);
    } catch (err) {
      console.log('Camera error:', err);
      // Fallback to file picker
      cameraInput.current?.click();
      setShowAttach(false);
    }
  };

  // Gallery picker
  const openGallery = () => {
    fileInput.current?.click();
    setShowAttach(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selected) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => { 
      sendMsg(file.type.startsWith('image/') ? '📸 Photo' : '📎 File', true, reader.result, 'photo'); 
      setIsUploading(false); 
      setToast('📸 Sent!'); 
    };
    reader.readAsDataURL(file);
  };

  // REAL Voice Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          sendMsg('🎤 Voice message', true, reader.result, 'voice');
          setToast('🎤 Voice sent!');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setToast('🔴 Recording... Tap ⏹ to stop');
    } catch (err) {
      console.log('Mic error:', err);
      // Fallback
      sendMsg('🎤 Voice message (simulated)', true, null, 'voice');
      setToast('🎤 Voice note sent!');
      setIsRecording(true);
      setTimeout(() => setIsRecording(false), 1500);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
  };

  const shareLocation = () => {
    if (navigator.geolocation) {
      setToast('📍 Getting location...');
      navigator.geolocation.getCurrentPosition(pos => {
        sendMsg(`📍 Live Location\nhttps://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`, true, null, 'location');
        setToast('📍 Location shared!');
      }, () => {
        sendMsg('📍 Nakuru County, Kenya', true, null, 'location');
        setToast('📍 Location shared!');
      }, { enableHighAccuracy: true });
    } else {
      sendMsg('📍 Nakuru County, Kenya', true, null, 'location');
    }
    setShowAttach(false);
  };

  const sendPaymentRequest = () => {
    const amount = prompt('Enter amount (KES):');
    if (amount) { sendMsg(`💳 Payment Request: KES ${parseInt(amount).toLocaleString()} via M-Pesa ESCROW`, true, null, 'payment'); setToast('💳 Payment request sent!'); }
  };

  const confirmDelivery = () => { sendMsg('✅ Delivery confirmed! Order complete.', true, null, 'delivery'); setToast('✅ Delivery confirmed!'); };
  const togglePin = (farmerId) => { setPinnedChats(prev => prev.includes(farmerId) ? prev.filter(id => id !== farmerId) : [...prev, farmerId]); };
  const toggleMute = (farmerId) => { setMutedChats(prev => prev.includes(farmerId) ? prev.filter(id => id !== farmerId) : [...prev, farmerId]); };

  const exportChat = () => {
    const msgs = messages[selected.id] || [];
    const txt = msgs.map(m => `[${new Date(m.time).toLocaleString()}] ${m.isMe ? 'You' : selected.name}: ${m.text}`).join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `chat_${selected.name}.txt`; a.click();
    setToast('💾 Chat exported!');
  };

  const filteredFarmers = chatFarmers.filter(f => !searchFarmers || f.name.toLowerCase().includes(searchFarmers.toLowerCase()) || f.product.toLowerCase().includes(searchFarmers.toLowerCase()));
  const sortedFarmers = [...filteredFarmers].sort((a, b) => (pinnedChats.includes(a.id) ? -1 : 0) - (pinnedChats.includes(b.id) ? -1 : 0));

  if (!selected) {
    return (
      <div>
        <div style={{background:'#E8F5E9',margin:12,padding:12,borderRadius:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <strong style={{fontSize:14}}>💬 Chat with farmers</strong>
            <span style={{fontSize:11,color:'#4CAF50'}}>{chatFarmers.filter(f=>f.online).length} online</span>
          </div>
          <p style={{fontSize:12,color:'#4CAF50',margin:'4px 0 0 0'}}>📸 Photos • 🎤 Voice • 📍 Location • 📹 Video • ⭐ Ratings</p>
        </div>
        <div style={{margin:'0 12px 12px',display:'flex',alignItems:'center',gap:8,background:'white',padding:'8px 12px',borderRadius:20,border:'1px solid #ddd'}}>
          <span>🔍</span><input value={searchFarmers} onChange={e => setSearchFarmers(e.target.value)} placeholder="Search farmers..." style={{border:'none',outline:'none',flex:1,fontSize:13}} />
        </div>
        {sortedFarmers.map(f => {
          const saved = (() => { try { return JSON.parse(localStorage.getItem(`chat_${f.id}`) || '[]'); } catch(e) { return []; } })();
          const last = saved[saved.length - 1];
          const isPinned = pinnedChats.includes(f.id);
          return (
            <div key={f.id} style={{position:'relative'}}>
              {isPinned && <div style={{position:'absolute',top:8,left:20,zIndex:1,fontSize:10,color:'#FF6F00'}}>📌 Pinned</div>}
              <div onClick={() => selectFarmer(f)} onContextMenu={e => { e.preventDefault(); setShowOptions(f.id); }} style={{background:'white',margin:'0 12px 8px',padding:12,borderRadius:12,display:'flex',alignItems:'center',gap:12,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,0,0,0.06)',borderLeft:isPinned?'3px solid #FF6F00':'none'}}>
                <div style={{position:'relative'}}>
                  <div style={{width:50,height:50,background:'#E8F5E9',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{f.image}</div>
                  {f.online && <div style={{position:'absolute',bottom:2,right:2,width:12,height:12,background:'#4CAF50',borderRadius:'50%',border:'2px solid white'}} />}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><strong style={{fontSize:14}}>{f.name}</strong><span style={{fontSize:10,color:'#999'}}>{last ? new Date(last.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</span></div>
                  <p style={{fontSize:12,color:'#4CAF50',margin:'2px 0'}}>{f.product}</p>
                  <p style={{fontSize:10,color:'gray',margin:0}}>{f.location} {mutedChats.includes(f.id) && '🔕'}</p>
                </div>
              </div>
              {showOptions === f.id && (
                <div style={{position:'absolute',right:20,top:40,background:'white',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.15)',zIndex:50,overflow:'hidden'}}>
                  <button onClick={() => { togglePin(f.id); setShowOptions(null); }} style={{display:'block',width:'100%',padding:'8px 16px',border:'none',background:'none',fontSize:12,cursor:'pointer',textAlign:'left'}}>📌 {isPinned ? 'Unpin' : 'Pin'}</button>
                  <button onClick={() => { toggleMute(f.id); setShowOptions(null); }} style={{display:'block',width:'100%',padding:'8px 16px',border:'none',background:'none',fontSize:12,cursor:'pointer',textAlign:'left'}}>🔕 {mutedChats.includes(f.id) ? 'Unmute' : 'Mute'}</button>
                </div>
              )}
            </div>
          );
        })}
        {showOptions && <div onClick={() => setShowOptions(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:40}} />}
      </div>
    );
  }

  const msgs = messages[selected.id] || [];
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#F5F7FA',zIndex:300,display:'flex',flexDirection:'column',maxWidth:450,margin:'0 auto'}}>
      {toast && <div style={{position:'fixed',top:50,left:'50%',transform:'translateX(-50%)',background:'#333',color:'white',padding:'10px 24px',borderRadius:25,fontSize:13,zIndex:999,whiteSpace:'nowrap'}}>{toast}</div>}
      
      <div style={{background:'#4CAF50',color:'white',padding:'8px 12px',display:'flex',alignItems:'center',gap:8,minHeight:56}}>
        <button onClick={() => setSelected(null)} style={{background:'none',border:'none',color:'white',fontSize:22,cursor:'pointer',padding:4}}>←</button>
        <span style={{fontSize:24}}>{selected.image}</span>
        <div style={{flex:1}}><strong style={{fontSize:16,display:'block'}}>{selected.name}</strong><span style={{fontSize:10,opacity:.8}}>{selected.online ? '🟢 Online' : 'Offline'}</span></div>
        <button onClick={() => setShowVideoCall(true)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer'}} title="Video Call">📹</button>
        <button onClick={() => { if(confirm('⚠️ Never send money outside FarmDirect.')) window.open(`tel:+${selected.phone}`) }} style={{background:'none',border:'none',fontSize:20,cursor:'pointer'}} title="Call">📞</button>
        <button onClick={() => setShowOptions(selected.id)} style={{background:'none',border:'none',color:'white',fontSize:20,cursor:'pointer'}}>⋮</button>
      </div>

      {showOptions === selected.id && (
        <div style={{position:'absolute',top:56,right:8,background:'white',borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.15)',zIndex:50,overflow:'hidden'}}>
          <button onClick={() => { setShowRating(true); setShowOptions(null); }} style={menuBtn}>⭐ Rate Farmer</button>
          <button onClick={() => { sendPaymentRequest(); setShowOptions(null); }} style={menuBtn}>💳 Request Payment</button>
          <button onClick={() => { confirmDelivery(); setShowOptions(null); }} style={menuBtn}>✅ Confirm Delivery</button>
          <button onClick={() => { exportChat(); setShowOptions(null); }} style={menuBtn}>💾 Export Chat</button>
        </div>
      )}
      {showOptions === selected.id && <div onClick={() => setShowOptions(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:40}} />}

      <div style={{flex:1,overflowY:'auto',padding:12,background:'#E5DDD5'}}>
        {msgs.length === 0 && <div style={{textAlign:'center',padding:40}}><span style={{fontSize:50,display:'block',marginBottom:10}}>💬</span><p style={{color:'gray'}}>Start a conversation!</p></div>}
        {msgs.map((m, i) => {
          const prev = msgs[i-1];
          const showDate = !prev || new Date(m.time).toDateString() !== new Date(prev.time).toDateString();
          const dateLabel = new Date(m.time).toDateString() === new Date().toDateString() ? 'Today' : new Date(m.time).toDateString() === new Date(Date.now()-86400000).toDateString() ? 'Yesterday' : new Date(m.time).toLocaleDateString('en-KE',{weekday:'long',month:'short',day:'numeric'});
          return (
            <React.Fragment key={i}>
              {showDate && <div style={{textAlign:'center',margin:'8px 0'}}><span style={{background:'#E1F3FB',color:'#54656F',fontSize:11,padding:'4px 10px',borderRadius:8}}>{dateLabel}</span></div>}
              <div style={{display:'flex',justifyContent:m.isMe?'flex-end':'flex-start',margin:'2px 0',paddingLeft:m.isMe?60:0,paddingRight:m.isMe?0:60}}>
                <div style={{maxWidth:'80%',padding:'6px 8px 6px 9px',borderRadius:8,background:m.isMe?'#D9FDD3':'white',color:'#303030',borderTopRightRadius:m.isMe?0:8,borderTopLeftRadius:m.isMe?8:0,boxShadow:'0 1px 1px rgba(0,0,0,0.1)',cursor:m.imageUrl?'pointer':'default'}} onClick={() => m.imageUrl && setShowFullImage(m)}>
                  {m.type === 'photo' && m.imageUrl ? <div><img src={m.imageUrl} alt="Photo" style={{width:200,height:200,objectFit:'cover',borderRadius:4}} /><p style={{fontSize:10,opacity:.7,margin:'4px 0 0 0',textAlign:'center'}}>📸 Tap to view full</p></div>
                  : m.type === 'voice' && m.imageUrl ? <div style={{display:'flex',alignItems:'center',gap:8}}><span>🎤</span><audio controls src={m.imageUrl} style={{width:150,height:30}} /></div>
                  : m.type === 'voice' ? <div style={{display:'flex',alignItems:'center',gap:8}}><span>🎤</span><div style={{width:120,height:8,background:'#C8E6C9',borderRadius:4}}><div style={{width:'70%',height:'100%',background:'#4CAF50'}} /></div><span style={{fontSize:11}}>0:12</span></div>
                  : m.type === 'location' ? <div style={{background:'white',padding:8,borderRadius:8,textAlign:'center'}}><span style={{fontSize:24}}>📍</span><p style={{fontWeight:'bold',fontSize:12}}>Live Location</p></div>
                  : m.type === 'payment' ? <div style={{background:'#FFF8E1',padding:8,borderRadius:8}}><p style={{fontWeight:'bold',fontSize:13,color:'#E65100',margin:0}}>💳 {m.text}</p></div>
                  : m.type === 'delivery' ? <div style={{background:'#E8F5E9',padding:8,borderRadius:8}}><p style={{fontWeight:'bold',fontSize:13,color:'#2E7D32',margin:0}}>{m.text}</p></div>
                  : <p style={{margin:0,fontSize:14,lineHeight:1.4}}>{m.text}</p>}
                  <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:4,marginTop:2}}><span style={{fontSize:10,color:'#667781'}}>{new Date(m.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>{m.isMe && <span style={{fontSize:10,color:'#667781'}}>✓✓</span>}</div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={chatEnd} />
      </div>

      <div style={{display:'flex',gap:6,padding:'6px 8px',overflowX:'auto',background:'white',borderTop:'1px solid #f0f0f0'}}>
        {QUICK_REPLIES.map((qr,i) => <button key={i} onClick={() => sendMsg(qr)} style={{background:'#E8F5E9',border:'1px solid #C8E6C9',padding:'6px 12px',borderRadius:16,fontSize:11,whiteSpace:'nowrap',cursor:'pointer',color:'#2E7D32'}}>{qr}</button>)}
      </div>

      <div style={{display:'flex',alignItems:'center',padding:8,gap:8,background:'#F0F2F5',borderTop:'1px solid #ddd'}}>
        <button onClick={() => setShowAttach(true)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#54656F'}}>📎</button>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message" onKeyDown={e => e.key==='Enter' && sendMsg()} style={{flex:1,padding:'10px 14px',borderRadius:24,border:'none',outline:'none',fontSize:14,background:'white'}} />
        {text.trim() ? <button onClick={() => sendMsg()} style={{background:'#4CAF50',color:'white',border:'none',width:40,height:40,borderRadius:'50%',cursor:'pointer',fontSize:16}}>➤</button>
        : isRecording ? <button onClick={stopVoiceRecording} style={{background:'#C62828',color:'white',border:'none',width:40,height:40,borderRadius:'50%',cursor:'pointer',fontSize:16,animation:'pulse 1s infinite'}}>⏹</button>
        : <button onClick={startVoiceRecording} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#54656F'}}>🎤</button>}
      </div>

      {/* Hidden inputs for camera & gallery */}
      <input type="file" accept="image/*" ref={fileInput} style={{display:'none'}} onChange={handleFileUpload} />
      <input type="file" accept="image/*" capture="environment" ref={cameraInput} style={{display:'none'}} onChange={handleFileUpload} />

      {/* Attach Menu */}
      {showAttach && <div onClick={() => setShowAttach(false)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.5)',zIndex:400,display:'flex',alignItems:'flex-end',justifyContent:'center'}}><div onClick={e => e.stopPropagation()} style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%'}}><h3 style={{marginTop:0,textAlign:'center'}}>Send Attachment</h3><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><div onClick={openCamera} style={{background:'#E8F5E9',borderRadius:12,padding:20,textAlign:'center',cursor:'pointer'}}><span style={{fontSize:36}}>📸</span><p style={{fontWeight:'bold',fontSize:11}}>Camera</p></div><div onClick={openGallery} style={{background:'#F3E5F5',borderRadius:12,padding:20,textAlign:'center',cursor:'pointer'}}><span style={{fontSize:36}}>🖼️</span><p style={{fontWeight:'bold',fontSize:11}}>Gallery</p></div><div onClick={shareLocation} style={{background:'#E3F2FD',borderRadius:12,padding:20,textAlign:'center',cursor:'pointer'}}><span style={{fontSize:36}}>📍</span><p style={{fontWeight:'bold',fontSize:11}}>Location</p></div></div><button onClick={() => setShowAttach(false)} style={{width:'100%',padding:10,marginTop:12,background:'none',border:'1px solid #ddd',borderRadius:8,cursor:'pointer'}}>Cancel</button></div></div>}
      {showRating && <div onClick={() => setShowRating(false)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.5)',zIndex:400,display:'flex',alignItems:'flex-end',justifyContent:'center'}}><div onClick={e => e.stopPropagation()} style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%'}}><h3 style={{marginTop:0,color:'#4CAF50',textAlign:'center'}}>⭐ Rate {selected.name}</h3><div style={{display:'flex',justifyContent:'center',gap:4,margin:'16px 0'}}>{[1,2,3,4,5].map(i => <span key={i} onClick={() => setRating(i)} style={{fontSize:44,cursor:'pointer'}}>{i <= rating ? '⭐' : '☆'}</span>)}</div><input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..." style={{width:'100%',padding:12,borderRadius:8,border:'1px solid #ddd',marginBottom:12}} /><button onClick={() => { setToast(`⭐ ${rating} star rating submitted!`); setShowRating(false); setComment(''); }} style={{width:'100%',padding:14,background:'#4CAF50',color:'white',border:'none',borderRadius:25,cursor:'pointer',fontWeight:'bold'}}>Submit Rating</button></div></div>}
      {showFullImage && <div onClick={() => setShowFullImage(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.9)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}><img src={showFullImage.imageUrl} alt="Full" style={{maxWidth:'95%',maxHeight:'70vh',borderRadius:12}} /><button onClick={() => setShowFullImage(null)} style={{padding:'10px 30px',background:'white',border:'none',borderRadius:25,cursor:'pointer',fontWeight:'bold',marginTop:12}}>Close</button></div>}
      {showVideoCall && <VideoCall farmer={selected} onEnd={() => setShowVideoCall(false)} />}
    </div>
  );
}

const menuBtn = {display:'block',width:'100%',padding:'10px 16px',border:'none',background:'none',fontSize:13,cursor:'pointer',textAlign:'left'};
