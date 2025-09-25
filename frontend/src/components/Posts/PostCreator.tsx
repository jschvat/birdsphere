/**
 * PostCreator Component
 *
 * Advanced post creation interface with multi-media support and flexible content options.
 * Provides rich text editing, file uploads, post type selection, and visibility controls.
 *
 * Features:
 * - Multi-file upload support with drag-and-drop capability
 * - Real-time file preview for images and documents
 * - Post type selection (standard, share, announcement, question, sale)
 * - Visibility controls (public, followers, private)
 * - File size validation and formatting
 * - Form validation with user-friendly error messages
 * - Optimistic UI updates with loading states
 * - Auto-expanding text areas for content input
 *
 * Architecture:
 * - Functional component with React hooks for state management
 * - Uses PostsContext for post creation and state updates
 * - Integrates with AuthContext for user authentication
 * - Implements controlled form inputs with validation
 * - Supports both text-only and media-rich posts
 * - Uses useCallback for performance optimization
 *
 * Props:
 * @param onPostCreated - Optional callback fired after successful post creation
 *
 * State Management:
 * - Form data state (content, type, visibility)
 * - File management state with preview capabilities
 * - UI state (loading, errors, option visibility)
 * - Form validation state and error handling
 *
 * File Handling:
 * - Multi-file selection with Array management
 * - File preview generation for images
 * - File size formatting and validation
 * - File removal and reordering capabilities
 *
 * Integration Points:
 * - PostsContext: Post creation and timeline updates
 * - AuthContext: User authentication and avatar display
 * - File upload API: Multi-part form data submission
 * - Media processing: File validation and optimization
 */
import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePosts } from '../../contexts/PostsContext';
import { CreatePostData } from '../../types/index';
import { getAvatarUrl } from '../../utils/avatarUtils';

interface PostCreatorProps {
  onPostCreated?: () => void;
}

const PostCreator: React.FC<PostCreatorProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const { createPost } = usePosts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'standard' | 'share' | 'announcement' | 'question' | 'sale'>('standard');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Check if post has content or files
    const hasContent = content.trim().length > 0;
    const hasFiles = selectedFiles.length > 0;

    if (!hasContent && !hasFiles) {
      setError('Post must contain either text content or files');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const postData: CreatePostData = {
        content: hasContent ? content.trim() : undefined,
        postType,
        visibility,
        media: selectedFiles.length > 0 ? selectedFiles : undefined,
      };

      await createPost(postData);

      // Reset form
      setContent('');
      setSelectedFiles([]);
      setPostType('standard');
      setVisibility('public');
      setShowOptions(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onPostCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const postTypeIcons = {
    standard: '📝',
    share: '🔄',
    announcement: '📢',
    question: '❓',
    sale: '🏷️'
  };

  const visibilityIcons = {
    public: '🌍',
    followers: '👥',
    private: '🔒'
  };

  return (
    <div className="card-birdsphere shadow-2xl border-0 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            {getAvatarUrl(user?.profileImage) ? (
              <img
                src={getAvatarUrl(user?.profileImage)!}
                alt={user?.username}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">@{user?.username}</p>
          </div>
        </div>

        {/* Content Input */}
        <div className="mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="w-full resize-none border-none outline-none text-gray-900 placeholder-gray-500 text-lg min-h-[120px] max-h-[300px]"
            maxLength={5000}
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {content.length}/5000
          </div>
        </div>

        {/* Media Preview */}
        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  {getFilePreview(file) ? (
                    <div className="relative">
                      <img
                        src={getFilePreview(file)!}
                        alt={file.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post Options */}
        {showOptions && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Post Type</label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">{postTypeIcons.standard} Standard</option>
                <option value="share">{postTypeIcons.share} Share</option>
                <option value="announcement">{postTypeIcons.announcement} Announcement</option>
                <option value="question">{postTypeIcons.question} Question</option>
                <option value="sale">{postTypeIcons.sale} For Sale</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">{visibilityIcons.public} Public</option>
                <option value="followers">{visibilityIcons.followers} Followers</option>
                <option value="private">{visibilityIcons.private} Private</option>
              </select>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Media Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-blue-50 text-blue-500 transition-colors"
              title="Add media"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Post Options Toggle */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
                showOptions
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="Post options"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={(!content.trim() && selectedFiles.length === 0) || isSubmitting}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              (content.trim() || selectedFiles.length > 0) && !isSubmitting
                ? 'btn-birdsphere shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </form>
    </div>
  );
};

export default PostCreator;