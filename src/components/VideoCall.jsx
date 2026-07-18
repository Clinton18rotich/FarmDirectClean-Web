import React, { useState, useEffect, useRef } from 'react';
import 'webrtc-adapter';

export default function VideoCall({ farmer, onEnd }) {
  const [state, setState] = useState('connecting'); // connecting, active, ended, permission
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    startCall();
    return () => {
      endCall();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCall = async () => {
    try {
      // Request camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: true
      });
      
      localStream.current = stream;
      
      // Show local video
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      // Simulate remote video after connection
      setTimeout(() => {
        setState('active');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }, 3000);

    } catch (err) {
      console.error('Camera/Mic error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera & microphone permission denied. Please allow access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found on this device.');
      } else {
        setError('Could not access camera/microphone: ' + err.message);
      }
      setState('permission');
    }
  };

  const endCall = () => {
    // Stop all tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setState('ended');
    setTimeout(onEnd, 1500);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // toggle
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#1a1a2e',zIndex:600,display:'flex',flexDirection:'column',maxWidth:450,margin:'0 auto'}}>
      
      {/* Main Video Area */}
      <div style={{flex:1,position:'relative',background:'#0a0a1e'}}>
        {/* Remote/Farmer Video (Large) */}
        {state === 'active' ? (
          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:100}}>
            {farmer.image}
          </div>
        ) : state === 'permission' ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',padding:20}}>
            <span style={{fontSize:60}}>📷❌</span>
            <p style={{color:'white',textAlign:'center',marginTop:16}}>{error || 'Camera access required'}</p>
            <button onClick={startCall} style={{marginTop:16,padding:'12px 24px',background:'#4CAF50',color:'white',border:'none',borderRadius:25,cursor:'pointer',fontWeight:'bold'}}>
              Try Again
            </button>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column'}}>
            <div style={{width:100,height:100,background:'#4CAF50',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:50}}>
              {farmer.image}
            </div>
            <h2 style={{color:'white',marginTop:16}}>{farmer.name}</h2>
            <p style={{color:'#aaa'}}>{state === 'connecting' ? 'Connecting...' : 'Ringing...'}</p>
            <div style={{display:'flex',gap:6,marginTop:12}}>
              {[0,1,2].map(i => <div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#4CAF50',animation:`pulse 1.2s ${i*0.3}s infinite`}} />)}
            </div>
          </div>
        )}

        {/* Self Video (Small) */}
        <div style={{position:'absolute',top:16,right:16,width:130,height:180,borderRadius:12,overflow:'hidden',border:'2px solid rgba(255,255,255,0.3)',background:'#1a1a2e'}}>
          {isVideoOff ? (
            <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#333',fontSize:30}}>
              📷❌
            </div>
          ) : (
            <video ref={localVideo} autoPlay muted playsInline style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)'}} />
          )}
        </div>

        {/* Timer */}
        {state === 'active' && (
          <div style={{position:'absolute',top:16,left:16,background:'rgba(0,0,0,0.6)',padding:'4px 10px',borderRadius:16}}>
            <span style={{color:'white',fontSize:12,fontWeight:'bold'}}>{formatTime(duration)}</span>
          </div>
        )}

        {/* Ended */}
        {state === 'ended' && (
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
            <h2 style={{color:'white',margin:0}}>Call Ended</h2>
            <p style={{color:'#aaa'}}>{formatTime(duration)}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{padding:'16px 20px 40px',display:'flex',justifyContent:'center',alignItems:'center',gap:16,background:'rgba(0,0,0,0.3)'}}>
        <button onClick={toggleMute} style={ctrlBtn(isMuted)}>
          {isMuted ? '🔇' : '🎤'}
        </button>
        <button onClick={toggleVideo} style={ctrlBtn(isVideoOff)}>
          {isVideoOff ? '📷❌' : '📷'}
        </button>
        <button onClick={() => setIsSpeakerOn(!isSpeakerOn)} style={ctrlBtn(!isSpeakerOn)}>
          {isSpeakerOn ? '🔊' : '🔈'}
        </button>
        <button onClick={endCall} style={{...ctrlBtn(false),background:'#C62828',width:65,height:65}}>
          <span style={{transform:'rotate(135deg)',display:'inline-block',fontSize:28}}>📞</span>
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const ctrlBtn = (active) => ({
  width:52,height:52,borderRadius:'50%',border:'none',
  background: active ? '#C62828' : 'rgba(255,255,255,0.2)',
  color:'white',fontSize:22,cursor:'pointer',
  display:'flex',alignItems:'center',justifyContent:'center',
  transition:'all 0.2s'
});
