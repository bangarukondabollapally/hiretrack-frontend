import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { clearChatHistory } from '../assistant/useChatHistory';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ht_token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('ht_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  // Keep a ref to the current user id so logout() can clear the right key
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('ht_token', token);
    } else {
      localStorage.removeItem('ht_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('ht_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ht_user');
    }
  }, [user]);

  // Set up request interceptor for Axios
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axiosInstance.interceptors.request.eject(interceptor);
    };
  }, [token]);

  const login = (authData) => {
    setToken(authData.token);
    setUser({ userId: authData.userId, email: authData.email });
  };

  const logout = () => {
    // Clear this user's chat history before wiping the user reference
    clearChatHistory(userRef.current?.userId);
    setToken(null);
    setUser(null);
    localStorage.removeItem('ht_token');
    localStorage.removeItem('ht_user');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
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
