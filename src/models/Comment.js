/**
 * Comment Data Model
 *
 * Advanced comment system with threading, media support, and comprehensive
 * functionality for the BirdSphere social platform. Recently enhanced to support
 * media attachments in comments with proper URL generation and display.
 *
 * Core Architecture:
 * - PostgreSQL-based with hierarchical comment threading
 * - Media attachment support via comment_media table
 * - Full-text search capabilities with PostgreSQL indexing
 * - Edit history tracking for comment modifications
 * - Reaction system integration for comment engagement
 * - Soft deletion and moderation support
 *
 * Database Schema:
 * Primary Table: comments
 * - Core: id, post_id, author_id, content, comment_type
 * - Threading: parent_comment_id (null for top-level comments)
 * - Engagement: reaction_count, reply_count, has_media
 * - Moderation: is_edited, is_hidden, is_active
 * - Timestamps: created_at, updated_at
 *
 * Related Tables:
 * - comment_media: Media attachments (images, videos, documents)
 * - comment_edit_history: Track content changes over time
 * - comment_reactions: User reactions to comments
 * - users: Author information and profiles
 *
 * Key Features:
 * 1. **Threaded Conversations**: Unlimited nesting with parent-child relationships
 * 2. **Rich Media Support**: Images, videos, files with metadata
 * 3. **Edit History**: Complete audit trail of comment modifications
 * 4. **Search & Discovery**: Full-text search across comment content
 * 5. **Moderation Tools**: Hide, delete, and moderate inappropriate content
 * 6. **Engagement Metrics**: Reaction counts, reply counts, view tracking
 * 7. **Media Integration**: Recently enhanced for proper media display
 *
 * Recent Enhancements (Fixed Issues):
 * - Enhanced comment loading with media support in controllers
 * - Fixed broken PostgreSQL stored procedure get_comments_with_media
 * - Implemented proper media URL generation for cross-origin access
 * - Added comprehensive media attachment methods
 * - Improved comment threading with media display
 * - Fixed comment media display in frontend components
 *
 * Media Architecture:
 * - Files stored in ./uploads/comments/ directory structure
 * - URLs generated with BASE_URL for proper client access
 * - Metadata tracking (dimensions, file sizes, MIME types)
 * - Display order maintenance for consistent presentation
 * - Thumbnail generation and storage for videos
 *
 * Threading System:
 * - Top-level comments: parent_comment_id = null
 * - Replies: parent_comment_id = parent comment UUID
 * - Unlimited nesting depth supported
 * - Reply count tracking for performance optimization
 * - Efficient queries for comment trees and threads
 *
 * Search Capabilities:
 * - PostgreSQL full-text search with tsvector indexing
 * - Content search across comment text
 * - Author-based filtering and search
 * - Date range filtering for temporal queries
 * - Sorting by newest, oldest, popular (reaction-based)
 *
 * Performance Features:
 * - JSON aggregation for media to reduce database queries
 * - Efficient pagination with offset/limit support
 * - Indexed queries on frequently accessed fields
 * - Transaction support for data consistency
 * - Connection pooling via database configuration
 *
 * Data Flow:
 * Comment Creation → Media Processing → Database Insert → URL Generation
 * Comment Loading → Author Join → Media Aggregation → URL Generation → Display
 * Comment Search → Full-text Query → Filter → Sort → Paginate → Results
 * Comment Edit → History Save → Content Update → Timestamp Update
 *
 * Integration Points:
 * - Used by CommentController for API endpoints
 * - Connected to CommentsSection React component
 * - Integrated with Post model for comment counts
 * - Links to User model for author information
 * - Supports Reaction model for engagement
 */

const { query } = require('../config/database');

/**
 * Comment Model Class
 *
 * Comprehensive comment management with media support and threading capabilities.
 * Recently enhanced to fix media display issues and improve performance.
 */
class Comment {
  static async create({
    postId,
    authorId,
    content,
    parentCommentId = null,
    commentType = 'standard'
  }) {
    const sql = `
      INSERT INTO comments (post_id, author_id, content, parent_comment_id, comment_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [postId, authorId, content, parentCommentId, commentType];
    const result = await query(sql, values);

    return result.rows[0];
  }

  static async findById(id) {
    const sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id) as reply_count
      FROM comments c
      WHERE c.id = $1
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async findByPostId(postId, options = {}) {
    const {
      authorId,
      search,
      startDate,
      endDate,
      limit = 20,
      offset = 0,
      sort = 'newest',
      includeReplies = false
    } = options;

    let whereConditions = ['c.post_id = $1'];
    let values = [postId];
    let paramCount = 2;

    // Only get top-level comments unless includeReplies is true
    if (!includeReplies) {
      whereConditions.push('c.parent_comment_id IS NULL');
    }

    if (authorId) {
      whereConditions.push(`c.author_id = $${paramCount++}`);
      values.push(authorId);
    }

    if (search) {
      whereConditions.push(`to_tsvector('english', c.content) @@ plainto_tsquery('english', $${paramCount++})`);
      values.push(search);
    }

    if (startDate) {
      whereConditions.push(`c.created_at >= $${paramCount++}`);
      values.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`c.created_at <= $${paramCount++}`);
      values.push(endDate);
    }

    // Build ORDER BY
    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'c.created_at ASC';
        break;
      case 'popular':
        orderBy = 'c.reaction_count DESC, c.created_at DESC';
        break;
      case 'newest':
      default:
        orderBy = 'c.created_at DESC';
        break;
    }

    const whereClause = whereConditions.join(' AND ');

    const sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id) as reply_count
      FROM comments c
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows;
  }

  static async findReplies(parentCommentId, options = {}) {
    const {
      limit = 10,
      offset = 0,
      sort = 'oldest'
    } = options;

    // Build ORDER BY
    let orderBy;
    switch (sort) {
      case 'newest':
        orderBy = 'created_at DESC';
        break;
      case 'popular':
        orderBy = 'reaction_count DESC, created_at ASC';
        break;
      case 'oldest':
      default:
        orderBy = 'created_at ASC';
        break;
    }

    const sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id) as reply_count
      FROM comments c
      WHERE c.parent_comment_id = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [parentCommentId, limit, offset]);
    return result.rows;
  }

  static async count(postId, options = {}) {
    const {
      authorId,
      search,
      startDate,
      endDate,
      includeReplies = true
    } = options;

    let whereConditions = ['post_id = $1'];
    let values = [postId];
    let paramCount = 2;

    // Only count top-level comments unless includeReplies is true
    if (!includeReplies) {
      whereConditions.push('parent_comment_id IS NULL');
    }

    if (authorId) {
      whereConditions.push(`author_id = $${paramCount++}`);
      values.push(authorId);
    }

    if (search) {
      whereConditions.push(`to_tsvector('english', content) @@ plainto_tsquery('english', $${paramCount++})`);
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

    const whereClause = whereConditions.join(' AND ');
    const sql = `SELECT COUNT(*) as count FROM comments WHERE ${whereClause}`;
    const result = await query(sql, values);

    return parseInt(result.rows[0].count);
  }

  static async update(id, updates) {
    const allowedFields = ['content'];

    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add edit tracking
    setClause.push('is_edited = TRUE');

    values.push(id);
    const sql = `
      UPDATE comments
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, values);

    if (result.rowCount === 0) {
      throw new Error('Comment not found');
    }

    return result.rows[0];
  }

  static async saveEditHistory(commentId, originalContent) {
    const sql = `
      INSERT INTO comment_edit_history (comment_id, content)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await query(sql, [commentId, originalContent]);
    return result.rows[0];
  }

  static async getEditHistory(commentId) {
    const sql = `
      SELECT * FROM comment_edit_history
      WHERE comment_id = $1
      ORDER BY edited_at DESC
    `;

    const result = await query(sql, [commentId]);
    return result.rows;
  }

  static async delete(id) {
    // First delete all replies (cascade should handle this, but being explicit)
    await query('DELETE FROM comments WHERE parent_comment_id = $1', [id]);

    const sql = 'DELETE FROM comments WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);

    if (result.rowCount === 0) {
      throw new Error('Comment not found');
    }

    return result.rows[0];
  }

  static async findByAuthor(authorId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      sort = 'newest'
    } = options;

    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'c.created_at ASC';
        break;
      case 'popular':
        orderBy = 'c.reaction_count DESC, c.created_at DESC';
        break;
      case 'newest':
      default:
        orderBy = 'c.created_at DESC';
        break;
    }

    const sql = `
      SELECT c.*,
             p.content as post_content,
             p.author_id as post_author_id,
             (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id) as reply_count
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.author_id = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `;

    const result = await query(sql, [authorId, limit, offset]);
    return result.rows;
  }

  static async markAsHidden(id, isHidden = true) {
    const sql = `
      UPDATE comments
      SET is_hidden = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(sql, [isHidden, id]);

    if (result.rowCount === 0) {
      throw new Error('Comment not found');
    }

    return result.rows[0];
  }

  static async findWithReplies(commentId, options = {}) {
    const {
      replyLimit = 3,
      replySort = 'oldest'
    } = options;

    // Get the main comment
    const comment = await this.findById(commentId);
    if (!comment) {
      return null;
    }

    // Get replies
    const replies = await this.findReplies(commentId, {
      limit: replyLimit,
      sort: replySort
    });

    comment.replies = replies;
    comment.hasMoreReplies = comment.reply_count > replyLimit;

    return comment;
  }

  static async getCommentThread(postId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      sort = 'newest',
      replyLimit = 3
    } = options;

    // Get top-level comments
    const comments = await this.findByPostId(postId, {
      ...options,
      includeReplies: false
    });

    // For each comment, get limited replies
    for (const comment of comments) {
      const replies = await this.findReplies(comment.id, {
        limit: replyLimit,
        sort: 'oldest'
      });

      comment.replies = replies;
      comment.hasMoreReplies = comment.reply_count > replyLimit;
    }

    return comments;
  }

  // ====================================================================
  // PHASE 1 ENHANCEMENT: MEDIA SUPPORT METHODS
  // ====================================================================

  static async addMedia(commentId, mediaArray) {
    if (!mediaArray || mediaArray.length === 0) return [];

    const values = [];
    const placeholders = [];

    mediaArray.forEach((media, index) => {
      const offset = index * 10;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`);

      values.push(
        commentId,
        media.fileType || 'image',
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
      INSERT INTO comment_media (comment_id, file_type, file_url, file_name, file_size, mime_type, width, height, duration, thumbnail_url)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows;
  }

  static async getCommentsWithMedia(postId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      sort = 'newest',
      includeReplies = false
    } = options;

    let whereConditions = ['c.post_id = $1'];
    let values = [postId];
    let paramCount = 2;

    // Only get top-level comments unless includeReplies is true
    if (!includeReplies) {
      whereConditions.push('c.parent_comment_id IS NULL');
    }

    // Build ORDER BY
    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'c.created_at ASC';
        break;
      case 'popular':
        orderBy = 'c.reaction_count DESC, c.created_at DESC';
        break;
      case 'newest':
      default:
        orderBy = 'c.created_at DESC';
        break;
    }

    const whereClause = whereConditions.join(' AND ');

    const sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id) as reply_count,
             COALESCE(json_agg(
               json_build_object(
                 'id', cm.id,
                 'fileType', cm.file_type,
                 'fileUrl', cm.file_url,
                 'fileName', cm.file_name,
                 'fileSize', cm.file_size,
                 'mimeType', cm.mime_type,
                 'width', cm.width,
                 'height', cm.height,
                 'duration', cm.duration,
                 'thumbnailUrl', cm.thumbnail_url,
                 'displayOrder', cm.display_order
               ) ORDER BY cm.display_order
             ) FILTER (WHERE cm.id IS NOT NULL), '[]'::json)::jsonb as media
      FROM comments c
      LEFT JOIN comment_media cm ON c.id = cm.comment_id
      WHERE ${whereClause}
      GROUP BY c.id
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await query(sql, values);
    return result.rows;
  }

  static async findByIdWithMedia(id) {
    const sql = `
      SELECT c.*,
             COALESCE(json_agg(
               json_build_object(
                 'id', cm.id,
                 'fileType', cm.file_type,
                 'fileUrl', cm.file_url,
                 'fileName', cm.file_name,
                 'fileSize', cm.file_size,
                 'mimeType', cm.mime_type,
                 'width', cm.width,
                 'height', cm.height,
                 'duration', cm.duration,
                 'thumbnailUrl', cm.thumbnail_url,
                 'displayOrder', cm.display_order
               ) ORDER BY cm.display_order
             ) FILTER (WHERE cm.id IS NOT NULL), '[]'::json)::jsonb as media
      FROM comments c
      LEFT JOIN comment_media cm ON c.id = cm.comment_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async updateMediaAttachments(commentId, mediaAttachments) {
    const sql = `
      UPDATE comments
      SET media_attachments = $1,
          has_media = $2
      WHERE id = $3
      RETURNING *
    `;

    const hasMedia = mediaAttachments && mediaAttachments.length > 0;
    const result = await query(sql, [JSON.stringify(mediaAttachments), hasMedia, commentId]);
    return result.rows[0];
  }

  static async deleteMedia(commentId, mediaId) {
    const sql = `
      DELETE FROM comment_media
      WHERE comment_id = $1 AND id = $2
      RETURNING *
    `;

    const result = await query(sql, [commentId, mediaId]);
    return result.rows[0];
  }

  static async getMediaByComment(commentId) {
    const sql = `
      SELECT * FROM comment_media
      WHERE comment_id = $1
      ORDER BY display_order, created_at
    `;

    const result = await query(sql, [commentId]);
    return result.rows;
  }

  static async createWithMedia({
    postId,
    authorId,
    content,
    parentCommentId = null,
    commentType = 'standard',
    mediaFiles = []
  }) {
    // Start transaction
    await query('BEGIN');

    try {
      // Create the comment
      const comment = await this.create({
        postId,
        authorId,
        content,
        parentCommentId,
        commentType: mediaFiles.length > 0 ? 'media' : commentType
      });

      // Add media if provided
      if (mediaFiles && mediaFiles.length > 0) {
        await this.addMedia(comment.id, mediaFiles);

        // Update comment to reflect media presence
        await this.updateMediaAttachments(comment.id, mediaFiles);
      }

      await query('COMMIT');

      // Return comment with media
      return await this.findByIdWithMedia(comment.id);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  static async getCommentThreadWithMedia(postId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      sort = 'newest',
      replyLimit = 3
    } = options;

    // Get top-level comments with media
    const comments = await this.getCommentsWithMedia(postId, {
      limit,
      offset,
      sort
    });

    // For each comment, get limited replies with media
    for (const comment of comments) {
      const replies = await this.getCommentsWithMedia(postId, {
        limit: replyLimit,
        sort: 'oldest'
      });

      // Filter replies to only those that belong to this comment
      comment.replies = replies.filter(reply => reply.parent_comment_id === comment.id);
      comment.hasMoreReplies = comment.reply_count > replyLimit;
    }

    return comments;
  }
}

module.exports = Comment;