'use client';

import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span>
            <span>Help, Guide & Keyboard Shortcuts</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', gap: '16px', fontSize: '13px', color: '#334155' }}>
          {/* Quick Start Guide */}
          <div>
            <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '14px' }}>🚀 How It Works</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.5 }}>
              <div><strong>1. Choose an AI Model:</strong> Select <strong>Local Ollama (mistral)</strong> to run 100% offline, or <strong>Gemini 1.5 Flash/Pro</strong> for ultra-fast cloud reasoning.</div>
              <div><strong>2. Select or Upload a Document:</strong> Click the Document button in the header or the Upload icon on the dock to upload any PDF. Documents with scanned pages automatically trigger Tesseract OCR.</div>
              <div><strong>3. Ask Grounded Questions:</strong> Type questions into the chat input. Answers cite verified page numbers like <code>[Page 1]</code> which highlight automatically in the document reader.</div>
              <div><strong>4. Interactive PDF Selection:</strong> Highlight any sentence or paragraph in the PDF reader to trigger instant <strong>Explain</strong>, <strong>Summarise</strong>, or <strong>Rewrite</strong> actions!</div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '14px' }}>⌨️ Keyboard Shortcuts</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span>Send message</span>
                <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Enter</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span>New line in prompt</span>
                <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Shift + Enter</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span>Close modal</span>
                <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Escape</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span>Zoom PDF</span>
                <kbd style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>+ / - buttons</kbd>
              </div>
            </div>
          </div>

          {/* Architecture Badge */}
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
            <strong>Full-Stack Architecture:</strong> Next.js 16 + FastAPI + PyMuPDF OCR + FastEmbed + SQLite / pgvector + Google Gemini & Ollama integration.
          </div>
        </div>
      </div>
    </div>
  );
};
