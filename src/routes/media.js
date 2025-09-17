const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const mediaController = require('../controllers/mediaController');

// Upload media files for posts
router.post('/upload', authenticateToken, mediaController.handleFileUpload, mediaController.uploadMediaForPost);

// Get file information
router.get('/file/:filename', mediaController.getFileInfo);

// Delete uploaded file
router.delete('/file/:filename', authenticateToken, mediaController.deleteUploadedFile);

// Get upload limits and allowed file types
router.get('/limits', mediaController.getUploadLimits);

module.exports = router;