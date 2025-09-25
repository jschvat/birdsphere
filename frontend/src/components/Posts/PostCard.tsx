/**
 * PostCard Component
 *
 * Individual post display component with comprehensive social interaction features.
 * Handles post rendering, editing, reactions, comments, and user interactions.
 *
 * Features:
 * - Post content display with rich media support
 * - Real-time reaction system with 7 reaction types
 * - Inline post editing for post owners
 * - Comment thread management
 * - User avatar and profile integration
 * - Relative timestamp formatting
 * - Post type indicators and visibility controls
 * - Delete confirmation with safety checks
 *
 * Architecture:
 * - Uses PostsContext for state management
 * - Integrates with AuthContext for user permissions
 * - Leverages React hooks for local component state
 * - Implements optimistic UI updates for reactions
 * - Responsive design with Tailwind CSS classes
 *
 * Props:
 * @param post - Complete post object with metadata, reactions, and content
 *
 * State Management:
 * - Local editing state for inline post updates
 * - Reaction picker visibility and positioning
 * - Comment section toggle and management
 * - Loading states for async operations
 *
 * Integration Points:
 * - PostsContext: Post CRUD operations and reaction management
 * - AuthContext: User authentication and permission checks
 * - ReactionPicker: Modal reaction selection interface
 * - CommentsSection: Threaded comment display and interaction
 * - MediaDisplay: Rich media content rendering
 */
import React, { useState, useRef } from 'react';
import { Post } from '../../types';
import { usePosts } from '../../contexts/PostsContext';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../utils/avatarUtils';
import ReactionPicker from './ReactionPicker';
import CommentsSection from './CommentsSection';
import MediaDisplay from '../Media/MediaDisplay';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth();
  const { updatePost, deletePost, addReaction } = usePosts();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);

  const isOwner = user?.id === post.userId;

  const postTypeEmojis = {
    standard: '',
    share: '🔄',
    announcement: '📢',
    question: '❓',
    sale: '💰'
  };

  const getUserReaction = () => {
    if (!post.reactions || !user) return null;
    return post.reactions.find(r => r.userId === user.id)?.reactionType || null;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTopReactions = () => {
    if (!post.reactionCounts) return [];

    return Object.entries(post.reactionCounts)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  const handleUpdate = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      await updatePost(post.id, { content: editContent });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePost(post.id);
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) return;

    try {
      await addReaction(post.id, reactionType);
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {getAvatarUrl(post.author.profileImage) ? (
              <img
                src={getAvatarUrl(post.author.profileImage) || ''}
                alt={`${post.author.firstName} ${post.author.lastName}`}
                className="h-10 w-10 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-500 flex items-center justify-center border border-gray-200">
                <span className="text-white font-semibold text-sm">
                  {post.author.firstName[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {post.author.firstName} {post.author.lastName}
              </p>
              <span className="text-gray-400">•</span>
              <p className="text-sm text-gray-500 truncate">@{post.author.username}</p>
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-500">{formatTimestamp(post.createdAt)}</p>
              {post.postType !== 'standard' && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs text-gray-500 flex items-center">
                    {postTypeEmojis[post.postType]} {post.postType}
                  </span>
                </>
              )}
              {post.visibility !== 'public' && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{post.visibility}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Post Options */}
        {isOwner && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpdate}
              className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
              title={isEditing ? "Save changes" : "Edit post"}
            >
              {isEditing ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post.content);
                }}
                className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                title="Cancel editing"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete post"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="What's on your mind?"
          />
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        )}
      </div>

      {/* Media Section */}
      {post.media && post.media.length > 0 && (
        <div className="px-4 pb-3">
          <MediaDisplay media={post.media} maxHeight="400px" />
        </div>
      )}

      {/* Engagement Bar */}
      <div className="px-4 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Reactions Summary */}
            {getTopReactions().length > 0 && (
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                {getTopReactions().map(([reaction, count]) => (
                  <span key={reaction} className="flex items-center">
                    {reaction === 'like' && '👍'}
                    {reaction === 'love' && '❤️'}
                    {reaction === 'laugh' && '😂'}
                    {reaction === 'wow' && '😮'}
                    {reaction === 'sad' && '😢'}
                    {reaction === 'angry' && '😡'}
                    {reaction === 'hug' && '🤗'}
                    <span className="ml-1">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {post.commentCount > 0 && (
              <button
                onClick={toggleComments}
                className="hover:text-blue-600 hover:underline cursor-pointer transition-colors"
              >
                {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
              </button>
            )}
            {post.shareCount > 0 && (
              <span>{post.shareCount} share{post.shareCount === 1 ? '' : 's'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Reaction Button */}
            <div className="relative">
              <button
                ref={reactionButtonRef}
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  getUserReaction()
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{getUserReaction() || 'React'}</span>
              </button>

              {showReactionPicker && (
                <ReactionPicker
                  onReactionSelect={handleReaction}
                  currentReaction={getUserReaction()}
                  isOpen={showReactionPicker}
                  onClose={() => setShowReactionPicker(false)}
                  triggerRef={reactionButtonRef}
                />
              )}
            </div>

            {/* Comment Button */}
            <button
              onClick={toggleComments}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Comment</span>
            </button>

            {/* Share Button */}
            <button
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => {
                // TODO: Implement share functionality
                console.log('Share functionality not implemented yet');
              }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <CommentsSection postId={post.id} onToggleComments={toggleComments} />
        </div>
      )}
    </article>
  );
};

export default PostCard;