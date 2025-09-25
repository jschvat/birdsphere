/**
 * Reaction Data Model
 * Universal reaction system supporting multiple reaction types for posts and comments.
 *
 * Architecture Overview:
 * - Universal targeting system (posts, comments)
 * - Seven reaction types: like, love, laugh, wow, sad, angry, hug
 * - UPSERT mechanism prevents duplicate reactions per user/target
 * - Reaction switching support (user can change reaction type)
 * - Real-time reaction analytics and summaries
 * - Engagement metrics for content ranking
 *
 * Key Features:
 * - Multi-Target Support: Works with both posts and comments
 * - Reaction Diversity: Seven distinct emotional reactions
 * - User Experience: Seamless reaction switching without duplicates
 * - Analytics Ready: Comprehensive reaction statistics and summaries
 * - Performance Optimized: Efficient queries for high-volume interactions
 *
 * Database Design:
 * - Unique constraint on (user_id, target_id, target_type) prevents duplicates
 * - Indexed for fast lookups and aggregations
 * - Target type validation ensures data consistency
 * - Timestamp tracking for trending analysis
 *
 * Integration Points:
 * - Works with Post and Comment models
 * - Powers engagement scoring algorithms
 * - Feeds real-time reaction counters
 * - Supports user activity tracking
 */
const { query } = require('../config/database');

class Reaction {
  /**
   * Create or Update Reaction
   * Adds a new reaction or updates existing reaction for a user on a target.
   * Uses UPSERT to allow users to change their reaction type.
   *
   * @param {Object} params - Reaction parameters
   * @param {string} params.userId - ID of user creating the reaction
   * @param {string} params.targetId - ID of target content (post or comment)
   * @param {string} params.targetType - Type of target: 'post' or 'comment'
   * @param {string} params.reactionType - Reaction type: like, love, laugh, wow, sad, angry, hug
   * @returns {Promise<Object>} Created or updated reaction
   * @throws {Error} If invalid target type or reaction type provided
   */
  static async create({
    userId,
    targetId,
    targetType,
    reactionType
  }) {
    // Validate target type
    if (!['post', 'comment'].includes(targetType)) {
      throw new Error('Invalid target type. Must be "post" or "comment"');
    }

    // Validate reaction type
    const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug'];
    if (!validReactions.includes(reactionType)) {
      throw new Error('Invalid reaction type');
    }

    const sql = `
      INSERT INTO reactions (user_id, target_id, target_type, reaction_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, target_id, target_type)
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type
      RETURNING *
    `;

    const values = [userId, targetId, targetType, reactionType];
    const result = await query(sql, values);

    return result.rows[0];
  }

  /**
   * Find Reaction by ID
   * Retrieves a specific reaction by its unique identifier.
   *
   * @param {string} id - Reaction ID
   * @returns {Promise<Object|null>} Reaction or null if not found
   */
  static async findById(id) {
    const sql = 'SELECT * FROM reactions WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  /**
   * Find User's Reactions
   * Retrieves paginated list of reactions created by a specific user.
   * Supports filtering by target type and reaction type.
   *
   * @param {string} userId - ID of user whose reactions to retrieve
   * @param {Object} [options={}] - Query options
   * @param {string} [options.targetType] - Filter by target type: 'post' or 'comment'
   * @param {string} [options.reactionType] - Filter by reaction type
   * @param {number} [options.limit=20] - Maximum reactions to return
   * @param {number} [options.offset=0] - Pagination offset
   * @param {string} [options.sort='newest'] - Sort order: newest or oldest
   * @returns {Promise<Array>} Array of user's reactions
   */
  static async findByUser(userId, options = {}) {
    const {
      targetType,
      reactionType,
      limit = 20,
      offset = 0,
      sort = 'newest'
    } = options;

    let whereConditions = ['user_id = $1'];
    let values = [userId];
    let paramCount = 2;

    if (targetType) {
      whereConditions.push(`target_type = $${paramCount++}`);
      values.push(targetType);
    }

    if (reactionType) {
      whereConditions.push(`reaction_type = $${paramCount++}`);
      values.push(reactionType);
    }

    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'created_at ASC';
        break;
      case 'newest':
      default:
        orderBy = 'created_at DESC';
        break;
    }

    const whereClause = whereConditions.join(' AND ');

    const sql = `
      SELECT * FROM reactions
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Find Reactions by Target
   * Retrieves all reactions for a specific piece of content.
   * Supports filtering by user and reaction type.
   *
   * @param {string} targetId - ID of target content
   * @param {string} targetType - Type of target: 'post' or 'comment'
   * @param {Object} [options={}] - Query options
   * @param {string} [options.userId] - Filter by specific user
   * @param {string} [options.reactionType] - Filter by reaction type
   * @param {number} [options.limit=50] - Maximum reactions to return
   * @param {number} [options.offset=0] - Pagination offset
   * @param {string} [options.sort='newest'] - Sort order: newest or oldest
   * @returns {Promise<Array>} Array of reactions on the target content
   */
  static async findByTarget(targetId, targetType, options = {}) {
    const {
      userId,
      reactionType,
      limit = 50,
      offset = 0,
      sort = 'newest'
    } = options;

    let whereConditions = ['target_id = $1', 'target_type = $2'];
    let values = [targetId, targetType];
    let paramCount = 3;

    if (userId) {
      whereConditions.push(`user_id = $${paramCount++}`);
      values.push(userId);
    }

    if (reactionType) {
      whereConditions.push(`reaction_type = $${paramCount++}`);
      values.push(reactionType);
    }

    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'created_at ASC';
        break;
      case 'newest':
      default:
        orderBy = 'created_at DESC';
        break;
    }

    const whereClause = whereConditions.join(' AND ');

    const sql = `
      SELECT * FROM reactions
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Get User's Reaction on Target
   * Checks if a user has reacted to specific content and returns the reaction.
   * Used for UI state management to show active reactions.
   *
   * @param {string} userId - ID of user
   * @param {string} targetId - ID of target content
   * @param {string} targetType - Type of target: 'post' or 'comment'
   * @returns {Promise<Object|null>} User's reaction or null if no reaction
   */
  static async getUserReaction(userId, targetId, targetType) {
    const sql = `
      SELECT * FROM reactions
      WHERE user_id = $1 AND target_id = $2 AND target_type = $3
    `;

    const result = await query(sql, [userId, targetId, targetType]);
    return result.rows[0];
  }

  /**
   * Get Reaction Summary
   * Provides aggregated reaction counts by type for a piece of content.
   * Returns both individual reaction counts and total reaction count.
   *
   * @param {string} targetId - ID of target content
   * @param {string} targetType - Type of target: 'post' or 'comment'
   * @returns {Promise<Object>} Object with reactions array and total count
   */
  static async getReactionSummary(targetId, targetType) {
    const sql = `
      SELECT reaction_type, COUNT(*) as count
      FROM reactions
      WHERE target_id = $1 AND target_type = $2
      GROUP BY reaction_type
      ORDER BY count DESC, reaction_type
    `;

    const result = await query(sql, [targetId, targetType]);

    const summary = {
      reactions: result.rows,
      total: result.rows.reduce((sum, r) => sum + parseInt(r.count), 0)
    };

    return summary;
  }

  static async remove(userId, targetId, targetType) {
    const sql = `
      DELETE FROM reactions
      WHERE user_id = $1 AND target_id = $2 AND target_type = $3
      RETURNING *
    `;

    const result = await query(sql, [userId, targetId, targetType]);
    return result.rows[0];
  }

  static async count(options = {}) {
    const {
      userId,
      targetId,
      targetType,
      reactionType
    } = options;

    let whereConditions = [];
    let values = [];
    let paramCount = 1;

    if (userId) {
      whereConditions.push(`user_id = $${paramCount++}`);
      values.push(userId);
    }

    if (targetId) {
      whereConditions.push(`target_id = $${paramCount++}`);
      values.push(targetId);
    }

    if (targetType) {
      whereConditions.push(`target_type = $${paramCount++}`);
      values.push(targetType);
    }

    if (reactionType) {
      whereConditions.push(`reaction_type = $${paramCount++}`);
      values.push(reactionType);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `SELECT COUNT(*) as count FROM reactions ${whereClause}`;
    const result = await query(sql, values);

    return parseInt(result.rows[0].count);
  }

  static async findRecentByUser(userId, limit = 10) {
    const sql = `
      SELECT r.*,
             CASE
               WHEN r.target_type = 'post' THEN p.content
               WHEN r.target_type = 'comment' THEN c.content
             END as target_content,
             CASE
               WHEN r.target_type = 'post' THEN p.author_id
               WHEN r.target_type = 'comment' THEN c.author_id
             END as target_author_id
      FROM reactions r
      LEFT JOIN posts p ON r.target_id = p.id AND r.target_type = 'post'
      LEFT JOIN comments c ON r.target_id = c.id AND r.target_type = 'comment'
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `;

    const result = await query(sql, [userId, limit]);
    return result.rows;
  }

  static async getTopReactedContent(options = {}) {
    const {
      targetType,
      reactionType,
      timeframe, // hours
      limit = 10
    } = options;

    let whereConditions = [];
    let values = [];
    let paramCount = 1;

    if (targetType) {
      whereConditions.push(`r.target_type = $${paramCount++}`);
      values.push(targetType);
    }

    if (reactionType) {
      whereConditions.push(`r.reaction_type = $${paramCount++}`);
      values.push(reactionType);
    }

    if (timeframe) {
      whereConditions.push(`r.created_at >= NOW() - INTERVAL '${timeframe} hours'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT r.target_id, r.target_type, COUNT(*) as reaction_count,
             CASE
               WHEN r.target_type = 'post' THEN p.content
               WHEN r.target_type = 'comment' THEN c.content
             END as content,
             CASE
               WHEN r.target_type = 'post' THEN p.author_id
               WHEN r.target_type = 'comment' THEN c.author_id
             END as author_id
      FROM reactions r
      LEFT JOIN posts p ON r.target_id = p.id AND r.target_type = 'post'
      LEFT JOIN comments c ON r.target_id = c.id AND r.target_type = 'comment'
      ${whereClause}
      GROUP BY r.target_id, r.target_type, p.content, c.content, p.author_id, c.author_id
      ORDER BY reaction_count DESC
      LIMIT $${paramCount++}
    `;

    values.push(limit);

    const result = await query(sql, values);
    return result.rows;
  }

  static async getUserReactionStats(userId, options = {}) {
    const {
      targetType,
      timeframe // hours
    } = options;

    let whereConditions = ['user_id = $1'];
    let values = [userId];
    let paramCount = 2;

    if (targetType) {
      whereConditions.push(`target_type = $${paramCount++}`);
      values.push(targetType);
    }

    if (timeframe) {
      whereConditions.push(`created_at >= NOW() - INTERVAL '${timeframe} hours'`);
    }

    const whereClause = whereConditions.join(' AND ');

    const sql = `
      SELECT reaction_type, target_type, COUNT(*) as count
      FROM reactions
      WHERE ${whereClause}
      GROUP BY reaction_type, target_type
      ORDER BY count DESC
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  /**
   * Get Valid Reaction Types
   * Returns list of all supported reaction types for validation.
   *
   * @returns {Array<string>} Array of valid reaction type strings
   */
  static getValidReactionTypes() {
    return ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug'];
  }

  /**
   * Get Valid Target Types
   * Returns list of all supported target types for validation.
   *
   * @returns {Array<string>} Array of valid target type strings
   */
  static getValidTargetTypes() {
    return ['post', 'comment'];
  }
}

module.exports = Reaction;