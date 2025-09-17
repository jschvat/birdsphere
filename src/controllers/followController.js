const Follow = require('../models/Follow');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Follow a user
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
    console.error('Error following user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to follow user',
      error: error.message
    });
  }
};

/**
 * Unfollow a user
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
    console.error('Error unfollowing user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfollow user',
      error: error.message
    });
  }
};

/**
 * Get user's followers
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
    console.error('Error fetching followers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch followers',
      error: error.message
    });
  }
};

/**
 * Get users that a user is following
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
    console.error('Error fetching following:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch following',
      error: error.message
    });
  }
};

/**
 * Get follow statistics for a user
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
    console.error('Error fetching follow stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch follow stats',
      error: error.message
    });
  }
};

/**
 * Get suggested users to follow
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
    console.error('Error fetching suggested users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggested users',
      error: error.message
    });
  }
};

/**
 * Update follow preferences
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
    console.error('Error updating follow preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update follow preferences',
      error: error.message
    });
  }
};

/**
 * Check if user is following another user
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
    console.error('Error checking follow status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check follow status',
      error: error.message
    });
  }
};