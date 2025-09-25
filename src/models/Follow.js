/**
 * Follow Data Model
 * Advanced social relationship management with notification preferences and engagement tracking.
 *
 * Architecture Overview:
 * - Bidirectional relationship tracking (followers/following)
 * - Granular notification preferences (posts, important content, live streams)
 * - Engagement scoring for algorithmic feed prioritization
 * - Self-follow prevention with relationship validation
 * - Mutual connection discovery and suggestions
 * - Comprehensive analytics and statistics
 *
 * Key Features:
 * - Notification Preferences: Users can customize notifications per relationship
 * - Engagement Tracking: Scores relationships based on user interactions
 * - Social Discovery: Find mutual follows and suggest new connections
 * - Analytics Dashboard: Detailed follower/following statistics
 * - Performance Optimized: Efficient queries for large social graphs
 *
 * Database Design:
 * - Unique constraint on (follower_id, following_id) prevents duplicates
 * - Indexes on follower_id and following_id for fast lookups
 * - Engagement scoring for feed algorithm optimization
 * - Timestamp tracking for relationship analytics
 *
 * Integration Points:
 * - Works with User model for profile information
 * - Feeds into timeline generation algorithms
 * - Powers notification delivery systems
 * - Supports social discovery features
 */
const db = require('../config/database');

class Follow {
  /**
   * Create Follow Relationship
   * Establishes a follower relationship with customizable notification preferences.
   * Prevents self-following and handles duplicate relationships via UPSERT.
   *
   * @param {Object} params - Follow relationship parameters
   * @param {string} params.followerId - ID of user doing the following
   * @param {string} params.followingId - ID of user being followed
   * @param {boolean} [params.notifyAllPosts=true] - Notify for all posts
   * @param {boolean} [params.notifyImportantPosts=true] - Notify for important posts
   * @param {boolean} [params.notifyLiveStream=true] - Notify for live streams
   * @returns {Promise<Object>} Created or updated follow relationship
   * @throws {Error} If user attempts to follow themselves
   */
  static async create({
    followerId,
    followingId,
    notifyAllPosts = true,
    notifyImportantPosts = true,
    notifyLiveStream = true
  }) {
    // Prevent self-following
    if (followerId === followingId) {
      throw new Error('Users cannot follow themselves');
    }

    const query = `
      INSERT INTO follows (
        follower_id, following_id,
        notify_all_posts, notify_important_posts, notify_live_stream
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (follower_id, following_id)
      DO UPDATE SET
        notify_all_posts = EXCLUDED.notify_all_posts,
        notify_important_posts = EXCLUDED.notify_important_posts,
        notify_live_stream = EXCLUDED.notify_live_stream
      RETURNING *
    `;

    const values = [
      followerId, followingId,
      notifyAllPosts, notifyImportantPosts, notifyLiveStream
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find Follow by ID
   * Retrieves a specific follow relationship by its unique identifier.
   *
   * @param {string} id - Follow relationship ID
   * @returns {Promise<Object|null>} Follow relationship or null if not found
   */
  static async findById(id) {
    const query = 'SELECT * FROM follows WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find Follow by User Pair
   * Checks if a specific follow relationship exists between two users.
   *
   * @param {string} followerId - ID of following user
   * @param {string} followingId - ID of followed user
   * @returns {Promise<Object|null>} Follow relationship or null if not found
   */
  static async findByUsers(followerId, followingId) {
    const query = `
      SELECT * FROM follows
      WHERE follower_id = $1 AND following_id = $2
    `;

    const result = await db.query(query, [followerId, followingId]);
    return result.rows[0];
  }

  /**
   * Get User's Followers
   * Retrieves paginated list of users following the specified user with profile information.
   * Supports multiple sorting options including engagement-based ranking.
   *
   * @param {string} userId - ID of user whose followers to retrieve
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=20] - Maximum followers to return
   * @param {number} [options.offset=0] - Pagination offset
   * @param {string} [options.sort='newest'] - Sort order: newest, oldest, engagement
   * @returns {Promise<Array>} Array of followers with user profile data
   */
  static async getFollowers(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      sort = 'newest'
    } = options;

    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'f.created_at ASC';
        break;
      case 'engagement':
        orderBy = 'f.engagement_score DESC, f.created_at DESC';
        break;
      case 'newest':
      default:
        orderBy = 'f.created_at DESC';
        break;
    }

    const query = `
      SELECT f.*,
             u.username, u.first_name, u.last_name, u.profile_image, u.is_verified
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get Users Being Followed
   * Retrieves paginated list of users that the specified user is following.
   * Includes profile information and supports engagement-based sorting.
   *
   * @param {string} userId - ID of user whose following list to retrieve
   * @param {Object} [options={}] - Query options
   * @param {number} [options.limit=20] - Maximum following to return
   * @param {number} [options.offset=0] - Pagination offset
   * @param {string} [options.sort='newest'] - Sort order: newest, oldest, engagement
   * @returns {Promise<Array>} Array of followed users with profile data
   */
  static async getFollowing(userId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      sort = 'newest'
    } = options;

    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'f.created_at ASC';
        break;
      case 'engagement':
        orderBy = 'f.engagement_score DESC, f.created_at DESC';
        break;
      case 'newest':
      default:
        orderBy = 'f.created_at DESC';
        break;
    }

    const query = `
      SELECT f.*,
             u.username, u.first_name, u.last_name, u.profile_image, u.is_verified
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Get Following IDs Only
   * Fast retrieval of just the IDs of users being followed.
   * Optimized for timeline generation and bulk operations.
   *
   * @param {string} userId - ID of user whose following IDs to retrieve
   * @returns {Promise<Array<string>>} Array of user IDs being followed
   */
  static async getFollowingIds(userId) {
    const query = `
      SELECT following_id
      FROM follows
      WHERE follower_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(row => row.following_id);
  }

  /**
   * Get Follower IDs Only
   * Fast retrieval of just the IDs of followers.
   * Used for notification targeting and analytics.
   *
   * @param {string} userId - ID of user whose follower IDs to retrieve
   * @returns {Promise<Array<string>>} Array of follower user IDs
   */
  static async getFollowerIds(userId) {
    const query = `
      SELECT follower_id
      FROM follows
      WHERE following_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(row => row.follower_id);
  }

  static async isFollowing(followerId, followingId) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = $1 AND following_id = $2
      ) as is_following
    `;

    const result = await db.query(query, [followerId, followingId]);
    return result.rows[0].is_following;
  }

  static async countFollowers(userId) {
    const query = 'SELECT COUNT(*) as count FROM follows WHERE following_id = $1';
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async countFollowing(userId) {
    const query = 'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1';
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async unfollow(followerId, followingId) {
    const query = `
      DELETE FROM follows
      WHERE follower_id = $1 AND following_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [followerId, followingId]);
    return result.rows[0];
  }

  static async updateNotificationSettings(followerId, followingId, settings) {
    const allowedFields = ['notify_all_posts', 'notify_important_posts', 'notify_live_stream'];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(settings)) {
      if (allowedFields.includes(key) && typeof value === 'boolean') {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid notification settings provided');
    }

    values.push(followerId, followingId);

    const query = `
      UPDATE follows
      SET ${setClause.join(', ')}
      WHERE follower_id = $${paramCount++} AND following_id = $${paramCount++}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      throw new Error('Follow relationship not found');
    }

    return result.rows[0];
  }

  static async updateEngagementScore(followerId, followingId, score) {
    const query = `
      UPDATE follows
      SET engagement_score = $1, last_interaction = CURRENT_TIMESTAMP
      WHERE follower_id = $2 AND following_id = $3
      RETURNING *
    `;

    const result = await db.query(query, [score, followerId, followingId]);
    return result.rows[0];
  }

  static async getMutualFollows(userId1, userId2) {
    const query = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.profile_image
      FROM users u
      WHERE u.id IN (
        SELECT f1.following_id
        FROM follows f1
        WHERE f1.follower_id = $1
        INTERSECT
        SELECT f2.following_id
        FROM follows f2
        WHERE f2.follower_id = $2
      )
      ORDER BY u.username
    `;

    const result = await db.query(query, [userId1, userId2]);
    return result.rows;
  }

  static async getSuggestedFollows(userId, options = {}) {
    const {
      limit = 10,
      excludeFollowing = true
    } = options;

    let excludeClause = '';
    if (excludeFollowing) {
      excludeClause = `AND u.id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = $1
      )`;
    }

    const query = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.profile_image, u.is_verified,
             COUNT(DISTINCT f.follower_id) as mutual_followers_count,
             COUNT(DISTINCT ai.category_id) as shared_interests_count
      FROM users u
      LEFT JOIN follows f ON u.id = f.following_id
      LEFT JOIN user_animal_interests ai ON u.id = ai.user_id
      WHERE u.id != $1
      ${excludeClause}
      AND ai.category_id IN (
        SELECT category_id FROM user_animal_interests WHERE user_id = $1
      )
      GROUP BY u.id, u.username, u.first_name, u.last_name, u.profile_image, u.is_verified
      ORDER BY shared_interests_count DESC, mutual_followers_count DESC
      LIMIT $${excludeFollowing ? 2 : 1}
    `;

    const values = excludeFollowing ? [userId, limit] : [userId, limit];
    const result = await db.query(query, values);
    return result.rows;
  }

  static async getFollowStats(userId) {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM follows WHERE following_id = $1) as followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count,
        (SELECT COUNT(*) FROM follows f1
         WHERE f1.follower_id = $1
         AND EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id = f1.following_id AND f2.following_id = $1)
        ) as mutual_follows_count
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  static async getRecentFollowers(userId, limit = 5) {
    const query = `
      SELECT f.*,
             u.username, u.first_name, u.last_name, u.profile_image, u.is_verified
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  static async getTopEngagedFollowing(userId, limit = 10) {
    const query = `
      SELECT f.*,
             u.username, u.first_name, u.last_name, u.profile_image, u.is_verified
      FROM follows f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY f.engagement_score DESC, f.last_interaction DESC
      LIMIT $2
    `;

    const result = await db.query(query, [userId, limit]);
    return result.rows;
  }

  static async bulkUpdateEngagement(engagementUpdates) {
    if (!engagementUpdates || engagementUpdates.length === 0) {
      return;
    }

    const values = [];
    const updateCases = [];

    engagementUpdates.forEach((update, index) => {
      const { followerId, followingId, score } = update;
      const offset = index * 3;

      updateCases.push(`
        WHEN follower_id = $${offset + 1} AND following_id = $${offset + 2}
        THEN $${offset + 3}
      `);

      values.push(followerId, followingId, score);
    });

    const query = `
      UPDATE follows
      SET engagement_score = CASE
        ${updateCases.join(' ')}
        ELSE engagement_score
      END,
      last_interaction = CURRENT_TIMESTAMP
      WHERE (follower_id, following_id) IN (${
        engagementUpdates.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2})`).join(', ')
      })
    `;

    await db.query(query, values);
  }
}

module.exports = Follow;