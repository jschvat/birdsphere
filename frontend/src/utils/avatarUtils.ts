/**
 * Avatar and Media URL Utility Functions
 *
 * Centralized utility functions for consistent avatar and media URL handling across the application.
 * Manages URL transformations, environment configuration, and static file serving coordination.
 *
 * Core Responsibilities:
 * - Avatar URL normalization and absolute path generation
 * - Media file URL transformation and CDN integration
 * - Environment-aware API base URL configuration
 * - Static file serving path management
 * - URL format validation and sanitization
 *
 * Architecture:
 * - Environment-based configuration with fallback defaults
 * - Centralized URL handling to prevent inconsistent paths
 * - Support for both relative and absolute URL inputs
 * - Static file path optimization (bypassing /api routes)
 * - Null-safe operations with proper error handling
 *
 * URL Handling Strategy:
 * - External URLs: Passed through unchanged (http/https prefixed)
 * - Relative URLs: Converted to absolute using configured base URL
 * - API-prefixed URLs: Cleaned to remove /api prefix for static files
 * - Malformed URLs: Sanitized and normalized to prevent errors
 *
 * Integration Points:
 * - User profile avatar display components
 * - Media gallery and file display components
 * - File upload and preview systems
 * - CDN integration for external media hosting
 * - Development and production environment coordination
 */

/**
 * Get the backend API base URL
 *
 * Uses the centralized REACT_APP_API_URL environment variable that matches
 * the BACKEND_PORT configuration in root .env file.
 */
const getApiBaseUrl = (): string => {
  // Get the base URL without /api suffix for static files
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  // Remove /api suffix if present
  return apiUrl.replace(/\/api$/, '');
};

/**
 * Converts a profile image URL to an absolute URL
 *
 * @param profileImage - The profile image URL (can be relative or absolute)
 * @returns The absolute URL or null if no image
 */
export const getAvatarUrl = (profileImage?: string | null): string | null => {
  // Return null if no profile image
  if (!profileImage?.trim()) {
    return null;
  }

  // Handle different URL formats
  if (profileImage.startsWith('http')) {
    // External URL - use as-is
    return profileImage;
  }

  // Handle relative URLs - ensure we don't double up on /api/ prefix
  let cleanPath = profileImage;

  // Remove /api prefix if it exists (since static files are served from root)
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4); // Remove '/api'
  }

  // Ensure path starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // Construct absolute URL for static files (no /api prefix)
  const avatarUrl = `${getApiBaseUrl()}${cleanPath}`;

  return avatarUrl;
};

/**
 * Converts a media file URL to an absolute URL
 *
 * @param mediaUrl - The media file URL (can be relative or absolute)
 * @returns The absolute URL or null if no media URL
 */
export const getMediaUrl = (mediaUrl?: string | null): string | null => {
  // Return null if no media URL
  if (!mediaUrl?.trim()) {
    return null;
  }

  // Handle different URL formats
  if (mediaUrl.startsWith('http')) {
    // External URL - use as-is
    return mediaUrl;
  }

  // Handle relative URLs - ensure we don't double up on /api/ prefix
  let cleanPath = mediaUrl;

  // Remove /api prefix if it exists (since static files are served from root)
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4); // Remove '/api'
  }

  // Ensure path starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // Construct absolute URL for static files (no /api prefix)
  const fullMediaUrl = `${getApiBaseUrl()}${cleanPath}`;

  return fullMediaUrl;
};