const { query } = require('../config/database');

class Post {
  static async create({
    authorId,
    content,
    visibility = 'public',
    mediaAttachments = [],
    locationCity = null,
    locationState = null,
    locationCountry = null,
    tags = []
  }) {
    const sql = `
      INSERT INTO posts (
        author_id, content, visibility, media_attachments,
        location_city, location_state, location_country, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      authorId, content, visibility, JSON.stringify(mediaAttachments),
      locationCity, locationState, locationCountry, tags
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findById(id) {
    const sql = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.profile_image
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.id = $1 AND p.is_active = true
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findMany(options = {}) {
    const {
      authorId,
      visibility,
      postType,
      hasMedia,
      hashtags,
      search,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
      sort = 'newest'
    } = options;

    let whereConditions = [];
    let values = [];
    let paramCount = 1;

    // Build WHERE conditions
    if (authorId) {
      whereConditions.push(`p.author_id = $${paramCount++}`);
      values.push(authorId);
    }

    if (visibility) {
      if (Array.isArray(visibility)) {
        whereConditions.push(`p.visibility = ANY($${paramCount++})`);
        values.push(visibility);
      } else {
        whereConditions.push(`p.visibility = $${paramCount++}`);
        values.push(visibility);
      }
    }

    if (postType) {
      whereConditions.push(`p.post_type = $${paramCount++}`);
      values.push(postType);
    }

    if (hasMedia === 'true') {
      whereConditions.push(`EXISTS(SELECT 1 FROM post_media pm WHERE pm.post_id = p.id)`);
    } else if (hasMedia === 'false') {
      whereConditions.push(`NOT EXISTS(SELECT 1 FROM post_media pm WHERE pm.post_id = p.id)`);
    }

    if (hashtags && hashtags.length > 0) {
      whereConditions.push(`p.hashtags && $${paramCount++}`);
      values.push(hashtags);
    }

    if (search) {
      whereConditions.push(`(
        to_tsvector('english', p.content) @@ plainto_tsquery('english', $${paramCount++}) OR
        p.search_keywords && ARRAY[lower($${paramCount - 1})]
      )`);
      values.push(search);
    }

    if (startDate) {
      whereConditions.push(`p.created_at >= $${paramCount++}`);
      values.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`p.created_at <= $${paramCount++}`);
      values.push(endDate);
    }

    // Build ORDER BY
    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'p.created_at ASC';
        break;
      case 'popular':
        orderBy = 'p.engagement_score DESC, p.reaction_count DESC, p.created_at DESC';
        break;
      case 'trending':
        orderBy = 'p.reach_count DESC, p.engagement_score DESC, p.created_at DESC';
        break;
      case 'mostViewed':
        orderBy = 'p.view_count DESC, p.created_at DESC';
        break;
      case 'mostCommented':
        orderBy = 'p.comment_count DESC, p.created_at DESC';
        break;
      case 'newest':
      default:
        orderBy = 'p.created_at DESC';
        break;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.profile_image,
             COALESCE(json_agg(
               json_build_object(
                 'id', pm.id,
                 'fileType', pm.file_type,
                 'fileUrl', pm.file_url,
                 'fileName', pm.file_name,
                 'fileSize', pm.file_size,
                 'mimeType', pm.mime_type,
                 'width', pm.width,
                 'height', pm.height,
                 'duration', pm.duration,
                 'thumbnailUrl', pm.thumbnail_url,
                 'displayOrder', pm.display_order
               ) ORDER BY pm.display_order
             ) FILTER (WHERE pm.id IS NOT NULL), '[]'::json) as media
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN post_media pm ON p.id = pm.post_id
      ${whereClause}
      GROUP BY p.id, u.username, u.first_name, u.last_name, u.profile_image
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows;
  }

  static async count(options = {}) {
    const {
      authorId,
      visibility,
      postType,
      hasMedia,
      hashtags,
      search,
      startDate,
      endDate
    } = options;

    let whereConditions = [];
    let values = [];
    let paramCount = 1;

    // Build WHERE conditions (same as findMany)
    if (authorId) {
      whereConditions.push(`author_id = $${paramCount++}`);
      values.push(authorId);
    }

    if (visibility) {
      if (Array.isArray(visibility)) {
        whereConditions.push(`visibility = ANY($${paramCount++})`);
        values.push(visibility);
      } else {
        whereConditions.push(`visibility = $${paramCount++}`);
        values.push(visibility);
      }
    }

    if (postType) {
      whereConditions.push(`post_type = $${paramCount++}`);
      values.push(postType);
    }

    if (hasMedia === 'true') {
      whereConditions.push(`EXISTS(SELECT 1 FROM post_media pm WHERE pm.post_id = posts.id)`);
    } else if (hasMedia === 'false') {
      whereConditions.push(`NOT EXISTS(SELECT 1 FROM post_media pm WHERE pm.post_id = posts.id)`);
    }

    if (hashtags && hashtags.length > 0) {
      whereConditions.push(`hashtags && $${paramCount++}`);
      values.push(hashtags);
    }

    if (search) {
      whereConditions.push(`(
        to_tsvector('english', content) @@ plainto_tsquery('english', $${paramCount++}) OR
        search_keywords && ARRAY[lower($${paramCount - 1})]
      )`);
      values.push(search);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramCount++}`);
      values.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramCount++}`);
      values.push(endDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `SELECT COUNT(*) as count FROM posts ${whereClause}`;
    const result = await query(sql, values);

    return parseInt(result.rows[0].count);
  }

  static async update(id, updates) {
    const allowedFields = ['content', 'post_type', 'visibility', 'is_pinned', 'location_lat', 'location_lng', 'location_name', 'share_comment'];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // Convert camelCase to snake_case
      if (allowedFields.includes(dbField) && value !== undefined) {
        setClause.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);
    const sql = `
      UPDATE posts
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, values);

    if (result.rowCount === 0) {
      throw new Error('Post not found');
    }

    return result.rows[0];
  }

  static async delete(id) {
    // Delete media first (cascade should handle this, but being explicit)
    await query('DELETE FROM post_media WHERE post_id = $1', [id]);

    const sql = 'DELETE FROM posts WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);

    if (result.rowCount === 0) {
      throw new Error('Post not found');
    }

    return result.rows[0];
  }

  static async addMedia(postId, mediaArray) {
    if (!mediaArray || mediaArray.length === 0) return;

    const values = [];
    const placeholders = [];

    mediaArray.forEach((media, index) => {
      const offset = index * 10;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);

      values.push(
        postId,
        media.fileType,
        media.fileUrl,
        media.fileName,
        media.fileSize || null,
        media.mimeType || null,
        media.width || null,
        media.height || null,
        media.duration || null,
        media.thumbnailUrl || null
      );
    });

    const sql = `
      INSERT INTO post_media (post_id, file_type, file_url, file_name, file_size, mime_type, width, height, duration, thumbnail_url)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  static async updateAnalytics(id, analytics) {
    const allowedFields = ['view_count', 'share_count', 'reach_count'];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(analytics)) {
      if (allowedFields.includes(key) && typeof value === 'number') {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      return;
    }

    setClause.push('last_engagement = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `
      UPDATE posts
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async incrementViews(id) {
    const sql = `
      UPDATE posts
      SET view_count = view_count + 1,
          last_engagement = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING view_count
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async addReaction(postId, userId, reactionType) {
    // First, check if reaction already exists
    const existingSQL = `
      SELECT id FROM reactions
      WHERE user_id = $1 AND target_id = $2 AND target_type = 'post'
    `;
    const existing = await query(existingSQL, [userId, postId]);

    if (existing.rows.length > 0) {
      // Update existing reaction
      const updateSQL = `
        UPDATE reactions
        SET reaction_type = $1
        WHERE user_id = $2 AND target_id = $3 AND target_type = 'post'
        RETURNING *
      `;
      const result = await query(updateSQL, [reactionType, userId, postId]);
      await this.updateReactionCounts(postId);
      return result.rows[0];
    } else {
      // Create new reaction
      const insertSQL = `
        INSERT INTO reactions (user_id, target_id, target_type, reaction_type)
        VALUES ($1, $2, 'post', $3)
        RETURNING *
      `;
      const result = await query(insertSQL, [userId, postId, reactionType]);
      await this.updateReactionCounts(postId);
      return result.rows[0];
    }
  }

  static async removeReaction(postId, userId) {
    const sql = `
      DELETE FROM reactions
      WHERE user_id = $1 AND target_id = $2 AND target_type = 'post'
      RETURNING *
    `;
    const result = await query(sql, [userId, postId]);
    await this.updateReactionCounts(postId);
    return result.rows[0];
  }

  static async updateReactionCounts(postId) {
    const sql = `
      UPDATE posts
      SET reaction_counts = (
        SELECT COALESCE(json_object_agg(reaction_type, count), '{}')
        FROM (
          SELECT reaction_type, COUNT(*) as count
          FROM reactions
          WHERE target_id = $1 AND target_type = 'post'
          GROUP BY reaction_type
        ) reaction_summary
      )
      WHERE id = $1
    `;
    await query(sql, [postId]);
  }

  static async incrementShareCount(postId) {
    const sql = `
      UPDATE posts
      SET share_count = share_count + 1
      WHERE id = $1
      RETURNING share_count
    `;
    const result = await query(sql, [postId]);
    return result.rows[0];
  }

  static async incrementCommentCount(postId) {
    const sql = `
      UPDATE posts
      SET comment_count = comment_count + 1
      WHERE id = $1
      RETURNING comment_count
    `;
    const result = await query(sql, [postId]);
    return result.rows[0];
  }

  static async findTrending(options = {}) {
    const { limit = 10, offset = 0 } = options;

    const sql = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.profile_image
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.visibility = 'public' AND p.is_active = true
      ORDER BY p.share_count DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await query(sql, [limit, offset]);
    return result.rows;
  }
}

module.exports = Post;