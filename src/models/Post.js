const db = require('../config/database');

class Post {
  static async create({
    authorId,
    content,
    postType = 'standard',
    visibility = 'followers',
    isPinned = false,
    locationLat = null,
    locationLng = null,
    locationName = null,
    originalPostId = null,
    shareComment = null,
    media = []
  }) {
    const query = `
      INSERT INTO posts (
        author_id, content, post_type, visibility, is_pinned,
        location_lat, location_lng, location_name,
        original_post_id, share_comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      authorId, content, postType, visibility, isPinned,
      locationLat, locationLng, locationName,
      originalPostId, shareComment
    ];

    const result = await db.query(query, values);
    const post = result.rows[0];

    // Add media if provided
    if (media && media.length > 0) {
      await this.addMedia(post.id, media);
      post.media = media;
    }

    return post;
  }

  static async findById(id) {
    const query = `
      SELECT p.*,
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
      LEFT JOIN post_media pm ON p.id = pm.post_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await db.query(query, [id]);
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

    const query = `
      SELECT p.*,
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
      LEFT JOIN post_media pm ON p.id = pm.post_id
      ${whereClause}
      GROUP BY p.id
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);
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

    const query = `SELECT COUNT(*) as count FROM posts ${whereClause}`;
    const result = await db.query(query, values);

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
    const query = `
      UPDATE posts
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      throw new Error('Post not found');
    }

    return result.rows[0];
  }

  static async delete(id) {
    // Delete media first (cascade should handle this, but being explicit)
    await db.query('DELETE FROM post_media WHERE post_id = $1', [id]);

    const query = 'DELETE FROM posts WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

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

    const query = `
      INSERT INTO post_media (post_id, file_type, file_url, file_name, file_size, mime_type, width, height, duration, thumbnail_url)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await db.query(query, values);
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

    const query = `
      UPDATE posts
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async incrementViews(id) {
    const query = `
      UPDATE posts
      SET view_count = view_count + 1,
          last_engagement = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING view_count
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async findTrending(options = {}) {
    const {
      timeframe = 24,  // hours
      limit = 10,
      offset = 0
    } = options;

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeframe);

    const query = `
      SELECT p.*,
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
      LEFT JOIN post_media pm ON p.id = pm.post_id
      WHERE p.created_at >= $1 AND p.visibility = 'public'
      GROUP BY p.id
      ORDER BY p.engagement_score DESC, p.reaction_count DESC, p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [cutoffTime, limit, offset]);
    return result.rows;
  }
}

module.exports = Post;