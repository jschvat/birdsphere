import React, { useState, useRef } from 'react';
import { Post } from '../../types';
import { usePosts } from '../../contexts/PostsContext';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../utils/avatarUtils';
import ReactionPicker from './ReactionPicker';

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
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);

  const isOwner = user?.id === post.userId;

  const postTypeEmojis = {
    standard: '',
    share: '🔄',
    announcement: '📢',
    question: '❓',
    sale: '💰'
  };

  const visibilityIcons = {
    public: '🌍',
    followers: '👥',
    private: '🔒'
  };

  const reactionEmojis = {
    like: '👍',
    love: '❤️',
    laugh: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😠',
    hug: '🤗'
  };

  const handleEdit = async () => {
    if (isEditing) {
      if (editContent.trim() !== post.content) {
        try {
          await updatePost(post.id, { content: editContent.trim() });
        } catch (error) {
          console.error('Failed to update post:', error);
        }
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      setIsDeleting(true);
      try {
        await deletePost(post.id);
      } catch (error) {
        console.error('Failed to delete post:', error);
        setIsDeleting(false);
      }
    }
  };

  const handleReaction = async (reactionType: string) => {
    try {
      await addReaction(post.id, reactionType);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
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
    const counts = post.reactionCounts || {};
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  };

  const userReaction = getUserReaction();

  const getReactionDisplay = () => {
    const topReactions = getTopReactions();
    if (topReactions.length === 0) return null;

    return (
      <div className="flex items-center space-x-1">
        <div className="flex -space-x-1">
          {topReactions.slice(0, 3).map(([type]) => (
            <div
              key={type}
              className="w-5 h-5 bg-white rounded-full border border-white flex items-center justify-center text-xs"
            >
              {reactionEmojis[type as keyof typeof reactionEmojis]}
            </div>
          ))}
        </div>
        <span className="text-sm text-gray-600 ml-2">
          {Object.values(post.reactionCounts || {}).reduce((a, b) => a + b, 0)}
        </span>
      </div>
    );
  };

  return (
    <article className="bg-white rounded-lg shadow-sm border-2 border-green-200 mb-4 overflow-hidden hover:shadow-md hover:border-green-300 transition-all duration-200">
      {/* Post Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getAvatarUrl(post.author.profileImage) ? (
                <img
                  src={getAvatarUrl(post.author.profileImage)!}
                  alt={post.author.username}
                  className="h-10 w-10 rounded-full object-cover border-2 border-gray-100"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center border-2 border-gray-100">
                  <span className="text-white font-semibold text-sm">
                    {post.author.firstName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-gray-900 hover:underline cursor-pointer">
                  {post.author.firstName} {post.author.lastName}
                </h3>
                {false && (
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>@{post.author.username}</span>
                <span>•</span>
                <time dateTime={post.createdAt} className="hover:underline cursor-pointer">
                  {formatTimestamp(post.createdAt)}
                  {post.updatedAt !== post.createdAt && ' (edited)'}
                </time>
                {post.postType !== 'standard' && (
                  <>
                    <span>•</span>
                    <span title={`${post.postType} post`}>
                      {postTypeEmojis[post.postType]}
                    </span>
                  </>
                )}
                <span title={`${post.visibility} visibility`} className="text-xs">
                  {visibilityIcons[post.visibility]}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          {isOwner && (
            <div className="flex items-center space-x-1">
              <button
                onClick={handleEdit}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
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
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Delete post"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full resize-none border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={5000}
              placeholder="What's on your mind?"
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {editContent.length}/5000 characters
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={editContent.trim() === '' || editContent.length > 5000}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>
        )}

        {/* Media Display */}
        {post.media && post.media.length > 0 && (
          <div className="mt-3">
            {post.media.length === 1 ? (
              // Single image - full width
              <div className="relative">
                <img
                  src={`http://localhost:3000${post.media[0].fileUrl || post.media[0].url}`}
                  alt={post.media[0].fileName || post.media[0].originalName}
                  className="w-full max-h-96 object-cover rounded-lg"
                  loading="lazy"
                />
              </div>
            ) : (
              // Multiple images - grid layout
              <div className={`grid gap-2 rounded-lg overflow-hidden ${
                post.media.length === 2 ? 'grid-cols-2' :
                post.media.length === 3 ? 'grid-cols-2' :
                'grid-cols-2'
              }`}>
                {post.media.slice(0, 4).map((mediaItem, index) => (
                  <div
                    key={mediaItem.id}
                    className={`relative ${
                      post.media && post.media.length === 3 && index === 0 ? 'row-span-2' : ''
                    } ${
                      post.media && post.media.length > 4 && index === 3 ? 'relative' : ''
                    }`}
                  >
                    <img
                      src={`http://localhost:3000${mediaItem.fileUrl || mediaItem.url}`}
                      alt={mediaItem.fileName || mediaItem.originalName}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                    {post.media && post.media.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          +{post.media.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Engagement Bar */}
      {!isEditing && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getReactionDisplay()}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{post.commentCount || 0} comments</span>
              <span>{post.shareCount || 0} shares</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isEditing && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {/* Like Button with Reaction Picker */}
              <div className="relative">
                <button
                  ref={reactionButtonRef}
                  onClick={() => {
                    if (!userReaction) {
                      handleReaction('like');
                    } else {
                      setShowReactionPicker(!showReactionPicker);
                    }
                  }}
                  onMouseEnter={() => setShowReactionPicker(true)}
                  onMouseLeave={() => {
                    // Don't auto-close on mouse leave, let user click
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    userReaction
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">
                    {userReaction ? reactionEmojis[userReaction as keyof typeof reactionEmojis] : '👍'}
                  </span>
                  <span className="text-sm font-medium">
                    {userReaction ? userReaction.charAt(0).toUpperCase() + userReaction.slice(1) : 'Like'}
                  </span>
                </button>

                <ReactionPicker
                  isOpen={showReactionPicker}
                  onClose={() => setShowReactionPicker(false)}
                  onReactionSelect={handleReaction}
                  currentReaction={userReaction}
                  triggerRef={reactionButtonRef as React.RefObject<HTMLButtonElement>}
                />
              </div>

              {/* Comment Button */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-medium">Comment</span>
              </button>

              {/* Share Button */}
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-green-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3">
            {/* Add Comment Form */}
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
                {user && getAvatarUrl(user.profileImage) ? (
                  <img
                    src={getAvatarUrl(user.profileImage)!}
                    alt={user.username}
                    className="h-8 w-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center border border-gray-200">
                    <span className="text-white font-semibold text-xs">
                      {user?.firstName[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Write a comment..."
                  className="w-full resize-none border border-gray-300 rounded-lg p-3 text-sm text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
                <div className="flex justify-end mt-2">
                  <button className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Comment
                  </button>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      {getAvatarUrl(comment.author.profileImage) ? (
                        <img
                          src={getAvatarUrl(comment.author.profileImage)!}
                          alt={comment.author.username}
                          className="h-8 w-8 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center border border-gray-200">
                          <span className="text-white font-semibold text-xs">
                            {comment.author.firstName[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">
                            {comment.author.firstName} {comment.author.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{comment.content}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 ml-3">
                        <button className="text-xs text-gray-500 hover:text-blue-600">
                          Like
                        </button>
                        <button className="text-xs text-gray-500 hover:text-blue-600">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default PostCard;