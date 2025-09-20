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
  content: string;
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
  reactions?: Reaction[];
  reactionCounts?: { [key: string]: number };
  replies?: Comment[];
  replyCount: number;
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
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  category: 'image' | 'video' | 'document' | 'model' | 'archive';
  url: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    thumbnail?: string;
  };
}