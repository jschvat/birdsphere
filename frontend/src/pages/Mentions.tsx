import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import PostFeed from '../components/Posts/PostFeed';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorBoundary from '../components/Common/ErrorBoundary';
import { Post } from '../types';
import api from '../services/api';

const Mentions: React.FC = () => {
  const { user, isInitialized, isLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMentions = useCallback(async (reset = false, offset = 0) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const currentPage = reset ? 1 : Math.floor(offset / 20) + 1;
      const response = await api.get(`/posts/mentions?page=${currentPage}&limit=20`);

      if (reset) {
        setPosts(response.data.posts);
      } else {
        setPosts(prev => [...prev, ...response.data.posts]);
      }

      setHasMore(response.data.pagination.hasNextPage);
    } catch (err: any) {
      console.error('Error loading mentions:', err);
      setError(err.response?.data?.error || 'Failed to load mentions');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    // Wait for auth to initialize before making authentication decisions
    if (!isInitialized) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    // Load initial mentions
    loadMentions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitialized, navigate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMentions(true); // Force refresh
    } finally {
      setRefreshing(false);
    }
  }, [loadMentions]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMentions(false, posts.length);
    }
  }, [hasMore, loading, loadMentions, posts.length]);

  // Show loading spinner while auth is initializing
  if (!isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Mentions</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Posts where others have commented or replied to your content
                  </p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="ml-2">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Failed to load mentions
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => loadMentions(true)}
                        className="text-sm font-medium text-red-800 hover:text-red-700"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && posts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No mentions yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  When others comment on your posts, you'll see them here.
                </p>
              </div>
            )}

            {/* Posts Feed */}
            {posts.length > 0 && (
              <PostFeed
                posts={posts}
                loading={loading}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
              />
            )}

            {/* Initial Loading */}
            {loading && posts.length === 0 && (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            )}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default Mentions;