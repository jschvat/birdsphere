/**
 * PostgreSQL Database Configuration Module
 *
 * Core database connectivity layer for the BirdSphere application.
 * Manages connection pooling, query execution, and database health monitoring
 * for all PostgreSQL operations.
 *
 * Architecture:
 * - Uses pg (node-postgres) connection pooling for optimal performance
 * - Provides centralized query interface for all models and controllers
 * - Implements automatic connection management with proper cleanup
 * - Supports both parameterized queries and raw client access
 * - Monitors connection health with event listeners
 *
 * Database Schema:
 * Primary tables: users, posts, comments, post_media, comment_media,
 * reactions, follows, listings, messages, chat_rooms
 *
 * Environment Variables Required:
 * - DB_HOST: PostgreSQL server hostname (default: localhost)
 * - DB_PORT: PostgreSQL server port (default: 5432)
 * - DB_NAME: Database name (default: birdsphere)
 * - DB_USER: Database username
 * - DB_PASSWORD: Database password
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL Connection Pool Configuration
 *
 * Creates a connection pool that manages multiple database connections
 * for concurrent request handling. Pool automatically handles:
 * - Connection creation and reuse
 * - Connection health monitoring
 * - Load balancing across connections
 * - Automatic reconnection on failures
 *
 * Pool settings are optimized for moderate concurrent usage.
 * For high-traffic scenarios, consider tuning pool size parameters.
 */
const pool = new Pool({
  host: process.env.DB_HOST,        // Database server hostname
  port: process.env.DB_PORT,        // Database server port
  database: process.env.DB_NAME,    // Target database name
  user: process.env.DB_USER,        // Database username
  password: process.env.DB_PASSWORD, // Database password

  // Connection pool settings (using defaults)
  // max: 10,                       // Maximum number of connections
  // idleTimeoutMillis: 30000,      // Close idle connections after 30s
  // connectionTimeoutMillis: 2000, // Timeout when connecting to database
});

/**
 * Connection Event Handler - Success
 *
 * Fired when a new connection is established to PostgreSQL.
 * Used for monitoring connection health and debugging connectivity issues.
 */
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

/**
 * Connection Event Handler - Error
 *
 * Fired when there's a connection error or connection loss.
 * Critical for monitoring database health and alerting on failures.
 * In production, this should integrate with monitoring systems.
 */
pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

/**
 * Execute SQL Query with Connection Pool
 *
 * Primary interface for database queries. Automatically manages connections
 * by acquiring from pool, executing query, and releasing back to pool.
 * Supports parameterized queries to prevent SQL injection attacks.
 *
 * Data Flow:
 * 1. Acquire connection from pool
 * 2. Execute query with optional parameters
 * 3. Return query result object
 * 4. Release connection back to pool (even on error)
 *
 * @param {string} text - SQL query string (supports $1, $2, etc. placeholders)
 * @param {Array} params - Optional array of parameters for query placeholders
 * @returns {Promise<Object>} PostgreSQL query result object with rows, rowCount, etc.
 *
 * Usage Examples:
 * - Simple query: query('SELECT * FROM users WHERE active = true')
 * - Parameterized: query('SELECT * FROM users WHERE id = $1', [userId])
 * - Insert: query('INSERT INTO posts (title, content) VALUES ($1, $2)', [title, content])
 *
 * Error Handling:
 * - Automatically releases connection even if query fails
 * - Throws original database errors for proper error handling upstream
 * - Logs connection issues through pool error handlers
 */
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    // Always release connection back to pool, even on error
    client.release();
  }
};

/**
 * Get Raw Database Client for Advanced Operations
 *
 * Provides direct access to a PostgreSQL client for complex operations
 * that require multiple queries or transaction management.
 *
 * IMPORTANT: Caller is responsible for releasing the client!
 *
 * Use Cases:
 * - Database transactions (BEGIN, COMMIT, ROLLBACK)
 * - Streaming large result sets
 * - Multiple related queries that should share same connection
 * - Custom connection configuration
 *
 * @returns {Promise<Client>} PostgreSQL client instance
 *
 * Usage Pattern:
 * ```javascript
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO table1...', params1);
 *   await client.query('UPDATE table2...', params2);
 *   await client.query('COMMIT');
 * } catch (error) {
 *   await client.query('ROLLBACK');
 *   throw error;
 * } finally {
 *   client.release(); // MUST release!
 * }
 * ```
 */
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  pool,      // Raw connection pool for advanced usage
  query,     // Primary query interface (recommended)
  getClient  // Raw client access (use with caution)
};