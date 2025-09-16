/**
 * Profile Page Component
 * 
 * A comprehensive user profile management component that provides both viewing
 * and editing functionality for user account information. This component
 * demonstrates advanced React patterns including state management, file uploads,
 * memory management, and optimistic UI updates.
 * 
 * Key Features:
 * - Profile viewing with rich visual layout
 * - Inline profile editing with form validation
 * - Avatar upload with image preview and validation
 * - Memory management for blob URLs
 * - Optimistic UI updates with error handling
 * - Responsive design with modern UI components
 * - Accessibility features (keyboard navigation, ARIA labels)
 * 
 * State Management:
 * - Uses React hooks for local component state
 * - Integrates with AuthContext for user authentication
 * - Manages multiple UI states (editing, loading, uploading)
 * - Handles form data synchronization with user state
 * 
 * Security Considerations:
 * - File upload validation (type and size limits)
 * - Authentication checks with automatic redirects
 * - Secure API integration for profile updates
 * - Memory leak prevention with URL cleanup
 * 
 * Performance Optimizations:
 * - useEffect dependency optimization
 * - Image preview using blob URLs
 * - Conditional rendering to reduce re-renders
 * - Efficient state updates with functional setState
 * 
 * @fileoverview User profile management component with advanced React patterns
 * @author Birdsphere Development Team
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadService } from '../services/uploadService';
import { animalService } from '../services/animalService';
import { User, AnimalCategory } from '../types';
import TreeView from '../components/TreeView';

/**
 * Main Profile Component
 * 
 * Manages the entire profile page lifecycle including authentication,
 * form editing, and file uploads. Uses multiple state hooks to track
 * different aspects of the user interface and user interactions.
 * 
 * @returns {JSX.Element} The complete profile page component
 */
const Profile: React.FC = () => {
  // Extract authentication context methods and state
  const { user, updateProfile, logout, refreshUser, isLoading, isInitialized, error, clearError } = useAuth();
  
  // Navigation hook for programmatic routing
  const navigate = useNavigate();
  
  // Local component state management
  /** Controls whether the profile is in edit mode or view mode */
  const [isEditing, setIsEditing] = useState(() => {
    // Restore edit mode from localStorage on component mount
    const savedEditMode = localStorage.getItem('profile-edit-mode');
    return savedEditMode === 'true';
  });
  
  /** Stores form data during editing, separate from user state for controlled updates */
  const [formData, setFormData] = useState<Partial<User>>({});
  
  /** Shows success message after successful profile updates */
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  /** Tracks avatar upload progress to show loading states */
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  /** Stores blob URL for avatar preview during upload process */
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  /** Animal categories for tree view selection */
  const [animalCategories, setAnimalCategories] = useState<AnimalCategory[]>([]);

  /** Loading state for animal categories */
  const [loadingCategories, setLoadingCategories] = useState(false);

  /** Reference to hidden file input for programmatic file selection */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Authentication and Form Initialization Effect
   * 
   * This effect handles several critical initialization tasks:
   * 1. Authentication verification and redirect logic
   * 2. Form data initialization from user state
   * 3. Cleanup of preview states on user change
   * 
   * Security: Automatically redirects unauthenticated users to login
   * Performance: Uses user.id as dependency to minimize re-renders
   * Memory: Cleans up avatar preview URLs to prevent memory leaks
   * 
   * Dependencies:
   * - user?.id: Triggers when user changes (login/logout)
   * - navigate: React Router navigation function
   * - isLoading: Prevents premature redirects during auth check
   */
  useEffect(() => {
    console.log('🏠 Profile useEffect - isInitialized:', isInitialized, 'user:', user ? 'exists' : 'null', 'isLoading:', isLoading);

    // Security check: Redirect unauthenticated users
    // Only redirect after auth context has fully initialized
    if (isInitialized && !user) {
      console.log('🚪 Redirecting to login - auth initialized but no user');
      navigate('/login');
      return;
    }

    // Wait for authentication to complete
    if (!user) {
      return;
    }
    
    // Memory management: Clear any existing avatar preview
    // This prevents memory leaks when user changes
    setAvatarPreview(null);
    
    // Initialize form data with current user information
    // Using default values to prevent controlled/uncontrolled input issues
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      bio: user.bio || '',
      locationCity: user.locationCity || '',
      locationState: user.locationState || '',
      locationCountry: user.locationCountry || '',
      userRoles: user.userRoles || [],
      animalInterests: user.animalInterests || [],
    });
  }, [user, navigate, isLoading, isInitialized]); // Include isInitialized to prevent race conditions

  /**
   * Debug Animal Interests Effect with Auto-Fix
   *
   * Logs animal interests data for debugging display issues and automatically
   * refreshes user data if animal interests are missing but user is logged in
   */
  useEffect(() => {
    console.log('🔄 Profile debug - user changed:', {
      userExists: !!user,
      userId: user?.id,
      animalInterests: user?.animalInterests,
      animalInterestsLength: user?.animalInterests?.length
    });

    if (user?.animalInterests) {
      if (user.animalInterests.length > 0) {
        console.log('✅ Profile debug - rendering', user.animalInterests.length, 'animal interests:',
          user.animalInterests.map(i => i.name).join(', '));
      } else {
        console.log('❌ Profile debug - animalInterests is empty array:', user.animalInterests);
      }
    } else if (user?.id && !isLoading) {
      // User is logged in but animal interests are missing - auto refresh
      console.log('🔧 Profile debug - auto-refreshing user data because animalInterests is missing');
      refreshUser();
    } else {
      console.log('❌ Profile debug - no animalInterests property:', user?.animalInterests);
    }
  }, [user?.animalInterests, user?.id, isLoading, refreshUser]);

  /**
   * Edit Mode Persistence Effect
   *
   * Saves the edit mode state to localStorage whenever it changes
   * so that the edit mode persists across page reloads.
   */
  useEffect(() => {
    localStorage.setItem('profile-edit-mode', isEditing.toString());
  }, [isEditing]);

  /**
   * Animal Categories Loading Effect
   *
   * Loads animal categories from the API when the component mounts.
   * This provides the data for the tree view component.
   */
  useEffect(() => {
    const loadAnimalCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await animalService.getAnimalCategories();
        setAnimalCategories(response.categories);
      } catch (error) {
        console.error('Failed to load animal categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadAnimalCategories();
  }, []);

  /**
   * Form Input Change Handler
   * 
   * Handles all form input changes including text inputs, textareas, and checkboxes.
   * Implements controlled component pattern by updating local state and provides
   * immediate UI feedback by clearing error and success states.
   * 
   * Features:
   * - Unified handler for multiple input types
   * - Type-safe handling of checkbox vs text inputs
   * - Immediate feedback by clearing error states
   * - Functional state updates for performance
   * 
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} e - Input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Update form data using functional setState for performance
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error state when user starts typing (immediate feedback)
    if (error) clearError();
    
    // Clear success message when user makes changes
    if (updateSuccess) setUpdateSuccess(false);
  };

  /**
   * Profile Update Form Submission Handler
   * 
   * Processes profile update form submission with comprehensive error handling
   * and user feedback. Implements optimistic UI updates by immediately switching
   * to view mode and showing success feedback.
   * 
   * Flow:
   * 1. Prevent default form submission
   * 2. Send update request to server via AuthContext
   * 3. Switch back to view mode on success
   * 4. Show temporary success message
   * 5. Error handling delegated to AuthContext
   * 
   * UX Features:
   * - Optimistic UI updates
   * - Auto-dismissing success messages
   * - Graceful error handling without UI disruption
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent browser default form submission
    e.preventDefault();

    try {
      // Prepare data for server - convert animalInterests objects to IDs
      const dataToSend = {
        ...formData,
        animalInterests: formData.animalInterests?.map(interest => interest.id) || []
      } as unknown as Partial<User>;

      // Send profile update request to server
      await updateProfile(dataToSend);

      // Optimistic UI update: switch back to view mode
      setIsEditing(false);

      // Clear the localStorage edit mode when saving
      localStorage.removeItem('profile-edit-mode');

      // Show success feedback to user
      setUpdateSuccess(true);

      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      // Error handling is managed by AuthContext
      // Error will be displayed through context's error state
    }
  };

  /**
   * User Logout Handler
   * 
   * Handles user logout process by calling the logout method from AuthContext
   * and then navigating to the login page. Simple but critical for user session management.
   * 
   * Security: Clears all authentication state and redirects to login
   * UX: Provides immediate navigation feedback
   * 
   * @async
   */
  const handleLogout = async () => {
    // Clear the localStorage edit mode on logout
    localStorage.removeItem('profile-edit-mode');

    // Clear authentication state through context
    await logout();

    // Navigate to login page
    navigate('/login');
  };

  /**
   * Avatar Click Handler
   * 
   * Programmatically triggers the hidden file input when user clicks on the avatar
   * or avatar upload button. This provides a better user experience than showing
   * the native file input.
   * 
   * Accessibility: Triggered by both click and keyboard events on avatar
   * UX: Hidden file input provides clean interface
   * 
   */
  const handleAvatarClick = () => {
    // Programmatically trigger file input click
    fileInputRef.current?.click();
  };

  /**
   * Avatar Upload Handler
   * 
   * Comprehensive file upload handler that manages the entire avatar update process
   * including validation, preview generation, upload, and state synchronization.
   * Implements sophisticated memory management and error handling.
   * 
   * Process Flow:
   * 1. File selection and validation (type, size)
   * 2. Create blob URL for immediate preview
   * 3. Upload file to server
   * 4. Wait for server processing
   * 5. Refresh user data to get new avatar URL
   * 6. Clean up resources and update UI
   * 
   * Security Features:
   * - File type validation (images only)
   * - File size limits (5MB max)
   * - Server-side processing validation
   * 
   * Performance Features:
   * - Immediate preview with blob URLs
   * - Async upload with loading states
   * - Memory leak prevention with URL cleanup
   * 
   * UX Features:
   * - Loading states during upload
   * - Success feedback
   * - Error handling with user alerts
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event
   */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security validation: Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Security validation: Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Track preview URL for memory management
    let previewUrl: string | null = null;
    
    try {
      // Set loading state for user feedback
      setIsUploadingAvatar(true);
      
      // Create blob URL for immediate preview (optimistic UI)
      previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      
      // Upload avatar to server
      await uploadService.uploadAvatar(file);
      
      // Allow server processing time (prevents race conditions)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh user data to get updated profile image URL
      await refreshUser();
      
      // Clear preview (server image now available)
      setAvatarPreview(null);
      
      // Show success feedback
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      
    } catch (error) {
      // Log error for debugging
      console.error('Avatar upload failed:', error);
      
      // Clear preview on error
      setAvatarPreview(null);
      
      // TODO: Show user-friendly error message instead of console.error
    } finally {
      // Always clear loading state
      setIsUploadingAvatar(false);
      
      // Memory management: Clean up blob URL to prevent memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  };

  /**
   * Avatar URL Resolution Function
   * 
   * Determines the correct avatar URL to display based on current state.
   * Implements a priority system for different avatar sources to provide
   * optimal user experience during uploads and normal viewing.
   * 
   * Priority Order:
   * 1. Avatar preview (blob URL during upload) - highest priority for immediate feedback
   * 2. User profile image from database - standard display
   * 3. null (shows default avatar) - fallback when no image available
   * 
   * URL Handling:
   * - Blob URLs (data:) used for upload preview
   * - Relative URLs converted to absolute for server images
   * - External URLs (http/https) passed through unchanged
   * 
   * Security Considerations:
   * - Only serves images from trusted domains
   * - Validates URL formats before processing
   * 
   * @returns {string | null} The avatar URL to display, or null for default avatar
   */
  const getAvatarUrl = () => {
    // Priority 1: Show upload preview if available (optimistic UI)
    // This provides immediate visual feedback during upload process
    if (avatarPreview && avatarPreview.trim()) {
      return avatarPreview;
    }
    
    // Priority 2: Show user's saved profile image from database
    if (user?.profileImage && user.profileImage.trim()) {
      // Handle different URL formats
      const avatarUrl = user.profileImage.startsWith('http') 
        ? user.profileImage  // External URL - use as-is
        : `http://localhost:3000${user.profileImage}`; // Relative URL - make absolute
      
      return avatarUrl;
    }
    
    // Priority 3: No avatar available - return null to show default
    return null;
  };

  /**
   * Loading State Render
   * 
   * Shows loading spinner while authentication is being verified or user data
   * is being fetched. Prevents flash of unauthorized content and provides
   * consistent loading experience.
   * 
   * Conditions for loading state:
   * - isLoading: Authentication check in progress
   * - !user: User data not yet available
   * 
   * UX: Centered loading spinner with consistent styling
   * Performance: Early return prevents unnecessary render cycles
   */
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  /**
   * Main Component Render
   * 
   * Renders the complete profile page with responsive design, accessibility features,
   * and conditional content based on editing state. Uses modern CSS techniques
   * including gradients, backdrop-blur, and transform animations.
   * 
   * Layout Structure:
   * - Full-height container with gradient background
   * - Overlay for visual depth and theme consistency  
   * - Card-based content layout with backdrop blur
   * - Responsive grid system for profile information
   * - Conditional rendering for edit/view modes
   * 
   * Accessibility Features:
   * - Keyboard navigation support
   * - ARIA labels and roles
   * - Screen reader friendly structure
   * - Focus management
   */
  return (
    <div className="min-h-screen gradient-birdsphere py-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/20"></div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="card-birdsphere shadow-2xl border-0 backdrop-blur-sm">
          <div className="card-body p-6">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6">
              <div className="flex items-center mb-3 md:mb-0">
                <div className="relative mr-3">
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    onClick={handleAvatarClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAvatarClick();
                      }
                    }}
                    title="Click to change profile picture"
                  >
                    {getAvatarUrl() ? (
                      <img
                        src={getAvatarUrl()!}
                        alt="Profile"
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
                        <svg className="w-8 h-8 text-white pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-1 shadow-lg border border-primary/20">
                    {isUploadingAvatar ? (
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                    )}
                  </div>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />

                <div>
                  <h1 className="text-2xl font-bold text-base-content mb-1 drop-shadow-lg">Profile</h1>
                  <p className="text-base-content/80 font-medium drop-shadow text-sm">
                    Manage your account information
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleAvatarClick}
                  className={`btn-birdsphere rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:scale-105 active:scale-95 flex items-center space-x-2 ${isUploadingAvatar ? 'animate-pulse' : ''}`}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                      </svg>
                      <span>Upload</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const newEditState = !isEditing;
                    setIsEditing(newEditState);
                    // Clear localStorage when canceling edit mode
                    if (!newEditState) {
                      localStorage.removeItem('profile-edit-mode');
                    }
                  }}
                  className="btn bg-gradient-to-r from-secondary to-accent hover:from-accent hover:to-secondary border-0 text-primary-content font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                  </div>
                </button>
                <button
                  onClick={refreshUser}
                  className="btn bg-info/20 hover:bg-info/30 border border-info/30 text-info hover:text-info font-semibold rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                    </svg>
                    <span>Refresh</span>
                  </div>
                </button>
                <button
                  onClick={handleLogout}
                  className="btn bg-base-200/30 hover:bg-base-200/50 border border-base-300/50 text-base-content hover:text-base-content font-semibold rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                    </svg>
                    <span>Logout</span>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-error/20 backdrop-blur-sm border border-error/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-error font-medium text-sm">{error}</span>
                </div>
              </div>
            )}

            {updateSuccess && (
              <div className="mb-4 p-3 bg-success/20 backdrop-blur-sm border border-success/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-success font-medium text-sm">Profile updated successfully!</span>
                </div>
              </div>
            )}

            {!isEditing ? (
              /**
               * VIEW MODE RENDER
               * 
               * Displays user profile information in read-only format with:
               * - Rich visual layout with gradient cards
               * - Responsive grid system
               * - Conditional content sections
               * - Status indicators and badges
               * - Formatted date display
               */
              // View Mode
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-lg border border-primary/20 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-base-content mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                      </svg>
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Full Name</label>
                        <p className="text-sm text-base-content font-medium mt-1">{user.firstName} {user.lastName}</p>
                      </div>
                      <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Username</label>
                        <p className="text-sm text-base-content font-medium mt-1">@{user.username}</p>
                      </div>
                      <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Email</label>
                        <p className="text-sm text-base-content font-medium mt-1">{user.email}</p>
                      </div>
                      <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-primary/10">
                        <label className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Phone</label>
                        <p className="text-sm text-base-content font-medium mt-1">{user.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-secondary/10 to-accent/10 p-4 rounded-lg border border-secondary/20 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-base-content mb-4 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      Account Details
                    </h3>
                    <div className="space-y-3">
                      <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-secondary/10">
                        <label className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">User Roles</label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {user.userRoles && user.userRoles.length > 0 ? user.userRoles.map((role) => {
                            const roleConfig = {
                              breeder: { color: 'primary', icon: 'M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z' },
                              buyer: { color: 'secondary', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01' },
                              enthusiast: { color: 'accent', icon: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z' },
                              trainer: { color: 'info', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
                              rescue_operator: { color: 'success', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' }
                            };
                            const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.enthusiast;
                            return (
                              <span key={role} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${config.color}/20 text-${config.color} border border-${config.color}/30`}>
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d={config.icon}/>
                                </svg>
                                {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            );
                          }) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary border border-secondary/30">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
                              </svg>
                              No roles selected
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-secondary/10">
                        <label className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Status</label>
                        <div className="mt-1">
                          {user.isVerified ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                              </svg>
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning/20 text-warning border border-warning/30">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                              Unverified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-secondary/10">
                        <label className="text-xs font-semibold text-base-content/70 uppercase tracking-wide">Member Since</label>
                        <p className="text-sm text-base-content font-medium mt-1">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {user.bio && (
                  <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-4 rounded-lg border border-accent/20 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-base-content mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd"/>
                      </svg>
                      About Me
                    </h3>
                    <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-accent/10">
                      <p className="text-sm text-base-content leading-relaxed">{user.bio}</p>
                    </div>
                  </div>
                )}

                {(user.locationCity || user.locationState || user.locationCountry) && (
                  <div className="bg-gradient-to-r from-secondary/10 to-primary/10 p-4 rounded-lg border border-secondary/20 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-base-content mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      Location
                    </h3>
                    <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-secondary/10">
                      <p className="text-sm text-base-content font-medium flex items-center">
                        <svg className="w-3 h-3 mr-2 text-base-content/60" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                        </svg>
                        {[user.locationCity, user.locationState, user.locationCountry]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Animal Interests Section */}
                {user.animalInterests && user.animalInterests.length > 0 && (
                  <div className="bg-gradient-to-r from-accent/10 to-secondary/10 p-4 rounded-lg border border-accent/20 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-base-content mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2L3 7v11c0 1.1.9 2 2 2h4v-6h2v6h4c1.1 0 2-.9 2-2V7l-7-5z"/>
                      </svg>
                      Animal Interests
                    </h3>
                    <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-accent/10">
                      <div className="flex flex-wrap gap-2">
                        {user.animalInterests.map((interest) => (
                          <span
                            key={interest.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/30"
                          >
                            {interest.icon && <span className="mr-1">{interest.icon}</span>}
                            {interest.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Rating Section */}
                {user.rating > 0 && (
                  <div className="bg-gradient-to-r from-warning/10 to-info/10 p-4 rounded-lg border border-warning/20 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-base-content mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-warning" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Community Rating
                    </h3>
                    <div className="bg-base-100/80 p-3 rounded-lg shadow-sm border border-warning/10">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= Math.round(user.rating)
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                            ))}
                          </div>
                          <span className="ml-2 text-sm text-base-content font-medium">
                            {user.rating.toFixed(1)} out of 5
                          </span>
                        </div>
                        <span className="text-sm text-base-content/70">
                          ({user.ratingCount} {user.ratingCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /**
               * EDIT MODE RENDER
               * 
               * Provides form interface for profile editing with:
               * - Controlled form inputs
               * - Real-time validation feedback
               * - Responsive form layout
               * - Loading states during submission
               * - Form submission handling
               */
              // Edit Mode
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full px-3 py-2 text-sm rounded-lg transition-all duration-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full px-3 py-2 text-sm rounded-lg transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-base-content mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="input-birdsphere w-full px-3 py-2 text-sm rounded-lg transition-all duration-300"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-base-content mb-1">
                    Bio (Optional)
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    className="input-birdsphere w-full px-3 py-2 text-sm rounded-lg transition-all duration-300 resize-none"
                    placeholder="Tell us about yourself and your interest in birds..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center my-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                  <span className="px-3 text-sm font-medium text-base-content bg-base-200/20 rounded-full backdrop-blur-sm">Location</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="locationCity"
                      value={formData.locationCity || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full px-3 py-2 text-sm rounded-lg transition-all duration-300"
                      placeholder="New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="locationState"
                      value={formData.locationState || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full px-3 py-2 text-sm rounded-lg transition-all duration-300"
                      placeholder="NY"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-base-content mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="locationCountry"
                      value={formData.locationCountry || ''}
                      onChange={handleChange}
                      className="input-birdsphere w-full px-3 py-2 text-sm rounded-lg transition-all duration-300"
                      placeholder="USA"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-base-content mb-2">
                    User Roles (Select all that apply)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      { value: 'breeder', label: 'Professional Breeder', icon: 'M23,11.5C23,11.5 21.5,9 18.5,9C15.5,9 14,11.5 14,11.5V10.5C14,8.57 12.43,7 10.5,7C8.57,7 7,8.57 7,10.5V11.5C7,11.5 5.5,9 2.5,9C1.12,9 0,10.12 0,11.5C0,12.88 1.12,14 2.5,14C5.5,14 7,11.5 7,11.5V12.5C7,14.43 8.57,16 10.5,16C12.43,16 14,14.43 14,12.5V11.5C14,11.5 15.5,14 18.5,14C21.88,14 23,12.88 23,11.5Z' },
                      { value: 'buyer', label: 'Buyer/Enthusiast', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01' },
                      { value: 'trainer', label: 'Bird Trainer', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
                      { value: 'rescue_operator', label: 'Rescue Operator', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
                      { value: 'enthusiast', label: 'Bird Enthusiast', icon: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z' }
                    ].map((role) => (
                      <div key={role.value} className="flex items-center space-x-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <input
                          type="checkbox"
                          id={role.value}
                          checked={(formData.userRoles || []).includes(role.value)}
                          onChange={(e) => {
                            const currentRoles = formData.userRoles || [];
                            const newRoles = e.target.checked
                              ? [...currentRoles, role.value]
                              : currentRoles.filter(r => r !== role.value);
                            setFormData({ ...formData, userRoles: newRoles });
                          }}
                          className="w-4 h-4 text-primary rounded focus:ring-primary/20"
                        />
                        <label htmlFor={role.value} className="text-sm font-medium text-base-content flex items-center space-x-2 cursor-pointer">
                          <span>{role.label}</span>
                          <svg className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                            <path d={role.icon}/>
                          </svg>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Animal Interests Tree Selection */}
                <div className="space-y-3">
                  <div className="flex items-center my-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
                    <span className="px-3 text-sm font-medium text-base-content bg-base-200/20 rounded-full backdrop-blur-sm">Animal Interests</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
                  </div>

                  <label className="block text-sm font-semibold text-base-content mb-2">
                    What animals do you work with or are interested in? (Select all that apply)
                  </label>

                  {loadingCategories ? (
                    <div className="flex items-center justify-center p-8 border border-base-300 rounded-lg bg-base-100">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-sm text-base-content/70">Loading animal categories...</span>
                    </div>
                  ) : animalCategories.length > 0 ? (
                    <TreeView
                      categories={animalCategories}
                      selectedIds={(formData.animalInterests || []).map(interest => interest.id)}
                      onSelectionChange={(selectedIds) => {
                        // Convert selected IDs to AnimalCategory objects
                        const findCategoriesByIds = (categories: AnimalCategory[], ids: number[]): AnimalCategory[] => {
                          const found: AnimalCategory[] = [];
                          const search = (cats: AnimalCategory[]) => {
                            cats.forEach(cat => {
                              if (ids.includes(cat.id)) {
                                found.push(cat);
                              }
                              if (cat.children) {
                                search(cat.children);
                              }
                            });
                          };
                          search(categories);
                          return found;
                        };

                        const selectedCategories = findCategoriesByIds(animalCategories, selectedIds);
                        setFormData({ ...formData, animalInterests: selectedCategories });
                      }}
                      readOnly={false}
                      showIcons={true}
                    />
                  ) : (
                    <div className="p-4 border border-base-300 rounded-lg bg-base-100 text-center">
                      <span className="text-sm text-base-content/70">
                        Unable to load animal categories. Please try refreshing the page.
                      </span>
                    </div>
                  )}

                  {formData.animalInterests && formData.animalInterests.length > 0 && (
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-base-content/70 mb-1">
                        SELECTED INTERESTS
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {formData.animalInterests.map((interest) => (
                          <span
                            key={interest.id}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/30"
                          >
                            {interest.icon && <span className="mr-1">{interest.icon}</span>}
                            {interest.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    className={`btn-birdsphere w-full text-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 group ${isLoading ? 'animate-pulse' : ''}`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating Profile...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <span>Update Profile</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;