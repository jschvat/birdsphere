import api from './api';
import { User, LoginCredentials, RegisterData } from '../types';

export interface AuthResponse {
  user: User;
  token: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const { user, token } = response.data;
    
    // No need to store in localStorage - cookies are handled automatically
    return { user, token };
  },

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    const { user, token } = response.data;
    
    // No need to store in localStorage - cookies are handled automatically
    return { user, token };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
      // Cookies are cleared by the server
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, we can still clear local state
    }
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await api.put('/auth/profile', userData);
    const updatedUser = response.data.user;
    
    return updatedUser;
  },

  // Check if user is authenticated by attempting to get profile
  async checkAuthentication(): Promise<User | null> {
    try {
      const user = await this.getProfile();
      return user;
    } catch (error) {
      return null;
    }
  },

  getCurrentUser(): User | null {
    // This method is deprecated - use checkAuthentication instead
    // Keeping for backward compatibility but it will return null
    // since we no longer store user data in localStorage
    return null;
  },

  getToken(): string | null {
    // This method is deprecated - tokens are now in httpOnly cookies
    // Keeping for backward compatibility but it will return null
    return null;
  },

  isAuthenticated(): boolean {
    // This method is deprecated - use checkAuthentication instead
    // We can't reliably check authentication status from client-side
    // with httpOnly cookies, so this returns false
    return false;
  }
};