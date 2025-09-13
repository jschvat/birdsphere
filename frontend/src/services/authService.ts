/**
 * Authentication Service Module
 * 
 * Provides a comprehensive authentication API service layer that abstracts
 * all authentication-related HTTP operations and implements advanced caching
 * strategies for optimal performance and user experience.
 */

import api from './api';
import { User, LoginCredentials, RegisterData } from '../types';

/**
 * Authentication Response Interface
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Authentication cache for storing user data temporarily
 */
let authCache: { user: User | null; timestamp: number } | null = null;

/** Cache duration in milliseconds (30 seconds) */
const CACHE_DURATION = 30000;

/**
 * Authentication Service Object
 */
export const authService = {
  /**
   * User Login Method
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const { user, token } = response.data;
    
    authCache = null;
    
    return { user, token };
  },

  /**
   * User Registration Method
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    const { user, token } = response.data;
    
    authCache = null;
    
    return { user, token };
  },

  /**
   * User Logout Method
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
      authCache = null;
    } catch (error) {
      console.error('Logout error:', error);
      authCache = null;
    }
  },

  /**
   * Get User Profile Method
   */
  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  /**
   * Update User Profile Method
   */
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await api.put('/auth/profile', userData);
    const updatedUser = response.data.user;
    
    authCache = null;
    
    return updatedUser;
  },

  /**
   * Check Authentication Status Method
   */
  async checkAuthentication(): Promise<User | null> {
    try {
      if (authCache && Date.now() - authCache.timestamp < CACHE_DURATION) {
        return authCache.user;
      }
      
      const user = await this.getProfile();
      
      authCache = {
        user,
        timestamp: Date.now()
      };
      
      return user;
    } catch (error) {
      authCache = {
        user: null,
        timestamp: Date.now()
      };
      
      return null;
    }
  },

  /**
   * Get Current User Method (DEPRECATED)
   */
  getCurrentUser(): User | null {
    return null;
  },

  /**
   * Get Authentication Token Method (DEPRECATED)
   */
  getToken(): string | null {
    return null;
  },

  /**
   * Check Authentication Status Method (DEPRECATED)
   */
  isAuthenticated(): boolean {
    return false;
  }
};