import { create } from 'zustand';
import { SystemUser } from '@/types';

interface AuthState {
  user: SystemUser | null;
  isAuthenticated: boolean;
  login: (user: SystemUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
