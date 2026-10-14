'use client';

import React, { useEffect, useState } from 'react';
import { HealthInfo } from '../lib/types';
import { fetchHealth } from '../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchHealth()
        .then((data) => {
          setHealth(data);
          setLoading(false);
        })
        .catch((e) => {
          console.error(e);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div className="modal-title">System & RAG Pipeline Diagnostics</div>
          <button className="modal-close-btn" onClick={onClose} title="Close Modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              Fetching pipeline status...
            </div>
          ) : health ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              {/* Database */}
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Database & Vector Search</div>
                <div style={{ color: '#475569' }}>Engine: <strong>{health.database.type}</strong></div>
                <div style={{ color: '#475569' }}>Status: <span style={{ color: '#10b981', fontWeight: 600 }}>{health.database.status}</span></div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  Total Documents: {health.database.total_documents} | Total Embedded Chunks: {health.database.total_chunks}
                </div>
              </div>

              {/* OCR Engine */}
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Document Processing & OCR</div>
                <div style={{ color: '#475569' }}>Extractor: <strong>PyMuPDF (fitz)</strong></div>
                <div style={{ color: '#475569' }}>OCR Tool: <strong>{health.ocr_engine.name}</strong></div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  Version: {health.ocr_engine.version}
                </div>
              </div>

              {/* Embedding Engine */}
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Embeddings & Vector Dimensions</div>
                <div style={{ color: '#475569' }}>Model: <strong>{health.embedding_engine.model}</strong></div>
                <div style={{ color: '#475569' }}>Dimension: <strong>{health.embedding_engine.dimension} floats</strong></div>
                <div style={{ color: '#475569' }}>Backend: <strong>{health.embedding_engine.backend}</strong></div>
              </div>

              {/* Grounded QA Engine */}
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Answer Grounding & LLM</div>
                <div style={{ color: '#475569' }}>Active Mode: <strong>Grounded RAG with Page Citations</strong></div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                  Configured API Keys: OpenAI / Gemini / Groq / Ollama or Grounded Synthesizer
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#ef4444' }}>
              Backend is currently offline. Start the backend with `python -m uvicorn app.main:app --port 8000`
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
