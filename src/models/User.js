/**
 * User Data Model
 *
 * Central user management model for the BirdSphere social marketplace platform.
 * Handles user authentication, profiles, geolocation, ratings, and animal interests.
 * Serves as the foundation for all user-related functionality across the platform.
 *
 * Core Architecture:
 * - PostgreSQL-based with bcrypt password hashing for security
 * - JWT token-based authentication with 90-day expiration
 * - Role-based access control (buyer, seller, breeder, admin)
 * - Geolocation-based user discovery with distance calculations
 * - Many-to-many relationships with animal categories
 * - Comprehensive rating and review system
 *
 * Database Schema:
 * Primary Table: users
 * - Authentication: email, password_hash, username
 * - Profile: first_name, last_name, phone, bio, profile_image
 * - Location: location_city, location_state, location_country, latitude, longitude
 * - Business: address_*, user_roles (array), rating, rating_count, is_verified
 * - Tracking: created_at, updated_at, last_login
 *
 * Related Tables:
 * - user_animal_interests: Many-to-many with animal_categories
 * - user_ratings: User review and rating system
 * - user_follows: Social following relationships
 * - listings: User's marketplace listings
 * - posts: User's social media posts
 *
 * Key Features:
 * 1. **Authentication**: Secure login/registration with JWT tokens
 * 2. **Geolocation**: Location-based user discovery and distance calculations
 * 3. **Animal Interests**: Category-based matching for breeding/buying interests
 * 4. **Rating System**: Peer-to-peer ratings with transaction context
 * 5. **Role Management**: Flexible role system (buyer/seller/breeder/admin)
 * 6. **Profile Management**: Comprehensive user profiles with images
 *
 * Security Considerations:
 * - Passwords hashed with bcrypt (12 salt rounds)
 * - JWT tokens signed with environment secret
 * - SQL injection prevention with parameterized queries
 * - Input validation and sanitization
 * - Password field exclusion in public queries
 *
 * Data Flow:
 * Registration → Password Hash → Database Insert → JWT Generation → Response
 * Login → Credential Validation → JWT Generation → Session Creation
 * Profile Update → Field Validation → Database Update → Response
 * Location Search → Distance Calculation → Filtered Results
 *
 * Usage Patterns:
 * - Controllers use this model for all user operations
 * - Authentication middleware validates JWT tokens
 * - Profile endpoints manage user data updates
 * - Search endpoints leverage geolocation features
 * - Rating system tracks user reputation
 */

const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * User Model Class
 *
 * Provides static methods for all user-related database operations.
 * Uses class-based design pattern for better organization and maintainability.
 * All methods are static as they operate on database records rather than instances.
 */
class User {
  /**
   * Create New User Account
   *
   * Registers a new user with secure password hashing and optional animal interests.
   * Handles the complete user registration flow including profile setup and
   * animal category associations.
   *
   * Security Features:
   * - Password hashed with bcrypt (12 salt rounds for high security)
   * - Input sanitization through PostgreSQL parameterized queries
   * - Transactional animal interest updates
   *
   * Data Flow:
   * 1. Hash password with bcrypt
   * 2. Insert user record into database
   * 3. Process animal interests (if provided)
   * 4. Return complete user object with interests
   *
   * @param {Object} userData - User registration data
   * @param {string} userData.email - Unique email address (required)
   * @param {string} userData.password - Plain text password (required)
   * @param {string} userData.firstName - User's first name (required)
   * @param {string} userData.lastName - User's last name (required)
   * @param {string} userData.username - Unique username (required)
   * @param {string} userData.phone - Phone number (optional)
   * @param {string} userData.bio - User biography (optional)
   * @param {string} userData.locationCity - City location (optional)
   * @param {string} userData.locationState - State/province (optional)
   * @param {string} userData.locationCountry - Country (optional)
   * @param {number} userData.latitude - GPS latitude (optional)
   * @param {number} userData.longitude - GPS longitude (optional)
   * @param {Array<string>} userData.userRoles - User roles ['buyer', 'seller', 'breeder'] (default: ['buyer'])
   * @param {string} userData.addressStreet - Business address street (optional)
   * @param {string} userData.addressCity - Business address city (optional)
   * @param {string} userData.addressState - Business address state (optional)
   * @param {string} userData.addressCountry - Business address country (optional)
   * @param {string} userData.addressPostalCode - Business postal code (optional)
   * @param {Array<string>} userData.animalInterests - Array of animal category IDs (optional)
   *
   * @returns {Promise<Object>} Created user object with animal interests
   * @throws {Error} Database errors or validation failures
   *
   * Example Usage:
   * const user = await User.create({
   *   email: 'john@example.com',
   *   password: 'securePassword123',
   *   firstName: 'John',
   *   lastName: 'Smith',
   *   username: 'johnsmith',
   *   userRoles: ['buyer', 'seller'],
   *   animalInterests: ['cat1', 'cat2']
   * });
   */
  static async create({ email, password, firstName, lastName, username, phone, bio, locationCity, locationState, locationCountry, latitude, longitude, userRoles = ['buyer'], addressStreet, addressCity, addressState, addressCountry, addressPostalCode, animalInterests = [] }) {
    const saltRounds = 12;  // High security: 12 rounds = ~250ms hashing time
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, username, phone, bio,
                        location_city, location_state, location_country, latitude, longitude,
                        user_roles, address_street, address_city, address_state, address_country, address_postal_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id, email, first_name, last_name, username, phone, bio,
                location_city, location_state, location_country, latitude, longitude,
                user_roles, address_street, address_city, address_state, address_country, address_postal_code,
                rating, rating_count, is_verified, created_at
    `;
    
    const values = [email, passwordHash, firstName, lastName, username, phone, bio,
                   locationCity, locationState, locationCountry, latitude, longitude,
                   userRoles, addressStreet, addressCity, addressState, addressCountry, addressPostalCode];
    
    const result = await db.query(query, values);
    const user = result.rows[0];

    // Add animal interests if provided
    if (animalInterests.length > 0) {
      await this.updateAnimalInterests(user.id, animalInterests);
      user.animalInterests = animalInterests;
    }

    return user;
  }

  /**
   * Find User by Email Address
   *
   * Retrieves user record by email for authentication purposes.
   * Includes password hash for login validation.
   *
   * @param {string} email - User email address
   * @returns {Promise<Object|undefined>} User object with password_hash or undefined
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find User by Username
   *
   * Retrieves user record by username for profile lookups and validation.
   *
   * @param {string} username - Unique username
   * @returns {Promise<Object|undefined>} User object or undefined
   */
  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    return result.rows[0];
  }

  /**
   * Find User by ID with Animal Interests
   *
   * Retrieves complete user profile including related animal interests.
   * Excludes password_hash for security. Used for profile displays and API responses.
   *
   * @param {string} id - User UUID
   * @returns {Promise<Object|undefined>} User object with animalInterests array or undefined
   */
  static async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, username, phone, bio, profile_image,
             location_city, location_state, location_country, latitude, longitude,
             user_roles, address_street, address_city, address_state, address_country, address_postal_code,
             rating, rating_count, is_verified, created_at, last_login
      FROM users WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    const user = result.rows[0];

    if (user) {
      // Get animal interests
      user.animalInterests = await this.getAnimalInterests(id);
    }

    return user;
  }

  static async findAll(options = {}) {
    const { limit = 20, offset = 0, publicOnly = false } = options;

    let query = `
      SELECT id, first_name, last_name, username,
             location_city, location_state, location_country,
             user_roles, rating, rating_count, is_verified, created_at
      FROM users
    `;

    if (publicOnly) {
      query += ` WHERE is_verified = true`;
    }

    query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

    const result = await db.query(query, [limit, offset]);
    return result.rows;
  }

  static async validatePassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  }

  static generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        userRoles: user.user_roles || []
      },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );
  }

  static async updateLastLogin(id) {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    await db.query(query, [id]);
  }

  static async update(id, updates) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'bio', 'profile_image',
                          'location_city', 'location_state', 'location_country',
                          'latitude', 'longitude', 'user_roles', 'address_street', 'address_city',
                          'address_state', 'address_country', 'address_postal_code'];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0 && !updates.animalInterests) {
      throw new Error('No valid fields to update');
    }

    let user;
    if (setClause.length > 0) {
      values.push(id);
      const query = `
        UPDATE users
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING id, email, first_name, last_name, username, phone, bio, profile_image,
                  location_city, location_state, location_country, latitude, longitude,
                  user_roles, address_street, address_city, address_state, address_country, address_postal_code,
                  rating, rating_count, is_verified, updated_at
      `;

      const result = await db.query(query, values);

      if (result.rowCount === 0) {
        throw new Error('User not found or no changes made');
      }

      user = result.rows[0];
    } else {
      user = await this.findById(id);
    }

    // Update animal interests if provided
    if (updates.animalInterests !== undefined) {
      await this.updateAnimalInterests(id, updates.animalInterests);
      user.animalInterests = updates.animalInterests;
    }

    return user;
  }

  /**
   * Search Users by Geographic Proximity
   *
   * Finds users within a specified radius using the Haversine formula for
   * accurate distance calculations on a spherical earth. Essential for
   * location-based features like finding nearby breeders or buyers.
   *
   * Algorithm: Haversine Formula
   * - Uses earth radius of 6371 km for distance calculations
   * - Accounts for spherical geometry (more accurate than simple lat/lng differences)
   * - Results include calculated distance for sorting and display
   *
   * Use Cases:
   * - Find nearby breeders within driving distance
   * - Locate potential buyers in the area
   * - Geographic filtering for marketplace listings
   * - Location-based user discovery
   *
   * @param {number} latitude - Center point latitude (-90 to 90)
   * @param {number} longitude - Center point longitude (-180 to 180)
   * @param {number} radiusKm - Search radius in kilometers (default: 50)
   * @param {number} limit - Maximum results to return (default: 20)
   * @returns {Promise<Array>} Array of users with distance field, sorted by proximity
   *
   * Example Response:
   * [{
   *   id: 'user-uuid',
   *   first_name: 'John',
   *   username: 'johnbreeder',
   *   distance: 15.7 // km from search center
   * }]
   */
  static async searchNearby(latitude, longitude, radiusKm = 50, limit = 20) {
    const query = `
      SELECT id, first_name, last_name, username, location_city, location_state,
             latitude, longitude, is_breeder, profile_image,
             (6371 * acos(cos(radians($1)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(latitude)))) AS distance
      FROM users
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      HAVING distance < $3
      ORDER BY distance
      LIMIT $4
    `;

    const result = await db.query(query, [latitude, longitude, radiusKm, limit]);
    return result.rows;
  }

  static async updateProfileImage(id, profileImageUrl) {
    const query = `
      UPDATE users
      SET profile_image = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, first_name, last_name, username, phone, bio, profile_image,
                location_city, location_state, location_country, latitude, longitude,
                user_roles, address_street, address_city, address_state, address_country, address_postal_code,
                rating, rating_count, is_verified, updated_at
    `;

    const result = await db.query(query, [profileImageUrl, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1';
    await db.query(query, [id]);
  }

  // Animal interests methods
  static async getAnimalInterests(userId) {
    const query = `
      SELECT ac.*
      FROM animal_categories ac
      INNER JOIN user_animal_interests uai ON ac.id = uai.category_id
      WHERE uai.user_id = $1
      ORDER BY ac.level, ac.name
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  static async updateAnimalInterests(userId, categoryIds) {
    await db.query('BEGIN');
    try {
      // Remove existing interests
      await db.query('DELETE FROM user_animal_interests WHERE user_id = $1', [userId]);

      // Add new interests
      if (categoryIds && categoryIds.length > 0) {
        const insertValues = categoryIds.map((_, index) => `($1, $${index + 2})`).join(', ');
        const query = `INSERT INTO user_animal_interests (user_id, category_id) VALUES ${insertValues}`;
        await db.query(query, [userId, ...categoryIds]);
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  // Animal categories methods
  static async getAnimalCategories() {
    const query = `
      SELECT * FROM animal_category_hierarchy
      ORDER BY level, full_path
    `;
    const result = await db.query(query);
    return result.rows;
  }

  static async getAnimalCategoriesTree() {
    const query = `
      SELECT * FROM animal_categories
      ORDER BY level, name
    `;
    const result = await db.query(query);
    return this.buildCategoryTree(result.rows);
  }

  static buildCategoryTree(categories) {
    const categoryMap = new Map();
    const tree = [];

    // Create map for quick lookup
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Build tree structure
    categories.forEach(cat => {
      if (cat.parent_id === null) {
        tree.push(categoryMap.get(cat.id));
      } else {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children.push(categoryMap.get(cat.id));
        }
      }
    });

    return tree;
  }

  // Rating methods
  static async addRating(raterId, ratedUserId, rating, comment, transactionType = 'other') {
    const query = `
      INSERT INTO user_ratings (rater_id, rated_user_id, rating, comment, transaction_type)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (rater_id, rated_user_id, transaction_type)
      DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
      RETURNING *
    `;
    const result = await db.query(query, [raterId, ratedUserId, rating, comment, transactionType]);
    return result.rows[0];
  }

  static async getUserRatings(userId, limit = 10) {
    const query = `
      SELECT ur.*, u.username as rater_username, u.first_name as rater_first_name
      FROM user_ratings ur
      INNER JOIN users u ON ur.rater_id = u.id
      WHERE ur.rated_user_id = $1
      ORDER BY ur.created_at DESC
      LIMIT $2
    `;
    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  static async searchNearby(latitude, longitude, radiusKm = 50, limit = 20, options = {}) {
    const { userRoles, animalInterests } = options;

    let whereClause = 'WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
    let params = [latitude, longitude, radiusKm, limit];
    let paramCount = 4;

    if (userRoles && userRoles.length > 0) {
      whereClause += ` AND user_roles && $${++paramCount}`;
      params.push(userRoles);
    }

    const query = `
      SELECT id, first_name, last_name, username, location_city, location_state,
             latitude, longitude, user_roles, rating, rating_count, profile_image,
             (6371 * acos(cos(radians($1)) * cos(radians(latitude)) *
              cos(radians(longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(latitude)))) AS distance
      FROM users
      ${whereClause}
      HAVING distance < $3
      ORDER BY distance
      LIMIT $4
    `;

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = User;