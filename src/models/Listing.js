const db = require('../config/database');

class Listing {
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

  static async incrementViews(id) {
    const query = 'UPDATE listings SET views_count = views_count + 1 WHERE id = $1';
    await db.query(query, [id]);
  }

  static async delete(id, sellerId) {
    const query = 'DELETE FROM listings WHERE id = $1 AND seller_id = $2 RETURNING id';
    const result = await db.query(query, [id, sellerId]);
    return result.rows[0];
  }

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