import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
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