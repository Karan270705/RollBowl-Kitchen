import { create } from 'zustand';
import { User } from '@/src/types/models';
import { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  token: string | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;

  setSession: (session: Session | null, user: User | null) => void;
  setInitializing: (isInit: boolean) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,

  setSession: (session, user) => {
    set({
      session,
      user,
      isAuthenticated: !!session,
      token: session?.access_token || null,
    });
  },

  setInitializing: (isInitializing) => set({ isInitializing }),

  logout: () =>
    set({
      user: null,
      token: null,
      session: null,
      isAuthenticated: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}));

// Selector hooks
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
