const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { uploadPostFiles, processPostFiles, handleUploadError } = require('../middleware/upload');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');

// Validation rules
const createPostValidation = [
  body('content')
    .notEmpty()
    .withMessage('Post content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters'),
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

const reactionValidation = [
  body('reactionType')
    .isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug'])
    .withMessage('Invalid reaction type')
];

// Timeline and discovery routes
router.get('/timeline', authenticateToken, postController.getTimeline);
router.get('/trending', postController.getTrendingPosts);
router.get('/discovery', authenticateToken, postController.getDiscoveryPosts);
router.get('/search', postController.searchPosts);

// Post CRUD routes - includes media upload support
router.post('/', authenticateToken, (req, res, next) => {
  uploadPostFiles(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    processPostFiles(req, res, next);
  });
}, createPostValidation, postController.createPost);
router.get('/:id', postController.getPost);
router.put('/:id', authenticateToken, postController.updatePost);
router.delete('/:id', authenticateToken, postController.deletePost);

// Post interaction routes
router.post('/:id/react', authenticateToken, reactionValidation, postController.reactToPost);
router.delete('/:id/react', authenticateToken, postController.removeReaction);
router.get('/:id/reactions', postController.getPostReactions);
router.post('/:id/share', authenticateToken, postController.sharePost);

// User posts
router.get('/user/:userId', postController.getUserPosts);

// Comment routes
router.post('/:postId/comments', authenticateToken, createCommentValidation, commentController.createComment);
router.get('/:postId/comments', commentController.getPostComments);
router.get('/comments/:commentId/replies', commentController.getCommentReplies);
router.put('/comments/:id', authenticateToken, commentController.updateComment);
router.delete('/comments/:id', authenticateToken, commentController.deleteComment);
router.post('/comments/:id/react', authenticateToken, reactionValidation, commentController.reactToComment);
router.delete('/comments/:id/react', authenticateToken, commentController.removeCommentReaction);
router.get('/comments/:id/reactions', commentController.getCommentReactions);

module.exports = router;