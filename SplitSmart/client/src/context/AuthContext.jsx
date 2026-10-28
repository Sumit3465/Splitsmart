import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('splitsmart_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('splitsmart_token');
      if (storedToken) {
        try {
          const userData = await api.auth.getMe();
          setUser(userData);
          setToken(storedToken);
        } catch (err) {
          console.warn('Session expired or token invalid. Clearing credentials.');
          localStorage.removeItem('splitsmart_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('splitsmart_token', data.token);
    setUser({ _id: data._id, name: data.name, email: data.email });
    setToken(data.token);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.auth.register({ name, email, password });
    localStorage.setItem('splitsmart_token', data.token);
    setUser({ _id: data._id, name: data.name, email: data.email });
    setToken(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('splitsmart_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: Boolean(user) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
