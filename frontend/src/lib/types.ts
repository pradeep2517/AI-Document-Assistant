export interface Citation {
  chunk_id: string;
  page_number: number;
  snippet: string;
  score: number;
}

export interface DocumentItem {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  page_count: number;
  ocr_applied: boolean;
  ocr_pages_count: number;
  extracted_chars: number;
  summary?: string;
  chunks_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  text: string;
  token_count: number;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  feedback?: 'up' | 'down' | null;
  model_used?: string;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  document_id?: string | null;
  document_name?: string | null;
  messages_count: number;
  created_at?: string;
  updated_at?: string;
  messages?: ChatMessage[];
}

export interface HealthInfo {
  status: string;
  version: string;
  database: {
    type: string;
    status: string;
    total_documents: number;
    total_chunks: number;
  };
  ocr_engine: {
    name: string;
    version: string;
    enabled: boolean;
  };
  embedding_engine: {
    model: string;
    dimension: number;
    backend: string;
  };
  llm_provider: string;
}
