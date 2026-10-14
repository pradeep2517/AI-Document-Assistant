import { DocumentItem, DocumentChunk, ChatSession, ChatMessage, HealthInfo } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.detail) {
        errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  return handleResponse<HealthInfo>(res);
}

export async function fetchDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/documents`, { cache: 'no-store' });
  const data = await handleResponse<{ documents: DocumentItem[]; total: number }>(res);
  return data.documents;
}

export async function fetchDocument(docId: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${docId}`, { cache: 'no-store' });
  return handleResponse<DocumentItem>(res);
}

export async function fetchDocumentChunks(docId: string, page?: number): Promise<DocumentChunk[]> {
  const url = page ? `${API_BASE}/api/v1/documents/${docId}/chunks?page=${page}` : `${API_BASE}/api/v1/documents/${docId}/chunks`;
  const res = await fetch(url, { cache: 'no-store' });
  return handleResponse<DocumentChunk[]>(res);
}

export async function uploadDocument(file: File, forceOcr: boolean = false): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${API_BASE}/api/v1/documents/upload${forceOcr ? '?force_ocr=true' : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<DocumentItem>(res);
}

export async function deleteDocument(docId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/documents/${docId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete document: ${res.statusText}`);
  }
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions`, { cache: 'no-store' });
  return handleResponse<ChatSession[]>(res);
}

export async function fetchChatSession(sessionId: string): Promise<ChatSession> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}`, { cache: 'no-store' });
  return handleResponse<ChatSession>(res);
}

export async function createChatSession(title: string = 'New Conversation', documentId?: string): Promise<ChatSession> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, document_id: documentId }),
  });
  return handleResponse<ChatSession>(res);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/chat/sessions/${sessionId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete session: ${res.statusText}`);
  }
}

export async function sendChatMessage(
  content: string,
  sessionId?: string,
  documentId?: string,
  model: string = 'GPT-4'
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/api/v1/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      session_id: sessionId,
      document_id: documentId,
      model,
    }),
  });
  return handleResponse<ChatMessage>(res);
}

export async function recordMessageFeedback(messageId: string, feedback: 'up' | 'down' | 'clear'): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/chat/message/${messageId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });
  await handleResponse(res);
}

export async function executeTextAction(
  text: string,
  action: 'explain' | 'summarise' | 'rewrite',
  pageNumber?: number
): Promise<{ result: string }> {
  const res = await fetch(`${API_BASE}/api/v1/chat/text-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, action, page_number: pageNumber }),
  });
  return handleResponse<{ result: string }>(res);
}

export function getDocumentFileUrl(docId: string): string {
  return `${API_BASE}/api/v1/documents/${docId}/file`;
}
