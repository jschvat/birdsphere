const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/nearby', userController.findNearbyUsers);
router.get('/:username', optionalAuth, userController.getUserProfile);

module.exports = router;