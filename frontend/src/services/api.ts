/**
 * Axios HTTP Client Configuration
 * 
 * Centralized HTTP client setup with comprehensive security, error handling,
 * and authentication integration. This module configures Axios with proper
 * CORS settings, cookie-based authentication, request/response interceptors,
 * and automatic error handling.
 * 
 * Key Features:
 * - Cookie-based authentication (httpOnly cookies)
 * - Automatic credential inclusion for CORS requests
 * - Request and response interceptors for centralized handling
 * - Automatic authentication error handling and redirects
 * - Configurable timeouts and base URL
 * - Environment-based configuration
 * 
 * Security Features:
 * - Secure cookie handling with withCredentials
 * - Automatic 401 redirect to prevent unauthorized access
 * - No manual token management (handled by cookies)
 * - CORS-compliant credential handling
 * 
 * Architecture Benefits:
 * - Single source of truth for HTTP configuration
 * - Consistent error handling across the application
 * - Separation of concerns (HTTP logic vs business logic)
 * - Easy to mock for testing
 * - Environment-specific configuration support
 * 
 * @fileoverview Centralized Axios HTTP client with security and authentication features
 * @author Birdsphere Development Team
 */

import axios from 'axios';

/**
 * API Base URL Configuration
 * 
 * Determines the base URL for all API requests using environment variables
 * for different deployment environments (development, staging, production).
 * 
 * Environment Configuration:
 * - REACT_APP_API_URL: Custom API URL from environment variables
 * - Default: http://localhost:3000 for development
 * 
 * Production deployments should set REACT_APP_API_URL to the appropriate
 * backend server URL (e.g., https://api.birdsphere.com)
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3015/api';

/**
 * Axios Instance Configuration
 * 
 * Creates a pre-configured Axios instance with security-focused defaults
 * optimized for browser-based applications using httpOnly cookie authentication.
 * 
 * Configuration Features:
 * - Automatic credential inclusion for authentication
 * - Timeout protection against hanging requests
 * - Content type defaults for JSON communication
 * - Connection pooling through Axios defaults
 */
const api = axios.create({
  /** API base URL from environment or development default */
  baseURL: API_BASE_URL,
  
  /** Request timeout in milliseconds (30 seconds) */
  timeout: 30000,
  
  /** 
   * Include credentials (cookies) with all requests
   * Essential for httpOnly cookie authentication to work with CORS
   */
  withCredentials: true,
  
  /** Default headers for all requests */
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Request Interceptor
 * 
 * Processes outgoing requests before they are sent to the server.
 * In this authentication model, we don't need to manually add Authorization
 * headers because httpOnly cookies are automatically included by the browser.
 * 
 * Security Notes:
 * - No Authorization header manipulation needed
 * - httpOnly cookies are automatically sent with requests
 * - Server will validate the authToken cookie
 */
api.interceptors.request.use(
  (config) => {
    // Security: No manual Authorization header needed
    // httpOnly cookies are automatically included by browser
    // Server will read and validate the authToken cookie
    return config;
  },
  (error) => {
    // Propagate request configuration errors
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * 
 * Handles incoming responses and implements global error handling strategies.
 * Provides centralized authentication error handling and automatic redirects
 * for security violations.
 * 
 * Error Handling Strategy:
 * - 401 Unauthorized: Redirect to login (authentication failure)
 * - 403 Forbidden: Redirect to login (insufficient permissions)
 * - Network errors: Pass through for component-level handling
 * - Server errors: Pass through with structured error information
 * 
 * Authentication Flow:
 * - Server validates httpOnly cookie on each request
 * - If invalid/expired, server returns 401
 * - Client automatically redirects to login
 * - User must re-authenticate to continue
 */
api.interceptors.response.use(
  /**
   * Success Response Handler
   * 
   * Passes successful responses through without modification.
   * All successful responses (2xx status codes) are returned as-is.
   * 
   * @param {AxiosResponse} response - Successful HTTP response
   * @returns {AxiosResponse} Unmodified response
   */
  (response) => response,
  
  /**
   * Error Response Handler
   * @param {AxiosError} error - HTTP error response
   * @returns {Promise<never>} Rejected promise with error
   */
  (error) => {
    // Handle authentication failures (401 Unauthorized)
    if (error.response?.status === 401) {
      // Only redirect if user is not already on login or register pages
      // This prevents infinite redirect loops during initial auth checks
      const currentPath = window.location.pathname;
      const isOnAuthPage = currentPath === '/login' || currentPath === '/register' || currentPath === '/';
      
      if (!isOnAuthPage) {
        // Security: Redirect to login on authentication failure
        // This ensures users can't access protected resources without valid auth
        window.location.href = '/login';
        return Promise.reject(new Error('Authentication required'));
      }
      
      // If already on auth page, just reject without redirect
      return Promise.reject(new Error('Authentication required'));
    }
    
    // Handle authorization failures (403 Forbidden)
    if (error.response?.status === 403) {
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname;
      const isOnAuthPage = currentPath === '/login' || currentPath === '/register' || currentPath === '/';
      
      if (!isOnAuthPage) {
        // User is authenticated but lacks necessary permissions
        // Redirect to login to allow different user or upgrade permissions
        window.location.href = '/login';
        return Promise.reject(new Error('Insufficient permissions'));
      }
      
      // If already on auth page, just reject without redirect
      return Promise.reject(new Error('Insufficient permissions'));
    }
    
    // For all other errors, pass through to component error handling
    // This allows components to handle specific business logic errors
    return Promise.reject(error);
  }
);

/**
 * Export configured Axios instance
 * 
 * This instance should be used throughout the application for all API calls.
 * It provides consistent behavior, security features, and error handling.
 * 
 * Usage Examples:
 * ```typescript
 * import api from './api';
 * 
 * // GET request
 * const users = await api.get('/users');
 * 
 * // POST request with data
 * const newUser = await api.post('/users', userData);
 * 
 * // PUT request for updates
 * const updatedUser = await api.put('/users/123', updateData);
 * 
 * // DELETE request
 * await api.delete('/users/123');
 * ```
 * 
 * Error Handling:
 * ```typescript
 * try {
 *   const data = await api.get('/protected-resource');
 * } catch (error) {
 *   // Handle specific errors
 *   if (error.response?.status === 404) {
 *     // Resource not found
 *   } else if (error.response?.status >= 500) {
 *     // Server error
 *   }
 * }
 * ```
 */
export default api;