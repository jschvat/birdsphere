/**
 * Animal Service Module
 *
 * Specialized API service for animal category and taxonomy operations.
 * Provides access to hierarchical animal classification data for user preferences and filtering.
 *
 * Core Responsibilities:
 * - Fetch animal categories from backend API
 * - Handle animal taxonomy data with proper error handling
 * - Support user preference selection and filtering
 * - Integration with TreeView components for category selection
 *
 * Architecture:
 * - Uses Fetch API with credentials for authenticated requests
 * - Environment-aware API URL configuration
 * - Error handling with meaningful error messages
 * - TypeScript interfaces for complete type safety
 *
 * Integration Points:
 * - User profile animal interests selection
 * - Pet marketplace filtering and categorization
 * - TreeView component data source
 * - Animal classification displays
 */
import { AnimalCategory } from '../types';

/**
 * API Base URL Configuration
 * Note: This service uses a different port (3015) configuration
 * TODO: Should be updated to use the same API base URL as other services
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3015/api';

/**
 * Animal Service Object
 *
 * Provides API operations for animal taxonomy and category management.
 */
export const animalService = {
  async getAnimalCategories(): Promise<{ categories: AnimalCategory[] }> {
    const response = await fetch(`${API_BASE_URL}/users/animal-categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch animal categories');
    }

    return response.json();
  }
};