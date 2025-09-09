const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class User {
  static async create({ email, password, firstName, lastName, username, phone, bio, locationCity, locationState, locationCountry, latitude, longitude, isBreeder = false }) {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, username, phone, bio, 
                        location_city, location_state, location_country, latitude, longitude, is_breeder)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, email, first_name, last_name, username, phone, bio, 
                location_city, location_state, location_country, latitude, longitude, 
                is_breeder, is_verified, created_at
    `;
    
    const values = [email, passwordHash, firstName, lastName, username, phone, bio, 
                   locationCity, locationState, locationCountry, latitude, longitude, isBreeder];
    
    const result = await db.query(query, values);
    return result.rows[0];
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
             is_breeder, is_verified, created_at, last_login
      FROM users WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
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
        isBreeder: user.is_breeder 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static async updateLastLogin(id) {
    const query = 'UPDATE users SET last_login = NOW() WHERE id = $1';
    await db.query(query, [id]);
  }

  static async update(id, updates) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'bio', 'profile_image', 
                          'location_city', 'location_state', 'location_country', 
                          'latitude', 'longitude', 'is_breeder'];
    
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

    values.push(id);
    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, username, phone, bio, profile_image,
                location_city, location_state, location_country, latitude, longitude,
                is_breeder, is_verified, updated_at
    `;

    const result = await db.query(query, values);
    return result.rows[0];
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

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1';
    await db.query(query, [id]);
  }
}

module.exports = User;