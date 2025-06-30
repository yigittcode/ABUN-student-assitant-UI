import { create } from 'zustand';
import type { ChatHistoryItem, ChatMessage, ChatResponse } from '../types';
import { chatService } from '../services/api';

interface SimpleMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatState {
  messages: SimpleMessage[];
  isLoading: boolean;
  isTyping: boolean;
  streamingMessage: string;
  isStreaming: boolean;
  error: string | null;
  addMessage: (message: { content: string; role: 'user' | 'assistant' }) => void;
  sendMessage: (message: string) => Promise<void>;
  sendMessageStream: (message: string) => Promise<void>;
  loadChatHistory: () => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isTyping: false,
  streamingMessage: '',
  isStreaming: false,
  error: null,

  addMessage: (message) => {
    const newMessage: SimpleMessage = {
      id: Date.now().toString(),
      content: message.content,
      role: message.role,
      timestamp: new Date(),
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  sendMessage: async (messageText) => {
    // Use streaming instead of regular message
    await get().sendMessageStream(messageText);
  },

  sendMessageStream: async (messageText) => {
    set({ isLoading: true, isStreaming: true, error: null, streamingMessage: '' });

    // Add user message immediately
    get().addMessage({ content: messageText, role: 'user' });

    try {
      const chatMessage: ChatMessage = { message: messageText };
      
      // Get stream from API
      const stream = await chatService.sendMessageStream(chatMessage);
      
      // Set up stream reading
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      // Keep loading true until we get substantial content
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Stream ended, add the complete message
          get().addMessage({ 
            content: fullResponse, 
            role: 'assistant' 
          });
          
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
                
                set((state) => ({
                  streamingMessage: fullResponse
                }));
              } else if (data.type === 'complete') {
                // Use the complete response from backend
                fullResponse = data.formatted_response || fullResponse;
                set({ isLoading: false });
                break;
              }
            } catch (e) {
              console.warn('Failed to parse JSON line:', line, e);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Streaming error:', error);
      
      // Fallback to regular API if streaming fails
      try {
        const response = await chatService.sendMessage({ message: messageText });
        get().addMessage({ 
          content: response.response, 
          role: 'assistant' 
        });
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
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
    } finally {
      // Final cleanup to ensure states are reset
      set({ 
        isLoading: false,
        isStreaming: false
      });
    }
  },

  loadChatHistory: async () => {
    try {
      const response = await chatService.getChatHistory();
      const formattedMessages: SimpleMessage[] = response.map((item) => [
        {
          id: `${item.id}-user`,
          content: item.message,
          role: 'user' as const,
          timestamp: new Date(item.timestamp),
        },
        {
          id: `${item.id}-assistant`,
          content: item.response,
          role: 'assistant' as const,
          timestamp: new Date(item.timestamp),
        },
      ]).flat();

      set({ messages: formattedMessages });
    } catch (error) {
      console.error('Error loading chat history:', error);
      set({ error: 'Chat geçmişi yüklenemedi' });
    }
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  clearError: () => {
    set({ error: null });
  },
})); 