import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { documentService } from '../services/api';
import type { 
  DocumentInfo, 
  UploadProgress, 
  UploadSession, 
  DocumentStats,
  DocumentUploadProgress 
} from '../types';

interface DocumentStore {
  // State
  documents: DocumentInfo[];
  uploadSessions: UploadSession[];
  currentUploadProgress: UploadProgress | null;
  uploadFiles: DocumentUploadProgress[];
  stats: DocumentStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDocuments: () => Promise<void>;
  fetchUploadSessions: () => Promise<void>;
  fetchDocumentStats: () => Promise<void>;
  
  // Upload Progress
  startUploadTracking: (sessionId: string, onComplete?: () => void) => void;
  stopUploadTracking: () => void;
  updateUploadProgress: (progress: UploadProgress) => void;
  
  // Upload Files Management
  addUploadFiles: (files: File[]) => void;
  updateFileProgress: (index: number, progress: number, status: DocumentUploadProgress['status']) => void;
  clearUploadFiles: () => void;
  
  // Document Management
  deleteDocument: (documentId: string) => Promise<void>;
  clearAllDocuments: () => Promise<void>;
  
  // Utility
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useDocumentStore = create<DocumentStore>()(
  persist(
    (set, get) => ({
      // Initial state
      documents: [],
      uploadSessions: [],
      currentUploadProgress: null,
      uploadFiles: [],
      stats: null,
      isLoading: false,
      error: null,

      // Fetch documents
      fetchDocuments: async () => {
        try {
          set({ isLoading: true, error: null });
          const documents = await documentService.getDocuments();
          set({ documents, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch documents',
            isLoading: false 
          });
        }
      },

      // Fetch upload sessions
      fetchUploadSessions: async () => {
        try {
          const uploadSessions = await documentService.getUploadSessions();
          set({ uploadSessions });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch upload sessions' });
        }
      },

      // Fetch document statistics
      fetchDocumentStats: async () => {
        try {
          const stats = await documentService.getDocumentStats();
          set({ stats });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to fetch document stats' });
        }
      },

      // Upload Progress Tracking
      startUploadTracking: (sessionId: string, onComplete?: () => void) => {
        const trackProgress = async () => {
          try {
            const progress = await documentService.getUploadProgress(sessionId);
            set({ currentUploadProgress: progress });
            
            // If not completed, continue tracking
            if (progress.status === 'processing' || progress.status === 'pending') {
              setTimeout(trackProgress, 1000); // Poll every second
            } else {
              // Completed or error, refresh ALL document data
              await Promise.all([
                get().fetchDocuments(),
                get().fetchUploadSessions(),
                get().fetchDocumentStats() // Added this to refresh stats
              ]);
              
              // Clear the current progress
              set({ currentUploadProgress: null });
              
              // Call completion callback if provided
              if (onComplete) {
                onComplete();
              }
            }
          } catch (error) {
            console.error('Error tracking upload progress:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to track upload progress',
              currentUploadProgress: null
            });
          }
        };
        
        trackProgress();
      },

      stopUploadTracking: () => {
        set({ currentUploadProgress: null });
      },

      updateUploadProgress: (progress: UploadProgress) => {
        set({ currentUploadProgress: progress });
      },

      // Upload Files Management
      addUploadFiles: (files: File[]) => {
        const uploadFiles = files.map(file => ({
          file,
          progress: 0,
          status: 'pending' as const
        }));
        set({ uploadFiles });
      },

      updateFileProgress: (index: number, progress: number, status: DocumentUploadProgress['status']) => {
        const { uploadFiles } = get();
        const updatedFiles = [...uploadFiles];
        updatedFiles[index] = { ...updatedFiles[index], progress, status };
        set({ uploadFiles: updatedFiles });
      },

      clearUploadFiles: () => {
        set({ uploadFiles: [] });
      },

      // Document Management
      deleteDocument: async (documentId: string) => {
        try {
          set({ isLoading: true, error: null });
          await documentService.deleteDocument(documentId);
          
          // Remove from local state
          const { documents } = get();
          const updatedDocuments = documents.filter(doc => doc.id !== documentId);
          set({ documents: updatedDocuments, isLoading: false });
          
          // Refresh stats
          get().fetchDocumentStats();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete document',
            isLoading: false 
          });
        }
      },

      clearAllDocuments: async () => {
        try {
          set({ isLoading: true, error: null });
          await documentService.clearAllDocuments();
          set({ documents: [], isLoading: false });
          
          // Refresh stats
          get().fetchDocumentStats();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to clear all documents',
            isLoading: false 
          });
        }
      },

      // Utility functions
      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'document-store',
      partialize: (state) => ({
        documents: state.documents,
        uploadSessions: state.uploadSessions,
        stats: state.stats,
      }),
    }
  )
); 