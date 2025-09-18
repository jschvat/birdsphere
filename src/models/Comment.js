const { query } = require('../config/database');

class Comment {
  static async create({
    postId,
    authorId,
    content,
    parentCommentId = null
  }) {
    const sql = `
      INSERT INTO comments (post_id, author_id, content, parent_comment_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [postId, authorId, content, parentCommentId];
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
}

module.exports = Comment;