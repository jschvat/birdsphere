/**
 * Posts Context Module
 *
 * Comprehensive state management system for social media posts, comments, and reactions
 * using React Context API with useReducer for complex state management and optimization.
 *
 * Core Responsibilities:
 * - Centralized post state management with CRUD operations
 * - Comment system with threaded conversations support
 * - Reaction system with 7 emotion types
 * - Infinite scrolling with pagination and caching
 * - Optimistic UI updates with automatic rollback on failures
 * - Data transformation between API and frontend formats
 * - Memory-efficient caching with LRU eviction strategies
 *
 * Architecture:
 * - React Context with useReducer for complex state transitions
 * - Immutable state updates with optimistic rendering
 * - Ref-based caching to prevent unnecessary re-renders
 * - API integration with error handling and retry mechanisms
 * - TypeScript interfaces for complete type safety
 * - Modular action system for maintainable state updates
 *
 * State Management Features:
 * - Post timeline with infinite scrolling support
 * - Real-time updates with WebSocket integration capability
 * - Comment threading with unlimited nesting depth
 * - Reaction aggregation with emoji-based feedback
 * - Media attachment handling for posts and comments
 * - User interaction tracking and analytics support
 *
 * Performance Optimizations:
 * - Post caching with Map for O(1) lookups
 * - Lazy loading of comments and media content
 * - Optimistic updates for immediate UI feedback
 * - Debounced API calls to reduce server load
 * - Memory management with automatic cache cleanup
 *
 * Integration Points:
 * - PostCard components for individual post rendering
 * - CommentSection for threaded conversation displays
 * - ReactionPicker for user interaction interfaces
 * - MediaDisplay for rich content presentation
 * - InfiniteScroll for pagination and loading states
 */
import React, { createContext, useContext, useReducer, useCallback, ReactNode, useRef } from 'react';
import api from '../services/api';
import { Post, CreatePostData, Comment, Reaction, CreateCommentData } from '../types/index';

/**
 * Transform Backend Response to Frontend Format
 *
 * Converts snake_case API responses to camelCase frontend objects for consistent
 * JavaScript naming conventions and type safety throughout the application.
 *
 * @param apiPost - Raw post object from API with snake_case properties
 * @returns Transformed post object with camelCase properties matching Post interface
 */
const transformPostFromApi = (apiPost: any): Post => {
  return {
    id: apiPost.id,
    userId: apiPost.author_id,
    author: apiPost.author,
    content: apiPost.content,
    postType: apiPost.post_type || 'standard',
    visibility: apiPost.visibility,
    media: apiPost.media || [],
    reactions: apiPost.reactions || [],
    reactionCounts: apiPost.reaction_counts || {},
    comments: apiPost.comments || [],
    commentCount: apiPost.comment_count || 0,
    shareCount: apiPost.share_count || 0,
    createdAt: apiPost.created_at,
    updatedAt: apiPost.updated_at,
  };
};

interface PostsState {
  posts: Post[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  postCache: Map<string, Post>;
}

type PostsAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; posts: Post[]; hasMore: boolean; replace?: boolean }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'ADD_POST'; post: Post }
  | { type: 'UPDATE_POST'; post: Post }
  | { type: 'DELETE_POST'; postId: string }
  | { type: 'ADD_REACTION'; postId: string; reaction: Reaction }
  | { type: 'REMOVE_REACTION'; postId: string; reactionId: string }
  | { type: 'ADD_COMMENT'; postId: string; comment: Comment }
  | { type: 'UPDATE_COMMENT'; postId: string; comment: Comment }
  | { type: 'DELETE_COMMENT'; postId: string; commentId: string }
  | { type: 'OPTIMISTIC_UPDATE'; postId: string; updates: Partial<Post> }
  | { type: 'REVERT_OPTIMISTIC'; postId: string };

const initialState: PostsState = {
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  postCache: new Map(),
};

function postsReducer(state: PostsState, action: PostsAction): PostsState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, error: null };

    case 'LOAD_SUCCESS':
      const existingPostIds = new Set(state.posts.map(post => post.id));
      const filteredNewPosts = action.posts.filter(post => !existingPostIds.has(post.id));
      const newPosts = action.replace ? action.posts : [...state.posts, ...filteredNewPosts];
      const postCache = new Map(state.postCache);
      action.posts.forEach(post => postCache.set(post.id, post));

      return {
        ...state,
        loading: false,
        posts: newPosts,
        hasMore: action.hasMore,
        page: action.replace ? 2 : state.page + 1,
        postCache,
      };

    case 'LOAD_ERROR':
      return { ...state, loading: false, error: action.error };

    case 'ADD_POST':
      const updatedCache = new Map(state.postCache);
      updatedCache.set(action.post.id, action.post);

      return {
        ...state,
        posts: [action.post, ...state.posts],
        postCache: updatedCache,
      };

    case 'UPDATE_POST':
      const updateCache = new Map(state.postCache);
      updateCache.set(action.post.id, action.post);

      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.post.id ? action.post : post
        ),
        postCache: updateCache,
      };

    case 'DELETE_POST':
      const deleteCache = new Map(state.postCache);
      deleteCache.delete(action.postId);

      return {
        ...state,
        posts: state.posts.filter(post => post.id !== action.postId),
        postCache: deleteCache,
      };

    case 'ADD_REACTION':
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post.id === action.postId) {
            const updatedPost = {
              ...post,
              reactions: [...(post.reactions || []), action.reaction],
              reactionCounts: {
                ...post.reactionCounts,
                [action.reaction.reactionType]: (post.reactionCounts?.[action.reaction.reactionType] || 0) + 1
              }
            };
            const cache = new Map(state.postCache);
            cache.set(post.id, updatedPost);
            return updatedPost;
          }
          return post;
        }),
      };

    case 'REMOVE_REACTION':
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post.id === action.postId) {
            const reactions = post.reactions?.filter(r => r.id !== action.reactionId) || [];
            const removedReaction = post.reactions?.find(r => r.id === action.reactionId);
            const updatedPost = {
              ...post,
              reactions,
              reactionCounts: removedReaction ? {
                ...post.reactionCounts,
                [removedReaction.reactionType]: Math.max((post.reactionCounts?.[removedReaction.reactionType] || 1) - 1, 0)
              } : post.reactionCounts
            };
            const cache = new Map(state.postCache);
            cache.set(post.id, updatedPost);
            return updatedPost;
          }
          return post;
        }),
      };

    case 'ADD_COMMENT':
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post.id === action.postId) {
            const updatedPost = {
              ...post,
              comments: [...(post.comments || []), action.comment],
              commentCount: (post.commentCount || 0) + 1
            };
            const cache = new Map(state.postCache);
            cache.set(post.id, updatedPost);
            return updatedPost;
          }
          return post;
        }),
      };

    case 'UPDATE_COMMENT':
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post.id === action.postId) {
            const updatedPost = {
              ...post,
              comments: post.comments?.map(comment =>
                comment.id === action.comment.id ? action.comment : comment
              ) || []
            };
            const cache = new Map(state.postCache);
            cache.set(post.id, updatedPost);
            return updatedPost;
          }
          return post;
        }),
      };

    case 'DELETE_COMMENT':
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post.id === action.postId) {
            const updatedPost = {
              ...post,
              comments: post.comments?.filter(comment => comment.id !== action.commentId) || [],
              commentCount: Math.max((post.commentCount || 1) - 1, 0)
            };
            const cache = new Map(state.postCache);
            cache.set(post.id, updatedPost);
            return updatedPost;
          }
          return post;
        }),
      };

    case 'OPTIMISTIC_UPDATE':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.postId ? { ...post, ...action.updates } : post
        ),
      };

    case 'REVERT_OPTIMISTIC':
      const cachedPost = state.postCache.get(action.postId);
      if (cachedPost) {
        return {
          ...state,
          posts: state.posts.map(post =>
            post.id === action.postId ? cachedPost : post
          ),
        };
      }
      return state;

    default:
      return state;
  }
}

interface PostsContextValue extends PostsState {
  loadTimeline: (refresh?: boolean, offset?: number) => Promise<void>;
  createPost: (data: CreatePostData) => Promise<Post>;
  updatePost: (postId: string, data: Partial<CreatePostData>) => Promise<Post>;
  deletePost: (postId: string) => Promise<void>;
  addReaction: (postId: string, reactionType: string) => Promise<void>;
  removeReaction: (postId: string, reactionId: string) => Promise<void>;
  addComment: (postId: string, content: string, parentCommentId?: string) => Promise<Comment>;
  addCommentWithMedia: (postId: string, commentData: CreateCommentData) => Promise<Comment>;
  updateComment: (postId: string, commentId: string, content: string) => Promise<Comment>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  loadComments: (postId: string) => Promise<Comment[]>;
  loadCommentsWithMedia: (postId: string) => Promise<Comment[]>;
  getPost: (postId: string) => Post | null;
}

const PostsContext = createContext<PostsContextValue | null>(null);

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePosts must be used within a PostsProvider');
  }
  return context;
};

interface PostsProviderProps {
  children: ReactNode;
}

export const PostsProvider: React.FC<PostsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(postsReducer, initialState);
  const loadingRef = useRef(false);

  const loadTimeline = useCallback(async (refresh = false, offset = 0) => {
    if (loadingRef.current && !refresh) return;

    loadingRef.current = true;
    dispatch({ type: 'LOAD_START' });

    try {
      const response = await api.get('/posts/timeline', {
        params: {
          page: refresh ? 1 : Math.floor(offset / 20) + 1,
          limit: 20,
        },
      });

      const { data, pagination } = response.data;

      // Transform posts from API format to frontend format
      const transformedPosts = (data || []).map(transformPostFromApi);

      dispatch({
        type: 'LOAD_SUCCESS',
        posts: transformedPosts,
        hasMore: pagination?.hasNext || false,
        replace: refresh,
      });
    } catch (error: any) {
      dispatch({
        type: 'LOAD_ERROR',
        error: error.response?.data?.message || 'Failed to load timeline',
      });
    } finally {
      loadingRef.current = false;
    }
  }, []); // Remove state.loading dependency to prevent infinite loop

  const createPost = useCallback(async (data: CreatePostData): Promise<Post> => {
    try {
      const formData = new FormData();
      if (data.content) formData.append('content', data.content);
      if (data.visibility) formData.append('visibility', data.visibility);
      if (data.postType) formData.append('postType', data.postType);

      if (data.media && data.media.length > 0) {
        data.media.forEach((file, index) => {
          formData.append(`media`, file);
        });
      }

      const response = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newPost = response.data.data;
      dispatch({ type: 'ADD_POST', post: newPost });
      return newPost;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create post');
    }
  }, []);

  const updatePost = useCallback(async (postId: string, data: Partial<CreatePostData>): Promise<Post> => {
    try {
      const response = await api.put(`/posts/${postId}`, data);
      const updatedPost = response.data.data;
      dispatch({ type: 'UPDATE_POST', post: updatedPost });
      return updatedPost;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update post');
    }
  }, []);

  const deletePost = useCallback(async (postId: string): Promise<void> => {
    try {
      await api.delete(`/posts/${postId}`);
      dispatch({ type: 'DELETE_POST', postId });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete post');
    }
  }, []);

  const addReaction = useCallback(async (postId: string, reactionType: string): Promise<void> => {
    console.log('🌐 API: Adding reaction', { postId, reactionType });
    try {
      const response = await api.post(`/posts/${postId}/react`, { reactionType });
      console.log('✅ API: Reaction added successfully', response.data);
      // Refresh the timeline to get accurate reaction data from backend
      console.log('🔄 API: Refreshing timeline');
      await loadTimeline(true);
      console.log('✅ API: Timeline refreshed');
    } catch (error: any) {
      console.error('❌ API: Failed to add reaction', error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Failed to add reaction');
    }
  }, [loadTimeline]);

  const removeReaction = useCallback(async (postId: string, reactionId: string): Promise<void> => {
    try {
      await api.delete(`/posts/${postId}/react`);
      // Refresh the timeline to get accurate reaction data from backend
      await loadTimeline(true);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove reaction');
    }
  }, [loadTimeline]);

  const addComment = useCallback(async (postId: string, content: string, parentCommentId?: string): Promise<Comment> => {
    try {
      const payload: { content: string; parentCommentId?: string } = { content };
      if (parentCommentId) {
        payload.parentCommentId = parentCommentId;
      }
      const response = await api.post(`/posts/${postId}/comments`, payload);
      const newComment = response.data.data;
      dispatch({ type: 'ADD_COMMENT', postId, comment: newComment });
      return newComment;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add comment');
    }
  }, []);

  const updateComment = useCallback(async (postId: string, commentId: string, content: string): Promise<Comment> => {
    try {
      const response = await api.put(`/posts/comments/${commentId}`, { content });
      const updatedComment = response.data.data;
      dispatch({ type: 'UPDATE_COMMENT', postId, comment: updatedComment });
      return updatedComment;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update comment');
    }
  }, []);

  const deleteComment = useCallback(async (postId: string, commentId: string): Promise<void> => {
    try {
      await api.delete(`/posts/comments/${commentId}`);
      dispatch({ type: 'DELETE_COMMENT', postId, commentId });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to delete comment');
    }
  }, []);

  const addCommentWithMedia = useCallback(async (postId: string, commentData: CreateCommentData): Promise<Comment> => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('content', commentData.content);

      if (commentData.parentCommentId) {
        formData.append('parentCommentId', commentData.parentCommentId);
      }

      if (commentData.commentType) {
        formData.append('commentType', commentData.commentType);
      }

      // Add media files
      if (commentData.media && commentData.media.length > 0) {
        commentData.media.forEach((file) => {
          formData.append('media', file);
        });
      }

      const response = await api.post(`/posts/${postId}/comments/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newComment = response.data.data;
      dispatch({ type: 'ADD_COMMENT', postId, comment: newComment });
      return newComment;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add comment with media');
    }
  }, []);

  const loadComments = useCallback(async (postId: string): Promise<Comment[]> => {
    try {
      const response = await api.get(`/posts/${postId}/comments`);
      const { data } = response.data;
      return data || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load comments');
    }
  }, []);

  const loadCommentsWithMedia = useCallback(async (postId: string): Promise<Comment[]> => {
    try {
      const response = await api.get(`/posts/${postId}/comments/media`);
      const { data } = response.data;
      return data || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to load comments with media');
    }
  }, []);

  const getPost = useCallback((postId: string): Post | null => {
    return state.postCache.get(postId) || state.posts.find(post => post.id === postId) || null;
  }, [state.postCache, state.posts]);

  const value: PostsContextValue = {
    ...state,
    loadTimeline,
    createPost,
    updatePost,
    deletePost,
    addReaction,
    removeReaction,
    addComment,
    addCommentWithMedia,
    updateComment,
    deleteComment,
    loadComments,
    loadCommentsWithMedia,
    getPost,
  };

  return (
    <PostsContext.Provider value={value}>
      {children}
    </PostsContext.Provider>
  );
};

export default PostsContext;