/**
 * Post Controller
 *
 * Handles all post-related HTTP endpoints for the BirdSphere social platform.
 * Manages post creation, retrieval, updates, deletions, and engagement features
 * including reactions, comments, and sharing functionality.
 *
 * Core Responsibilities:
 * - Post CRUD operations with media support
 * - Timeline generation and content feeds
 * - User engagement tracking (reactions, views, shares)
 * - Comment management integration
 * - Content moderation and visibility controls
 * - Search and discovery features
 *
 * Key Features:
 * 1. **Media Post Creation**: Handle file uploads with validation
 * 2. **Timeline Construction**: Generate personalized content feeds
 * 3. **Engagement Tracking**: Reactions, comments, shares, views
 * 4. **Content Discovery**: Search, filtering, and trending algorithms
 * 5. **Access Control**: Visibility settings and permission checks
 * 6. **Performance Optimization**: Efficient queries and caching
 *
 * Endpoints Overview:
 * - POST /posts - Create new post with media
 * - GET /posts - List posts with filters and pagination
 * - GET /posts/:id - Get single post with full details
 * - PUT /posts/:id - Update existing post
 * - DELETE /posts/:id - Delete post (author only)
 * - POST /posts/:id/reactions - Add reaction to post
 * - GET /posts/:id/comments - Get post comments
 * - GET /timeline - Generate personalized timeline
 *
 * Data Flow:
 * Request → Validation → Authentication → Model Operation → Response
 * File Upload → Media Processing → Database Storage → URL Generation
 * Timeline Request → Following Query → Content Aggregation → Sorting → Response
 *
 * Integration Points:
 * - Post model for database operations
 * - Comment model for comment functionality
 * - User model for author information
 * - Reaction model for engagement
 * - Follow model for timeline generation
 * - Upload middleware for media processing
 */

const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Create New Post
 *
 * Creates a new post with optional media attachments. Handles file uploads,
 * content validation, and media processing. Supports various post types
 * and visibility settings.
 *
 * Request Processing:
 * 1. Validate request data and files
 * 2. Process uploaded media files
 * 3. Create post record with media
 * 4. Generate response with author info
 *
 * @route POST /api/posts
 * @access Private (authenticated users)
 */
exports.createPost = async (req, res) => {
  console.log('🔍 createPost called with:', {
    body: req.body,
    files: req.files ? req.files.length : 0,
    fileNames: req.files ? req.files.map(f => f.originalname) : []
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      content,
      postType = 'standard',
      visibility = 'followers',
      isPinned = false,
      locationLat,
      locationLng,
      locationName,
      originalPostId,
      shareComment
    } = req.body;

    // Check if post has content or files
    const hasContent = content && content.trim().length > 0;
    const hasFiles = req.files && req.files.length > 0;

    if (!hasContent && !hasFiles) {
      return res.status(400).json({
        success: false,
        message: 'Post must contain either text content or files'
      });
    }

    // Process uploaded files into media array for the Post model
    // Store only filenames, URLs will be generated dynamically using env variables
    const mediaAttachments = req.files ? req.files.map((file, index) => ({
      id: file.filename.split('.')[0], // Use filename without extension as ID
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      category: file.category || 'image',
      url: file.filename, // Store only filename, not full URL
      metadata: {
        width: file.width,
        height: file.height,
        duration: file.duration,
        thumbnail: file.thumbnail
      }
    })) : [];

    // Create the post using the Post model (which handles mediaAttachments properly)
    const post = await Post.create({
      authorId: req.user.id,
      content: content || '', // Use empty string if content is undefined/null
      postType,
      visibility,
      isPinned,
      locationLat,
      locationLng,
      locationName,
      originalPostId,
      shareComment,
      mediaAttachments
    });

    // Get author information for response
    const author = await User.findById(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        ...post,
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
    console.log('💥 Error creating post:', error);
    console.log('💥 Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
};

/**
 * Get timeline posts (authenticated user's personalized feed)
 */
exports.getTimeline = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = 'newest',
      postType,
      hasMedia,
      authorId
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user's following IDs for visibility filtering
    const followingIds = await Follow.getFollowingIds(req.user.id);

    // Build visibility conditions
    const visibilityConditions = ['public'];
    if (followingIds.length > 0) {
      visibilityConditions.push('followers');
    }

    const posts = await Post.findMany({
      visibility: visibilityConditions,
      postType,
      hasMedia,
      authorId,
      limit: parseInt(limit),
      offset,
      sort
    });

    const total = await Post.count({
      visibility: visibilityConditions,
      postType,
      hasMedia,
      authorId
    });

    // Transform posts to include author information, reactions, and comments data
    const postsWithAuthors = await Promise.all(posts.map(async (post) => {
      console.log('📊 Post media data for post:', post.id, 'media:', post.media);

      // Fetch comments for this post
      const comments = await Comment.findByPostId(post.id, {
        limit: 10, // Get first 10 comments
        sort: 'newest',
        includeReplies: false // Only top-level comments for now
      });

      // Transform comments to include author information and media
      const commentsWithAuthors = await Promise.all(comments.map(async (comment) => {
        const commentAuthor = await User.findById(comment.author_id);

        // Fetch media for this comment
        const mediaQuery = `
          SELECT cm.id, cm.file_type, cm.file_url, cm.file_name,
                 cm.file_size, cm.mime_type, cm.width, cm.height,
                 cm.duration, cm.thumbnail_url, cm.display_order
          FROM comment_media cm
          WHERE cm.comment_id = $1
          ORDER BY cm.display_order ASC
        `;
        const { query } = require('../config/database');
        const mediaResult = await query(mediaQuery, [comment.id]);

        return {
          id: comment.id,
          content: comment.content,
          authorId: comment.author_id,
          postId: comment.post_id,
          parentCommentId: comment.parent_comment_id,
          reactionCounts: comment.reaction_counts || {},
          replyCount: comment.reply_count || 0,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          author: {
            id: commentAuthor.id,
            username: commentAuthor.username,
            firstName: commentAuthor.first_name,
            lastName: commentAuthor.last_name,
            profileImage: commentAuthor.profile_image,
            isVerified: commentAuthor.is_verified || false
          },
          media: mediaResult.rows.map(media => ({
            id: media.id,
            fileType: media.file_type,
            fileUrl: media.file_url,
            fileName: media.file_name,
            fileSize: media.file_size,
            mimeType: media.mime_type,
            width: media.width,
            height: media.height,
            duration: media.duration,
            thumbnailUrl: media.thumbnail_url,
            displayOrder: media.display_order
          }))
        };
      }));

      return {
        ...post,
        author: {
          id: post.author_id,
          username: post.username,
          firstName: post.first_name,
          lastName: post.last_name,
          profileImage: post.profile_image,
          isVerified: post.is_verified || false // Default to false if not present
        },
        reactions: [], // Will be populated by separate call if needed
        reactionCounts: post.reaction_counts || {}, // Use existing field from database
        comments: commentsWithAuthors // Include comments with author info
      };
    }));

    res.json({
      success: true,
      data: postsWithAuthors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: offset + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      },
      meta: {
        availableSorts: ['newest', 'oldest', 'popular', 'trending', 'mostViewed', 'mostCommented'],
        filters: {
          postType: ['standard', 'share', 'announcement', 'question', 'sale'],
          visibility: ['public', 'followers'],
          hasMedia: ['true', 'false']
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timeline',
      error: error.message
    });
  }
};

/**
 * Get a single post by ID
 */
exports.getPost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Get author information
    const author = await User.findById(post.author_id);

    // Increment view count
    await Post.incrementViews(id);

    res.json({
      success: true,
      data: {
        ...post,
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
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};

/**
 * Update a post
 */
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.author_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedPost = await Post.update(id, updates);

    // Get author information
    const author = await User.findById(updatedPost.author_id);

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: {
        ...updatedPost,
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
      message: 'Failed to update post',
      error: error.message
    });
  }
};

/**
 * Delete a post
 */
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.author_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Post.delete(id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
};

/**
 * Search posts
 */
exports.searchPosts = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 20,
      sort = 'newest',
      postType,
      hasMedia,
      hashtags,
      authorId,
      startDate,
      endDate
    } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.findMany({
      search,
      postType,
      hasMedia,
      hashtags: hashtags ? hashtags.split(',') : undefined,
      authorId,
      startDate,
      endDate,
      visibility: 'public', // Only search public posts
      limit: parseInt(limit),
      offset,
      sort
    });

    const total = await Post.count({
      search,
      postType,
      hasMedia,
      hashtags: hashtags ? hashtags.split(',') : undefined,
      authorId,
      startDate,
      endDate,
      visibility: 'public'
    });

    // Transform posts to include author information (now coming from JOIN)
    const postsWithAuthors = posts.map((post) => {
      return {
        ...post,
        author: {
          id: post.author_id,
          username: post.username,
          firstName: post.first_name,
          lastName: post.last_name,
          profileImage: post.profile_image,
          isVerified: post.is_verified || false // Default to false if not present
        }
      };
    });

    res.json({
      success: true,
      data: postsWithAuthors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: offset + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      },
      meta: {
        searchQuery: search,
        availableSorts: ['newest', 'oldest', 'popular', 'trending'],
        searchFields: ['content', 'hashtags'],
        filters: {
          postType: ['standard', 'share', 'announcement', 'question', 'sale'],
          hasMedia: ['true', 'false']
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search posts',
      error: error.message
    });
  }
};

/**
 * Get trending posts
 */
exports.getTrendingPosts = async (req, res) => {
  try {
    const {
      timeframe = 24,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.findTrending({
      timeframe: parseInt(timeframe),
      limit: parseInt(limit),
      offset
    });

    // Transform posts to include author information (now coming from JOIN)
    const postsWithAuthors = posts.map((post) => {
      return {
        ...post,
        author: {
          id: post.author_id,
          username: post.username,
          firstName: post.first_name,
          lastName: post.last_name,
          profileImage: post.profile_image,
          isVerified: post.is_verified || false // Default to false if not present
        }
      };
    });

    res.json({
      success: true,
      data: postsWithAuthors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasNext: posts.length === parseInt(limit),
        hasPrev: parseInt(page) > 1
      },
      meta: {
        timeframe: `${timeframe} hours`,
        algorithm: 'engagement-based trending'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending posts',
      error: error.message
    });
  }
};

/**
 * Get posts by specific user
 */
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = 'newest',
      postType,
      hasMedia
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine visibility based on relationship
    let visibility = ['public'];
    const isOwnProfile = req.user && req.user.id === userId;

    if (isOwnProfile) {
      visibility = ['public', 'followers', 'private'];
    } else if (req.user) {
      const isFollowing = await Follow.isFollowing(req.user.id, userId);
      if (isFollowing) {
        visibility = ['public', 'followers'];
      }
    }

    const posts = await Post.findMany({
      authorId: userId,
      visibility,
      postType,
      hasMedia,
      limit: parseInt(limit),
      offset,
      sort
    });

    const total = await Post.count({
      authorId: userId,
      visibility,
      postType,
      hasMedia
    });

    // Add author information to each post
    const postsWithAuthors = posts.map(post => ({
      ...post,
      author: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        profileImage: user.profile_image,
        isVerified: user.is_verified
      }
    }));

    res.json({
      success: true,
      data: postsWithAuthors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: offset + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      },
      meta: {
        userId,
        isOwnProfile,
        username: user.username,
        availableSorts: ['newest', 'oldest', 'popular']
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user posts',
      error: error.message
    });
  }
};

/**
 * React to a post
 */
exports.reactToPost = async (req, res) => {
  console.log('🎯 Backend: reactToPost called', {
    postId: req.params.id,
    userId: req.user?.id,
    reactionType: req.body.reactionType
  });

  try {
    const { id } = req.params;
    const { reactionType } = req.body;

    console.log('📝 Backend: Validating post exists');
    const post = await Post.findById(id);
    if (!post) {
      console.log('❌ Backend: Post not found');
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    console.log('➕ Backend: Adding reaction via Post.addReaction');
    const reaction = await Post.addReaction(id, req.user.id, reactionType);
    console.log('✅ Backend: Reaction added successfully', reaction);

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
      message: 'Failed to react to post',
      error: error.message
    });
  }
};

/**
 * Remove reaction from post
 */
exports.removePostReaction = async (req, res) => {
  try {
    const { id } = req.params;

    await Post.removeReaction(id, req.user.id);

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
 * Get post reactions summary
 */
exports.getPostReactions = async (req, res) => {
  try {
    const { id } = req.params;

    const reactions = await Reaction.getReactionSummary(id, 'post');

    res.json({
      success: true,
      data: reactions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post reactions',
      error: error.message
    });
  }
};