import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  // Add other user properties as needed based on your JWT payload
}

interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  exp: number;
  iat: number;
  // Add other JWT payload properties as needed
}

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: User | null;
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
    const decoded = jwtDecode<JwtPayload>(token);
    set({ 
      token, 
      isAuthenticated: true, 
      user: {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    });
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
      const decoded = jwtDecode<JwtPayload>(token);
      set({ 
        token, 
        isAuthenticated: true, 
        user: {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role
        }
      });
      return true;
    } catch {
      get().clearToken();
      return false;
    }
  }
}));