const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Reaction = require('../models/Reaction');
const Comment = require('../models/Comment');
const User = require('../models/User');

class TimelineService {
  /**
   * Generate personalized timeline for a user
   * @param {string} userId - User ID to generate timeline for
   * @param {object} options - Options for timeline generation
   * @returns {Promise<Array>} Array of posts with scores
   */
  async generateTimeline(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      includeFollowedOnly = false,
      maxAge = 7 // days
    } = options;

    try {
      // Get user's follows and interests
      const [followingIds, userInterests] = await Promise.all([
        Follow.getFollowingIds(userId),
        this.getUserInterests(userId)
      ]);

      // Build visibility conditions
      const visibilityConditions = ['public'];
      if (followingIds.length > 0) {
        visibilityConditions.push('followers');
      }

      // Calculate date filter
      const cutoffDate = new Date(Date.now() - (maxAge * 24 * 60 * 60 * 1000));

      // Get posts with initial filtering
      const posts = await Post.findMany({
        visibility: includeFollowedOnly ? ['followers'] : visibilityConditions,
        authorId: includeFollowedOnly ? followingIds : undefined,
        createdAfter: cutoffDate.toISOString(),
        limit: limit * 3, // Get more than needed for algorithm filtering
        sort: 'newest'
      });

      // Add author information and score posts
      const postsWithAuthors = await this.addAuthorInformation(posts);
      const scoredPosts = await this.scorePostsForUser(postsWithAuthors, userId, userInterests, followingIds);

      // Sort by score and take requested amount
      return scoredPosts
        .sort((a, b) => b.algorithmScore - a.algorithmScore)
        .slice(offset, offset + limit);

    } catch (error) {
      console.error('Error generating timeline:', error);
      throw error;
    }
  }

  /**
   * Get trending posts (public posts with high engagement)
   */
  async getTrendingPosts(options = {}) {
    const {
      limit = 20,
      timeframe = 24 // hours
    } = options;

    const cutoffDate = new Date(Date.now() - (timeframe * 60 * 60 * 1000));

    const posts = await Post.findTrending({
      timeframe,
      limit
    });

    return this.addAuthorInformation(posts);
  }

  /**
   * Get posts by category with interest-based ranking
   */
  async getCategoryFeed(categoryId, userId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const posts = await Post.findMany({
      visibility: ['public', 'followers'],
      limit,
      offset,
      sort: 'popular'
    });

    const postsWithAuthors = await this.addAuthorInformation(posts);

    // Add user-specific data if logged in
    if (userId) {
      return this.addUserInteractionData(postsWithAuthors, userId);
    }

    return postsWithAuthors;
  }

  /**
   * Add author information to posts
   */
  async addAuthorInformation(posts) {
    return Promise.all(posts.map(async (post) => {
      const author = await User.findById(post.author_id);
      return {
        ...post,
        author: {
          id: author.id,
          username: author.username,
          firstName: author.first_name,
          lastName: author.last_name,
          profileImage: author.profile_image,
          isVerified: author.is_verified
        }
      };
    }));
  }

  /**
   * Score posts based on user interests and behavior
   */
  async scorePostsForUser(posts, userId, userInterests, followingIds) {
    const followedUserIds = new Set(followingIds);
    const userInterestIds = new Set(userInterests.map(i => i.category));

    // Get follow relationships with engagement scores
    const followRelations = await Follow.getFollowing(userId);
    const followEngagementMap = new Map();
    followRelations.forEach(rel => {
      followEngagementMap.set(rel.following_id, rel.engagement_score || 1);
    });

    return posts.map(post => {
      let score = post.engagement_score || 0;

      // Following bonus (strong signal)
      if (followedUserIds.has(post.author_id)) {
        score += 50;

        // Apply engagement multiplier from follow relationship
        const engagementMultiplier = followEngagementMap.get(post.author_id) || 1;
        score *= engagementMultiplier;
      }

      // Interest matching bonus would require category associations
      // For now, we'll use a simplified approach based on post type
      if (post.post_type === 'question') score += 10;
      if (post.post_type === 'announcement') score += 5;

      // Recency boost (exponential decay)
      const hoursOld = (Date.now() - new Date(post.created_at)) / (1000 * 60 * 60);
      const recencyMultiplier = Math.exp(-hoursOld / 12); // Half-life of 12 hours
      score *= (0.5 + 0.5 * recencyMultiplier);

      // Content type bonuses
      if (post.media_count > 0) {
        score += post.media_count * 5; // Bonus for media content
      }

      // Engagement rate bonus
      const engagementRate = post.view_count > 0 ?
        ((post.reaction_count + post.comment_count) / post.view_count) : 0;
      score += engagementRate * 20;

      // Add calculated score to post object
      return {
        ...post,
        algorithmScore: Math.max(0, score)
      };
    });
  }

  /**
   * Get user's follow relationships
   */
  async getUserFollows(userId) {
    return Follow.getFollowing(userId);
  }

  /**
   * Get user's interests (from their animal interests and interaction history)
   */
  async getUserInterests(userId) {
    // This would integrate with the existing user_animal_interests table
    // For now, we'll use a simplified approach

    // Get explicit interests
    const user = await User.findById(userId);

    let interests = [];
    if (user && user.animal_interests) {
      interests = user.animal_interests.map(interest => ({
        category: interest.id,
        score: 1.0
      }));
    }

    // Could also analyze user's reaction/comment history to infer interests
    // const interactionHistory = await this.getUserInteractionHistory(userId);
    // interests = [...interests, ...this.inferInterestsFromHistory(interactionHistory)];

    return interests;
  }

  /**
   * Add user-specific interaction data to posts
   */
  async addUserInteractionData(posts, userId) {
    const postIds = posts.map(p => p.id);

    // Get user's reactions to these posts
    const userReactions = await Promise.all(
      postIds.map(postId => Reaction.getUserReaction(userId, postId, 'post'))
    );

    const reactionMap = new Map();
    userReactions.forEach((reaction, index) => {
      if (reaction) {
        reactionMap.set(postIds[index], reaction.reaction_type);
      }
    });

    // Add reaction data to posts
    return posts.map(post => ({
      ...post,
      userReaction: reactionMap.get(post.id) || null
    }));
  }

  /**
   * Update user engagement score based on interaction
   */
  async updateEngagementScore(userId, targetUserId, interactionType) {
    const weights = {
      'view': 0.1,
      'like': 1.0,
      'comment': 2.0,
      'share': 3.0
    };

    const weight = weights[interactionType] || 0;

    // Get current engagement score
    const followRelation = await Follow.findByUsers(userId, targetUserId);
    if (followRelation) {
      const newScore = (followRelation.engagement_score || 1) + (weight * 0.1);
      await Follow.updateEngagementScore(userId, targetUserId, newScore);
    }
  }

  /**
   * Get posts for discovery (users not followed, high engagement)
   */
  async getDiscoveryPosts(userId, options = {}) {
    const { limit = 10 } = options;

    // Get users that current user follows
    const followedUserIds = await Follow.getFollowingIds(userId);
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const posts = await Post.findMany({
      visibility: ['public'],
      excludeAuthorIds: [...followedUserIds, userId],
      createdAfter: cutoffDate.toISOString(),
      sort: 'popular',
      limit
    });

    return this.addAuthorInformation(posts);
  }

  /**
   * Search posts by content, hashtags, or categories
   */
  async searchPosts(query, userId, options = {}) {
    const { limit = 20, offset = 0, sortBy = 'relevance' } = options;

    let sortType = 'newest';
    if (sortBy === 'recent') {
      sortType = 'newest';
    } else if (sortBy === 'popular') {
      sortType = 'popular';
    } else if (sortBy === 'relevance') {
      sortType = 'newest'; // PostgreSQL full-text search would handle relevance
    }

    const posts = await Post.findMany({
      search: query,
      visibility: ['public', 'followers'],
      sort: sortType,
      limit,
      offset
    });

    const postsWithAuthors = await this.addAuthorInformation(posts);
    return this.addUserInteractionData(postsWithAuthors, userId);
  }
}

module.exports = new TimelineService();