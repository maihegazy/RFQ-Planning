// web/src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const checkAuth = useCallback(async () => {
    // Prevent multiple simultaneous auth checks
    if (initialized) return;
    
    try {
      console.log('Checking authentication...');
      const response = await api.get('/auth/me');
      console.log('Auth successful:', response.data);
      setUser(response.data.user);
    } catch (error) {
      console.log('Auth check failed (expected if not logged in):', error.response?.status);
      // 401 is expected when not logged in
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [initialized]);

  useEffect(() => {
    checkAuth();
  }, []); // Only run once on mount

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Redirect to login
      window.location.href = '/login';
    }
  };

  const acceptInvite = async (token, password) => {
    const response = await api.post('/auth/accept-invite', { token, password });
    setUser(response.data.user);
    return response.data;
  };

  const hasFinancialAccess = () => {
    return ['ADMIN', 'DELIVERY_MANAGER', 'GENERAL_MANAGER', 'ENGINEERING_MANAGER'].includes(user?.role);
  };

  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };

  const isManagement = () => {
    return ['ADMIN', 'DELIVERY_MANAGER', 'GENERAL_MANAGER', 'ENGINEERING_MANAGER'].includes(user?.role);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    acceptInvite,
    hasFinancialAccess,
    isAdmin,
    isManagement,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};