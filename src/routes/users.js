const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', userController.getAllUsers);
router.get('/nearby', userController.findNearbyUsers);

// Authenticated routes
router.get('/profile', authenticateToken, userController.getCurrentUserProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

// Public user profile route (must be last to avoid conflicts)
router.get('/:username', optionalAuth, userController.getUserProfile);

module.exports = router;