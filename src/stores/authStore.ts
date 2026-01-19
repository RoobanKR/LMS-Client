import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: any;
  setToken: (token: string) => void;
  clearToken: () => void;
  verifyToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  isAuthenticated: false,
  user: null,

  setToken: (token) => {
    localStorage.setItem('smartcliff_token', token);
    const decoded = jwtDecode(token);
    set({ token, isAuthenticated: true, user: decoded });
  },

  clearToken: () => {
    localStorage.removeItem('smartcliff_token');
    set({ token: null, isAuthenticated: false, user: null });
  },

  verifyToken: async () => {
    const token = localStorage.getItem('smartcliff_token');
    if (!token) {
      get().clearToken();
      return false;
    }

    try {
      const { verifyToken } = await import('../apiServices/tokenVerify');
      await verifyToken(token);
      const decoded = jwtDecode(token);
      set({ token, isAuthenticated: true, user: decoded });
      return true;
    } catch (error) {
      get().clearToken();
      return false;
    }
  }
}));