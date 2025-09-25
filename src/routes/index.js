/**
 * Main API Router
 * Central routing hub for the BirdSphere application API endpoints.
 *
 * Route Structure:
 * - /api/auth - Authentication and user account management
 * - /api/posts - Social media posts, comments, and reactions
 * - /api/users - User profiles, discovery, and management
 * - /api/listings - Animal marketplace and breeding listings
 * - /api/follows - Social relationships and follow management
 * - /api/messages - Direct messaging between users
 * - /api/chat - Real-time chat functionality
 * - /api/media - File upload and media management
 * - /api/location - Geographic and location services
 * - /api/upload - Legacy upload endpoints
 *
 * API Features:
 * - RESTful design with consistent response formats
 * - Comprehensive authentication and authorization
 * - Input validation and sanitization
 * - Error handling and appropriate HTTP status codes
 * - Swagger/OpenAPI documentation for key endpoints
 * - Rate limiting and security middleware
 * - Caching for performance optimization
 *
 * Authentication:
 * Most endpoints require JWT authentication via:
 * - Authorization: Bearer <token> header
 * - httpOnly cookies (preferred for web clients)
 *
 * Response Format:
 * All responses follow consistent JSON structure with:
 * - Success: { message?, data?, pagination? }
 * - Error: { error, message?, details? }
 */
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const listingRoutes = require('./listings');
const messageRoutes = require('./messages');
const userRoutes = require('./users');
const locationRoutes = require('./location');
const chatRoutes = require('./chat');
const uploadRoutes = require('./upload');
const postRoutes = require('./posts');
const followRoutes = require('./follows');
const mediaRoutes = require('./media');

// Mount routes
router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/messages', messageRoutes);
router.use('/users', userRoutes);
router.use('/location', locationRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);
router.use('/posts', postRoutes);
router.use('/follows', followRoutes);
router.use('/media', mediaRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'BirdSphere API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      listings: '/api/listings',
      messages: '/api/messages',
      users: '/api/users',
      location: '/api/location',
      chat: '/api/chat',
      posts: '/api/posts',
      follows: '/api/follows',
      media: '/api/media'
    }
  });
});

module.exports = router;