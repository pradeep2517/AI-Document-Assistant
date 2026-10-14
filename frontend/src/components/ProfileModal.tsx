'use client';

import React from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentCount: number;
  conversationCount: number;
  activeModel: string;
  onResetWorkspace: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  documentCount,
  conversationCount,
  activeModel,
  onResetWorkspace,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👤</span>
            <span>User Profile & Workspace</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body" style={{ gap: '16px' }}>
          {/* User Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>Pradeep</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Full-Stack AI Developer • Local Workspace</div>
              <span style={{ fontSize: '10.5px', background: '#dcfce7', color: '#15803d', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', marginTop: '2px', display: 'inline-block' }}>
                Active Session
              </span>
            </div>
          </div>

          {/* Workspace Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
            <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{documentCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Documents</div>
            </div>
            <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{conversationCount}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Conversations</div>
            </div>
            <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#7c3aed', marginTop: '4px' }}>Ready</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>AI Engine</div>
            </div>
          </div>

          {/* Current Active Engine */}
          <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '10px', fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#475569' }}>Current Selected Model:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{activeModel}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <button
              type="button"
              className="popup-btn"
              onClick={() => {
                if (confirm('Do you want to reset and start a fresh session?')) {
                  onResetWorkspace();
                  onClose();
                }
              }}
              style={{ background: '#fee2e2', color: '#dc2626', fontSize: '12px' }}
            >
              Reset Session Cache
            </button>
            <button
              type="button"
              className="popup-btn"
              onClick={onClose}
              style={{ background: '#f1f5f9', color: '#475569' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
