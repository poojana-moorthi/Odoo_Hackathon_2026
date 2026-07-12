import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const API_URL = 'http://localhost:5000/api';

// Create a custom axios instance
export const api = axios.create({
  baseURL: API_URL
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('transitops_token'));
  const [loading, setLoading] = useState(true);

  // Set up axios request interceptor to append JWT token
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, [token]);

  // Set up axios response interceptor to handle auto logout on 401/403
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Skip auto-logout only if we are currently trying to login
          const isLoginRequest = error.config.url.endsWith('/auth/login');
          if (!isLoginRequest) {
            console.warn('Session expired or unauthorized. Logging out...');
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Validate token on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Session validation failed:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = res.data;
      
      localStorage.setItem('transitops_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (err) {
      console.error('Login request failed:', err);
      const msg = err.response?.data?.message || 'Login failed. Please check connection.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('transitops_token');
    setToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to change password.' 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, changePassword, setToken, setUser }}>
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
