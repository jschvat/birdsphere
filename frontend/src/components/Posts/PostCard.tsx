import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePosts } from '../../contexts/PostsContext';
import { Post } from '../../types/index';
import CommentsSection from './CommentsSection';
import MediaDisplay from '../Media/MediaDisplay';
import { getAvatarUrl } from '../../utils/avatarUtils';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth();
  const { addReaction, removeReaction, deletePost, updatePost } = usePosts();

  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === post.userId;

  const reactionEmojis = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠',
    hug: '🤗'
  };

  const postTypeEmojis = {
    standard: '',
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

  const getUserReaction = useCallback(() => {
    return post.reactions?.find(r => r.userId === user?.id);
  }, [post.reactions, user?.id]);

  const handleReaction = async (reactionType: string) => {
    if (!user) return;

    const existingReaction = getUserReaction();

    try {
      if (existingReaction) {
        if (existingReaction.reactionType === reactionType) {
          // Remove reaction if clicking the same one
          await removeReaction(post.id, existingReaction.id);
        } else {
          // Remove old reaction and add new one
          await removeReaction(post.id, existingReaction.id);
          await addReaction(post.id, reactionType);
        }
      } else {
        // Add new reaction
        await addReaction(post.id, reactionType);
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  };

  const handleEdit = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      await updatePost(post.id, { content: editContent.trim() });
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
      setIsDeleting(false);
    }
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
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTopReactions = () => {
    const counts = post.reactionCounts || {};
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  const userReaction = getUserReaction();

  return (
    <article className="card-birdsphere shadow-xl border-0 backdrop-blur-sm p-3">
      {/* Post Header */}
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0">
            {getAvatarUrl(post.author.profileImage) ? (
              <img
                src={getAvatarUrl(post.author.profileImage)!}
                alt={post.author.username}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-medium text-sm">
                  {post.author.firstName[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {post.author.firstName} {post.author.lastName}
              </h3>
              <span className="text-xs text-gray-500">@{post.author.username}</span>
              {post.postType !== 'standard' && (
                <span className="text-xs" title={`${post.postType} post`}>
                  {postTypeEmojis[post.postType]}
                </span>
              )}
              <span className="text-xs" title={`${post.visibility} post`}>
                {visibilityIcons[post.visibility]}
              </span>
            </div>
            <time className="text-xs text-gray-500" dateTime={post.createdAt}>
              {formatTimestamp(post.createdAt)}
              {post.updatedAt !== post.createdAt && ' • edited'}
            </time>
          </div>
        </div>

        {/* Actions Menu */}
        {isOwner && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleEdit}
              disabled={isDeleting}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title={isEditing ? 'Save changes' : 'Edit post'}
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
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Delete post"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Post Content */}
      <div className="mb-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={5000}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{editContent.length}/5000</span>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={!editContent.trim() || editContent === post.content}
                  className="text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        )}
      </div>

      {/* Media Display */}
      {post.media && post.media.length > 0 && (
        <div className="mb-3">
          <MediaDisplay media={post.media} />
        </div>
      )}

      {/* Reaction Summary */}
      {post.reactionCounts && Object.values(post.reactionCounts).some(count => count > 0) && (
        <div className="flex items-center justify-between py-1 mb-2 border-b border-gray-100">
          <div className="flex items-center space-x-1">
            {getTopReactions().map(([type, count]) => (
              <span key={type} className="flex items-center space-x-1 text-xs text-gray-600">
                <span>{reactionEmojis[type as keyof typeof reactionEmojis]}</span>
                <span>{type} {count}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center space-x-3 text-xs text-gray-500">
            {post.commentCount > 0 && (
              <span>comment {post.commentCount}</span>
            )}
            {post.shareCount > 0 && (
              <span>{post.shareCount} share{post.shareCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1">
        {/* Reaction Buttons */}
        <div className="flex items-center space-x-1">
          {Object.entries(reactionEmojis).map(([type, emoji]) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                userReaction?.reactionType === type
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span>{emoji}</span>
              {post.reactionCounts?.[type] && (
                <span className="text-xs">{post.reactionCounts[type]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Comment and Share Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.959 9.959 0 01-4.906-1.274A6 6 0 013 16.5c0-3.315 2.686-6 6-6 1.316 0 2.485.42 3.456 1.138a8.958 8.958 0 015.544 1.362z" />
            </svg>
            <span className="text-xs">
              {showComments ? 'Hide' : 'Comment'}
            </span>
          </button>

          <button className="flex items-center space-x-1 text-gray-500 hover:text-green-500 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="text-xs">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <CommentsSection postId={post.id} comments={post.comments || []} />
        </div>
      )}
    </article>
  );
};

export default PostCard;