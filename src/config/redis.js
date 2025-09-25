/**
 * Redis Configuration Module
 *
 * Manages Redis connection for session storage, caching, and real-time features
 * in the BirdSphere application. Redis serves as a high-performance data store
 * for temporary data that needs fast access and automatic expiration.
 *
 * Architecture:
 * - Single Redis client instance shared across the application
 * - Used primarily for Express session storage via connect-redis
 * - Supports optional authentication with password
 * - Provides connection health monitoring and error handling
 * - Auto-reconnection on connection loss
 *
 * Key Use Cases:
 * 1. Session Storage: User login sessions with automatic expiration
 * 2. Rate Limiting: Track API request counts per IP/user
 * 3. Caching: Cache frequently accessed data (user profiles, post counts)
 * 4. Real-time Features: Store online user status, notification queues
 * 5. Temporary Data: Password reset tokens, email verification codes
 *
 * Data Flow:
 * Client Request → Express Session Middleware → Redis (session lookup/store)
 * API Request → Rate Limiter → Redis (increment request count)
 * Cache Request → Application Logic → Redis (get/set cached data)
 *
 * Environment Variables:
 * - REDIS_HOST: Redis server hostname (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis authentication password (optional)
 */

const { createClient } = require('redis');
require('dotenv').config();

/**
 * Redis Client Configuration
 *
 * Creates a Redis client with connection settings from environment variables.
 * Supports both authenticated and non-authenticated Redis instances.
 *
 * Connection Options:
 * - socket.host: Redis server hostname/IP
 * - socket.port: Redis server port (typically 6379)
 * - password: Optional authentication (set to undefined if not needed)
 *
 * Redis Client Features:
 * - Automatic reconnection on connection loss
 * - Connection pooling for multiple concurrent operations
 * - Built-in error handling and logging
 * - Support for all Redis data types (strings, lists, sets, hashes, etc.)
 */
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',  // Redis server hostname
    port: process.env.REDIS_PORT || 6379,         // Redis server port
  },
  password: process.env.REDIS_PASSWORD || undefined, // Optional authentication
});

/**
 * Redis Connection Event Handler - Success
 *
 * Fired when Redis client successfully connects to the Redis server.
 * Used for monitoring connection status and debugging connectivity issues.
 * In production, this can trigger notifications to monitoring systems.
 */
redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

/**
 * Redis Connection Event Handler - Error
 *
 * Fired when there's a Redis connection error or server unavailability.
 * Critical for application health monitoring since Redis failures can affect:
 * - User sessions (login/logout functionality)
 * - API rate limiting (may allow unlimited requests)
 * - Caching performance (fallback to database queries)
 *
 * Error scenarios:
 * - Redis server down/unreachable
 * - Authentication failures
 * - Network connectivity issues
 * - Redis server memory/resource limits exceeded
 */
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);

  // In production, consider:
  // - Alerting administrators
  // - Implementing fallback mechanisms
  // - Graceful degradation of features that depend on Redis
});

/**
 * Initialize Redis Connection
 *
 * Establishes connection to Redis server. This is required for the newer
 * Redis client (v4+) which requires explicit connection initiation.
 *
 * Connection is asynchronous but the client can be used immediately.
 * Commands will be queued until connection is established.
 */
redisClient.connect();

/**
 * Export Redis Client Instance
 *
 * Provides shared Redis client for use throughout the application:
 * - Session storage in server.js
 * - Caching in middleware/cache.js
 * - Rate limiting in express-rate-limit
 * - Custom caching in controllers/services
 *
 * Common Redis Operations:
 * - redisClient.set(key, value, { EX: seconds }): Store with expiration
 * - redisClient.get(key): Retrieve value by key
 * - redisClient.del(key): Delete key
 * - redisClient.exists(key): Check if key exists
 * - redisClient.incr(key): Increment counter
 * - redisClient.hSet/hGet: Hash operations for complex data
 */
module.exports = redisClient;