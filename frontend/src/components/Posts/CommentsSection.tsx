import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePosts } from '../../contexts/PostsContext';
import { Comment } from '../../types/index';
import { getAvatarUrl } from '../../utils/avatarUtils';

interface CommentsSectionProps {
  postId: string;
  comments: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, comments }) => {
  const { user } = useAuth();
  const { addComment } = usePosts();

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(postId, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(commentId);
  }, []);

  if (!user) {
    return (
      <div className="text-center py-4 text-gray-500">
        Please log in to view and post comments.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
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
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">{newComment.length}/1000</span>
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  newComment.trim() && !isSubmitting
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

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a9.959 9.959 0 01-4.906-1.274A6 6 0 013 16.5c0-3.315 2.686-6 6-6 1.316 0 2.485.42 3.456 1.138a8.958 8.958 0 015.544 1.362z" />
            </svg>
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReply={handleReply}
            />
          ))
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
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.content}</p>
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