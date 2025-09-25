/**
 * Listing Data Model
 * Comprehensive animal marketplace system with advanced search and location features.
 *
 * Architecture Overview:
 * - Multi-category animal listings with detailed breed information
 * - Geolocation-based proximity search using Haversine formula
 * - Rich media support through ListingMedia relationship
 * - Advanced filtering by species, breed, age, health status
 * - Shipping and pickup logistics management
 * - User reputation and breeder verification integration
 *
 * Key Features:
 * - Location Intelligence: GPS coordinates with radius-based search
 * - Advanced Search: Multi-criteria filtering with full-text search
 * - Animal Details: Species, breed, age, sex, color, health tracking
 * - Media Gallery: Multiple photos with primary image designation
 * - Seller Management: Integration with user profiles and breeder status
 * - Performance Optimized: Efficient queries for large catalog browsing
 *
 * Database Design:
 * - Foreign keys to users (sellers) and categories
 * - Indexed location fields for geographic queries
 * - Status field for listing lifecycle management
 * - View counter for popularity tracking
 * - Comprehensive animal metadata storage
 *
 * Integration Points:
 * - Works with User model for seller information
 * - Connects to ListingMedia for image galleries
 * - Uses category hierarchy for organization
 * - Supports messaging for buyer-seller communication
 */
const db = require('../config/database');

class Listing {
  /**
   * Create New Listing
   * Creates a comprehensive animal listing with location and detailed animal information.
   * Supports all animal metadata including health status and vaccination records.
   *
   * @param {string} sellerId - ID of user creating the listing
   * @param {Object} listingData - Comprehensive listing information
   * @param {string} listingData.categoryId - Animal category ID
   * @param {string} listingData.title - Listing title
   * @param {string} listingData.description - Detailed description
   * @param {number} listingData.price - Price in specified currency
   * @param {string} [listingData.currency='USD'] - Currency code
   * @param {string} listingData.species - Animal species
   * @param {string} listingData.breed - Specific breed
   * @param {string} listingData.age - Animal age
   * @param {string} listingData.sex - Animal sex
   * @param {string} listingData.color - Animal color/markings
   * @param {string} listingData.healthStatus - Health condition
   * @param {string} listingData.vaccinationStatus - Vaccination records
   * @param {boolean} [listingData.shippingAvailable=false] - Shipping option
   * @param {boolean} [listingData.localPickupOnly=true] - Pickup requirement
   * @param {string} listingData.locationCity - Seller's city
   * @param {string} listingData.locationState - Seller's state/province
   * @param {string} listingData.locationCountry - Seller's country
   * @param {number} listingData.latitude - GPS latitude for proximity search
   * @param {number} listingData.longitude - GPS longitude for proximity search
   * @returns {Promise<Object>} Created listing with full details
   */
  static async create(sellerId, listingData) {
    const {
      categoryId, title, description, price, currency = 'USD',
      species, breed, age, sex, color, healthStatus, vaccinationStatus,
      shippingAvailable = false, localPickupOnly = true,
      locationCity, locationState, locationCountry, latitude, longitude
    } = listingData;

    const query = `
      INSERT INTO listings (
        seller_id, category_id, title, description, price, currency,
        species, breed, age, sex, color, health_status, vaccination_status,
        shipping_available, local_pickup_only,
        location_city, location_state, location_country, latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      sellerId, categoryId, title, description, price, currency,
      species, breed, age, sex, color, healthStatus, vaccinationStatus,
      shippingAvailable, localPickupOnly,
      locationCity, locationState, locationCountry, latitude, longitude
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find Listing with Full Details
   * Retrieves complete listing information including seller profile, category,
   * and all associated media files ordered by display preference.
   *
   * @param {string} id - Listing ID
   * @returns {Promise<Object|null>} Complete listing with seller, category, and media
   */
  static async findById(id) {
    const query = `
      SELECT l.*, 
             u.username, u.first_name, u.last_name, u.is_breeder, u.profile_image,
             c.name as category_name,
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', lm.id,
                   'filePath', lm.file_path,
                   'fileType', lm.file_type,
                   'isPrimary', lm.is_primary,
                   'displayOrder', lm.display_order
                 ) ORDER BY lm.display_order, lm.created_at
               ) FILTER (WHERE lm.id IS NOT NULL),
               '[]'
             ) as media
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN listing_media lm ON l.id = lm.listing_id
      WHERE l.id = $1
      GROUP BY l.id, u.username, u.first_name, u.last_name, u.is_breeder, u.profile_image, c.name
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find Listings by Seller
   * Retrieves all listings for a specific seller with media count.
   * Optionally filters by listing status.
   *
   * @param {string} sellerId - Seller's user ID
   * @param {string|null} [status=null] - Optional status filter (active, sold, etc.)
   * @returns {Promise<Array>} Array of seller's listings with category and media info
   */
  static async findBySeller(sellerId, status = null) {
    let query = `
      SELECT l.*, c.name as category_name,
             COUNT(lm.id) as media_count
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN listing_media lm ON l.id = lm.listing_id
      WHERE l.seller_id = $1
    `;
    
    const values = [sellerId];
    
    if (status) {
      query += ' AND l.status = $2';
      values.push(status);
    }
    
    query += `
      GROUP BY l.id, c.name
      ORDER BY l.created_at DESC
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Advanced Listing Search
   * Comprehensive search with multiple criteria including geolocation proximity.
   * Supports full-text search, price ranges, animal characteristics, and geographic filters.
   * Uses Haversine formula for accurate distance calculations.
   *
   * @param {Object} [filters={}] - Search criteria
   * @param {string} [filters.query] - Full-text search query
   * @param {string} [filters.category] - Category ID or parent category
   * @param {number} [filters.minPrice] - Minimum price filter
   * @param {number} [filters.maxPrice] - Maximum price filter
   * @param {string} [filters.species] - Animal species filter
   * @param {string} [filters.breed] - Breed filter
   * @param {string} [filters.sex] - Sex filter
   * @param {string} [filters.location] - City/state text search
   * @param {number} [filters.radius=50] - Search radius in kilometers
   * @param {number} [filters.latitude] - User's latitude for proximity
   * @param {number} [filters.longitude] - User's longitude for proximity
   * @param {boolean} [filters.shippingAvailable] - Shipping filter
   * @param {number} [filters.page=1] - Pagination page number
   * @param {number} [filters.limit=20] - Results per page
   * @param {string} [filters.sortBy='created_at'] - Sort field: created_at, price, distance
   * @param {string} [filters.sortOrder='desc'] - Sort direction: asc or desc
   * @returns {Promise<Array>} Array of matching listings with seller and media info
   */
  static async search(filters = {}) {
    const {
      query: searchQuery,
      category,
      minPrice,
      maxPrice,
      species,
      breed,
      sex,
      location,
      radius = 50,
      latitude,
      longitude,
      shippingAvailable,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    let baseQuery = `
      SELECT l.*,
             u.username, u.first_name, u.last_name, u.is_breeder,
             c.name as category_name,
             COUNT(lm.id) as media_count
    `;

    // Add distance calculation if coordinates provided
    if (latitude && longitude) {
      baseQuery += `,
        (6371 * acos(cos(radians($${latitude && longitude ? 'LAT_PARAM' : 'NULL'})) * cos(radians(l.latitude)) * 
         cos(radians(l.longitude) - radians($${latitude && longitude ? 'LNG_PARAM' : 'NULL'})) + 
         sin(radians($${latitude && longitude ? 'LAT_PARAM' : 'NULL'})) * sin(radians(l.latitude)))) AS distance
      `;
    }

    baseQuery += `
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      JOIN categories c ON l.category_id = c.id
      LEFT JOIN listing_media lm ON l.id = lm.listing_id
      WHERE l.status = 'active'
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    // Add search conditions
    if (searchQuery) {
      conditions.push(`(l.title ILIKE $${paramCount} OR l.description ILIKE $${paramCount} OR l.species ILIKE $${paramCount})`);
      values.push(`%${searchQuery}%`);
      paramCount++;
    }

    if (category) {
      conditions.push(`(l.category_id = $${paramCount} OR c.parent_id = $${paramCount})`);
      values.push(category);
      paramCount++;
    }

    if (minPrice !== undefined) {
      conditions.push(`l.price >= $${paramCount}`);
      values.push(minPrice);
      paramCount++;
    }

    if (maxPrice !== undefined) {
      conditions.push(`l.price <= $${paramCount}`);
      values.push(maxPrice);
      paramCount++;
    }

    if (species) {
      conditions.push(`l.species ILIKE $${paramCount}`);
      values.push(`%${species}%`);
      paramCount++;
    }

    if (breed) {
      conditions.push(`l.breed ILIKE $${paramCount}`);
      values.push(`%${breed}%`);
      paramCount++;
    }

    if (sex) {
      conditions.push(`l.sex = $${paramCount}`);
      values.push(sex);
      paramCount++;
    }

    if (location) {
      conditions.push(`(l.location_city ILIKE $${paramCount} OR l.location_state ILIKE $${paramCount})`);
      values.push(`%${location}%`);
      paramCount++;
    }

    if (shippingAvailable !== undefined) {
      conditions.push(`l.shipping_available = $${paramCount}`);
      values.push(shippingAvailable);
      paramCount++;
    }

    // Add distance filter if coordinates provided
    if (latitude && longitude) {
      // Replace placeholders with actual parameter numbers
      baseQuery = baseQuery.replace(/LAT_PARAM/g, paramCount).replace(/LNG_PARAM/g, paramCount + 1);
      values.push(latitude, longitude);
      paramCount += 2;

      conditions.push(`(
        l.latitude IS NULL OR l.longitude IS NULL OR
        (6371 * acos(cos(radians($${paramCount - 2})) * cos(radians(l.latitude)) * 
         cos(radians(l.longitude) - radians($${paramCount - 1})) + 
         sin(radians($${paramCount - 2})) * sin(radians(l.latitude)))) <= $${paramCount}
      )`);
      values.push(radius);
      paramCount++;
    }

    if (conditions.length > 0) {
      baseQuery += ' AND ' + conditions.join(' AND ');
    }

    baseQuery += ' GROUP BY l.id, u.username, u.first_name, u.last_name, u.is_breeder, c.name';

    // Add sorting
    const allowedSortFields = ['created_at', 'price', 'distance'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    if (sortBy === 'distance' && (!latitude || !longitude)) {
      baseQuery += ' ORDER BY l.created_at DESC';
    } else {
      baseQuery += ` ORDER BY ${sortField} ${order}`;
    }

    // Add pagination
    const offset = (page - 1) * limit;
    baseQuery += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await db.query(baseQuery, values);
    return result.rows;
  }

  static async update(id, sellerId, updates) {
    const allowedFields = [
      'title', 'description', 'price', 'species', 'breed', 'age', 'sex', 'color',
      'health_status', 'vaccination_status', 'shipping_available', 
      'local_pickup_only', 'status'
    ];

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

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id, sellerId);
    const query = `
      UPDATE listings 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND seller_id = $${paramCount + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Increment View Counter
   * Atomically increases the view count for analytics and popularity ranking.
   *
   * @param {string} id - Listing ID to increment views for
   * @returns {Promise<void>}
   */
  static async incrementViews(id) {
    const query = 'UPDATE listings SET views_count = views_count + 1 WHERE id = $1';
    await db.query(query, [id]);
  }

  static async delete(id, sellerId) {
    const query = 'DELETE FROM listings WHERE id = $1 AND seller_id = $2 RETURNING id';
    const result = await db.query(query, [id, sellerId]);
    return result.rows[0];
  }

  /**
   * Get Category Hierarchy
   * Retrieves complete category tree with parent-child relationships.
   * Used for navigation menus and category filters.
   *
   * @returns {Promise<Array>} Hierarchically organized categories with parent info
   */
  static async getCategories() {
    const query = `
      SELECT c.*, 
             CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END as level,
             p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = true
      ORDER BY 
        CASE WHEN c.parent_id IS NULL THEN c.name ELSE p.name END,
        CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END,
        c.name
    `;
    
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = Listing;