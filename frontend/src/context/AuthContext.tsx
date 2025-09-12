import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthContext - Checking authentication status...');
        
        // Only check authentication if we're not on the login page
        // This prevents unnecessary API calls that would trigger 401 responses
        if (window.location.pathname === '/login') {
          console.log('AuthContext - On login page, skipping auth check');
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // Try to get current user profile using httpOnly cookie
        const currentUser = await authService.checkAuthentication();
        
        if (currentUser) {
          console.log('AuthContext - User authenticated:', currentUser);
          setUser(currentUser);
        } else {
          console.log('AuthContext - User not authenticated');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
        // Don't redirect here - let the axios interceptor handle it
      } finally {
        setIsLoading(false);
        console.log('AuthContext - Initialization complete, isLoading set to false');
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setIsLoading(true);
      const { user } = await authService.login(credentials);
      setUser(user);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setError(null);
      setIsLoading(true);
      const { user } = await authService.register(userData);
      setUser(user);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      // Force clear all user state
      setUser(null);
      setError(null);
      console.log('AuthContext - User logged out, state cleared');
    } catch (err) {
      console.error('Logout error:', err);
      // Even if logout fails, clear local state
      setUser(null);
      setError(null);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      setError(null);
      const updatedUser = await authService.updateProfile(userData);
      setUser(updatedUser);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Profile update failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.checkAuthentication();
      if (currentUser) {
        console.log('AuthContext - User data refreshed:', currentUser);
        setUser(currentUser);
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};