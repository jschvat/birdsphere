const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', userController.getAllUsers);
router.get('/nearby', userController.findNearbyUsers);
router.get('/animal-categories', userController.getAnimalCategories);

// Authenticated routes
router.get('/profile', authenticateToken, userController.getCurrentUserProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

// Rating routes
router.post('/:userId/ratings', authenticateToken, userController.addUserRating);
router.get('/:userId/ratings', userController.getUserRatings);

// Public user profile route (must be last to avoid conflicts)
router.get('/:username', optionalAuth, userController.getUserProfile);

module.exports = router;