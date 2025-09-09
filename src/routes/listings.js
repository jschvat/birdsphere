const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate, validateQuery } = require('../utils/validation');
const { listingSchema, updateListingSchema, searchSchema } = require('../utils/validation');
const { uploadMultiple, handleUploadError, validateUpload, processUploadedFiles } = require('../middleware/upload');

// Public routes
router.get('/', validateQuery(searchSchema), optionalAuth, listingController.getListings);
router.get('/categories', listingController.getCategories);
router.get('/:id', optionalAuth, listingController.getListing);

// Protected routes - require authentication
router.post('/', authenticateToken, validate(listingSchema), listingController.createListing);
router.get('/user/my-listings', authenticateToken, listingController.getUserListings);
router.put('/:id', authenticateToken, validate(updateListingSchema), listingController.updateListing);
router.delete('/:id', authenticateToken, listingController.deleteListing);

// Media upload routes
router.post('/:id/media', 
  authenticateToken, 
  uploadMultiple, 
  handleUploadError,
  validateUpload,
  processUploadedFiles,
  listingController.uploadMedia
);

router.delete('/:id/media/:mediaId', authenticateToken, listingController.deleteMedia);

module.exports = router;