/**
 * TypeScript Type Definitions
 *
 * Comprehensive type definitions for the BirdSphere application frontend.
 * Provides type safety, IntelliSense, and contract definitions for all data structures.
 *
 * Core Categories:
 * - Animal taxonomy and category types
 * - User authentication and profile types
 * - Social media post and interaction types
 * - Media file and upload types
 * - API request and response types
 *
 * Architecture:
 * - Interface-based design for object types
 * - Union types for enumeration values
 * - Generic types for reusable patterns
 * - Optional properties with proper nullability
 * - Consistent naming conventions throughout
 *
 * Integration Points:
 * - React component props and state
 * - API service method signatures
 * - Redux/Context state structures
 * - Form validation schemas
 * - Database entity mappings
 */

/**
 * Animal Category Interface
 *
 * Represents hierarchical animal taxonomy categories used in TreeView components
 * and user preference selection systems.
 *
 * @interface AnimalCategory
 */
export interface AnimalCategory {
  id: number;
  name: string;
  parent_id?: number;
  level: number;
  icon?: string;
  children?: AnimalCategory[];
}

export interface UserRating {
  id: number;
  rater_id: string;
  rated_user_id: string;
  rating: number;
  comment?: string;
  transaction_type: string;
  rater_username: string;
  rater_first_name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  latitude?: number;
  longitude?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  userRoles: string[];
  rating: number;
  ratingCount: number;
  animalInterests: AnimalCategory[];
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  recentRatings?: UserRating[];
}

// Type for profile update requests - allows animalInterests to be sent as IDs
export type UserProfileUpdate = Omit<Partial<User>, 'animalInterests'> & {
  animalInterests?: number[];
};

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  phone?: string;
  bio?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  latitude?: number;
  longitude?: number;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressPostalCode?: string;
  userRoles?: string[];
  animalInterests?: number[];
}

export interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface Post {
  id: string;
  userId: string;
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  content: string;
  postType: 'standard' | 'share' | 'announcement' | 'question' | 'sale';
  visibility: 'public' | 'followers' | 'private';
  media?: MediaFile[];
  reactions?: Reaction[];
  reactionCounts?: { [key: string]: number };
  comments?: Comment[];
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  content?: string;
  postType?: 'standard' | 'share' | 'announcement' | 'question' | 'sale';
  visibility?: 'public' | 'followers' | 'private';
  media?: File[];
}

export interface Comment {
  id: string;
  userId: string;
  postId: string;
  author: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  content: string;
  parentId?: string;
  commentType?: 'standard' | 'media' | 'reaction' | 'question';
  hasMedia?: boolean;
  media?: CommentMediaFile[];
  mediaAttachments?: CommentMediaFile[];
  reactions?: Reaction[];
  reactionCounts?: { [key: string]: number };
  replies?: Comment[];
  replyCount: number;
  isEdited?: boolean;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'post' | 'comment';
  reactionType: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'hug';
  createdAt: string;
}

export interface MediaFile {
  id: string;
  filename?: string;
  fileName?: string;
  originalName?: string;
  mimetype?: string;
  mimeType?: string;
  size?: number;
  fileSize?: number;
  category?: 'image' | 'video' | 'document' | 'model' | 'archive';
  fileType?: string;
  url?: string;
  fileUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
  };
}

export interface CommentMediaFile {
  id: string;
  fileType: 'image' | 'video' | 'document';
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  displayOrder?: number;
  createdAt?: string;
}

export interface CreateCommentData {
  content: string;
  parentCommentId?: string;
  commentType?: 'standard' | 'media' | 'reaction' | 'question';
  media?: File[];
}