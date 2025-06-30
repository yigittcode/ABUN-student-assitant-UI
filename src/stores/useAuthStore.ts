import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest } from '../types';
import { authService } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          const user: User = {
            email: response.email,
            token: response.access_token,
            isAuthenticated: true,
          };
          
          localStorage.setItem('token', response.access_token);
          set({ user, isLoading: false });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, error: null });
      },

      clearError: () => {
        set({ error: null });
      },

      initializeAuth: () => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('auth-storage');
        
        if (token && userData) {
          try {
            const { state } = JSON.parse(userData);
            if (state?.user) {
              set({ user: state.user });
            }
          } catch (error) {
            console.error('Failed to initialize auth:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('auth-storage');
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
); 