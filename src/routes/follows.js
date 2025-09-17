const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const followController = require('../controllers/followController');

// Follow/unfollow routes
router.post('/:userId', authenticateToken, followController.followUser);
router.delete('/:userId', authenticateToken, followController.unfollowUser);

// Get followers/following
router.get('/:userId/followers', followController.getFollowers);
router.get('/:userId/following', followController.getFollowing);
router.get('/:userId/stats', followController.getFollowStats);

// Follow utilities
router.get('/suggestions', authenticateToken, followController.getSuggestedUsers);
router.put('/:userId/preferences', authenticateToken, followController.updateFollowPreferences);
router.get('/:userId/status', authenticateToken, followController.checkFollowStatus);

module.exports = router;