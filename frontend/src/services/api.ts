/**\n * Axios HTTP Client Configuration\n * \n * Centralized HTTP client setup with comprehensive security, error handling,\n * and authentication integration. This module configures Axios with proper\n * CORS settings, cookie-based authentication, request/response interceptors,\n * and automatic error handling.\n * \n * Key Features:\n * - Cookie-based authentication (httpOnly cookies)\n * - Automatic credential inclusion for CORS requests\n * - Request and response interceptors for centralized handling\n * - Automatic authentication error handling and redirects\n * - Configurable timeouts and base URL\n * - Environment-based configuration\n * \n * Security Features:\n * - Secure cookie handling with withCredentials\n * - Automatic 401 redirect to prevent unauthorized access\n * - No manual token management (handled by cookies)\n * - CORS-compliant credential handling\n * \n * Architecture Benefits:\n * - Single source of truth for HTTP configuration\n * - Consistent error handling across the application\n * - Separation of concerns (HTTP logic vs business logic)\n * - Easy to mock for testing\n * - Environment-specific configuration support\n * \n * @fileoverview Centralized Axios HTTP client with security and authentication features\n * @author Birdsphere Development Team\n */\n\nimport axios from 'axios';

/**
 * API Base URL Configuration
 * 
 * Determines the base URL for all API requests using environment variables
 * for different deployment environments (development, staging, production).
 * 
 * Environment Configuration:
 * - REACT_APP_API_URL: Custom API URL from environment variables
 * - Fallback: Local development server (http://localhost:3000/api)
 * 
 * Usage Examples:
 * - Development: http://localhost:3000/api
 * - Staging: https://api-staging.birdsphere.com/api
 * - Production: https://api.birdsphere.com/api
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Axios Instance Configuration
 * 
 * Creates a configured Axios instance with security and performance optimizations.
 * This instance is used throughout the application for all HTTP requests.
 * 
 * Configuration Details:
 * - baseURL: Set from environment or defaults to local development
 * - timeout: 10-second request timeout to prevent hanging requests
 * - headers: JSON content type for consistent API communication
 * - withCredentials: Enables cookie sending for CORS authentication
 * 
 * Security Considerations:
 * - withCredentials: true enables httpOnly cookie authentication
 * - Allows secure cross-origin requests with credentials
 * - No authorization headers needed (handled by cookies)
 * 
 * Performance Features:
 * - Request timeout prevents hanging connections
 * - Consistent headers reduce negotiation overhead
 * - Connection pooling through Axios defaults
 */
const api = axios.create({
  /** API base URL from environment or development default */
  baseURL: API_BASE_URL,
  
  /** Request timeout in milliseconds (10 seconds) */
  timeout: 10000,
  
  /** Default headers for all requests */
  headers: {
    'Content-Type': 'application/json',
  },
  
  /** Enable cookie-based authentication for CORS requests */
  withCredentials: true,
});

/**
 * Request Interceptor Configuration
 * 
 * Intercepts all outgoing requests to apply consistent configuration
 * and handle authentication. In this httpOnly cookie-based system,
 * the interceptor primarily serves as a future extension point.
 * 
 * Current Functionality:
 * - Pass-through configuration (no modifications needed)
 * - Cookie authentication handled automatically by browser
 * - Error propagation for request failures
 * 
 * Security Benefits:
 * - No manual token handling prevents XSS token theft
 * - Cookies are automatically included by browser
 * - Server reads httpOnly cookies for authentication
 * 
 * Future Extensions:
 * - Request logging and monitoring
 * - Dynamic header injection
 * - Request transformation
 * - Retry logic implementation
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
 * Response Interceptor Configuration
 * 
 * Handles all incoming responses and provides centralized error handling,
 * particularly for authentication failures. This interceptor is crucial
 * for maintaining security and user experience.
 * 
 * Success Handling:
 * - Pass-through successful responses unchanged
 * - Preserve original response structure
 * 
 * Error Handling:
 * - 401 Unauthorized: Automatic redirect to login page
 * - Infinite redirect prevention with path checking
 * - All other errors propagated to calling code
 * 
 * Security Features:
 * - Automatic session expiration handling
 * - Prevents access to protected resources when unauthorized
 * - Clean separation between authentication and authorization errors
 * 
 * UX Benefits:
 * - Seamless redirect on session expiration
 * - No user confusion from 401 errors
 * - Consistent authentication flow
 * 
 * Error Prevention:
 * - Checks current path to prevent redirect loops
 * - Maintains browser history and user context
 */
api.interceptors.response.use(
  /**
   * Success Response Handler
   * @param {AxiosResponse} response - Successful API response
   * @returns {AxiosResponse} Unmodified response
   */
  (response) => response,
  
  /**
   * Error Response Handler
   * @param {AxiosError} error - API error response
   * @returns {Promise<never>} Rejected promise with error
   */
  (error) => {
    // Handle authentication failures (401 Unauthorized)
    if (error.response?.status === 401) {
      // Security: Redirect to login on authentication failure
      // UX: Prevent infinite redirect loops by checking current path
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Propagate all errors to calling code for specific handling
    return Promise.reject(error);
  }
);

/**
 * Export Configured Axios Instance
 * 
 * The default export provides a fully configured Axios instance ready
 * for use throughout the application. This instance includes:
 * 
 * - Environment-based base URL configuration
 * - Security-focused cookie authentication
 * - Request/response interceptors for error handling
 * - Proper timeout and header configuration
 * - CORS credential support
 * 
 * Usage:
 * ```typescript
 * import api from './api';
 * 
 * // GET request
 * const users = await api.get('/users');
 * 
 * // POST request with data
 * const newUser = await api.post('/users', userData);
 * 
 * // Authentication is handled automatically via cookies
 * ```
 * 
 * @exports {AxiosInstance} Configured Axios instance for API communication
 */
export default api;