import { AnimalCategory } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3010';

export const animalService = {
  async getAnimalCategories(): Promise<{ categories: AnimalCategory[] }> {
    const response = await fetch(`${API_BASE_URL}/api/users/animal-categories`, {
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