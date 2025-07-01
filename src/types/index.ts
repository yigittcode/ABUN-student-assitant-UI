// API Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  email: string;
}

export interface ChatMessage {
  message: string;
}

export interface ChatResponse {
  response: string;
  sources: Array<{ [key: string]: string }>;
  timestamp: string;
}

// Memory Chat Types
export interface ConversationChatMessage {
  message: string;
  session_id?: string | null;
  start_new_conversation?: boolean;
}

export interface ConversationChatResponse {
  response: string;
  sources: Array<{ [key: string]: string }>;
  timestamp: string;
  session_id: string;
  message_count: number;
  is_new_conversation: boolean;
}

export interface ConversationSession {
  session_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  status: string;
  first_message: string;
  last_message: string;
}

export interface DocumentInfo {
  id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  status: string;
  chunks_count?: number;
}

// New document management types
export interface DocumentChunk {
  chunk_index: number;
  content: string;
  source: string;
  article?: string | null;
}

export interface DocumentContent {
  document_id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  status: string;
  total_chunks: number;
  full_content: string;
  raw_chunks?: DocumentChunk[] | null;
}

export interface DocumentDetails {
  document_id: string;
  file_name: string;
  file_size: number;
  created_at: string;
  status: string;
  chunks_count: number;
  metadata: Record<string, any>;
  weaviate_chunks: number;
}

export interface UploadResponse {
  status: string;
  message: string;
  files_processed: number;
  session_id?: string; // Upload session ID for progress tracking
}

// Upload Progress & Session Types
export interface UploadProgress {
  session_id: string;
  total_files: number;
  processed_files: number;
  current_file?: string;
  progress_percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface UploadSession {
  session_id: string;
  total_files: number;
  processed_files: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  started_at: string;
  completed_at?: string;
  created_by: string;
}

// Application Types
export interface ChatHistoryItem {
  id: string;
  message: string;
  response: string;
  timestamp: string;
  sources?: Array<{ [key: string]: string }>;
}

export interface User {
  email: string;
  token: string;
  isAuthenticated: boolean;
}

export interface SystemStats {
  total_documents: number;
  total_chunks: number;
  total_conversations: number;
  system_health: 'healthy' | 'warning' | 'error';
  last_updated: string;
}

export interface AppState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface DocumentUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  session_id?: string;
}

// Document Management Types
export interface DocumentStats {
  total_documents: number;
  total_size: number;
  recent_uploads: number;
  processing_documents: number;
} 