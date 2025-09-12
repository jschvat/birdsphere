/**
 * Authentication Service Module
 * 
 * Provides a comprehensive authentication API service layer that abstracts
 * all authentication-related HTTP operations and implements advanced caching
 * strategies for optimal performance and user experience.
 * 
 * Architecture Features:
 * - Service layer pattern separating API logic from components
 * - Smart caching with TTL to reduce redundant server calls
 * - Secure httpOnly cookie-based authentication (no localStorage)
 * - Comprehensive error handling and state management
 * - Backward compatibility with deprecated methods
 * - TypeScript integration for type safety
 * 
 * Security Considerations:
 * - Uses httpOnly cookies preventing XSS token theft
 * - No client-side token storage
 * - Automatic cookie management by browser/server
 * - Cache invalidation on authentication state changes
 * - Graceful handling of authentication failures
 * 
 * Performance Optimizations:
 * - Request caching with configurable TTL
 * - Cache invalidation on state changes
 * - Minimal redundant authentication checks
 * - Efficient cache lookup and update strategies
 * 
 * Cache Strategy:
 * - 30-second cache duration for authentication checks
 * - Automatic cache invalidation on login/logout/profile updates
 * - Caches both successful and failed authentication attempts
 * - Memory-efficient single-user cache implementation
 * 
 * @fileoverview Authentication service with advanced caching and security features
 * @author Birdsphere Development Team
 */

import api from './api';
import { User, LoginCredentials, RegisterData } from '../types';

/**
 * Authentication Response Interface
 * 
 * Defines the structure of successful authentication responses from the server.
 * Used by login and register methods to ensure type safety and consistent
 * response handling across the application.
 * 
 * @interface AuthResponse
 */
export interface AuthResponse {
  /** Authenticated user object with profile information */
  user: User;
  
  /** JWT token (included for compatibility, stored in httpOnly cookies) */
  token: string;
}

/**
 * Authentication Cache Implementation
 * 
 * Simple in-memory cache to prevent redundant authentication checks.
 * Stores the last authentication result with timestamp for TTL validation.
 * 
 * Cache Structure:
 * - user: Last fetched user object (null if unauthenticated)
 * - timestamp: When the cache entry was created
 * 
 * Benefits:
 * - Reduces server load from repeated auth checks
 * - Improves app responsiveness
 * - Handles both authenticated and unauthenticated states
 * 
 * Security: Cache is cleared on any auth state change to prevent stale data
 */
let authCache: { user: User | null; timestamp: number } | null = null;

/** Cache duration in milliseconds (30 seconds) */
const CACHE_DURATION = 30000;

/**
 * Authentication Service Object
 * 
 * Main service object containing all authentication-related methods.
 * Implements the service layer pattern to abstract API calls from components
 * and provide a clean, consistent interface for authentication operations.
 * 
 * Methods are organized by functionality:
 * - Authentication: login, register, logout
 * - Profile Management: getProfile, updateProfile
 * - State Checking: checkAuthentication
 * - Legacy Support: deprecated methods for backward compatibility
 */
export const authService = {
  /**
   * User Login Method
   * 
   * Authenticates user with provided credentials and establishes secure session.
   * Uses httpOnly cookies for token storage, providing enhanced security against
   * XSS attacks. Automatically invalidates cache to ensure fresh state.
   * 
   * Security Features:
   * - Credentials sent over HTTPS only
   * - JWT tokens stored in httpOnly cookies
   * - No client-side token storage
   * - Automatic session establishment
   * 
   * Cache Management:
   * - Clears existing cache on successful login
   * - Ensures fresh authentication state
   * - Prevents stale user data
   * 
   * @param {LoginCredentials} credentials - User login credentials (email/username, password)
   * @returns {Promise<AuthResponse>} Promise resolving to user data and token info
   * @throws {Error} Authentication failure with server error details
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Send authentication request to server
    const response = await api.post('/auth/login', credentials);
    const { user, token } = response.data;
    
    // Cache invalidation: Clear cache after successful login
    authCache = null;
    
    // Security: Cookies are handled automatically by browser/server
    // No client-side storage needed or wanted for security reasons
    return { user, token };
  },

  /**
   * User Registration Method
   * 
   * Creates new user account and automatically establishes authenticated session.
   * Handles comprehensive user data validation on server side and returns
   * complete user profile information upon successful registration.
   * 
   * Registration Flow:
   * 1. Send user data to server for validation and creation
   * 2. Server validates data and creates account
   * 3. Server automatically logs in new user
   * 4. Client receives user data and establishes session
   * 5. Cache is cleared for fresh state
   * 
   * Security Features:
   * - Server-side validation and sanitization
   * - Password hashing handled on server
   * - Automatic secure session establishment
   * - httpOnly cookie authentication
   * 
   * @param {RegisterData} userData - New user registration information
   * @returns {Promise<AuthResponse>} Promise resolving to user data and token info
   * @throws {Error} Registration failure with validation error details
   */
  async register(userData: RegisterData): Promise<AuthResponse> {
    // Send registration request with user data
    const response = await api.post('/auth/register', userData);
    const { user, token } = response.data;
    
    // Cache invalidation: Clear cache after successful registration
    authCache = null;
    
    // Security: Session cookies are handled automatically
    // New user is automatically logged in upon registration
    return { user, token };
  },

  /**
   * User Logout Method
   * 
   * Securely terminates user session by invalidating server-side session
   * and clearing authentication cookies. Implements defensive programming
   * by clearing cache even if server logout fails.
   * 
   * Logout Process:
   * 1. Send logout request to server
   * 2. Server invalidates session and clears httpOnly cookies
   * 3. Client clears authentication cache
   * 4. User is effectively logged out
   * 
   * Error Handling:
   * - Logs server errors for debugging
   * - Clears cache regardless of server response
   * - Prevents hanging authentication state
   * - Graceful degradation if server unavailable
   * 
   * Security Features:
   * - Server-side session invalidation
   * - Cookie clearing handled by server
   * - No client-side secrets to clear
   * - Defense against logout failures
   * 
   * @returns {Promise<void>} Promise that resolves when logout process completes
   */
  async logout(): Promise<void> {
    try {
      // Send logout request to server for session invalidation
      await api.post('/auth/logout');
      
      // Clear authentication cache
      authCache = null;
      
      // Security: httpOnly cookies are cleared by server response
    } catch (error) {
      // Log error for debugging purposes
      console.error('Logout error:', error);
      
      // Defensive programming: Clear cache even if server logout fails
      // This prevents lingering authentication state in case of network issues
      authCache = null;
    }
  },

  /**
   * Get User Profile Method
   * 
   * Fetches current user's profile information from the server.
   * Used internally by other methods and can be called directly
   * for fresh user data. Requires valid authentication.
   * 
   * Security:
   * - Requires valid httpOnly cookie authentication
   * - Server validates session before returning data
   * - Returns full user profile with sensitive fields filtered
   * 
   * Usage:
   * - Internal use by checkAuthentication
   * - Direct calls when fresh data needed
   * - Profile refresh operations
   * 
   * @returns {Promise<User>} Promise resolving to current user's profile data
   * @throws {Error} Authentication failure or server error
   */
  async getProfile(): Promise<User> {
    // Request user profile from authenticated endpoint
    const response = await api.get('/auth/profile');
    return response.data;
  },

  /**
   * Update User Profile Method
   * 
   * Updates user profile information on the server and returns the updated
   * user object. Supports partial updates (only changed fields need to be provided).
   * Automatically invalidates cache to ensure fresh state.
   * 
   * Update Process:
   * 1. Send partial user data to server
   * 2. Server validates and updates profile
   * 3. Server returns complete updated user object
   * 4. Cache is invalidated for consistency
   * 5. Updated user object returned to caller
   * 
   * Features:
   * - Partial updates (send only changed fields)
   * - Server-side validation and sanitization
   * - Automatic cache invalidation
   * - Complete user object returned
   * - Optimistic UI support through immediate return
   * 
   * Security:
   * - Requires valid authentication
   * - Server-side field validation
   * - Sensitive fields protected by server
   * 
   * @param {Partial<User>} userData - Partial user data with fields to update
   * @returns {Promise<User>} Promise resolving to complete updated user object
   * @throws {Error} Validation errors or authentication failure
   */
  async updateProfile(userData: Partial<User>): Promise<User> {
    // Send profile update request with partial data
    const response = await api.put('/auth/profile', userData);
    const updatedUser = response.data.user;
    
    // Cache invalidation: Clear cache after successful profile update
    // This ensures subsequent checkAuthentication calls get fresh data
    authCache = null;
    
    return updatedUser;
  },

  /**
   * Check Authentication Status Method
   * 
   * The primary method for determining user authentication status.
   * Implements intelligent caching to balance performance with data freshness.
   * This method is the foundation of the authentication system.
   * 
   * Authentication Check Process:
   * 1. Check if cached result is available and within TTL
   * 2. If cached, return cached user data (or null)
   * 3. If not cached or expired, query server for profile
   * 4. Cache the result (success or failure) with timestamp
   * 5. Return user data or null based on server response
   * 
   * Caching Strategy:
   * - Cache hit: Return immediate result (no server call)
   * - Cache miss: Query server and cache result
   * - Cache both successful and failed authentication
   * - 30-second TTL balances performance vs freshness
   * 
   * Error Handling:
   * - Network errors treated as unauthenticated
   * - Failed authentication cached to prevent spam
   * - Graceful degradation when server unavailable
   * 
   * Performance Benefits:
   * - Reduces redundant server calls
   * - Improves app responsiveness
   * - Prevents authentication check storms
   * - Minimal memory footprint
   * 
   * Security:
   * - Relies on httpOnly cookie validation
   * - No client-side token checking
   * - Server-side session validation
   * 
   * @returns {Promise<User | null>} Promise resolving to user object or null if unauthenticated
   */
  async checkAuthentication(): Promise<User | null> {
    try {
      // Performance optimization: Check cache first
      if (authCache && Date.now() - authCache.timestamp < CACHE_DURATION) {
        return authCache.user;
      }
      
      // Cache miss or expired: Query server for current user profile
      const user = await this.getProfile();
      
      // Cache successful authentication result
      authCache = {
        user,
        timestamp: Date.now()
      };
      
      return user;
    } catch (error) {
      // Cache failed authentication to prevent repeated server calls
      authCache = {
        user: null,
        timestamp: Date.now()
      };
      
      // Return null for unauthenticated state
      return null;
    }
  },

  /**
   * Get Current User Method (DEPRECATED)
   * 
   * Legacy method maintained for backward compatibility.
   * 
   * @deprecated Use checkAuthentication() instead for proper async authentication checking
   * 
   * Historical Context:
   * - Previously returned user data from localStorage
   * - localStorage storage was removed for security reasons
   * - httpOnly cookies cannot be accessed from JavaScript
   * 
   * Security Rationale:
   * - localStorage is vulnerable to XSS attacks
   * - httpOnly cookies provide better security
   * - Authentication state should be verified with server
   * 
   * Migration Path:
   * ```typescript
   * // Old way (deprecated)
   * const user = authService.getCurrentUser();
   * 
   * // New way (recommended)
   * const user = await authService.checkAuthentication();
   * ```
   * 
   * @returns {User | null} Always returns null in current implementation
   */
  getCurrentUser(): User | null {
    // DEPRECATED: This method always returns null
    // Use checkAuthentication() for proper async authentication checking
    return null;
  },

  /**
   * Get Authentication Token Method (DEPRECATED)
   * 
   * Legacy method maintained for backward compatibility.
   * 
   * @deprecated Tokens are now stored in httpOnly cookies and cannot be accessed from JavaScript
   * 
   * Historical Context:
   * - Previously returned JWT token from localStorage
   * - localStorage token storage was removed for security
   * - Tokens are now stored in httpOnly cookies
   * 
   * Security Improvements:
   * - httpOnly cookies cannot be accessed by JavaScript
   * - Prevents XSS token theft attacks
   * - Automatic cookie management by browser
   * - Server-side token validation only
   * 
   * Migration Path:
   * ```typescript
   * // Old way (deprecated)
   * const token = authService.getToken();
   * if (token) { /* user is authenticated */ }
   * 
   * // New way (recommended)
   * const user = await authService.checkAuthentication();
   * if (user) { /* user is authenticated */ }
   * ```
   * 
   * @returns {string | null} Always returns null in current implementation
   */
  getToken(): string | null {
    // DEPRECATED: Tokens are now stored in httpOnly cookies
    // Cannot be accessed from JavaScript for security reasons
    return null;
  },

  /**
   * Check Authentication Status Method (DEPRECATED)
   * 
   * Legacy synchronous authentication check method.
   * 
   * @deprecated Use checkAuthentication() instead for proper async authentication verification
   * 
   * Limitations of Synchronous Approach:
   * - Cannot verify httpOnly cookies from JavaScript
   * - No way to check server-side session validity
   * - Unreliable authentication state detection
   * - Potential for false positives/negatives
   * 
   * Why Async is Required:
   * - httpOnly cookies require server validation
   * - Network latency needs to be handled
   * - Server-side session state changes
   * - Proper error handling for network failures
   * 
   * Migration Path:
   * ```typescript
   * // Old way (deprecated)
   * if (authService.isAuthenticated()) {
   *   // Handle authenticated user
   * }
   * 
   * // New way (recommended)
   * const user = await authService.checkAuthentication();
   * if (user) {
   *   // Handle authenticated user
   * }
   * ```
   * 
   * @returns {boolean} Always returns false in current implementation
   */
  isAuthenticated(): boolean {
    // DEPRECATED: Cannot reliably check authentication status synchronously
    // with httpOnly cookies. Use checkAuthentication() instead.
    return false;
  }
};