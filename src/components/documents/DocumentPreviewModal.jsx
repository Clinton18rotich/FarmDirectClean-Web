// FILE: src/components/documents/DocumentPreviewModal.jsx
// Session 6.14-a — Full-screen preview of a printable HTML document.
// Renders via iframe (source: doc.html) + Print / Share / Close actions.
import React, { useEffect, useRef } from 'react';

export default function DocumentPreviewModal({ open, onClose, title, htmlContent, reference }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!open || !iframeRef.current || !htmlContent) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }, [open, htmlContent]);

  if (!open) return null;

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      // Fallback: open in new tab so user can print manually
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title || 'FarmDirect Document',
          text: `FarmDirect document${reference ? ' · ' + reference : ''}`,
        });
      } else {
        // Fallback — copy reference to clipboard
        if (reference) {
          await navigator.clipboard.writeText(reference);
          alert('Reference copied: ' + reference);
        }
      }
    } catch (err) {
      // user cancelled — silent
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        zIndex: 9000, display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1B5E20', color: 'white', padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📄 {title || 'Document'}
          </div>
          {reference && (
            <div style={{ fontSize: 10, opacity: 0.85, fontFamily: 'monospace' }}>
              {reference}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'white',
            fontSize: 24, cursor: 'pointer', padding: '4px 8px', flexShrink: 0,
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Body — iframe rendering the doc */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1, overflow: 'auto', background: '#f5f5f5',
          display: 'flex', justifyContent: 'center', padding: 0,
        }}
      >
        <iframe
          ref={iframeRef}
          title={title || 'Document preview'}
          style={{
            width: '100%', maxWidth: 900, minHeight: '100%',
            border: 'none', background: 'white',
          }}
        />
      </div>

      {/* Bottom action bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderTop: '1px solid #ddd',
          padding: '12px 16px', display: 'flex', gap: 10, flexShrink: 0,
        }}
      >
        <button
          onClick={handlePrint}
          style={{
            flex: 1, padding: '14px', borderRadius: 25, border: 'none',
            background: '#2E7D32', color: 'white', fontSize: 15,
            fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          🖨️ Print / Save PDF
        </button>
        <button
          onClick={handleShare}
          style={{
            padding: '14px 18px', borderRadius: 25, border: '1px solid #2E7D32',
            background: 'white', color: '#2E7D32', fontSize: 15,
            fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          📤 Share
        </button>
      </div>
    </div>
  );
}
