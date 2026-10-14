'use client';

import React, { useState } from 'react';
import { ChatSession } from '../lib/types';

interface ConversationsSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewConversation: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewConversation,
  onDeleteSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const todaySessions: ChatSession[] = [];
  const earlierSessions: ChatSession[] = [];

  if (isMounted) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    filteredSessions.forEach((s) => {
      const sessionTime = s.updated_at ? new Date(s.updated_at).getTime() : 0;
      if (sessionTime >= startOfToday) {
        todaySessions.push(s);
      } else {
        earlierSessions.push(s);
      }
    });
  } else {
    // Default group on initial SSR pass
    todaySessions.push(...filteredSessions);
  }

  return (
    <nav className="conversations-sidebar" aria-label="Conversation History">
      {/* Brand Title */}
      <div className="brand-title">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>ASKYOURPDF</span>
      </div>

      {/* Search Input */}
      <div className="search-bar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search for conversation"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="input-search-conversation"
        />
      </div>

      {/* + New Conversation Button */}
      <button className="btn-new-conversation" onClick={onNewConversation} id="btn-new-conversation">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>+New Conversation</span>
      </button>

      {/* Conversation List */}
      <div className="conversation-list">
        {todaySessions.length > 0 && (
          <>
            <div className="conversation-group-title">TODAY</div>
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className={`conversation-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => onSelectSession(session.id)}
                id={`session-item-${session.id}`}
              >
                <span className="conversation-title-text" title={session.title}>
                  {session.title}
                </span>
                <button
                  className="action-icon-btn"
                  title="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete conversation "${session.title}"?`)) {
                      onDeleteSession(session.id);
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}

        {earlierSessions.length > 0 && (
          <>
            <div className="conversation-group-title" style={{ marginTop: '16px' }}>YESTERDAY</div>
            {earlierSessions.map((session) => (
              <div
                key={session.id}
                className={`conversation-item ${activeSessionId === session.id ? 'active' : ''}`}
                onClick={() => onSelectSession(session.id)}
                id={`session-item-${session.id}`}
              >
                <span className="conversation-title-text" title={session.title}>
                  {session.title}
                </span>
                <button
                  className="action-icon-btn"
                  title="Delete conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete conversation "${session.title}"?`)) {
                      onDeleteSession(session.id);
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}

        {todaySessions.length === 0 && earlierSessions.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
            No conversations found.
          </div>
        )}
      </div>
    </nav>
  );
};
