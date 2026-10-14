'use client';

import React, { useState } from 'react';

interface TopHeaderProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  documentCount: number;
  onOpenDocuments: () => void;
  ollamaOnline: boolean;
  geminiConfigured: boolean;
  onOpenGeminiKeyModal: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  selectedModel,
  onSelectModel,
  documentCount,
  onOpenDocuments,
  ollamaOnline,
  geminiConfigured,
  onOpenGeminiKeyModal,
}) => {
  // Only Local Ollama Agent and Google Gemini API models as requested
  const models = [
    {
      id: 'Local / Ollama (mistral:latest)',
      label: 'Local Ollama (mistral)',
      icon: '🦙',
      status: ollamaOnline ? 'Online' : 'Offline',
      isOnline: ollamaOnline,
    },
    {
      id: 'Gemini 1.5 Flash',
      label: 'Gemini 1.5 Flash',
      icon: '✨',
      status: geminiConfigured ? 'Ready' : 'Set Key',
      isPurple: true,
    },
    {
      id: 'Gemini 1.5 Pro',
      label: 'Gemini 1.5 Pro',
      icon: '💎',
      status: geminiConfigured ? 'Ready' : 'Set Key',
      isPurple: true,
    },
  ];

  return (
    <header className="top-header-bar" role="banner">
      {/* Bot Tag */}
      <div className="bot-tag">
        <div className="bot-badge-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
            <rect width="18" height="12" x="3" y="8" rx="3" />
            <circle cx="8" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" />
            <line x1="12" y1="16" x2="12" y2="16.01" />
          </svg>
        </div>
        <div>
          <div className="bot-title">AskYourPDF</div>
          <div className="bot-sub">Local Ollama & Gemini Engine</div>
        </div>
      </div>

      {/* Model Switcher: ONLY Local Ollama and Gemini API */}
      <div className="model-switcher" role="tablist" aria-label="LLM Agent Selection">
        {models.map((m) => {
          const isActive = selectedModel === m.id;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={isActive}
              className={`model-tab ${isActive ? 'active' : ''} ${isActive && m.isPurple ? 'gpt4' : ''}`}
              onClick={() => onSelectModel(m.id)}
              id={`tab-model-${m.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              title={`${m.label} (${m.status})`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
              <span
                style={{
                  fontSize: '9px',
                  padding: '1px 5px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  background: m.isOnline ? '#dcfce7' : (m.isPurple && geminiConfigured ? '#ede9fe' : '#f1f5f9'),
                  color: m.isOnline ? '#15803d' : (m.isPurple && geminiConfigured ? '#6d28d9' : '#64748b'),
                }}
              >
                {m.status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Header Right Tools */}
      <div className="header-right-tools">
        {/* Gemini Key Config Shortcut */}
        <button
          className="pill-lang"
          onClick={onOpenGeminiKeyModal}
          title="Configure Google Gemini API Key"
          id="btn-gemini-key"
          style={{ background: geminiConfigured ? '#f3e8ff' : '#f1f4f8', color: geminiConfigured ? '#7c3aed' : '#475569' }}
        >
          {geminiConfigured ? '💎 Gemini Active' : '🔑 Gemini Key'}
        </button>

        {/* Ollama Status pill */}
        <div
          className="pill-credits"
          style={{ background: ollamaOnline ? '#0f172a' : '#475569' }}
          title={ollamaOnline ? 'Ollama Daemon Running on 127.0.0.1:11434' : 'Ollama Daemon Offline'}
          id="badge-ollama-status"
        >
          <span className="coin">{ollamaOnline ? '🟢' : '⚪'}</span>
          <span>{ollamaOnline ? 'Ollama' : 'Offline'}</span>
          <span className="btn-text">mistral</span>
        </div>

        {/* Documents Toggle */}
        <button className="btn-documents-toggle" onClick={onOpenDocuments} id="btn-open-documents-modal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Documents ({documentCount})</span>
        </button>
      </div>
    </header>
  );
};
