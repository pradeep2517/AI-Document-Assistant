'use client';

import React from 'react';

interface TopHeaderProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  documentCount: number;
  onOpenDocuments: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  selectedModel,
  onSelectModel,
  documentCount,
  onOpenDocuments,
}) => {
  const models = [
    { id: 'GPT-3.5', label: 'GPT-3.5', icon: '⚡' },
    { id: 'GPT-4', label: 'GPT-4', icon: '✨', isPurple: true },
    { id: 'Claude', label: 'Claude', icon: 'AI' },
    { id: 'Claude 2', label: 'Claude 2', icon: 'AI' },
    { id: 'Local / Ollama', label: 'Local / Ollama', icon: '🦙' },
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
          <div className="bot-sub">Bot</div>
        </div>
      </div>

      {/* Model Switcher */}
      <div className="model-switcher" role="tablist" aria-label="LLM Model Selection">
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
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Header Right Tools */}
      <div className="header-right-tools">
        {/* Language selector */}
        <button className="pill-lang" title="Language: English" id="btn-lang-select">
          EN ↑
        </button>

        {/* Credits pill */}
        <div className="pill-credits" title="Account Credits" id="badge-credits">
          <span className="coin">🪙</span>
          <span>500</span>
          <span className="btn-text">Buy More Credit</span>
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
