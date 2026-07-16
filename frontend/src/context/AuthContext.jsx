import React, { createContext, useState, useEffect, useContext } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await client.get('/auth/profile/');
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await client.post('/auth/login/', { username, password });
    const { access, refresh } = res.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    
    // Fetch user details after login
    const profileRes = await client.get('/auth/profile/');
    setUser(profileRes.data);
    return profileRes.data;
  };

  const register = async (username, email, password) => {
    const res = await client.post('/auth/register/', { username, email, password });
    return res.data;
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try {
        await client.post('/auth/logout/', { refresh });
      } catch (err) {
        console.error('Logout request error:', err);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const applyForMentor = async (bio) => {
    const res = await client.post('/auth/mentor-apply/', { bio });
    return res.data;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    fetchProfile,
    applyForMentor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
