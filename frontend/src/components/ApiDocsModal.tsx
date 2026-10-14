'use client';

import React, { useState } from 'react';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const endpoints = [
    {
      method: 'GET',
      path: '/health',
      badgeColor: '#10b981',
      title: 'System Health & Engine Diagnostics',
      desc: 'Returns status of SQLite/pgvector database, PyMuPDF OCR engine, and embedding models.',
      curl: 'curl http://localhost:8000/health',
    },
    {
      method: 'GET',
      path: '/api/v1/documents',
      badgeColor: '#10b981',
      title: 'List All Documents',
      desc: 'Retrieves all indexed PDF documents, total pages, OCR status, and chunk counts.',
      curl: 'curl http://localhost:8000/api/v1/documents',
    },
    {
      method: 'POST',
      path: '/api/v1/documents/upload',
      badgeColor: '#3b82f6',
      title: 'Upload PDF Document',
      desc: 'Extracts text, applies Tesseract OCR when needed, splits into 500-char chunks, and generates 384-d embeddings.',
      curl: 'curl -X POST -F "file=@document.pdf" http://localhost:8000/api/v1/documents/upload',
    },
    {
      method: 'POST',
      path: '/api/v1/chat/message',
      badgeColor: '#8b5cf6',
      title: 'Grounded RAG Chat Query',
      desc: 'Retrieves relevant document chunks via cosine similarity and generates grounded answers with exact [Page X] citations.',
      curl: `curl -X POST http://localhost:8000/api/v1/chat/message \\
  -H "Content-Type: application/json" \\
  -d '{"content": "What is the topic?", "model": "Gemini 1.5 Flash"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/chat/models/gemini-key',
      badgeColor: '#f59e0b',
      title: 'Connect & Validate Gemini Key',
      desc: 'Validates API key directly with Google Generative AI API and persists to .env.',
      curl: `curl -X POST http://localhost:8000/api/v1/chat/models/gemini-key \\
  -H "Content-Type: application/json" \\
  -d '{"api_key": "YOUR_GEMINI_KEY"}'`,
    },
    {
      method: 'POST',
      path: '/api/v1/chat/text-action',
      badgeColor: '#ec4899',
      title: 'Instant Selection Actions',
      desc: 'Performs explain, summarise, or rewrite actions on selected PDF passages.',
      curl: `curl -X POST http://localhost:8000/api/v1/chat/text-action \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Sample excerpt", "action": "explain"}'`,
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡</span>
            <span>FastAPI REST Endpoints & Developer Docs</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', gap: '14px', paddingRight: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>OpenAPI / Swagger UI</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Interactive testing sandbox running on port 8000</div>
            </div>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="popup-btn primary"
              style={{ padding: '6px 14px', fontSize: '12px', textDecoration: 'none', background: '#0284c7' }}
            >
              Open /docs ↗
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {endpoints.map((ep, idx) => (
              <div
                key={ep.path}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: `${ep.badgeColor}15`,
                        color: ep.badgeColor,
                        fontFamily: 'monospace',
                      }}
                    >
                      {ep.method}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12.5px', color: '#0f172a' }}>
                      {ep.path}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(ep.curl, idx)}
                    style={{
                      background: copiedIndex === idx ? '#ecfdf5' : '#f1f5f9',
                      color: copiedIndex === idx ? '#059669' : '#475569',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedIndex === idx ? '✓ Copied' : 'Copy cURL'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{ep.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
