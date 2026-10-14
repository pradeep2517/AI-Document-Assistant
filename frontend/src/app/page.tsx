'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DocumentItem, ChatSession, ChatMessage } from '../lib/types';
import {
  fetchDocuments,
  fetchChatSessions,
  fetchChatSession,
  createChatSession,
  deleteChatSession,
  sendChatMessage,
  executeTextAction,
  fetchModelStatus,
} from '../lib/api';
import { IconDock } from '../components/IconDock';
import { ConversationsSidebar } from '../components/ConversationsSidebar';
import { TopHeader } from '../components/TopHeader';
import { DocumentViewer } from '../components/DocumentViewer';
import { ChatPane } from '../components/ChatPane';
import { ChatInput } from '../components/ChatInput';
import { DocumentsModal } from '../components/DocumentsModal';
import { SettingsModal } from '../components/SettingsModal';
import { GeminiKeyModal } from '../components/GeminiKeyModal';
import { ApiDocsModal } from '../components/ApiDocsModal';
import { RagToolsModal } from '../components/RagToolsModal';
import { HelpModal } from '../components/HelpModal';
import { ProfileModal } from '../components/ProfileModal';

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocument, setActiveDocument] = useState<DocumentItem | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Model state: exclusively Local Ollama and Gemini API
  const [selectedModel, setSelectedModel] = useState<string>('Local / Ollama (mistral:latest)');
  const [ollamaOnline, setOllamaOnline] = useState<boolean>(true);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  
  const [activeCitationPage, setActiveCitationPage] = useState<number | null>(null);
  const [loadingAnswer, setLoadingAnswer] = useState<boolean>(false);

  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [isApiDocsModalOpen, setIsApiDocsModalOpen] = useState<boolean>(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Initial Load of Documents, Sessions, and Model Status
  const loadData = useCallback(async () => {
    try {
      const [docs, sessList, modelStat] = await Promise.all([
        fetchDocuments().catch(() => []),
        fetchChatSessions().catch(() => []),
        fetchModelStatus().catch(() => ({
          ollama_online: true,
          ollama_models: ['mistral:latest'],
          gemini_configured: false,
          gemini_model: 'gemini-1.5-flash',
        })),
      ]);

      setDocuments(docs);
      setSessions(sessList);
      if (modelStat) {
        setOllamaOnline(modelStat.ollama_online);
        setGeminiConfigured(modelStat.gemini_configured);
        // Automatically select Gemini when Local Ollama is offline
        if (!modelStat.ollama_online && modelStat.gemini_configured) {
          setSelectedModel('Gemini 1.5 Flash');
        }
      }

      // Select active document if not already chosen
      if (docs.length > 0 && !activeDocument) {
        setActiveDocument(docs[0]);
      }

      // Select active session (prefer most recently updated session)
      if (sessList.length > 0 && !activeSessionId) {
        const primary = sessList[0];
        setActiveSessionId(primary.id);
        const fullSess = await fetchChatSession(primary.id);
        setMessages(fullSess.messages || []);
        if (fullSess.document_id) {
          const matchedDoc = docs.find((d) => d.id === fullSess.document_id);
          if (matchedDoc) setActiveDocument(matchedDoc);
        }
      }
    } catch (e) {
      console.error('Failed to load initial assistant data:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Switch Conversation Session
  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const fullSess = await fetchChatSession(sessionId);
      setMessages(fullSess.messages || []);
      if (fullSess.document_id) {
        const matchedDoc = documents.find((d) => d.id === fullSess.document_id);
        if (matchedDoc) setActiveDocument(matchedDoc);
      }
    } catch (e) {
      console.error('Error fetching session:', e);
    }
  };

  // 3. New Conversation
  const handleNewConversation = async () => {
    try {
      const newSess = await createChatSession('New Conversation', activeDocument?.id);
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setMessages([]);
    } catch (e) {
      console.error('Error creating new conversation:', e);
    }
  };

  // 4. Delete Conversation
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== sessionId);
        if (activeSessionId === sessionId) {
          if (remaining.length > 0) {
            handleSelectSession(remaining[0].id);
          } else {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
        return remaining;
      });
    } catch (e) {
      console.error('Error deleting session:', e);
    }
  };

  // 5. Send Question to RAG Pipeline (Routes to Local Ollama or Gemini API)
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || loadingAnswer) return;

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: activeSessionId || 'default',
      role: 'user',
      content: content.trim(),
      citations: [],
      model_used: selectedModel,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoadingAnswer(true);

    try {
      const response = await sendChatMessage(
        content.trim(),
        activeSessionId || undefined,
        activeDocument?.id,
        selectedModel
      );

      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, response]);

      // Track the session the backend used (handles auto-created sessions)
      if (response.session_id && response.session_id !== activeSessionId) {
        setActiveSessionId(response.session_id);
      }

      // Refresh session list to pick up new/updated titles
      const updatedSessions = await fetchChatSessions();
      setSessions(updatedSessions);
    } catch (err: any) {
      console.error('Error answering question:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        session_id: activeSessionId || 'default',
        role: 'assistant',
        content: `I encountered an issue processing your request: ${err.message}. Please verify the agent connection.`,
        citations: [],
        model_used: selectedModel,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  // 6. Handle Document Selection Tooltip Actions (Explain, Summarise, Rewrite)
  const handleExecuteTextAction = async (
    text: string,
    action: 'explain' | 'summarise' | 'rewrite',
    pageNumber: number
  ) => {
    setLoadingAnswer(true);
    try {
      const res = await executeTextAction(text, action, pageNumber, selectedModel);
      const actionMsg: ChatMessage = {
        id: `action-${Date.now()}`,
        session_id: activeSessionId || 'default',
        role: 'assistant',
        content: res.result,
        citations: [
          {
            chunk_id: `page-${pageNumber}`,
            page_number: pageNumber,
            snippet: text.substring(0, 160) + '...',
            score: 0.98,
          },
        ],
        model_used: `${selectedModel} (${action.toUpperCase()})`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, actionMsg]);
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleResetWorkspace = async () => {
    try {
      const newSession = await createChatSession('Fresh Conversation', activeDocument?.id);
      setActiveSessionId(newSession.id);
      setMessages([]);
      const updated = await fetchChatSessions();
      setSessions(updated);
      showToast('Workspace reset — Started fresh conversation');
    } catch (e: any) {
      showToast('Session reset completed');
      setMessages([]);
    }
  };

  return (
    <main className="app-viewport">
      <div className="app-frame">
        {/* Leftmost Slim Dark Icon Dock */}
        <IconDock
          conversationCount={sessions.length}
          onHome={() => {
            showToast('AI Document Assistant — Home');
            setActiveCitationPage(null);
          }}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenDocuments={() => setIsDocsModalOpen(true)}
          onOpenApiDocs={() => setIsApiDocsModalOpen(true)}
          onOpenTools={() => setIsToolsModalOpen(true)}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={() => setIsProfileModalOpen(true)}
        />

        {/* Conversation History Sidebar */}
        {isSidebarOpen && (
          <ConversationsSidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewConversation={handleNewConversation}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {/* Main Workspace Area */}
        <div className="workspace-container">
          {/* Top Header Bar with Local Ollama & Gemini API Selection */}
          <TopHeader
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            documentCount={documents.length}
            onOpenDocuments={() => setIsDocsModalOpen(true)}
            ollamaOnline={ollamaOnline}
            geminiConfigured={geminiConfigured}
            onOpenGeminiKeyModal={() => setIsGeminiModalOpen(true)}
          />

          {/* Split Content Area: Document Viewer + Chat Pane */}
          <div className="split-content-area">
            {/* Left: Document Viewer */}
            <DocumentViewer
              document={activeDocument}
              activeCitationPage={activeCitationPage}
              onExecuteTextAction={handleExecuteTextAction}
              onOpenDocuments={() => setIsDocsModalOpen(true)}
            />

            {/* Right: Chat Thread & Input */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <ChatPane
                messages={messages}
                loading={loadingAnswer}
                onCitationClick={(page) => setActiveCitationPage(page)}
                onQuickPromptClick={(prompt) => handleSendMessage(prompt)}
              />

              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={loadingAnswer}
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        <DocumentsModal
          isOpen={isDocsModalOpen}
          onClose={() => setIsDocsModalOpen(false)}
          documents={documents}
          activeDocumentId={activeDocument?.id || null}
          onSelectDocument={(doc) => {
            setActiveDocument(doc);
            setIsDocsModalOpen(false);
          }}
          onRefreshDocuments={loadData}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />

        <GeminiKeyModal
          isOpen={isGeminiModalOpen}
          onClose={() => setIsGeminiModalOpen(false)}
          geminiConfigured={geminiConfigured}
          onKeySaved={() => {
            setGeminiConfigured(true);
            setSelectedModel('Gemini 1.5 Flash');
          }}
        />

        <ApiDocsModal
          isOpen={isApiDocsModalOpen}
          onClose={() => setIsApiDocsModalOpen(false)}
        />

        <RagToolsModal
          isOpen={isToolsModalOpen}
          onClose={() => setIsToolsModalOpen(false)}
          ollamaOnline={ollamaOnline}
          geminiConfigured={geminiConfigured}
        />

        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />

        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          documentCount={documents.length}
          conversationCount={sessions.length}
          activeModel={selectedModel}
          onResetWorkspace={handleResetWorkspace}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>✨</span>
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </main>
  );
}
