import React, { useEffect, useRef, useCallback } from 'react';
import { Post } from '../../types/index';
import PostCard from './PostCard';
import LoadingSpinner from '../Common/LoadingSpinner';

interface PostFeedProps {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const PostFeed: React.FC<PostFeedProps> = ({
  posts,
  loading,
  hasMore,
  onLoadMore,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const currentLoadMoreRef = loadMoreRef.current;

    if (currentLoadMoreRef) {
      observerRef.current = new IntersectionObserver(handleIntersection, {
        threshold: 0.1,
        rootMargin: '100px',
      });

      observerRef.current.observe(currentLoadMoreRef);
    }

    return () => {
      if (observerRef.current && currentLoadMoreRef) {
        observerRef.current.unobserve(currentLoadMoreRef);
      }
    };
  }, [handleIntersection]);

  if (posts.length === 0 && loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loading && <LoadingSpinner size="sm" />}
        </div>
      )}

      {/* End of Feed Message */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You're all caught up!
          </div>
        </div>
      )}

      {/* No Posts State */}
      {posts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-.93-2.36A3.24 3.24 0 0 0 15.07 10a2.58 2.58 0 0 0-1.91.64l-.03.03v-.67h-1.25v8h1.25v-4.5a1.58 1.58 0 0 1 .45-1.13A1.54 1.54 0 0 1 14.7 11.5a1.65 1.65 0 0 1 1.12.42 1.72 1.72 0 0 1 .49 1.26v5.32zm-7.52-7.5a3.26 3.26 0 0 0-.93-2.36A3.24 3.24 0 0 0 7.55 10a2.58 2.58 0 0 0-1.91.64l-.03.03v-.67H4.36v8h1.25v-4.5a1.58 1.58 0 0 1 .45-1.13A1.54 1.54 0 0 1 7.18 11.5a1.65 1.65 0 0 1 1.12.42 1.72 1.72 0 0 1 .49 1.26v5.32zm-3.75-7.5h1.25v8H7.23z"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Be the first to share something with the community! Create a post to get the conversation started.
          </p>
        </div>
      )}

      {/* Error State for Failed Loading */}
      {posts.length > 0 && !hasMore && !loading && (
        <div className="text-center py-4">
          <button
            onClick={onLoadMore}
            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
          >
            Try loading more posts
          </button>
        </div>
      )}
    </div>
  );
};

// Loading skeleton component
const PostSkeleton: React.FC = () => {
  return (
    <div className="card-birdsphere shadow-xl border-0 backdrop-blur-sm p-3 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="h-6 w-6 bg-gray-200 rounded"></div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Media skeleton (sometimes) */}
      {Math.random() > 0.6 && (
        <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
      )}

      {/* Actions skeleton */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
          <div className="h-8 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 w-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default PostFeed;