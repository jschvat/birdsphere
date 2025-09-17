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