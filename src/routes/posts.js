const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { uploadPostFiles, processPostFiles, uploadCommentFiles, processCommentFiles, handleUploadError } = require('../middleware/upload');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');

// Validation rules
const createPostValidation = [
  body('content')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Post content must not exceed 5000 characters'),
  body('postType')
    .optional()
    .isIn(['standard', 'share', 'announcement', 'question', 'sale'])
    .withMessage('Invalid post type'),
  body('visibility')
    .optional()
    .isIn(['public', 'followers', 'private'])
    .withMessage('Invalid visibility setting')
];

const createCommentValidation = [
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters')
];

const createCommentWithMediaValidation = [
  body('content')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comment content must be 1000 characters or less'),
  // Custom validation to ensure either content or files are provided
  (req, res, next) => {
    const hasContent = req.body.content && req.body.content.trim().length > 0;
    const hasFiles = req.files && req.files.length > 0;

    if (!hasContent && !hasFiles) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Either comment content or media files are required'
      });
    }

    next();
  }
];

const reactionValidation = [
  body('reactionType')
    .isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug'])
    .withMessage('Invalid reaction type')
];

// Timeline and discovery routes
router.get('/timeline', authenticateToken, postController.getTimeline);
router.get('/trending', postController.getTrendingPosts);
// router.get('/discovery', authenticateToken, postController.getDiscoveryPosts);
router.get('/search', postController.searchPosts);

// Post CRUD routes - includes media upload support
router.post('/', authenticateToken, (req, res, next) => {
  console.log('📍 POST /api/posts route hit');
  uploadPostFiles(req, res, (err) => {
    if (err) {
      console.log('❌ Upload error in route:', err);
      return handleUploadError(err, req, res, next);
    }
    console.log('✅ Upload successful, processing files');
    processPostFiles(req, res, next);
  });
}, createPostValidation, postController.createPost);
router.get('/:id', postController.getPost);
router.put('/:id', authenticateToken, postController.updatePost);
router.delete('/:id', authenticateToken, postController.deletePost);

// Post interaction routes
router.post('/:id/react', authenticateToken, reactionValidation, postController.reactToPost);
router.delete('/:id/react', authenticateToken, postController.removePostReaction);
router.get('/:id/reactions', postController.getPostReactions);
// router.post('/:id/share', authenticateToken, postController.sharePost);

// User posts
router.get('/user/:userId', postController.getUserPosts);

// Comment routes
router.post('/:postId/comments', authenticateToken, createCommentValidation, commentController.createComment);

// Enhanced comment route with media support
router.post('/:postId/comments/media', authenticateToken, (req, res, next) => {
  console.log('📍 POST /api/posts/:postId/comments/media route hit');
  uploadCommentFiles(req, res, (err) => {
    if (err) {
      console.log('❌ Comment upload error in route:', err);
      return handleUploadError(err, req, res, next);
    }
    console.log('✅ Comment upload successful, processing files');
    processCommentFiles(req, res, next);
  });
}, createCommentWithMediaValidation, commentController.createCommentWithMedia);

router.get('/:postId/comments', commentController.getPostComments);

// Enhanced route to get comments with media
router.get('/:postId/comments/media', commentController.getPostCommentsWithMedia);

router.get('/comments/:commentId/replies', commentController.getCommentReplies);
router.put('/comments/:id', authenticateToken, commentController.updateComment);
router.delete('/comments/:id', authenticateToken, commentController.deleteComment);

// Add media to existing comment
router.post('/comments/:id/media', authenticateToken, (req, res, next) => {
  uploadCommentFiles(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    processCommentFiles(req, res, next);
  });
}, commentController.addMediaToComment);

router.post('/comments/:id/react', authenticateToken, reactionValidation, commentController.reactToComment);
router.delete('/comments/:id/react', authenticateToken, commentController.removeCommentReaction);
router.get('/comments/:id/reactions', commentController.getCommentReactions);

module.exports = router;