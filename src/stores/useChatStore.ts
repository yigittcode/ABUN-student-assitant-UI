import { create } from 'zustand';
import type { ChatHistoryItem, ChatMessage, ChatResponse } from '../types';
import { chatService } from '../services/api';
import { flushSync } from 'react-dom';

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
      let hasAddedFinalMessage = false;
      let animationFrameId: number | null = null;
      
      // Helper function to decode escape sequences
      const decodeEscapeSequences = (str: string): string => {
        return str
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => 
            String.fromCharCode(parseInt(code, 16))
          )
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      };
      
      // Smooth update function using requestAnimationFrame
      const smoothUpdate = (content: string) => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
          set({ streamingMessage: content });
          animationFrameId = null;
        });
      };
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Final update with complete content
          const finalContent = decodeEscapeSequences(fullResponse);
          set({ streamingMessage: finalContent });
          
          // Ensure final message is added only once
          if (finalContent.trim() && !hasAddedFinalMessage) {
            get().addMessage({ 
              content: finalContent, 
              role: 'assistant' 
            });
            hasAddedFinalMessage = true;
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
        
        // Split by lines and process each line
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) continue;
          
          // Handle SSE format: "data: {...}"
          if (trimmedLine.startsWith('data: ')) {
            const jsonData = trimmedLine.substring(6); // Remove "data: " prefix
            
            // Handle [DONE] message
            if (jsonData === '[DONE]') {
              continue;
            }
            
            try {
              const data = JSON.parse(jsonData);
              
              // Handle content chunks
              if (data.type === 'content' && data.content !== undefined && !data.done) {
                // Check if content is double-encoded JSON string
                let actualContent = data.content;
                
                // Try to parse content as JSON if it's a string containing JSON
                if (typeof data.content === 'string' && data.content.includes('"type":')) {
                  try {
                    const parsedContent = JSON.parse(data.content);
                    if (parsedContent.type === 'content' && parsedContent.content !== undefined) {
                      actualContent = parsedContent.content;
                    }
                  } catch (e) {
                    // If parsing fails, use the original content
                    actualContent = data.content;
                  }
                }
                
                // Skip if actualContent looks like raw JSON
                if (typeof actualContent === 'string' && actualContent.startsWith('{"type"')) {
                  continue;
                }
                
                fullResponse += actualContent;
                
                // Only set loading to false once we start getting content
                if (fullResponse.length > 0) {
                  set({ isLoading: false });
                }
                
                // Update streaming message immediately with smooth animation
                smoothUpdate(decodeEscapeSequences(fullResponse));
              } 
              // Handle completion
              else if (data.type === 'complete' && data.done) {
                // Use the complete response if provided, otherwise use accumulated response
                if (data.full_response) {
                  // Check if full_response is double-encoded JSON string
                  let actualResponse = data.full_response;
                  
                  // Try to parse full_response as JSON if it contains streaming data
                  if (typeof data.full_response === 'string' && data.full_response.includes('"type":')) {
                    try {
                      // This might be a concatenated JSON string, try to extract the actual response
                      const regex = /"full_response":\s*"([^"]*(?:\\.[^"]*)*)"/;
                      const match = data.full_response.match(regex);
                      if (match && match[1]) {
                        // Decode the escaped string
                        actualResponse = decodeEscapeSequences(match[1]);
                      }
                    } catch (e) {
                      // If parsing fails, use the original response
                      actualResponse = data.full_response;
                    }
                  }
                  
                  fullResponse = actualResponse;
                }
                
                // Don't add message here, let the done handler do it
                set({ isLoading: false });
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming JSON:', jsonData, parseError);
              // Continue processing other lines
            }
          }
          // Handle lines that don't start with "data: " (might be direct JSON)
          else if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
            try {
              const data = JSON.parse(trimmedLine);
              
              if (data.type === 'content' && data.content !== undefined && !data.done) {
                // Check if content is double-encoded JSON string
                let actualContent = data.content;
                
                // Try to parse content as JSON if it's a string containing JSON
                if (typeof data.content === 'string' && data.content.includes('"type":')) {
                  try {
                    const parsedContent = JSON.parse(data.content);
                    if (parsedContent.type === 'content' && parsedContent.content !== undefined) {
                      actualContent = parsedContent.content;
                    }
                  } catch (e) {
                    // If parsing fails, use the original content
                    actualContent = data.content;
                  }
                }
                
                // Skip if actualContent looks like raw JSON
                if (typeof actualContent === 'string' && actualContent.startsWith('{"type"')) {
                  continue;
                }
                
                fullResponse += actualContent;
                
                if (fullResponse.length > 0) {
                  set({ isLoading: false });
                }
                
                // Update streaming message immediately with smooth animation
                smoothUpdate(decodeEscapeSequences(fullResponse));
              } 
              else if (data.type === 'complete' && data.done) {
                if (data.full_response) {
                  // Check if full_response is double-encoded JSON string
                  let actualResponse = data.full_response;
                  
                  // Try to parse full_response as JSON if it contains streaming data
                  if (typeof data.full_response === 'string' && data.full_response.includes('"type":')) {
                    try {
                      // This might be a concatenated JSON string, try to extract the actual response
                      const regex = /"full_response":\s*"([^"]*(?:\\.[^"]*)*)"/;
                      const match = data.full_response.match(regex);
                      if (match && match[1]) {
                        // Decode the escaped string
                        actualResponse = decodeEscapeSequences(match[1]);
                      }
                    } catch (e) {
                      // If parsing fails, use the original response
                      actualResponse = data.full_response;
                    }
                  }
                  
                  fullResponse = actualResponse;
                }
                
                // Don't add message here, let the done handler do it
                set({ isLoading: false });
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse direct JSON:', trimmedLine, parseError);
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