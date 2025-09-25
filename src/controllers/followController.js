/**
 * Follow Controller
 * Social relationship management for user following and discovery features.
 *
 * NOTE: This controller appears to use MongoDB/Mongoose operations,
 * indicating a hybrid database architecture where social relationships
 * may be stored in MongoDB while core user data is in PostgreSQL.
 *
 * Core Responsibilities:
 * - Follow/unfollow relationship management
 * - Follower and following list retrieval
 * - Social discovery and user suggestions
 * - Follow statistics and analytics
 * - Notification preferences for follows
 * - Follow status checking and validation
 *
 * Key Features:
 * - Social Graph Management: Complete follow relationship handling
 * - Smart Suggestions: Algorithm-based user discovery and recommendations
 * - Preference Control: Granular notification and category preferences
 * - Analytics: Comprehensive follow statistics and insights
 * - Performance Optimized: Efficient aggregation queries for large datasets
 * - Validation: Prevents self-following and duplicate relationships
 *
 * Integration Points:
 * - Works with MongoDB Follow model for relationship data
 * - Connects to User model for profile information
 * - Supports notification systems with preference management
 * - Feeds social discovery algorithms
 * - Powers timeline and content recommendation systems
 */
const Follow = require('../models/Follow');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Follow User Endpoint
 * Creates a follow relationship with duplicate and self-follow prevention.
 * Supports category-specific following for targeted content preferences.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - ID of user to follow
 * @param {Array} [req.body.categories] - Specific categories to follow
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Success confirmation with relationship data
 */
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { categories } = req.body; // Optional: specific categories to follow

    // Can't follow yourself
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot follow yourself'
      });
    }

    // Check if user exists
    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: req.user.id,
      following: userId
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    // Create follow relationship
    const follow = new Follow({
      follower: req.user.id,
      following: userId,
      categories: categories || []
    });

    await follow.save();

    res.status(201).json({
      success: true,
      message: 'Successfully followed user',
      data: follow
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to follow user',
      error: error.message
    });
  }
};

/**
 * Unfollow User Endpoint
 * Removes an existing follow relationship between users.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - ID of user to unfollow
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Success confirmation of relationship removal
 */
exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await Follow.findOneAndDelete({
      follower: req.user.id,
      following: userId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Follow relationship not found'
      });
    }

    res.json({
      success: true,
      message: 'Successfully unfollowed user'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user',
      error: error.message
    });
  }
};

/**
 * Get User's Followers
 * Retrieves paginated list of users following the specified user.
 * Includes follow status for the current authenticated user.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - ID of user to get followers for
 * @param {number} [req.query.limit=20] - Maximum followers to return
 * @param {number} [req.query.offset=0] - Pagination offset
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Paginated followers list with user profiles
 */
exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 20,
      offset = 0
    } = req.query;

    const followers = await Follow.find({ following: userId })
      .populate('follower', 'username firstName lastName profileImage isVerified bio')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    // Add follow status for current user
    let followersWithStatus = followers.map(f => f.follower);

    if (req.user) {
      const currentUserFollows = await Follow.find({
        follower: req.user.id,
        following: { $in: followersWithStatus.map(u => u._id) }
      });

      const followingMap = new Set(currentUserFollows.map(f => f.following.toString()));

      followersWithStatus = followersWithStatus.map(user => ({
        ...user.toObject(),
        isFollowing: followingMap.has(user._id.toString())
      }));
    }

    res.json({
      success: true,
      data: followersWithStatus,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: followers.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch followers',
      error: error.message
    });
  }
};

/**
 * Get Following List
 * Retrieves paginated list of users that the specified user follows.
 * Shows follow status from current user's perspective.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - ID of user to get following list for
 * @param {number} [req.query.limit=20] - Maximum following to return
 * @param {number} [req.query.offset=0] - Pagination offset
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Paginated following list with user profiles
 */
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 20,
      offset = 0
    } = req.query;

    const following = await Follow.find({ follower: userId })
      .populate('following', 'username firstName lastName profileImage isVerified bio')
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    // Add follow status for current user
    let followingWithStatus = following.map(f => f.following);

    if (req.user && req.user.id !== userId) {
      const currentUserFollows = await Follow.find({
        follower: req.user.id,
        following: { $in: followingWithStatus.map(u => u._id) }
      });

      const followingMap = new Set(currentUserFollows.map(f => f.following.toString()));

      followingWithStatus = followingWithStatus.map(user => ({
        ...user.toObject(),
        isFollowing: followingMap.has(user._id.toString())
      }));
    }

    res.json({
      success: true,
      data: followingWithStatus,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: following.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following',
      error: error.message
    });
  }
};

/**
 * Get Follow Statistics
 * Retrieves comprehensive follow metrics for a user including counts
 * and current user's follow status.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - ID of user to get stats for
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Follow statistics including follower/following counts
 */
exports.getFollowStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const [followerCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId })
    ]);

    // Check if current user follows this user
    let isFollowing = false;
    if (req.user && req.user.id !== userId) {
      const followRelation = await Follow.exists({
        follower: req.user.id,
        following: userId
      });
      isFollowing = !!followRelation;
    }

    res.json({
      success: true,
      data: {
        followerCount,
        followingCount,
        isFollowing
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch follow stats',
      error: error.message
    });
  }
};

/**
 * Get Suggested Users
 * Algorithm-based user recommendations using mutual connections and popularity.
 * Combines friend-of-friend suggestions with popular user discovery.
 *
 * @param {Object} req - Express request object
 * @param {number} [req.query.limit=10] - Maximum suggestions to return
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Curated list of suggested users to follow
 */
exports.getSuggestedUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get users that current user follows
    const userFollows = await Follow.find({ follower: req.user.id });
    const followedUserIds = userFollows.map(f => f.following);

    // Get users that followers of current user also follow (friend suggestions)
    const friendSuggestions = await Follow.aggregate([
      { $match: { following: { $in: followedUserIds } } },
      { $group: { _id: '$follower', commonFollows: { $sum: 1 } } },
      { $match: { _id: { $nin: [...followedUserIds, req.user.id] } } },
      { $sort: { commonFollows: -1 } },
      { $limit: parseInt(limit) / 2 }
    ]);

    // Get popular users (high follower count) not followed by current user
    const popularUsers = await Follow.aggregate([
      { $match: { following: { $nin: [...followedUserIds, req.user.id] } } },
      { $group: { _id: '$following', followerCount: { $sum: 1 } } },
      { $sort: { followerCount: -1 } },
      { $limit: parseInt(limit) / 2 }
    ]);

    // Combine and populate user data
    const suggestionIds = [
      ...friendSuggestions.map(s => s._id),
      ...popularUsers.map(s => s._id)
    ].slice(0, parseInt(limit));

    const suggestions = await User.find({
      _id: { $in: suggestionIds }
    })
    .select('username firstName lastName profileImage isVerified bio')
    .limit(parseInt(limit));

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggested users',
      error: error.message
    });
  }
};

/**
 * Update Follow Preferences
 * Modifies notification settings and category preferences for existing follows.
 * Allows fine-tuned control over content and notification delivery.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - ID of followed user
 * @param {Array} [req.body.categories] - Updated category preferences
 * @param {Object} [req.body.notifications] - Updated notification settings
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Updated follow relationship with new preferences
 */
exports.updateFollowPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const { categories, notifications } = req.body;

    const follow = await Follow.findOne({
      follower: req.user.id,
      following: userId
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        message: 'Follow relationship not found'
      });
    }

    if (categories !== undefined) {
      follow.categories = categories;
    }

    if (notifications !== undefined) {
      follow.notifications = { ...follow.notifications, ...notifications };
    }

    await follow.save();

    res.json({
      success: true,
      message: 'Follow preferences updated successfully',
      data: follow
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update follow preferences',
      error: error.message
    });
  }
};

/**
 * Check Follow Status
 * Determines if the current user is following a specific user.
 * Returns detailed follow relationship information if exists.
 *
 * @param {Object} req - Express request object
 * @param {string} req.params.userId - ID of user to check follow status for
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Follow status and relationship details
 */
exports.checkFollowStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const follow = await Follow.findOne({
      follower: req.user.id,
      following: userId
    });

    res.json({
      success: true,
      data: {
        isFollowing: !!follow,
        followDetails: follow || null
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check follow status',
      error: error.message
    });
  }
};