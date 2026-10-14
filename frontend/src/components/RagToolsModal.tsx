'use client';

import React, { useState } from 'react';

interface RagToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ollamaOnline: boolean;
  geminiConfigured: boolean;
}

export const RagToolsModal: React.FC<RagToolsModalProps> = ({
  isOpen,
  onClose,
  ollamaOnline,
  geminiConfigured,
}) => {
  const [testQuery, setTestQuery] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestEmbeddings = async () => {
    if (!testQuery.trim()) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/v1/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: testQuery.trim(), model: 'Local / Ollama' }),
      });
      const data = await res.json();
      if (data.citations) {
        setTestResult(
          `Success! Retrieved ${data.citations.length} citations from vector store. Highest score: ${
            data.citations[0]?.score ? (data.citations[0].score * 100).toFixed(1) + '%' : 'N/A'
          }`
        );
      } else {
        setTestResult('Executed test query successfully.');
      }
    } catch (e: any) {
      setTestResult(`Test failed: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️</span>
            <span>RAG Pipeline Diagnostics & Vector Tools</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ gap: '16px' }}>
          {/* Engine Status Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>LOCAL OLLAMA</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '14px' }}>{ollamaOnline ? '🟢' : '⚪'}</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: ollamaOnline ? '#059669' : '#64748b' }}>
                  {ollamaOnline ? 'Daemon Running' : 'Offline'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Port 11434 (mistral / llama)</div>
            </div>

            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>GOOGLE GEMINI API</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '14px' }}>{geminiConfigured ? '💎' : '⚪'}</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: geminiConfigured ? '#7c3aed' : '#64748b' }}>
                  {geminiConfigured ? 'Connected & Active' : 'Unconfigured'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Gemini 1.5/3.5 Flash & Pro</div>
            </div>
          </div>

          {/* Pipeline Config Details */}
          <div style={{ padding: '12px 14px', background: '#f1f5f9', borderRadius: '10px', fontSize: '12.5px', color: '#334155' }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>Pipeline Specifications:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div>• Embedding Model: <strong>all-MiniLM-L6-v2</strong></div>
              <div>• Vector Dimension: <strong>384-d</strong></div>
              <div>• Chunk Size: <strong>500 chars (100 overlap)</strong></div>
              <div>• Similarity Threshold: <strong>0.10</strong></div>
              <div>• OCR Engine: <strong>Tesseract (200 DPI)</strong></div>
              <div>• Fallback Synthesis: <strong>Grounded Extractor</strong></div>
            </div>
          </div>

          {/* Quick Vector Query Tester */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
              Test Vector Search & Retrieval:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. soil moisture, system architecture..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleTestEmbeddings()}
              />
              <button
                type="button"
                onClick={handleTestEmbeddings}
                disabled={testing || !testQuery.trim()}
                className="popup-btn primary"
                style={{ background: '#0284c7', color: '#ffffff', whiteSpace: 'nowrap' }}
              >
                {testing ? 'Testing...' : 'Test Retrieval'}
              </button>
            </div>
            {testResult && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '12px', border: '1px solid #a7f3d0' }}>
                {testResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
