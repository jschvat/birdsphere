const db = require('../config/database');

class Reaction {
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

    const query = `
      INSERT INTO reactions (user_id, target_id, target_type, reaction_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, target_id, target_type)
      DO UPDATE SET reaction_type = EXCLUDED.reaction_type
      RETURNING *
    `;

    const values = [userId, targetId, targetType, reactionType];
    const result = await db.query(query, values);

    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM reactions WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

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

    const query = `
      SELECT * FROM reactions
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }

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

    const query = `
      SELECT * FROM reactions
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  static async getUserReaction(userId, targetId, targetType) {
    const query = `
      SELECT * FROM reactions
      WHERE user_id = $1 AND target_id = $2 AND target_type = $3
    `;

    const result = await db.query(query, [userId, targetId, targetType]);
    return result.rows[0];
  }

  static async getReactionSummary(targetId, targetType) {
    const query = `
      SELECT reaction_type, COUNT(*) as count
      FROM reactions
      WHERE target_id = $1 AND target_type = $2
      GROUP BY reaction_type
      ORDER BY count DESC, reaction_type
    `;

    const result = await db.query(query, [targetId, targetType]);

    const summary = {
      reactions: result.rows,
      total: result.rows.reduce((sum, r) => sum + parseInt(r.count), 0)
    };

    return summary;
  }

  static async remove(userId, targetId, targetType) {
    const query = `
      DELETE FROM reactions
      WHERE user_id = $1 AND target_id = $2 AND target_type = $3
      RETURNING *
    `;

    const result = await db.query(query, [userId, targetId, targetType]);
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

    const query = `SELECT COUNT(*) as count FROM reactions ${whereClause}`;
    const result = await db.query(query, values);

    return parseInt(result.rows[0].count);
  }

  static async findRecentByUser(userId, limit = 10) {
    const query = `
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

    const result = await db.query(query, [userId, limit]);
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

    const query = `
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

    const result = await db.query(query, values);
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

    const query = `
      SELECT reaction_type, target_type, COUNT(*) as count
      FROM reactions
      WHERE ${whereClause}
      GROUP BY reaction_type, target_type
      ORDER BY count DESC
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  static getValidReactionTypes() {
    return ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug'];
  }

  static getValidTargetTypes() {
    return ['post', 'comment'];
  }
}

module.exports = Reaction;