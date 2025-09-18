const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Reaction = require('../models/Reaction');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Create a comment on a post
 */
exports.createComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Verify parent comment exists if provided
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment || parentComment.post_id !== postId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent comment'
        });
      }
    }

    const comment = await Comment.create({
      postId,
      authorId: req.user.id,
      content,
      parentCommentId
    });

    // Get author information for response
    const author = await User.findById(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: {
        ...comment,
        author: {
          id: author.id,
          username: author.username,
          firstName: author.first_name,
          lastName: author.last_name,
          profileImage: author.profile_image,
          isVerified: author.is_verified
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: error.message
    });
  }
};

/**
 * Get comments for a post with comprehensive filtering and pagination
 */
exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = 'newest',
      search,
      authorId,
      startDate,
      endDate
    } = req.query;

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get top-level comments with nested replies
    const comments = await Comment.getCommentThread(postId, {
      limit: parseInt(limit),
      offset,
      sort,
      search,
      authorId,
      startDate,
      endDate,
      replyLimit: 3
    });

    const total = await Comment.count(postId, {
      authorId,
      search,
      startDate,
      endDate,
      includeReplies: false
    });

    // Add author information to comments and replies
    const commentsWithAuthors = await Promise.all(comments.map(async (comment) => {
      const author = await User.findById(comment.author_id);

      // Process replies
      const repliesWithAuthors = await Promise.all((comment.replies || []).map(async (reply) => {
        const replyAuthor = await User.findById(reply.author_id);
        return {
          ...reply,
          author: {
            id: replyAuthor.id,
            username: replyAuthor.username,
            firstName: replyAuthor.first_name,
            lastName: replyAuthor.last_name,
            profileImage: replyAuthor.profile_image,
            isVerified: replyAuthor.is_verified
          }
        };
      }));

      return {
        ...comment,
        author: {
          id: author.id,
          username: author.username,
          firstName: author.first_name,
          lastName: author.last_name,
          profileImage: author.profile_image,
          isVerified: author.is_verified
        },
        replies: repliesWithAuthors
      };
    }));

    // Add user reaction data if authenticated
    if (req.user && commentsWithAuthors.length > 0) {
      for (const comment of commentsWithAuthors) {
        const userReaction = await Reaction.getUserReaction(req.user.id, comment.id, 'comment');
        comment.userReaction = userReaction ? userReaction.reaction_type : null;

        // Add user reactions for replies too
        for (const reply of comment.replies || []) {
          const replyUserReaction = await Reaction.getUserReaction(req.user.id, reply.id, 'comment');
          reply.userReaction = replyUserReaction ? replyUserReaction.reaction_type : null;
        }
      }
    }

    res.json({
      success: true,
      data: commentsWithAuthors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: offset + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      },
      meta: {
        postId,
        availableSorts: ['newest', 'oldest', 'popular'],
        searchFields: ['content']
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

/**
 * Get replies to a comment
 */
exports.getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const {
      limit = 10,
      offset = 0,
      sort = 'oldest'
    } = req.query;

    const replies = await Comment.findReplies(commentId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort
    });

    // Add author information to replies
    const repliesWithAuthors = await Promise.all(replies.map(async (reply) => {
      const author = await User.findById(reply.author_id);
      return {
        ...reply,
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

    res.json({
      success: true,
      data: repliesWithAuthors,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: replies.length === parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comment replies',
      error: error.message
    });
  }
};

/**
 * Update a comment
 */
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.author_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Save edit history
    if (comment.content !== content) {
      await Comment.saveEditHistory(id, comment.content);
    }

    const updatedComment = await Comment.update(id, { content });

    // Get author information
    const author = await User.findById(updatedComment.author_id);

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        ...updatedComment,
        author: {
          id: author.id,
          username: author.username,
          firstName: author.first_name,
          lastName: author.last_name,
          profileImage: author.profile_image,
          isVerified: author.is_verified
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message
    });
  }
};

/**
 * Delete a comment
 */
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.author_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Comment.delete(id);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};

/**
 * React to a comment
 */
exports.reactToComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionType } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const reaction = await Reaction.create({
      userId: req.user.id,
      targetId: id,
      targetType: 'comment',
      reactionType
    });

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: {
        reactionType: reaction.reaction_type
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to react to comment',
      error: error.message
    });
  }
};

/**
 * Remove reaction from comment
 */
exports.removeCommentReaction = async (req, res) => {
  try {
    const { id } = req.params;

    await Reaction.remove(req.user.id, id, 'comment');

    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: error.message
    });
  }
};

/**
 * Get comment reactions summary
 */
exports.getCommentReactions = async (req, res) => {
  try {
    const { id } = req.params;

    const reactions = await Reaction.getReactionSummary(id, 'comment');

    res.json({
      success: true,
      data: reactions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comment reactions',
      error: error.message
    });
  }
};