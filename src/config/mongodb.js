/**
 * MongoDB Configuration Module
 *
 * Manages MongoDB connection for hybrid database architecture in BirdSphere.
 * While PostgreSQL serves as the primary database, MongoDB is used for
 * specific chat-related features that benefit from document storage.
 *
 * Hybrid Database Architecture:
 * - PostgreSQL (Primary): Users, posts, comments, reactions, structured data
 * - MongoDB (Optional): Chat messages, real-time data, flexible schema needs
 * - Redis: Sessions, caching, temporary data
 *
 * This allows leveraging the best of each database technology:
 * - PostgreSQL: ACID transactions, relational integrity, complex queries
 * - MongoDB: Flexible schema, horizontal scaling, real-time applications
 *
 * Key Features:
 * - Singleton connection pattern for efficient resource usage
 * - Comprehensive error handling and connection monitoring
 * - Automatic reconnection on connection failures
 * - Health status monitoring for application monitoring
 * - Environment-based configuration with sensible defaults
 *
 * Environment Variables:
 * - MONGODB_URI: Full MongoDB connection string with auth
 * - USE_MONGODB_CHAT: Enable/disable MongoDB chat features (true/false)
 *
 * Data Models (MongoDB):
 * - ChatMessages: Real-time chat messages with embedded metadata
 * - MessageReadStatus: Message read/delivery status tracking
 * - UserPresence: Online/offline status and last seen timestamps
 */

const mongoose = require('mongoose');
const redis = require('./redis');

/**
 * MongoDB Connection Manager Class
 *
 * Implements singleton pattern to ensure only one MongoDB connection
 * throughout the application lifecycle. Provides connection state management,
 * health monitoring, and graceful error handling.
 *
 * Connection States:
 * - 0: Disconnected
 * - 1: Connected
 * - 2: Connecting
 * - 3: Disconnecting
 *
 * Design Pattern: Singleton
 * Benefits: Resource efficiency, consistent connection state, centralized config
 */
class MongoDBConnection {
  /**
   * Initialize MongoDB Connection Manager
   *
   * Sets up initial connection state and prepares for connection establishment.
   * Does not actually connect to MongoDB - connection happens lazily on first use.
   */
  constructor() {
    this.connection = null;      // Mongoose connection instance
    this.isConnected = false;    // Internal connection state tracking
  }

  /**
   * Establish MongoDB Connection
   *
   * Creates connection to MongoDB using Mongoose ODM with optimized settings.
   * Uses singleton pattern - subsequent calls return existing connection.
   *
   * Connection Configuration:
   * - maxPoolSize: 10 concurrent connections for scalability
   * - serverSelectionTimeoutMS: 5s timeout for server discovery
   * - socketTimeoutMS: 45s timeout for individual operations
   *
   * Data Flow:
   * 1. Check if already connected (singleton behavior)
   * 2. Parse MongoDB URI from environment or use default
   * 3. Establish connection with optimized settings
   * 4. Set up event listeners for connection monitoring
   * 5. Return connection instance for use by models
   *
   * @returns {Promise<Connection>} Mongoose connection instance
   * @throws {Error} Connection failure errors with detailed messages
   *
   * Usage:
   * - Called automatically when USE_MONGODB_CHAT=true in server.js
   * - Used by MongoDB models (ChatMessage, MessageReadStatus)
   * - Connection is shared across all MongoDB operations
   */
  async connect() {
    // Singleton pattern: return existing connection if already connected
    if (this.isConnected) {
      return this.connection;
    }

    try {
      // MongoDB URI with authentication and database specification
      // Format: mongodb://username:password@host:port/database?options
      const mongoURI = process.env.MONGODB_URI ||
        'mongodb://birdsphere_admin:mongodb_password_123@localhost:27017/birdsphere_chat?authSource=admin';

      // Establish connection with production-ready settings
      this.connection = await mongoose.connect(mongoURI, {
        maxPoolSize: 10,                  // Maximum 10 concurrent connections
        serverSelectionTimeoutMS: 5000,   // 5s timeout for finding MongoDB server
        socketTimeoutMS: 45000,           // 45s timeout for individual operations
      });

      this.isConnected = true;
      console.log('MongoDB connected successfully');

      // Set up connection event monitoring for health tracking
      this.setupConnectionEventHandlers();

      return this.connection;
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Setup Connection Event Handlers
   *
   * Configures event listeners for MongoDB connection state changes.
   * Critical for monitoring database health and handling reconnection scenarios.
   *
   * Events Monitored:
   * - error: Connection errors, authentication failures
   * - disconnected: Planned or unplanned disconnections
   * - reconnected: Successful reconnection after failure
   */
  setupConnectionEventHandlers() {
    /**
     * Connection Error Handler
     *
     * Handles various MongoDB connection errors:
     * - Authentication failures (wrong credentials)
     * - Network connectivity issues
     * - MongoDB server unavailable
     * - Database access permission errors
     */
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      this.isConnected = false;

      // In production, consider:
      // - Sending alerts to monitoring systems
      // - Implementing automatic retry logic
      // - Graceful degradation of chat features
    });

    /**
     * Disconnection Handler
     *
     * Fired when MongoDB connection is lost (planned or unplanned).
     * Updates connection state to prevent operations on dead connection.
     */
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      this.isConnected = false;
    });

    /**
     * Reconnection Handler
     *
     * Fired when MongoDB successfully reconnects after a disconnection.
     * Mongoose handles reconnection automatically with built-in retry logic.
     */
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      this.isConnected = true;
    });
  }

  /**
   * Gracefully Disconnect from MongoDB
   *
   * Closes MongoDB connection and cleans up resources.
   * Should be called during application shutdown to prevent connection leaks.
   *
   * @returns {Promise<void>} Resolves when disconnection is complete
   *
   * Usage:
   * - Application shutdown handlers
   * - Unit test cleanup
   * - Switching database configurations
   */
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('MongoDB disconnected');
    }
  }

  /**
   * Get Current MongoDB Connection Instance
   *
   * Returns the raw Mongoose connection for advanced operations.
   * Most application code should use models instead of raw connection.
   *
   * @returns {Connection|null} Mongoose connection instance or null if not connected
   *
   * Use Cases:
   * - Database administration operations
   * - Custom query operations not supported by models
   * - Connection debugging and monitoring
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Check MongoDB Connection Health
   *
   * Determines if MongoDB connection is healthy and ready for operations.
   * Combines internal state tracking with Mongoose's readyState.
   *
   * Connection Ready States:
   * - 0: Disconnected
   * - 1: Connected (healthy)
   * - 2: Connecting
   * - 3: Disconnecting
   *
   * @returns {boolean} True if connection is healthy and ready for operations
   *
   * Usage:
   * - Health check endpoints
   * - Pre-operation connection validation
   * - Monitoring and alerting systems
   * - Fallback logic for chat features
   */
  isHealthy() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

/**
 * Singleton Instance Export
 *
 * Creates and exports a single MongoDB connection instance for use
 * throughout the application. Ensures consistent connection state
 * and prevents multiple connection instances.
 *
 * Usage across application:
 * - server.js: Initialize connection if USE_MONGODB_CHAT=true
 * - Chat models: Access connection for schema registration
 * - Chat controllers: Verify connection health before operations
 * - Health endpoints: Report MongoDB status
 */
const mongoConnection = new MongoDBConnection();

module.exports = mongoConnection;