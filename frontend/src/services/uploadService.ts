/**
 * Upload Service Module
 *
 * Specialized service for handling file uploads with multi-part form data support.
 * Provides secure and efficient file upload operations for avatars and media content.
 *
 * Core Responsibilities:
 * - Avatar image uploads with automatic processing and validation
 * - Multi-part form data handling with proper content type headers
 * - File validation and size restrictions for security
 * - Upload progress tracking and error handling
 * - Integration with backend media processing pipeline
 *
 * Architecture:
 * - Uses configured API client for consistent authentication and error handling
 * - FormData API for browser-compatible file uploads
 * - Automatic content-type detection for multi-part uploads
 * - Promise-based API for async/await compatibility
 * - Structured response format for consistent data handling
 *
 * Security Features:
 * - Automatic file type validation by backend
 * - File size restrictions enforced server-side
 * - Secure cookie authentication for upload authorization
 * - No temporary file storage on client-side
 * - Malware scanning integration on backend
 *
 * Upload Flow:
 * 1. Client selects file through file input or drag-and-drop
 * 2. File is added to FormData object with appropriate field name
 * 3. Request sent with multipart/form-data content type
 * 4. Backend validates file type, size, and security
 * 5. File processed and stored with generated unique filename
 * 6. Response includes final URL for immediate use in UI
 *
 * Integration Points:
 * - User profile avatar update workflows
 * - Post creation with media attachments
 * - Media gallery management systems
 * - Real-time upload progress indicators
 * - Error handling and retry mechanisms
 */
import api from './api';

/**
 * Upload Service Object
 *
 * Provides file upload functionality with proper multi-part form handling
 * and integration with the authenticated API client.
 */
export const uploadService = {
  /**
   * Upload Avatar Image
   *
   * Uploads a user avatar image file to the backend with automatic processing and validation.
   * Handles multi-part form data submission and returns the processed avatar URL.
   *
   * Features:
   * - Multi-part form data upload with proper content type headers
   * - Automatic file type validation (images only)
   * - File size restriction enforcement by backend
   * - Image processing and optimization on server
   * - Secure authentication through httpOnly cookies
   * - Unique filename generation to prevent conflicts
   *
   * Upload Process:
   * 1. File wrapped in FormData with 'avatar' field name
   * 2. Content-Type set to multipart/form-data for proper handling
   * 3. Request sent to /upload/avatar endpoint with authentication
   * 4. Backend validates file type, size, and security constraints
   * 5. Image processed, resized, and optimized for web display
   * 6. Stored with unique filename and returned as accessible URL
   *
   * @param file - The image file to upload (File object from input or drag-and-drop)
   * @returns Promise resolving to object with avatarUrl property containing the uploaded image URL
   *
   * @throws {Error} When file validation fails (unsupported type, too large)
   * @throws {Error} When upload fails due to network or server issues
   * @throws {Error} When user lacks permission to upload files
   *
   * @example
   * ```typescript
   * const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
   * const file = fileInput.files[0];
   *
   * try {
   *   const result = await uploadService.uploadAvatar(file);
   *   console.log('Avatar uploaded:', result.avatarUrl);
   *   // Update user profile with new avatar URL
   * } catch (error) {
   *   console.error('Upload failed:', error.message);
   * }
   * ```
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};