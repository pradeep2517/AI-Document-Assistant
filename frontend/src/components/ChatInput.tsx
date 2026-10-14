'use client';

import React, { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || disabled) return;
    onSendMessage(inputVal.trim());
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className="chat-input-container" onSubmit={handleSubmit} role="search" aria-label="Ask document question">
      {/* Amber action button */}
      <button
        type="button"
        className="chat-input-action-btn"
        title="Document Assistant Magic Actions"
        onClick={() => onSendMessage('Provide a comprehensive executive summary of this document with key statistics.')}
        id="btn-magic-action"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
        </svg>
      </button>

      {/* Pill input wrapper */}
      <div className="chat-input-wrapper">
        <input
          type="text"
          placeholder="Ask any question about your document"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          id="input-chat-query"
        />

        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputVal.trim() || disabled}
          title="Send Question"
          id="btn-send-chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </form>
  );
};
