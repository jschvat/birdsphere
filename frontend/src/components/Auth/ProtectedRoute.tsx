import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 *
 * Ensures that child components are only rendered for authenticated users.
 * Prevents the page refresh redirect issue by waiting for auth initialization.
 *
 * Features:
 * - Waits for auth context to initialize before making authentication decisions
 * - Shows loading spinner during auth initialization and loading states
 * - Redirects unauthenticated users to specified route (default: /login)
 * - Prevents premature redirects that cause the page refresh login issue
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login'
}) => {
  const { user, isInitialized, isLoading } = useAuth();

  // Show loading spinner while auth is initializing or loading
  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  // If auth is initialized but no user, redirect to login
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};

export default ProtectedRoute;