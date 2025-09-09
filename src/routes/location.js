const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Public location-based routes
router.get('/nearby/listings', locationController.getNearbyListings);
router.get('/nearby/breeders', locationController.getNearbyBreeders);
router.get('/distance', locationController.calculateDistanceBetweenPoints);

module.exports = router;