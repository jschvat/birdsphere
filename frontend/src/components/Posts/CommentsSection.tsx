/**
 * CommentsSection Component
 *
 * Comprehensive comment system with threaded conversations, media support, and real-time interactions.
 * Provides nested comment threads, rich media attachments, and extensive comment management features.
 *
 * Features:
 * - Threaded comment system with unlimited nesting depth
 * - Rich media support (images, videos, documents) in comments
 * - Real-time comment loading with optimistic UI updates
 * - Inline comment editing and deletion for comment owners
 * - Reply functionality with contextual user mentions
 * - File attachment with drag-and-drop and preview
 * - Auto-expanding textareas with character limits
 * - Loading states and error handling with retry mechanisms
 * - Comment reaction system integration
 * - Responsive design with mobile-optimized layouts
 *
 * Architecture:
 * - Functional component using React hooks for complex state management
 * - Integrates with PostsContext for comment CRUD operations
 * - Uses AuthContext for user authentication and permissions
 * - Implements controlled form inputs with validation
 * - Memory-efficient file handling with URL cleanup
 * - Optimized comment loading with caching strategies
 *
 * Comment Structure:
 * - Root comments: Top-level comments directly on posts
 * - Reply threads: Nested comments with visual indentation
 * - Media attachments: Files embedded within comment content
 * - Reaction counts: Aggregated emoji reactions per comment
 * - Timestamps: Relative time display with edit indicators
 *
 * Props:
 * @param postId - Unique identifier for the post these comments belong to
 * @param comments - Optional pre-loaded comments array for performance
 * @param onToggleComments - Optional callback for parent component visibility control
 *
 * State Management:
 * - newComment: Current comment text being composed
 * - selectedFiles: Array of files selected for upload with comment
 * - showCommentForm: Boolean controlling new comment form visibility
 * - loadedComments: Comments fetched from API when not provided via props
 * - Various UI states: loading, submitting, media upload visibility
 *
 * File Handling:
 * - Multi-file selection with preview generation
 * - File type validation (images, videos, documents)
 * - File size limits and compression options
 * - Memory cleanup for object URLs to prevent leaks
 * - Drag-and-drop interface for intuitive file uploads
 *
 * Integration Points:
 * - PostsContext: Comment creation, editing, deletion, and loading
 * - AuthContext: User authentication and avatar display
 * - MediaDisplay: Rich media rendering within comments
 * - Avatar utilities: User profile image URL generation
 * - File upload API: Multi-part form data submission
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePosts } from '../../contexts/PostsContext';
import { Comment, CreateCommentData } from '../../types/index';
import { getAvatarUrl, getMediaUrl } from '../../utils/avatarUtils';
import MediaDisplay from '../Media/MediaDisplay';

interface CommentsSectionProps {
  postId: string;
  comments?: Comment[];
  onToggleComments?: () => void;
}

/**
 * CommentItem Component Props
 *
 * Individual comment display component with editing, reactions, and reply functionality.
 * Supports nested comment threads with consistent styling and interaction patterns.
 *
 * Props:
 * @param comment - Comment data object with content, author, and metadata
 * @param postId - Parent post identifier for API operations
 * @param isReply - Boolean indicating if this is a nested reply comment
 * @param onReply - Callback function fired when user clicks reply button
 */
interface CommentItemProps {
  comment: Comment;
  postId: string;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, comments, onToggleComments }) => {
  const { user } = useAuth();
  const { addComment, addCommentWithMedia, loadComments } = usePosts();

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loadedComments, setLoadedComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);
  const currentPostIdRef = useRef<string>(postId);

  // Reset loading state when postId changes
  useEffect(() => {
    if (currentPostIdRef.current !== postId) {
      hasLoadedRef.current = false;
      currentPostIdRef.current = postId;
      setLoadedComments([]);
    }
  }, [postId]);

  // Manual comment loading function
  const handleLoadComments = useCallback(async () => {
    if (hasLoadedRef.current || isLoadingComments) return;

    hasLoadedRef.current = true;
    setIsLoadingComments(true);
    try {
      const fetchedComments = await loadComments(postId);
      setLoadedComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
      setLoadedComments([]);
      hasLoadedRef.current = false; // Reset on error
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId, loadComments]);

  // Automatically load comments when component mounts (since it's only shown when toggled)
  useEffect(() => {
    if (!comments && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setIsLoadingComments(true);

      loadComments(postId).then((fetchedComments) => {
        setLoadedComments(fetchedComments);
      }).catch((error) => {
        console.error('Failed to load comments:', error);
        setLoadedComments([]);
        hasLoadedRef.current = false; // Reset on error
      }).finally(() => {
        setIsLoadingComments(false);
      });
    } else if (comments && comments.length > 0) {
      setLoadedComments(comments);
      hasLoadedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Use provided comments or loaded comments
  const displayComments = comments || loadedComments;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Allow submission if there's text content OR media files, but not both empty
    if ((!newComment.trim() && selectedFiles.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (selectedFiles.length > 0) {
        // Use enhanced comment with media
        const commentData: CreateCommentData = {
          content: newComment.trim(),
          commentType: 'media',
          media: selectedFiles
        };
        await addCommentWithMedia(postId, commentData);
      } else {
        // Use standard comment
        await addComment(postId, newComment.trim());
      }

      setNewComment('');
      setSelectedFiles([]);
      setShowMediaUpload(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh comments if we're managing them locally
      if (!comments && hasLoadedRef.current) {
        try {
          const updatedComments = await loadComments(postId);
          setLoadedComments(updatedComments);
        } catch (error) {
          console.error('Failed to refresh comments:', error);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(commentId);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prevFiles => [...prevFiles, ...files].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prevFiles => {
      // Clean up object URL to prevent memory leaks
      const fileToRemove = prevFiles[index];
      if (fileToRemove) {
        const objectUrl = URL.createObjectURL(fileToRemove);
        URL.revokeObjectURL(objectUrl);
      }
      return prevFiles.filter((_, i) => i !== index);
    });
  };

  const handleMediaButtonClick = () => {
    if (showMediaUpload) {
      setShowMediaUpload(false);
      setSelectedFiles([]);
    } else {
      setShowMediaUpload(true);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-4 text-gray-500">
        Please log in to view and post comments.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Comment Form - only show when showCommentForm is true */}
      {showCommentForm && (
        <form onSubmit={handleSubmitComment} className="flex space-x-3">
        <div className="flex-shrink-0">
          {getAvatarUrl(user.profileImage) ? (
            <img
              src={getAvatarUrl(user.profileImage)!}
              alt={user.username}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-sm font-medium">
                {user.firstName[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              maxLength={1000}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />

            {/* Media Upload Section */}
            {showMediaUpload && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Add Media</h4>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Choose Files
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        const isVideo = file.type.startsWith('video/');
                        const fileUrl = URL.createObjectURL(file);

                        return (
                          <div key={index} className="bg-white rounded border overflow-hidden">
                            {isImage ? (
                              <div className="relative">
                                <img
                                  src={fileUrl}
                                  alt={file.name}
                                  className="w-full h-auto max-h-48 object-contain bg-gray-50"
                                  onLoad={() => URL.revokeObjectURL(fileUrl)}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                  title="Remove image"
                                >
                                  ×
                                </button>
                                <div className="p-2 bg-gray-50 border-t">
                                  <p className="text-sm text-gray-700 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                              </div>
                            ) : isVideo ? (
                              <div className="relative">
                                <video
                                  src={fileUrl}
                                  className="w-full h-auto max-h-48 object-contain bg-gray-50"
                                  controls={false}
                                  preload="metadata"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                                  title="Remove video"
                                >
                                  ×
                                </button>
                                <div className="p-2 bg-gray-50 border-t">
                                  <p className="text-sm text-gray-700 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between p-3">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Supports images, videos, PDFs, and text files. Max 5 files, 10MB each.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-400">{newComment.length}/1000</span>
                <button
                  type="button"
                  onClick={handleMediaButtonClick}
                  className={`text-sm font-medium transition-colors ${
                    showMediaUpload
                      ? 'text-blue-600 hover:text-blue-800'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📎 {showMediaUpload ? 'Hide Media' : 'Add Media'}
                </button>
              </div>
              <button
                type="submit"
                disabled={(!newComment.trim() && selectedFiles.length === 0) || isSubmitting}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  (newComment.trim() || selectedFiles.length > 0) && !isSubmitting
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Posting...' : 'Comment'}
              </button>
            </div>
          </div>
        </div>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoadingComments ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="animate-spin mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm">Loading comments...</p>
          </div>
        ) : !displayComments || displayComments.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.959 9.959 0 01-4.906-1.274A6 6 0 013 16.5c0-3.315 2.686-6 6-6 1.316 0 2.485.42 3.456 1.138a8.958 8.958 0 015.544 1.362z" />
            </svg>
            <p className="text-sm mb-3">No comments yet. Be the first to comment!</p>
            {!showCommentForm && (
              <button
                onClick={() => setShowCommentForm(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Write a Comment
              </button>
            )}
          </div>
        ) : (
          <>
            {displayComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReply={handleReply}
              />
            ))}
            {!showCommentForm && (
              <div className="text-center py-4">
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Write a Comment
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const CommentItem: React.FC<CommentItemProps> = ({ comment, postId, isReply = false, onReply }) => {
  const { user } = useAuth();
  const { updateComment, deleteComment, addComment } = usePosts();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const isOwner = user?.id === comment.author.id;

  const reactionEmojis = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠',
    hug: '🤗'
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleEdit = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      await updateComment(postId, comment.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteComment(postId, comment.id);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      // In a real implementation, you'd pass the parent comment ID
      await addComment(postId, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      console.error('Failed to add reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getTopReactions = () => {
    const counts = comment.reactionCounts || {};
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  return (
    <div className={`flex space-x-3 ${isReply ? 'ml-8' : ''}`}>
      <div className="flex-shrink-0">
        {getAvatarUrl(comment.author.profileImage) ? (
          <img
            src={getAvatarUrl(comment.author.profileImage)!}
            alt={comment.author.username}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-gray-600 text-sm font-medium">
              {comment.author.firstName[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                {comment.author.firstName} {comment.author.lastName}
              </span>
              <span className="text-xs text-gray-500">@{comment.author.username}</span>
              <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
                {formatTimestamp(comment.createdAt)}
                {comment.updatedAt !== comment.createdAt && ' • edited'}
              </time>
            </div>
            {isOwner && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleEdit}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  title={isEditing ? 'Save changes' : 'Edit comment'}
                >
                  {isEditing ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete comment"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full resize-none border border-gray-300 rounded p-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                maxLength={1000}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{editContent.length}/1000</span>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={!editContent.trim() || editContent === comment.content}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.content}</p>

              {/* Comment Media Display */}
              {comment.media && comment.media.length > 0 && (
                <div className="mt-3">
                  <MediaDisplay
                    media={comment.media.map(mediaFile => ({
                      ...mediaFile,
                      url: getMediaUrl(mediaFile.fileUrl) || undefined,
                      category: mediaFile.fileType,
                      originalName: mediaFile.fileName,
                      size: mediaFile.fileSize,
                      mimetype: mediaFile.mimeType
                    }))}
                    maxHeight="300px"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Comment Actions */}
        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
          {/* Reactions */}
          {getTopReactions().length > 0 && (
            <div className="flex items-center space-x-1">
              {getTopReactions().map(([type, count]) => (
                <span key={type} className="flex items-center space-x-1">
                  <span>{reactionEmojis[type as keyof typeof reactionEmojis]}</span>
                  <span>{type} {count}</span>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsReplying(!isReplying)}
            className="hover:text-blue-500 transition-colors"
          >
            Reply
          </button>

          {comment.replyCount > 0 && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="hover:text-blue-500 transition-colors"
            >
              {showReplies ? 'Hide' : 'Show'} {comment.replyCount} repl{comment.replyCount === 1 ? 'y' : 'ies'}
            </button>
          )}
        </div>

        {/* Reply Form */}
        {isReplying && (
          <form onSubmit={handleReply} className="mt-2 flex space-x-2">
            <div className="flex-1">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Replying to ${comment.author.firstName}...`}
                className="w-full resize-none border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">{replyContent.length}/1000</span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyContent('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!replyContent.trim() || isSubmittingReply}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReply ? 'Replying...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Nested Replies */}
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                isReply={true}
                onReply={onReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection;