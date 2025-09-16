const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class User {
  static async create({ email, password, firstName, lastName, username, phone, bio, locationCity, locationState, locationCountry, latitude, longitude, userRoles = ['buyer'], addressStreet, addressCity, addressState, addressCountry, addressPostalCode, animalInterests = [] }) {
    const saltRounds = 12;
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

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    return result.rows[0];
  }

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