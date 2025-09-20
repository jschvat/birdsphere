/**
 * Avatar URL utility functions
 *
 * Provides consistent avatar URL handling across the application
 */

/**
 * Get the backend API base URL
 */
const getApiBaseUrl = (): string => {
  // Get the base URL without /api suffix for static files
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3015/api';
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

  // Debug logging to identify the issue
  console.log('🔍 getAvatarUrl input:', profileImage);

  // Remove /api prefix if it exists (since static files are served from root)
  if (cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.substring(4); // Remove '/api'
    console.log('🔧 Removed /api prefix. New path:', cleanPath);
  }

  // Ensure path starts with /
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // Construct absolute URL for static files (no /api prefix)
  const avatarUrl = `${getApiBaseUrl()}${cleanPath}`;

  console.log('✅ Final avatar URL:', avatarUrl);
  return avatarUrl;
};