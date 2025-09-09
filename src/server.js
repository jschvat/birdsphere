/**
 * BirdSphere API Server
 * 
 * Main server file that initializes and configures the Express.js application
 * with all necessary middleware, routes, and services for the BirdSphere
 * pet marketplace platform.
 * 
 * Features:
 * - REST API endpoints for listings, users, messages, location services
 * - Real-time chat functionality using Socket.IO
 * - Security middleware (Helmet, CORS, Rate limiting)
 * - Session management with Redis store
 * - File upload handling
 * - API documentation with Swagger
 * - Health monitoring endpoints
 * - Hybrid database support (PostgreSQL + optional MongoDB for chat)
 */

// Load environment variables from .env file
require('dotenv').config();

// Core Express.js framework and middleware
const express = require('express');
const cors = require('cors');              // Cross-Origin Resource Sharing
const helmet = require('helmet');          // Security headers
const compression = require('compression'); // Response compression
const morgan = require('morgan');          // HTTP request logging
const rateLimit = require('express-rate-limit'); // Rate limiting
const session = require('express-session'); // Session management
const RedisStore = require('connect-redis').default; // Redis session store
const { createServer } = require('http');   // HTTP server for Socket.IO
const { Server } = require('socket.io');   // Real-time WebSocket communication

// Application configuration modules
const redisClient = require('./config/redis');
const { swaggerUi, specs } = require('./config/swagger');

// Initialize Express application
const app = express();

// Create HTTP server for both Express and Socket.IO
const server = createServer(app);

// Initialize Socket.IO server with CORS configuration
const io = new Server(server, {
  cors: {
    // Allow different origins based on environment
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://birdsphere.com'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true // Allow cookies and authentication headers
  }
});

// Server configuration
const PORT = process.env.PORT || 3000;

// Rate limiting configuration
// Prevents abuse by limiting requests per IP address
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes time window
  max: 100, // Maximum 100 requests per IP per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false   // Disable X-RateLimit-* headers
});

/**
 * MIDDLEWARE CONFIGURATION
 * Applied in order - each request passes through these middlewares
 */

// Security middleware - sets various HTTP headers for protection
app.use(helmet());

// Compression middleware - gzips responses for better performance
app.use(compression());

// HTTP request logging for monitoring and debugging
app.use(morgan('combined'));

// Apply rate limiting to all routes
app.use(limiter);

// CORS (Cross-Origin Resource Sharing) configuration
// Allows requests from specified origins with credentials
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://birdsphere.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true, // Allow cookies and auth headers
}));

// Body parsing middleware
// Parse JSON payloads (up to 10MB for file uploads)
app.use(express.json({ limit: '10mb' }));
// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session management with Redis store
// Provides persistent user sessions across server restarts
app.use(session({
  store: new RedisStore({ client: redisClient }), // Use Redis for session storage
  secret: process.env.SESSION_SECRET,             // Secret for signing session IDs
  resave: false,                                  // Don't save session if unmodified
  saveUninitialized: false,                       // Don't create session until something stored
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,                                // Prevent XSS attacks
    maxAge: 1000 * 60 * 60 * 24 * 7,              // 7 days expiration
  },
}));

/**
 * ROUTES AND STATIC FILE SERVING
 */

// Import all API route modules
const apiRoutes = require('./routes');

// Swagger API documentation endpoint
// Provides interactive API documentation at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,                                     // Enable API explorer
  customCss: '.swagger-ui .topbar { display: none }', // Hide Swagger topbar
  customSiteTitle: 'BirdSphere API Documentation'     // Custom page title
}));

// Mount all API routes under /api prefix
// Routes include: auth, listings, users, messages, location, chat
app.use('/api', apiRoutes);

// Serve uploaded files (images, documents) statically
// Files are accessible at /uploads/<filename>
app.use('/uploads', express.static(process.env.UPLOAD_PATH || 'uploads'));

/**
 * UTILITY ENDPOINTS
 */

// Root endpoint - provides basic server information
app.get('/', (req, res) => {
  res.json({
    message: 'BirdSphere API Server',
    version: '1.0.0',
    status: 'running',
    documentation: '/api-docs'
  });
});

// Health check endpoint for monitoring and load balancers
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime() // Server uptime in seconds
  });
});

/**
 * ERROR HANDLING MIDDLEWARE
 * Must be defined after all other app.use() and routes calls
 */

// Global error handler - catches all unhandled errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    // Only show detailed error message in development
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler - catches all undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

/**
 * DATABASE AND SOCKET INITIALIZATION
 */

// Initialize MongoDB for hybrid chat functionality (optional)
// Uses PostgreSQL as primary database, MongoDB for chat if enabled
if (process.env.USE_MONGODB_CHAT === 'true') {
  const mongoConnection = require('./config/mongodb');
  mongoConnection.connect().catch(error => {
    console.error('Failed to initialize MongoDB for chat:', error);
  });
}

// Initialize Socket.IO chat functionality
// Handles real-time messaging between users
require('./socket/chatHandler')(io);

/**
 * SERVER STARTUP
 */

// Start the server and listen on specified port
server.listen(PORT, () => {
  console.log(`BirdSphere server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Socket.IO chat server enabled`);
  
  // Log important endpoints for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
  }
});