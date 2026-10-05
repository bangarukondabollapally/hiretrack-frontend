import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axiosInstance, { setUnauthenticatedCallback } from '../api/axiosInstance';
import { clearAllQueryCache } from '../api/queries';

const AuthContext = createContext(null);

export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const atobFn = typeof atob === 'function' ? atob : (str) => Buffer.from(str, 'base64').toString('binary');
    const jsonPayload = decodeURIComponent(
      atobFn(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    // Check expiration
    if (parsed.exp && parsed.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      userId: parsed.userId || parsed.id || parsed.sub,
      email: parsed.sub || parsed.email,
      role: parsed.role || 'USER',
      exp: parsed.exp,
    };
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    const stored = sessionStorage.getItem('ht_token') || sessionStorage.getItem('token');
    const valid = parseJwt(stored);
    if (stored && !valid) {
      sessionStorage.removeItem('ht_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('ht_user');
      return null;
    }
    return stored || null;
  });

  const [authNotice, setAuthNotice] = useState(null);

  // Derive user identity synchronously from token — SINGLE SOURCE OF TRUTH
  const user = parseJwt(token);
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const role = user?.role || 'USER';

  // Keep a ref to token for cleanup handlers
  const tokenRef = useRef(token);
  useEffect(() => {
    tokenRef.current = token;
    if (token) {
      sessionStorage.setItem('ht_token', token);
    } else {
      sessionStorage.removeItem('ht_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('ht_user');
    }
  }, [token]);

  // Set up request interceptor & 401 callback for Axios
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.request.use(
      (config) => {
        const activeToken = sessionStorage.getItem('ht_token') || tokenRef.current;
        if (activeToken) {
          config.headers.Authorization = `Bearer ${activeToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    setUnauthenticatedCallback(() => {
      clearAllQueryCache();
      setTokenState(null);
      setAuthNotice('Session expired. Please sign in again.');
    });

    return () => {
      axiosInstance.interceptors.request.eject(interceptor);
    };
  }, []);

  const login = (authData) => {
    clearAllQueryCache();
    setAuthNotice(null);
    setTokenState(authData.token);
  };

  const logout = () => {
    clearAllQueryCache();
    setAuthNotice(null);
    setTokenState(null);
    sessionStorage.removeItem('ht_token');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('ht_user');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        role,
        authNotice,
        clearAuthNotice: () => setAuthNotice(null),
        authReady: true, // Hydration is 100% synchronous
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
