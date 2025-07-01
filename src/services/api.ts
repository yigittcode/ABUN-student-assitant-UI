import axios, { type AxiosResponse } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  ChatMessage,
  ChatResponse,
  DocumentInfo,
  DocumentContent,
  DocumentDetails,
  UploadResponse,
  SystemStats,
  ChatHistoryItem,
  UploadProgress,
  UploadSession,
  DocumentStats
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

// API Services
export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponse> = await api.post('/api/login', credentials);
    return response.data;
  },
};

export const chatService = {
  sendMessage: async (message: ChatMessage): Promise<ChatResponse> => {
    const response: AxiosResponse<ChatResponse> = await api.post('/api/chat', message);
    return response.data;
  },

  sendMessageStream: async (message: ChatMessage): Promise<ReadableStream> => {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      throw new Error('Failed to get stream response');
    }
    
    return response.body!;
  },

  getChatHistory: async (limit: number = 50): Promise<ChatHistoryItem[]> => {
    const response: AxiosResponse<ChatHistoryItem[]> = await api.get(`/api/chat/history?limit=${limit}`);
    return response.data;
  },

  clearChatHistory: async (): Promise<void> => {
    await api.delete('/api/chat/history');
  },
};

export const documentService = {
  uploadDocuments: async (files: File[]): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response: AxiosResponse<UploadResponse> = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload Progress Tracking
  getUploadProgress: async (sessionId: string): Promise<UploadProgress> => {
    const response: AxiosResponse<UploadProgress> = await api.get(`/api/upload/progress/${sessionId}`);
    return response.data;
  },

  getUploadSessions: async (limit: number = 10): Promise<UploadSession[]> => {
    const response: AxiosResponse<UploadSession[]> = await api.get(`/api/upload/sessions?limit=${limit}`);
    return response.data;
  },

  // Document Management
  getDocuments: async (): Promise<DocumentInfo[]> => {
    const response: AxiosResponse<DocumentInfo[]> = await api.get('/api/documents');
    return response.data;
  },

  getDocumentContent: async (documentId: string, showChunks: boolean = false): Promise<DocumentContent> => {
    const response: AxiosResponse<DocumentContent> = await api.get(
      `/api/documents/${documentId}/content?show_chunks=${showChunks}`
    );
    return response.data;
  },

  getDocumentDetails: async (documentId: string): Promise<DocumentDetails> => {
    const response: AxiosResponse<DocumentDetails> = await api.get(
      `/api/documents/${documentId}/info`
    );
    return response.data;
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await api.delete(`/api/documents/${documentId}`);
  },

  clearAllDocuments: async (): Promise<void> => {
    await api.delete('/api/documents');
  },

  // Document Statistics
  getDocumentStats: async (): Promise<DocumentStats> => {
    const documents = await documentService.getDocuments();
    const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
    const recentUploads = documents.filter(doc => {
      const uploadDate = new Date(doc.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return uploadDate > dayAgo;
    }).length;
    const processingDocuments = documents.filter(doc => doc.status === 'processing').length;

    return {
      total_documents: documents.length,
      total_size: totalSize,
      recent_uploads: recentUploads,
      processing_documents: processingDocuments
    };
  },
};

export const systemService = {
  getStats: async (): Promise<SystemStats> => {
    const response: AxiosResponse<SystemStats> = await api.get('/api/stats');
    return response.data;
  },

  getHealth: async (): Promise<{ status: string }> => {
    const response: AxiosResponse<{ status: string }> = await api.get('/health');
    return response.data;
  },
};

export const speechService = {
  speechToSpeech: async (audioFile: File, options?: { voice?: string, gender?: string, language?: string, signal?: AbortSignal }): Promise<Blob> => {
    const { voice = 'tr-TR-EmelNeural', gender = 'female', language = 'tr', signal } = options || {};
    
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('voice', voice);
    formData.append('gender', gender);
    formData.append('language', language);

    const response = await fetch(`${API_BASE_URL}/api/speech-to-speech`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      signal
    });

    if (!response.ok) {
      throw new Error('Speech to speech failed');
    }

    return response.blob();
  },

  textToSpeech: async (text: string, options?: { voice?: string, gender?: string, signal?: AbortSignal }): Promise<Blob> => {
    const { voice = 'tr-TR-EmelNeural', gender = 'female', signal } = options || {};
    
    const formData = new FormData();
    formData.append('text', text);
    formData.append('voice', voice);
    formData.append('gender', gender);

    const response = await fetch(`${API_BASE_URL}/api/text-to-speech`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      signal
    });

    if (!response.ok) {
      throw new Error('Text to speech failed');
    }

    return response.blob();
  },

  getVoices: async (): Promise<string[]> => {
    const response: AxiosResponse<string[]> = await api.get('/api/speech/voices');
    return response.data;
  },
};

export default api; 