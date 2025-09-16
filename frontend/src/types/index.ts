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