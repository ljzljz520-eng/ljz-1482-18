import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { api } from '../api/client';
import type { UserProfile } from '../types';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  sessionExpired: boolean;
  authenticating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  markSessionExpired: () => void;
  clearExpiredFlag: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      sessionExpired: false,
      authenticating: false,
      login: async (email, password) => {
        set({ authenticating: true });
        try {
          const res = await api.post<{ token: string; user: UserProfile }>('/auth/login', { email, password });
          set({ token: res.data.token, user: res.data.user, sessionExpired: false, authenticating: false });
        } catch (error) {
          set({ authenticating: false });
          if (axios.isAxiosError(error)) throw new Error(error.response?.data?.message || '登录失败');
          throw error;
        }
      },
      logout: () => set({ token: null, user: null, sessionExpired: false }),
      markSessionExpired: () => set({ token: null, user: null, sessionExpired: true }),
      clearExpiredFlag: () => set({ sessionExpired: false })
    }),
    {
      name: 'creative-workbench-auth',
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
);
