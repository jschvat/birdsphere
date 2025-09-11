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

// Mount routes
router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/messages', messageRoutes);
router.use('/users', userRoutes);
router.use('/location', locationRoutes);
router.use('/chat', chatRoutes);
router.use('/upload', uploadRoutes);

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
      chat: '/api/chat'
    }
  });
});

module.exports = router;