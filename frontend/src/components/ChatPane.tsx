'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Citation } from '../lib/types';
import { recordMessageFeedback } from '../lib/api';

interface ChatPaneProps {
  messages: ChatMessage[];
  loading: boolean;
  onCitationClick: (pageNumber: number) => void;
  onQuickPromptClick: (promptText: string) => void;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  messages,
  loading,
  onCitationClick,
  onQuickPromptClick,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<{ [msgId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = async (messageId: string, type: 'up' | 'down') => {
    try {
      await recordMessageFeedback(messageId, type);
      // Note: feedback persisted server-side; UI will reflect on next full refresh
    } catch (e) {
      console.error('Failed to record feedback:', e);
    }
  };

  const toggleCitations = (msgId: string) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Helper to format text with clickable [Page X] tags
  const renderFormattedContent = (content: string) => {
    // Split by [Page X] patterns
    const regex = /\[Page\s+(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const pageNum = parseInt(match[1], 10);
      parts.push(
        <button
          key={`page-tag-${match.index}`}
          className="citation-badge"
          style={{ cursor: 'pointer', border: 'none', verticalAlign: 'middle' }}
          onClick={() => onCitationClick(pageNum)}
          title={`Click to jump to Page ${pageNum} in Document Viewer`}
        >
          Page {pageNum} ↗
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const quickPrompts = [
    'Tell me more about these innovations',
    'What is the system architecture?',
    'Summarize experimental results',
    'What is the methodology?',
  ];

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="chat-panel" role="region" aria-label="Conversation Thread">
      {/* Messages Scroll Area */}
      <div className="chat-messages-scroll">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const timeStr = isMounted && msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '12:15 PM';

          return (
            <div
              key={msg.id}
              className={`message-row ${isAssistant ? 'assistant' : 'user'}`}
              id={`chat-msg-${msg.id}`}
            >
              {isAssistant && (
                <div className="message-avatar assistant">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
              )}

              <div className={`message-bubble ${isAssistant ? 'assistant' : 'user'}`}>
                {/* Content body */}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {renderFormattedContent(msg.content)}
                </div>

                {/* Grounded Citations Box */}
                {isAssistant && msg.citations && msg.citations.length > 0 && (
                  <div className="citations-box">
                    <div className="citations-header" onClick={() => toggleCitations(msg.id)}>
                      <span>
                        📚 Grounded Citations ({msg.citations.length} verified excerpt
                        {msg.citations.length > 1 ? 's' : ''})
                      </span>
                      <span>{expandedCitations[msg.id] ? '▲' : '▼'}</span>
                    </div>

                    {expandedCitations[msg.id] && (
                      <div className="citations-list">
                        {msg.citations.map((c, idx) => (
                          <div
                            key={c.chunk_id || idx}
                            className="citation-chip"
                            onClick={() => onCitationClick(c.page_number)}
                            title="Click to view in document"
                          >
                            <span className="citation-badge">Page {c.page_number}</span>
                            <span style={{ fontStyle: 'italic' }}>&quot;{c.snippet}&quot;</span>
                            <span style={{ marginLeft: '6px', color: '#94a3b8', fontSize: '11px' }}>
                              ({Math.round(c.score * 100)}% match)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer with timestamp and actions */}
                <div className="message-footer">
                  <span>{timeStr}</span>

                  {isAssistant && (
                    <div className="message-actions">
                      <button
                        className="action-icon-btn"
                        title={copiedId === msg.id ? 'Copied!' : 'Copy to clipboard'}
                        onClick={() => handleCopy(msg.content, msg.id)}
                      >
                        {copiedId === msg.id ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        )}
                      </button>

                      <button
                        className={`action-icon-btn ${msg.feedback === 'up' ? 'active' : ''}`}
                        title="Good answer"
                        onClick={() => handleFeedback(msg.id, 'up')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={msg.feedback === 'up' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 10v12" />
                          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                        </svg>
                      </button>

                      <button
                        className={`action-icon-btn ${msg.feedback === 'down' ? 'active' : ''}`}
                        title="Needs improvement"
                        onClick={() => handleFeedback(msg.id, 'down')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={msg.feedback === 'down' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 14V2" />
                          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!isAssistant && (
                <div className="message-avatar user">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="message-row assistant">
            <div className="message-avatar assistant">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="animate-spin">⚙</span>
              <span>Retrieving relevant chunks and verifying page citations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="quick-prompts-bar">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            className="quick-chip"
            onClick={() => onQuickPromptClick(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};
