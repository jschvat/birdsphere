const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Simple test endpoint first (no auth for testing)
router.get('/test', (req, res) => {
  res.json({
    message: 'Chat system is working!',
    timestamp: new Date().toISOString(),
    socketEnabled: true
  });
});

// Authenticated test endpoint  
router.get('/test-auth', authenticateToken, (req, res) => {
  res.json({
    message: 'Chat system is working with authentication!',
    user: req.user.username,
    timestamp: new Date().toISOString()
  });
});

// Placeholder for future chat endpoints
router.get('/rooms', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Chat rooms endpoint - coming soon',
    rooms: []
  });
});

module.exports = router;