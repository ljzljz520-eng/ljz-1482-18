import { create } from "zustand";
import { api } from "@/api";
import { TOKEN_KEY } from "@/api/client";
import type { UserInfo } from "@/api/types";

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  initializing: boolean;
  setSession: (token: string, user: UserInfo) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  initializing: true,

  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },

  hydrate: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ initializing: false, user: null });
      return;
    }
    try {
      const user = await api.me();
      set({ user, token, initializing: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, initializing: false });
    }
  }
}));
