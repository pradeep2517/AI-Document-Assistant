'use client';

import React, { useState } from 'react';
import { saveGeminiKey } from '../lib/api';

interface GeminiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiConfigured: boolean;
  onKeySaved: () => void;
}

export const GeminiKeyModal: React.FC<GeminiKeyModalProps> = ({
  isOpen,
  onClose,
  geminiConfigured,
  onKeySaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setMessage({ text: 'Please enter a valid Gemini API key.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await saveGeminiKey(apiKey.trim());
      if (res.gemini_configured) {
        setMessage({ text: 'Google Gemini API key verified and connected successfully!', type: 'success' });
        setTimeout(() => {
          onKeySaved();
          onClose();
        }, 1200);
      } else {
        setMessage({ text: 'Key was cleared.', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save Gemini key.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await saveGeminiKey('');
      setApiKey('');
      setMessage({ text: 'Gemini API key disconnected successfully.', type: 'success' });
      setTimeout(() => {
        onKeySaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to disconnect key.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💎</span>
            <span>Google Gemini API Integration</span>
            {geminiConfigured && (
              <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                Active
              </span>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body" style={{ gap: '16px' }}>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
            Connect your <strong>Google Gemini API Key</strong> to ask grounded questions using <strong>Gemini 1.5 Flash</strong> and <strong>Gemini 1.5 Pro</strong>. Or switch to the <strong>Local Ollama (mistral)</strong> agent to run completely offline without an API key!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
              Gemini API Key:
            </label>
            <input
              type="password"
              placeholder={geminiConfigured ? '••••••••••••••••••••••••' : 'AIzaSy...'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Get a free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6', textDecoration: 'underline' }}>Google AI Studio</a>.
            </span>
          </div>

          {message && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: message.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            {geminiConfigured ? (
              <button
                type="button"
                className="popup-btn"
                onClick={handleDisconnect}
                disabled={loading}
                style={{ background: '#fee2e2', color: '#dc2626', fontSize: '12px' }}
              >
                Disconnect Key
              </button>
            ) : <span />}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="popup-btn"
                onClick={onClose}
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="popup-btn primary"
                style={{ background: '#7c3aed', color: '#ffffff' }}
              >
                {loading ? 'Verifying with Google...' : 'Save & Activate Gemini'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
