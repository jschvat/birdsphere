/**
 * Post Data Model
 *
 * Core social media content model for the BirdSphere platform. Handles creation,
 * retrieval, and management of user posts with rich media support, engagement metrics,
 * and advanced search capabilities.
 *
 * Core Architecture:
 * - PostgreSQL-based with media file management
 * - Transactional post creation with media attachments
 * - Advanced search with full-text indexing and hashtag support
 * - Engagement tracking (views, reactions, comments, shares)
 * - Multiple post types (standard, share, announcement, question, sale)
 * - Geolocation support for location-based posts
 *
 * Database Schema:
 * Primary Table: posts
 * - Content: content (text), post_type, visibility (public/friends/private)
 * - Media: Linked via post_media table (one-to-many relationship)
 * - Engagement: reaction_count, comment_count, share_count, view_count
 * - Metadata: hashtags (array), search_keywords (array), engagement_score
 * - Location: location_lat, location_lng, location_name
 * - Flags: is_active, is_pinned, is_edited
 *
 * Related Tables:
 * - post_media: Media attachments (images, videos, documents)
 * - post_reactions: User reactions (like, love, laugh, etc.)
 * - comments: User comments and replies
 * - post_shares: Share/repost tracking
 * - user_follows: Timeline construction based on following relationships
 *
 * Key Features:
 * 1. **Rich Media Support**: Images, videos, documents with metadata
 * 2. **Content Discovery**: Full-text search + hashtag indexing
 * 3. **Engagement Analytics**: Comprehensive metrics and scoring
 * 4. **Flexible Visibility**: Public, friends-only, or private posts
 * 5. **Post Types**: Standard, announcements, questions, sales, shares
 * 6. **Geolocation**: Location-tagged posts for local discovery
 * 7. **Timeline Generation**: Efficient feeds with multiple sort options
 *
 * Media Architecture:
 * - Files stored in filesystem (./uploads/posts/)
 * - URLs generated with BASE_URL for cross-origin access
 * - Metadata extraction for dimensions, duration, thumbnails
 * - Multiple file types supported with MIME type validation
 * - Display order maintained for consistent presentation
 *
 * Search & Discovery:
 * - PostgreSQL full-text search on content
 * - Hashtag array matching for topic discovery
 * - Keyword extraction and indexing
 * - Multiple sort algorithms (newest, popular, trending, engagement)
 * - Pagination support for large datasets
 *
 * Performance Optimizations:
 * - Database transactions for data consistency
 * - JSON aggregation for media to reduce queries
 * - Parameterized queries for SQL injection prevention
 * - Indexing on frequently queried fields (author_id, created_at, hashtags)
 *
 * Data Flow:
 * Post Creation → Transaction Start → Media Upload → Database Insert → URL Generation
 * Timeline Request → Query Building → Media Aggregation → URL Generation → Response
 * Search Request → Full-text Query → Filtering → Sorting → Pagination → Results
 *
 * Usage Patterns:
 * - Controllers handle API endpoints and validation
 * - Timeline service constructs personalized feeds
 * - Search service provides content discovery
 * - Media service manages file uploads and processing
 */

const { query, getClient } = require('../config/database');

/**
 * Post Model Class
 *
 * Provides comprehensive static methods for post lifecycle management.
 * Emphasizes data consistency, performance, and rich media support.
 */
class Post {
  /**
   * Create New Post with Media Attachments
   *
   * Creates a new post using database transactions to ensure data consistency
   * between post record and associated media files. Supports multiple media types
   * and maintains proper ordering for display.
   *
   * Transaction Flow:
   * 1. Begin database transaction
   * 2. Insert post record
   * 3. Process and insert media attachments
   * 4. Commit transaction (or rollback on error)
   *
   * Media Processing:
   * - Extracts metadata (dimensions, duration, thumbnails)
   * - Maintains display order for consistent presentation
   * - Generates proper file URLs for client access
   *
   * @param {Object} postData - Post creation data
   * @param {string} postData.authorId - Post author user ID (required)
   * @param {string} postData.content - Post text content (required)
   * @param {string} postData.visibility - Visibility setting: 'public', 'friends', 'private' (default: 'public')
   * @param {Array<Object>} postData.mediaAttachments - Array of media file objects (default: [])
   * @param {string} postData.postType - Post type: 'standard', 'share', 'announcement', 'question', 'sale' (default: 'standard')
   * @param {boolean} postData.isPinned - Whether post is pinned to profile (default: false)
   * @param {number} postData.locationLat - GPS latitude for location tagging (optional)
   * @param {number} postData.locationLng - GPS longitude for location tagging (optional)
   * @param {string} postData.locationName - Human-readable location name (optional)
   * @param {string} postData.originalPostId - Original post ID for shares/reposts (optional)
   * @param {string} postData.shareComment - Comment when sharing another post (optional)
   *
   * @returns {Promise<Object>} Created post object with generated ID and timestamps
   * @throws {Error} Database transaction errors or media processing failures
   *
   * Media Attachment Object Structure:
   * {
   *   category: 'image|video|document',
   *   url: 'filename.ext',
   *   originalName: 'user-uploaded-name.ext',
   *   size: 1024,
   *   mimetype: 'image/jpeg',
   *   metadata: { width: 800, height: 600, duration: null, thumbnail: 'thumb.jpg' }
   * }
   */
  static async create({
    authorId,
    content,
    visibility = 'public',
    mediaAttachments = [],
    postType = 'standard',
    isPinned = false,
    locationLat = null,
    locationLng = null,
    locationName = null,
    originalPostId = null,
    shareComment = null
  }) {
    // Start transaction
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Insert post
      const postSql = `
        INSERT INTO posts (
          author_id, content, visibility, post_type, is_pinned,
          location_lat, location_lng, location_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const postValues = [
        authorId, content, visibility, postType, isPinned,
        locationLat, locationLng, locationName
      ];

      const postResult = await client.query(postSql, postValues);
      const post = postResult.rows[0];

      // Insert media attachments if any
      if (mediaAttachments && mediaAttachments.length > 0) {
        for (let i = 0; i < mediaAttachments.length; i++) {
          const media = mediaAttachments[i];
          const mediaSql = `
            INSERT INTO post_media (
              post_id, file_type, file_url, file_name, file_size, mime_type,
              width, height, duration, thumbnail_url, display_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `;

          const mediaValues = [
            post.id,
            media.category || 'image',
            media.url,
            media.originalName || media.filename,
            media.size || 0,
            media.mimetype,
            media.metadata?.width,
            media.metadata?.height,
            media.metadata?.duration,
            media.metadata?.thumbnail,
            i
          ];

          await client.query(mediaSql, mediaValues);
        }
      }

      await client.query('COMMIT');
      client.release();

      return post;
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
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

    // Generate media URLs using environment variables
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const publicUploadUrl = process.env.PUBLIC_UPLOAD_URL || '/uploads';
    const postMediaPath = 'posts'; // From POST_MEDIA_PATH env var

    const sql = `
      SELECT p.*, u.username, u.first_name, u.last_name, u.profile_image,
             COALESCE(json_agg(
               json_build_object(
                 'id', pm.id,
                 'fileType', pm.file_type,
                 'filename', pm.file_url,
                 'fileName', pm.file_name,
                 'fileSize', pm.file_size,
                 'mimeType', pm.mime_type,
                 'width', pm.width,
                 'height', pm.height,
                 'duration', pm.duration,
                 'thumbnailUrl', pm.thumbnail_url,
                 'displayOrder', pm.display_order,
                 'url', CONCAT('${baseUrl}${publicUploadUrl}/${postMediaPath}/', pm.file_url),
                 'fileUrl', CONCAT('${baseUrl}${publicUploadUrl}/${postMediaPath}/', pm.file_url)
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
    console.log('🔧 Post.addReaction called:', { postId, userId, reactionType });

    // First, check if reaction already exists
    const existingSQL = `
      SELECT id FROM reactions
      WHERE user_id = $1 AND target_id = $2 AND target_type = 'post'
    `;
    const existing = await query(existingSQL, [userId, postId]);
    console.log('🔍 Existing reaction check:', { existingCount: existing.rows.length });

    if (existing.rows.length > 0) {
      // Update existing reaction
      console.log('🔄 Updating existing reaction to:', reactionType);
      const updateSQL = `
        UPDATE reactions
        SET reaction_type = $1
        WHERE user_id = $2 AND target_id = $3 AND target_type = 'post'
        RETURNING *
      `;
      const result = await query(updateSQL, [reactionType, userId, postId]);
      console.log('✅ Reaction updated, calling updateReactionCounts');
      await this.updateReactionCounts(postId);
      console.log('✅ Reaction counts updated');
      return result.rows[0];
    } else {
      // Create new reaction
      console.log('➕ Creating new reaction:', reactionType);
      const insertSQL = `
        INSERT INTO reactions (user_id, target_id, target_type, reaction_type)
        VALUES ($1, $2, 'post', $3)
        RETURNING *
      `;
      const result = await query(insertSQL, [userId, postId, reactionType]);
      console.log('✅ Reaction created, calling updateReactionCounts');
      await this.updateReactionCounts(postId);
      console.log('✅ Reaction counts updated');
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
    console.log('💾 updateReactionCounts called for postId:', postId);

    // First, check current reactions for this post
    const checkSQL = `
      SELECT reaction_type, COUNT(*) as count
      FROM reactions
      WHERE target_id = $1 AND target_type = 'post'
      GROUP BY reaction_type
    `;
    const currentReactions = await query(checkSQL, [postId]);
    console.log('📊 Current reactions for post:', currentReactions.rows);

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
      RETURNING reaction_counts
    `;
    const result = await query(sql, [postId]);
    console.log('✅ Updated reaction_counts to:', result.rows[0]?.reaction_counts);
    return result.rows[0];
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

  static async incrementCommentCount(postId, increment = 1) {
    const sql = `
      UPDATE posts
      SET comment_count = GREATEST(comment_count + $2, 0)
      WHERE id = $1
      RETURNING comment_count
    `;
    const result = await query(sql, [postId, increment]);
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

  static async syncCommentCounts() {
    const sql = `
      UPDATE posts
      SET comment_count = (
        SELECT COUNT(*)
        FROM comments
        WHERE comments.post_id = posts.id
        AND comments.parent_comment_id IS NULL
        AND comments.is_active = true
      )
      WHERE id IN (
        SELECT DISTINCT post_id
        FROM comments
        WHERE is_active = true
      )
    `;

    const result = await query(sql);
    return result.rowCount;
  }
}

module.exports = Post;