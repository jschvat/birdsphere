import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePosts } from '../contexts/PostsContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import PostCreator from '../components/Posts/PostCreator';
import PostFeed from '../components/Posts/PostFeed';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ErrorBoundary from '../components/Common/ErrorBoundary';

const Timeline: React.FC = () => {
  const { user } = useAuth();
  const { posts, loading, error, loadTimeline, hasMore } = usePosts();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Load initial timeline
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]); // Remove loadTimeline from dependencies to prevent infinite loop

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTimeline(true); // Force refresh
    } finally {
      setRefreshing(false);
    }
  }, [loadTimeline]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadTimeline(false, posts.length);
    }
  }, [hasMore, loading, loadTimeline, posts.length]);

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen gradient-birdsphere relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/20"></div>
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6 relative z-10">
        <ErrorBoundary>
          {/* Post Creation */}
          <div className="mb-6">
            <PostCreator onPostCreated={handleRefresh} />
          </div>

          {/* Timeline Feed */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error loading timeline
                    </h3>
                    <div className="mt-1 text-sm text-red-700">
                      {error}
                    </div>
                    <div className="mt-2">
                      <button
                        onClick={handleRefresh}
                        className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pull to refresh indicator */}
            {refreshing && (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            )}

            <PostFeed
              posts={posts}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
            />

            {/* Empty state */}
            {posts.length === 0 && !loading && !error && (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Be the first to share something with the community!
                </p>
              </div>
            )}
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default Timeline;