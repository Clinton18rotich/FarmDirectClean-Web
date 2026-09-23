// FILE: src/components/ErrorBoundary.jsx
// Catches render errors and shows them on-screen (mobile-friendly debugging).
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'white', zIndex:99999, padding:20, overflowY:'auto' }}>
          <h2 style={{ color:'#C62828', marginTop:0 }}>💥 Render Error</h2>
          <p style={{ fontSize:13, color:'#333', fontWeight:'bold', marginBottom:12 }}>{String(this.state.error?.message || this.state.error)}</p>
          <details>
            <summary style={{ cursor:'pointer', fontSize:12, color:'#666' }}>Stack trace</summary>
            <pre style={{ fontSize:10, background:'#F5F5F5', padding:10, borderRadius:8, overflowX:'auto', lineHeight:1.4 }}>
              {String(this.state.error?.stack || '').slice(0, 1500)}
            </pre>
          </details>
          {this.state.info?.componentStack && (
            <details style={{ marginTop:10 }}>
              <summary style={{ cursor:'pointer', fontSize:12, color:'#666' }}>Component stack</summary>
              <pre style={{ fontSize:10, background:'#F5F5F5', padding:10, borderRadius:8, overflowX:'auto', lineHeight:1.4 }}>
                {this.state.info.componentStack.slice(0, 1500)}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ error: null, info: null })}
            style={{ marginTop:20, padding:14, background:'#2E7D32', color:'white', border:'none', borderRadius:25, fontSize:14, fontWeight:'bold', cursor:'pointer' }}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
