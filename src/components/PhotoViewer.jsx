import React from 'react';

export default function PhotoViewer({ src, caption, onClose }) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', top:0, left:0, right:0, bottom:0,
        background:'rgba(0,0,0,0.95)', zIndex:3000,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', padding:20,
      }}
    >
      <img
        src={src}
        alt="Full view"
        style={{maxWidth:'100%', maxHeight:'80%', objectFit:'contain', borderRadius:8}}
        onClick={(e) => e.stopPropagation()}
      />
      {caption && (
        <p style={{color:'white', fontSize:13, marginTop:16, textAlign:'center'}}>{caption}</p>
      )}
      <button
        onClick={onClose}
        style={{
          position:'absolute', top:20, right:20,
          background:'rgba(255,255,255,0.25)', color:'white',
          border:'none', borderRadius:'50%', width:44, height:44,
          fontSize:24, cursor:'pointer', fontWeight:'bold',
        }}
      >×</button>
    </div>
  );
}
