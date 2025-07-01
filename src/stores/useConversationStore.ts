import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ConversationChatMessage, 
  ConversationChatResponse, 
  ConversationSession 
} from '../types';
import { chatService, conversationService } from '../services/api';

interface ConversationMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  session_id?: string;
  message_count?: number;
}

interface ConversationState {
  // Current conversation
  messages: ConversationMessage[];
  currentSessionId: string | null;
  messageCount: number;
  isNewConversation: boolean;
  
  // Loading states
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessage: string;
  error: string | null;
  
  // Session management (Admin)
  sessions: ConversationSession[];
  isLoadingSessions: boolean;
  
  // User session management (IP-based)
  myConversations: ConversationSession[];
  isLoadingMySessions: boolean;
  
  // Actions
  sendMessageWithMemory: (message: string, startNew?: boolean) => Promise<ConversationChatResponse | null>;
  sendMessageWithMemoryStream: (message: string, startNew?: boolean) => Promise<void>;
  startNewConversation: () => void;
  continueConversation: (sessionId: string) => void;
  loadConversationHistory: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  closeConversation: (sessionId: string, summary?: string) => Promise<void>;
  cleanupOldConversations: (daysOld?: number, inactiveDays?: number) => Promise<void>;
  addMessage: (message: { content: string; role: 'user' | 'assistant'; session_id?: string }) => void;
  clearMessages: () => void;
  clearError: () => void;
  loadHistoryForCurrentSession: () => Promise<void>;
  initializeStore: () => void;
  
  // User session management functions
  loadMyConversations: () => Promise<void>;
  deleteMySession: (sessionId: string) => Promise<void>;
  deleteAllMySessions: () => Promise<void>;
  switchToSession: (sessionId: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      currentSessionId: null,
      messageCount: 0,
      isNewConversation: true,
      isLoading: false,
      isStreaming: false,
      streamingMessage: '',
      error: null,
      sessions: [],
      isLoadingSessions: false,
      myConversations: [],
      isLoadingMySessions: false,

      addMessage: (message) => {
        const newMessage: ConversationMessage = {
          id: Date.now().toString(),
          content: message.content,
          role: message.role,
          timestamp: new Date(),
          session_id: message.session_id || get().currentSessionId || undefined,
        };
        
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      sendMessageWithMemory: async (messageText, startNew = false) => {
        set({ isLoading: true, error: null });

        try {
          const { currentSessionId } = get();
          
          const chatMessage: ConversationChatMessage = {
            message: messageText,
            session_id: startNew ? null : currentSessionId,
            start_new_conversation: startNew
          };

          // Add user message immediately
          get().addMessage({ content: messageText, role: 'user' });

          const response = await chatService.sendMessageWithMemory(chatMessage);

          // Update session info
          set({
            currentSessionId: response.session_id,
            messageCount: response.message_count,
            isNewConversation: response.is_new_conversation,
            isLoading: false
          });

          // Add assistant response
          get().addMessage({ 
            content: response.response, 
            role: 'assistant',
            session_id: response.session_id
          });

          return response;
        } catch (error) {
          console.error('Memory chat error:', error);
          set({ 
            error: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
            isLoading: false 
          });
          
          // Add error message
          get().addMessage({ 
            content: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.', 
            role: 'assistant' 
          });
          
          return null;
        }
      },

      sendMessageWithMemoryStream: async (messageText, startNew = false) => {
        set({ isLoading: true, isStreaming: true, error: null, streamingMessage: '' });

        try {
          const { currentSessionId } = get();
          
          const chatMessage: ConversationChatMessage = {
            message: messageText,
            session_id: startNew ? null : currentSessionId,
            start_new_conversation: startNew
          };

          // Add user message immediately
          get().addMessage({ content: messageText, role: 'user' });

          // Get stream from API
          const stream = await chatService.sendMessageWithMemoryStream(chatMessage);
          
          // Set up stream reading
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';
          let sessionInfo: any = null;
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Stream ended, add the complete message
              get().addMessage({ 
                content: fullResponse, 
                role: 'assistant',
                session_id: sessionInfo?.session_id
              });
              
              // Update session info if available
              if (sessionInfo) {
                const prevSessionId = get().currentSessionId;
                set({
                  currentSessionId: sessionInfo.session_id,
                  messageCount: sessionInfo.message_count,
                  isNewConversation: sessionInfo.is_new_conversation
                });
                
                // If we got a new session ID and messages are empty, load history
                if (sessionInfo.session_id !== prevSessionId && get().messages.length <= 2) {
                  try {
                    await get().loadConversationHistory(sessionInfo.session_id);
                  } catch (error) {
                    console.error('Failed to load session history:', error);
                  }
                }
              }
              
              // Clear streaming state
              set({ 
                isLoading: false,
                isStreaming: false, 
                streamingMessage: '' 
              });
              break;
            }
            
            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                const jsonData = line.replace('data: ', '').trim();
                
                // Handle [DONE] message
                if (jsonData === '[DONE]') {
                  continue;
                }
                
                try {
                  const data = JSON.parse(jsonData);
                  
                  if (data.type === 'content' && !data.done) {
                    fullResponse += data.content;
                    
                    // Only set loading to false once we start getting content
                    if (fullResponse.length > 0) {
                      set({ isLoading: false });
                    }
                    
                    set({ streamingMessage: fullResponse });
                  } else if (data.type === 'complete' || data.type === 'session_info') {
                    // Store session info for later use
                    if (data.session_id) {
                      sessionInfo = data;
                    }
                    // Use the complete response from backend
                    if (data.formatted_response) {
                      fullResponse = data.formatted_response;
                    }
                    set({ isLoading: false });
                  }
                } catch (e) {
                  console.warn('Failed to parse JSON line:', line, e);
                }
              }
            }
          }
          
        } catch (error) {
          console.error('Memory streaming error:', error);
          
          // Fallback to regular memory API if streaming fails
          try {
            await get().sendMessageWithMemory(messageText, startNew);
          } catch (fallbackError) {
            console.error('Fallback memory API also failed:', fallbackError);
            set({ 
              error: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
            });
            
            get().addMessage({ 
              content: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.', 
              role: 'assistant' 
            });
          }
          
          set({ 
            isLoading: false,
            isStreaming: false,
            streamingMessage: ''
          });
        }
      },

      startNewConversation: () => {
        set({
          messages: [],
          currentSessionId: null,
          messageCount: 0,
          isNewConversation: true,
          streamingMessage: '',
          error: null
        });
      },

      continueConversation: (sessionId: string) => {
        set({
          currentSessionId: sessionId,
          isNewConversation: false,
          error: null
        });
      },

      loadConversationHistory: async (sessionId: string) => {
        try {
          set({ isLoading: true, error: null });
          console.log(`🔄 Loading conversation history for session: ${sessionId}`);
          
          const response = await conversationService.getConversationHistory(sessionId);
          console.log(`📥 Received history response:`, response);
          
          if (response && response.messages && response.messages.length > 0) {
            // Convert API history format to our message format
            const messages: ConversationMessage[] = [];
            
            response.messages.forEach((item: any, index: number) => {
              // Add user message (question)
              if (item.question) {
                messages.push({
                  id: `${sessionId}-${index}-q`,
                  content: item.question,
                  role: 'user',
                  timestamp: new Date(item.timestamp),
                  session_id: sessionId
                });
              }
              
              // Add assistant message (answer)
              if (item.answer) {
                messages.push({
                  id: `${sessionId}-${index}-a`,
                  content: item.answer,
                  role: 'assistant',
                  timestamp: new Date(item.timestamp),
                  session_id: sessionId
                });
              }
            });

            set({ 
              messages,
              currentSessionId: sessionId,
              messageCount: response.message_count || messages.length / 2,
              isNewConversation: false,
              isLoading: false
            });
            
            console.log(`✅ Loaded ${messages.length} messages (${response.messages.length} exchanges) for session ${sessionId}`);
          } else {
            // No history found, but session exists
            set({
              messages: [],
              currentSessionId: sessionId,
              messageCount: 0,
              isNewConversation: false,
              isLoading: false
            });
            
            console.log(`ℹ️ No history found for session ${sessionId}`);
          }
        } catch (error) {
          console.error('❌ Error loading conversation history:', error);
          set({ 
            error: 'Konuşma geçmişi yüklenemedi',
            isLoading: false 
          });
        }
      },

      loadSessions: async () => {
        try {
          set({ isLoadingSessions: true });
          const sessions = await conversationService.getConversations();
          set({ sessions, isLoadingSessions: false });
        } catch (error) {
          console.error('Error loading sessions:', error);
          set({ 
            error: 'Oturumlar yüklenemedi',
            isLoadingSessions: false 
          });
        }
      },

      closeConversation: async (sessionId: string, summary?: string) => {
        try {
          await conversationService.closeConversation(sessionId, summary);
          
          // Remove from sessions list
          const { sessions } = get();
          const updatedSessions = sessions.filter(s => s.session_id !== sessionId);
          set({ sessions: updatedSessions });
          
          // If current session is being closed, start new conversation
          if (get().currentSessionId === sessionId) {
            get().startNewConversation();
          }
        } catch (error) {
          console.error('Error closing conversation:', error);
          set({ error: 'Konuşma kapatılamadı' });
        }
      },

      cleanupOldConversations: async (daysOld = 30, inactiveDays = 7) => {
        try {
          await conversationService.cleanupConversations(daysOld, inactiveDays);
          // Reload sessions to reflect changes
          await get().loadSessions();
        } catch (error) {
          console.error('Error cleaning up conversations:', error);
          set({ error: 'Eski konuşmalar temizlenemedi' });
        }
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      clearError: () => {
        set({ error: null });
              },

        loadHistoryForCurrentSession: async () => {
          const { currentSessionId } = get();
          if (currentSessionId && get().messages.length === 0) {
            try {
              console.log(`🔄 Loading history for current session: ${currentSessionId}`);
              await get().loadConversationHistory(currentSessionId);
            } catch (error) {
              console.error('Error loading history for current session:', error);
              set({ error: 'Geçerli oturumun geçmişi yüklenemedi' });
            }
          }
        },

        // User session management functions
        loadMyConversations: async () => {
          try {
            set({ isLoadingMySessions: true, error: null });
            console.log(`🔄 Loading my conversations...`);
            
            const myConversations = await conversationService.getMyConversations();
            
            // Update current session info if we're continuing an existing session
            const { currentSessionId } = get();
            const currentSession = myConversations.find(c => c.session_id === currentSessionId);
            if (currentSession) {
              set({
                messageCount: currentSession.message_count,
                isNewConversation: false
              });
            }
            
            set({ 
              myConversations,
              isLoadingMySessions: false 
            });
            
            console.log(`✅ Loaded ${myConversations.length} my conversations`);
          } catch (error) {
            console.error('❌ Error loading my conversations:', error);
            set({ 
              error: 'Konuşmalarınız yüklenemedi',
              isLoadingMySessions: false 
            });
          }
        },

        deleteMySession: async (sessionId: string) => {
          try {
            console.log(`🗑️ Deleting my session: ${sessionId}`);
            
            await conversationService.deleteSession(sessionId);
            
            // Remove from myConversations list
            const { myConversations } = get();
            const updatedConversations = myConversations.filter(c => c.session_id !== sessionId);
            set({ myConversations: updatedConversations });
            
            // If current session is being deleted, start new conversation
            if (get().currentSessionId === sessionId) {
              get().startNewConversation();
            }
            
            console.log(`✅ Session deleted: ${sessionId}`);
          } catch (error) {
            console.error('❌ Error deleting session:', error);
            set({ error: 'Session silinemedi' });
          }
        },

        deleteAllMySessions: async () => {
          try {
            console.log(`🗑️ Deleting all my sessions...`);
            
            await conversationService.deleteAllMySessions(true);
            
            // Clear myConversations list
            set({ myConversations: [] });
            
            // Start new conversation since all sessions are deleted
            get().startNewConversation();
            
            console.log(`✅ All sessions deleted`);
          } catch (error) {
            console.error('❌ Error deleting all sessions:', error);
            set({ error: 'Tüm session\'lar silinemedi' });
          }
        },

        switchToSession: async (sessionId: string) => {
          try {
            console.log(`🔄 Switching to session: ${sessionId}`);
            
            // Load conversation history for the selected session
            await get().loadConversationHistory(sessionId);
            
            console.log(`✅ Switched to session: ${sessionId}`);
          } catch (error) {
            console.error('❌ Error switching to session:', error);
            set({ error: 'Session\'a geçilemedi' });
          }
        },

        // Initialize store - check if we have persisted session
        initializeStore: () => {
          const { currentSessionId } = get();
          console.log(`🔧 Initializing conversation store, currentSessionId: ${currentSessionId}`);
          
          if (currentSessionId && get().messages.length === 0) {
            console.log(`📥 Found persisted session, loading history...`);
            get().loadHistoryForCurrentSession();
          }
          
          // Load user's conversations
          get().loadMyConversations();
        },
    }),
    {
      name: 'conversation-storage',
      partialize: (state) => ({ 
        currentSessionId: state.currentSessionId,
        messageCount: state.messageCount,
        isNewConversation: state.isNewConversation,
        messages: state.messages // Persist messages too
      }),
    }
  )
); 