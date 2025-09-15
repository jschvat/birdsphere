/**
 * Authentication Context for React Application
 * 
 * This module implements a comprehensive authentication system using React Context API
 * to manage authentication state across the entire application. The context provides
 * centralized state management for user authentication, session persistence, and
 * secure token-based authentication using httpOnly cookies.
 * 
 * Key Features:
 * - Centralized authentication state management
 * - Automatic session restoration on app initialization
 * - Secure httpOnly cookie-based authentication (no localStorage exposure)
 * - Comprehensive error handling and user feedback
 * - Optimistic UI updates with rollback on failure
 * - Type-safe implementation with TypeScript
 * 
 * Security Considerations:
 * - Uses httpOnly cookies to prevent XSS token theft
 * - Automatic session validation on app startup
 * - Centralized logout handling for security compliance
 * - Error boundary integration for graceful failure handling
 * 
 * @fileoverview React Context-based authentication system with secure token management
 * @author Birdsphere Development Team
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../types';
import { authService } from '../services/authService';

/**
 * AuthContextType Interface
 * 
 * Defines the complete API surface for authentication context consumers.
 * This interface ensures type safety across all authentication operations
 * and provides a consistent contract for components using authentication.
 * 
 * @interface AuthContextType
 */
interface AuthContextType {
  /** Current authenticated user object or null if not authenticated */
  user: User | null;
  
  /** Boolean flag indicating if user is currently authenticated */
  isAuthenticated: boolean;
  
  /** Loading state for async authentication operations */
  isLoading: boolean;

  /** Flag indicating if auth context has completed initial setup */
  isInitialized: boolean;
  
  /** 
   * Authenticate user with credentials
   * @param credentials - User login credentials (email/username and password)
   * @throws {Error} Authentication failure with descriptive message
   */
  login: (credentials: LoginCredentials) => Promise<void>;
  
  /** 
   * Register new user account
   * @param userData - New user registration data
   * @throws {Error} Registration failure with validation details
   */
  register: (userData: RegisterData) => Promise<void>;
  
  /** 
   * Logout current user and clear authentication state
   * Handles both successful logout and cleanup on failure
   */
  logout: () => Promise<void>;
  
  /** 
   * Update current user profile information
   * @param userData - Partial user data for profile updates
   * @throws {Error} Profile update failure with validation details
   */
  updateProfile: (userData: Partial<User>) => Promise<void>;
  
  /** 
   * Refresh user data from server (useful after profile updates elsewhere)
   * Silently fails to avoid disrupting user experience
   */
  refreshUser: () => Promise<void>;
  
  /** Current error message from authentication operations */
  error: string | null;
  
  /** Clear current error state (useful for form reset) */
  clearError: () => void;
}

/**
 * React Context for Authentication
 * 
 * Creates the authentication context that will be provided throughout the component tree.
 * Uses undefined as default to force consumers to check if context is available,
 * preventing silent failures when context is used outside of provider.
 * 
 * @type {React.Context<AuthContextType | undefined>}
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Custom Hook for Authentication Context
 * 
 * Provides a type-safe way to consume the authentication context.
 * Throws an error if used outside of AuthProvider to fail fast and
 * provide clear debugging information.
 * 
 * This pattern ensures that:
 * 1. Components can't accidentally use auth outside of provider
 * 2. TypeScript knows the context is defined (no undefined checks needed)
 * 3. Runtime errors are descriptive and help with debugging
 * 
 * Usage:
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 * ```
 * 
 * @returns {AuthContextType} The authentication context value
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Props interface for AuthProvider component
 * 
 * @interface AuthProviderProps
 */
interface AuthProviderProps {
  /** Child components that will have access to authentication context */
  children: ReactNode;
}

/**
 * Authentication Provider Component
 * 
 * The main provider component that manages authentication state and provides
 * authentication methods to the entire application. This component should be
 * placed at the root of the application to ensure all components have access
 * to authentication functionality.
 * 
 * State Management:
 * - user: Stores current user data or null if not authenticated
 * - isLoading: Tracks async operations to show loading states
 * - error: Stores error messages for user feedback
 * 
 * Key Responsibilities:
 * 1. Initialize authentication state on app startup
 * 2. Manage user authentication lifecycle (login/logout)
 * 3. Persist authentication state across browser sessions
 * 4. Handle authentication errors gracefully
 * 5. Provide consistent authentication API to child components
 * 
 * @param {AuthProviderProps} props - Component props containing children
 * @returns {JSX.Element} Provider component wrapping children
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Authentication state: current user or null
  const [user, setUser] = useState<User | null>(null);
  
  // Loading state: true during authentication operations
  const [isLoading, setIsLoading] = useState(true);

  // Initialization state: tracks if auth context setup is complete
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Error state: stores error messages from failed operations
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Authentication Initialization Effect
   * 
   * Runs once when the AuthProvider component mounts to restore authentication
   * state from the server. This is critical for maintaining user sessions
   * across browser refreshes and app restarts.
   * 
   * Process:
   * 1. Attempts to validate existing httpOnly cookie with server
   * 2. If valid, populates user state with current user data
   * 3. If invalid or missing, sets user to null (unauthenticated state)
   * 4. Handles errors gracefully without disrupting user experience
   * 5. Always sets loading to false when complete
   * 
   * Security Notes:
   * - Uses httpOnly cookies which cannot be accessed by JavaScript
   * - Relies on server-side validation for security
   * - Does not redirect on failure (handled by axios interceptors)
   */
  useEffect(() => {
    let isMounted = true; // Track component mount status to prevent state updates after unmount
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Starting auth initialization...');
        // Attempt to validate existing authentication with server
        // This checks if the httpOnly cookie contains a valid JWT token
        const currentUser = await authService.checkAuthentication();
        console.log('✅ Auth check result:', currentUser ? 'User found' : 'No user found');

        // Only update state if component is still mounted
        if (isMounted) {
          if (currentUser) {
            // Valid authentication found - restore user state
            console.log('👤 Setting user:', currentUser.email);
            setUser(currentUser);
          } else {
            // No valid authentication - set unauthenticated state
            console.log('❌ No user found, setting user to null');
            setUser(null);
          }
        }
      } catch (err) {
        // Authentication check failed - log error but don't disrupt UX
        console.error('❌ Auth initialization error:', err);

        // Only update state if component is still mounted
        if (isMounted) {
          setUser(null);
        }
        // Don't redirect here - let the axios interceptor handle navigation
      } finally {
        // Always complete loading state regardless of success/failure
        // Only update state if component is still mounted
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();
    
    // Cleanup function to prevent state updates after component unmounts
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - run only once on mount

  /**
   * User Login Method
   * 
   * Authenticates user with provided credentials and updates application state.
   * Uses httpOnly cookies for secure token storage, preventing XSS attacks.
   * 
   * Authentication Flow:
   * 1. Clear any existing errors
   * 2. Set loading state for UI feedback
   * 3. Send credentials to authentication service
   * 4. Update user state with authenticated user data
   * 5. Handle errors with user-friendly messages
   * 
   * Security Features:
   * - Credentials never stored in client-side storage
   * - JWT tokens stored in httpOnly cookies only
   * - Error messages sanitized for user display
   * 
   * @param {LoginCredentials} credentials - User login credentials
   * @throws {Error} Descriptive error message on authentication failure
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      // Clear any previous error state
      setError(null);
      
      // Show loading state to user
      setIsLoading(true);
      
      // Attempt authentication with server
      const { user } = await authService.login(credentials);
      
      // Update application state with authenticated user
      setUser(user);
    } catch (err: any) {
      // Extract user-friendly error message
      const errorMessage = err.response?.data?.error || 'Login failed';
      setError(errorMessage);
      
      // Re-throw error for component-level handling
      throw new Error(errorMessage);
    } finally {
      // Always clear loading state
      setIsLoading(false);
    }
  };

  /**
   * User Registration Method
   * 
   * Creates new user account and automatically authenticates the user.
   * Provides comprehensive validation feedback and maintains security
   * standards consistent with login functionality.
   * 
   * Registration Flow:
   * 1. Clear existing error state
   * 2. Set loading state for UI feedback
   * 3. Submit registration data to server
   * 4. Automatically authenticate new user
   * 5. Update application state
   * 
   * Error Handling:
   * - Server-side validation errors displayed to user
   * - Duplicate email/username conflicts handled gracefully
   * - Network errors provide fallback messaging
   * 
   * @param {RegisterData} userData - New user registration information
   * @throws {Error} Detailed validation or registration error message
   */
  const register = async (userData: RegisterData) => {
    try {
      // Clear any previous error state
      setError(null);
      
      // Show loading state to user
      setIsLoading(true);
      
      // Attempt user registration
      const { user } = await authService.register(userData);
      
      // Automatically authenticate newly registered user
      setUser(user);
    } catch (err: any) {
      // Extract detailed error message (may include validation details)
      const errorMessage = err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      
      // Re-throw error for component-level handling
      throw new Error(errorMessage);
    } finally {
      // Always clear loading state
      setIsLoading(false);
    }
  };

  /**
   * User Logout Method
   * 
   * Securely logs out the user by invalidating server-side session and
   * clearing all client-side authentication state. Implements defensive
   * programming by clearing state even if server logout fails.
   * 
   * Logout Process:
   * 1. Call server logout endpoint to invalidate session
   * 2. Clear httpOnly cookie on server side
   * 3. Clear all client-side user state
   * 4. Reset error state for clean slate
   * 
   * Security Considerations:
   * - Always clears local state regardless of server response
   * - Prevents lingering authentication state on logout failure
   * - Logs errors for monitoring but doesn't expose to user
   * 
   * @async
   * @returns {Promise<void>} Completes when logout process finished
   */
  const logout = async () => {
    try {
      // Call server logout to invalidate session and clear cookie
      await authService.logout();
      
      // Clear all client-side authentication state
      setUser(null);
      setError(null);
    } catch (err) {
      // Log error for debugging but don't expose to user
      console.error('Logout error:', err);
      
      // Even if server logout fails, clear local state for security
      setUser(null);
      setError(null);
    }
  };

  /**
   * Profile Update Method
   * 
   * Updates user profile information and refreshes authentication state.
   * Provides optimistic updates with rollback capability on failure.
   * 
   * Update Process:
   * 1. Clear any existing errors
   * 2. Send partial user data to server for update
   * 3. Replace current user state with updated data
   * 4. Handle validation errors with user feedback
   * 
   * Features:
   * - Partial updates (only changed fields need to be provided)
   * - Automatic state synchronization with server
   * - Comprehensive error handling and user feedback
   * - Maintains authentication state consistency
   * 
   * @param {Partial<User>} userData - Fields to update in user profile
   * @throws {Error} Validation or update failure with detailed message
   */
  const updateProfile = async (userData: Partial<User>) => {
    try {
      // Clear any previous error state
      setError(null);
      
      // Send update request to server
      const updatedUser = await authService.updateProfile(userData);
      
      // Update local state with server response
      setUser(updatedUser);
    } catch (err: any) {
      // Extract detailed error message for user feedback
      const errorMessage = err.response?.data?.error || 'Profile update failed';
      setError(errorMessage);
      
      // Re-throw error for component-level handling
      throw new Error(errorMessage);
    }
  };

  /**
   * User Data Refresh Method
   * 
   * Silently refreshes user data from the server without affecting loading
   * state or error handling. Useful for syncing user data after profile
   * updates performed elsewhere in the application.
   * 
   * Refresh Process:
   * 1. Query server for current user data
   * 2. Update local state if user data is returned
   * 3. Silently fail if refresh is not possible
   * 
   * Use Cases:
   * - Sync data after profile updates in other tabs
   * - Refresh user permissions or role changes
   * - Update user preferences from server
   * 
   * Note: Deliberately does not set loading state to avoid UI flicker
   * during background refresh operations.
   * 
   * @async
   * @returns {Promise<void>} Completes when refresh attempt finished
   */
  const refreshUser = async () => {
    try {
      // Query server for current user data
      const currentUser = await authService.checkAuthentication();
      
      if (currentUser) {
        // Update local state with fresh user data
        setUser(currentUser);
      }
      // If no user data returned, maintain current state
    } catch (err) {
      // Log error for debugging but don't disrupt user experience
      console.error('Failed to refresh user data:', err);
      // Silently fail - user state remains unchanged
    }
  };

  /**
   * Error State Clearing Method
   * 
   * Clears current error state to reset UI to clean state.
   * Typically used when user dismisses error messages or
   * when starting new authentication operations.
   * 
   * @returns {void}
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Context Value Construction
   * 
   * Assembles the complete authentication context value that will be provided
   * to all consuming components. This object contains both state and methods
   * needed for authentication throughout the application.
   * 
   * State Properties:
   * - user: Current user object or null
   * - isAuthenticated: Computed boolean from user existence
   * - isLoading: Loading state for UI feedback
   * - error: Current error message if any
   * 
   * Methods:
   * - login: Authenticate with credentials
   * - register: Create new user account
   * - logout: Clear authentication state
   * - updateProfile: Update user profile data
   * - refreshUser: Sync user data from server
   * - clearError: Reset error state
   */
  const value: AuthContextType = {
    // Current user state
    user,
    
    // Computed authentication status (true if user exists)
    isAuthenticated: !!user,
    
    // Loading state for async operations
    isLoading,

    // Initialization state for tracking setup completion
    isInitialized,
    
    // Authentication methods
    login,
    register,
    logout,
    
    // Profile management methods
    updateProfile,
    refreshUser,
    
    // Error state management
    error,
    clearError,
  };

  /**
   * Provider Component Render
   * 
   * Returns the AuthContext.Provider with constructed value, making all
   * authentication functionality available to child components through
   * the useAuth hook.
   * 
   * This provider should be placed at the root of the application component
   * tree to ensure all components have access to authentication state.
   */
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};