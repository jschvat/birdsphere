/**
 * Authentication Service Module
 *
 * Comprehensive authentication API service layer providing secure user authentication,
 * session management, and profile operations with advanced caching and concurrency control.
 *
 * Core Responsibilities:
 * - User authentication (login, register, logout) with httpOnly cookie sessions
 * - User profile management and updates with optimistic caching
 * - Authentication state verification with intelligent cache invalidation
 * - Concurrent request deduplication to prevent multiple auth checks
 * - Secure session handling without client-side token storage
 *
 * Architecture:
 * - Cookie-based authentication for enhanced security
 * - In-memory caching with configurable TTL for performance
 * - Promise-based concurrency control for authentication checks
 * - Automatic cache invalidation on state changes
 * - Service layer abstraction for consistent API interactions
 * - Error handling with graceful degradation
 *
 * Security Features:
 * - No client-side token storage (httpOnly cookies only)
 * - Automatic session cleanup on logout
 * - Cache invalidation on profile updates
 * - Concurrent request protection against race conditions
 * - Secure credential handling without exposure to client code
 *
 * Caching Strategy:
 * - 30-second cache TTL for authentication state
 * - Immediate cache invalidation on state changes
 * - Single-flight pattern for concurrent authentication checks
 * - Memory-efficient cache with timestamp validation
 * - Automatic cleanup on service operations
 *
 * Integration Points:
 * - AuthContext for React state management integration
 * - API service for HTTP operations and interceptors
 * - User profile components for data display
 * - Protected routes for authentication gating
 * - Session persistence across browser refreshes
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

/** Flag to prevent multiple simultaneous authentication checks */
let isCheckingAuth = false;

/** Promise to store the ongoing authentication check */
let authCheckPromise: Promise<User | null> | null = null;

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
    console.log('🔍 authService.getProfile response:', response.data);
    console.log('🐾 authService.getProfile animalInterests:', response.data.animalInterests);
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
   * Force Cache Clear Method
   */
  clearCache(): void {
    authCache = null;
    authCheckPromise = null;
    isCheckingAuth = false;
  },

  /**
   * Check Authentication Status Method
   */
  async checkAuthentication(): Promise<User | null> {
    try {
      // Check cache first
      if (authCache && Date.now() - authCache.timestamp < CACHE_DURATION) {
        console.log('🚀 Auth: Using cached result');
        return authCache.user;
      }

      // If already checking, wait for the existing promise
      if (isCheckingAuth && authCheckPromise) {
        console.log('⏳ Auth: Waiting for existing check to complete');
        return await authCheckPromise;
      }

      console.log('🔍 Auth: Starting new authentication check');
      isCheckingAuth = true;

      // Create and store the promise
      authCheckPromise = (async () => {
        try {
          const user = await this.getProfile();
          console.log('✅ Auth: Profile fetch successful');

          authCache = {
            user,
            timestamp: Date.now()
          };

          return user;
        } catch (error) {
          console.log('❌ Auth: Profile fetch failed', error);
          authCache = {
            user: null,
            timestamp: Date.now()
          };

          return null;
        }
      })();

      const result = await authCheckPromise;
      return result;
    } finally {
      isCheckingAuth = false;
      authCheckPromise = null;
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