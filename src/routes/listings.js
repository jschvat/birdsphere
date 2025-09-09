const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate, validateQuery } = require('../utils/validation');
const { listingSchema, updateListingSchema, searchSchema } = require('../utils/validation');
const { uploadMultiple, handleUploadError, validateUpload, processUploadedFiles } = require('../middleware/upload');

/**
 * @swagger
 * /api/listings:
 *   get:
 *     tags: [Listings]
 *     summary: Search and filter listings
 *     description: Get listings with optional search, filters, and pagination
 *     parameters:
 *       - name: query
 *         in: query
 *         description: Search query (searches title, description, species)
 *         schema:
 *           type: string
 *           example: budgerigar
 *       - name: category
 *         in: query
 *         description: Category ID filter
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: minPrice
 *         in: query
 *         description: Minimum price filter
 *         schema:
 *           type: number
 *           example: 50
 *       - name: maxPrice
 *         in: query
 *         description: Maximum price filter
 *         schema:
 *           type: number
 *           example: 200
 *       - name: species
 *         in: query
 *         description: Species filter
 *         schema:
 *           type: string
 *           example: Budgerigar
 *       - name: latitude
 *         in: query
 *         description: Latitude for distance-based search
 *         schema:
 *           type: number
 *           example: 34.0522
 *       - name: longitude
 *         in: query
 *         description: Longitude for distance-based search
 *         schema:
 *           type: number
 *           example: -118.2437
 *       - name: radius
 *         in: query
 *         description: Search radius in kilometers
 *         schema:
 *           type: number
 *           default: 50
 *       - name: page
 *         in: query
 *         description: Page number
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Items per page
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Listings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 listings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
router.get('/', validateQuery(searchSchema), optionalAuth, listingController.getListings);

/**
 * @swagger
 * /api/listings/categories:
 *   get:
 *     tags: [Listings]
 *     summary: Get all categories
 *     description: Retrieve all listing categories with subcategories
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get('/categories', listingController.getCategories);

/**
 * @swagger
 * /api/listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get listing details
 *     description: Get detailed information about a specific listing
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Listing ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Listing retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 listing:
 *                   $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found
 */
router.get('/:id', optionalAuth, listingController.getListing);

/**
 * @swagger
 * /api/listings:
 *   post:
 *     tags: [Listings]
 *     summary: Create a new listing
 *     description: Create a new marketplace listing (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - title
 *               - description
 *               - price
 *             properties:
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 example: "9e934c16-9429-418b-839d-d874d2b1bfd6"
 *               title:
 *                 type: string
 *                 example: "Beautiful Blue Budgerigar Pair"
 *               description:
 *                 type: string
 *                 example: "Healthy breeding pair of blue budgerigars"
 *               price:
 *                 type: number
 *                 example: 85.99
 *               species:
 *                 type: string
 *                 example: "Budgerigar"
 *               breed:
 *                 type: string
 *                 example: "English Budgie"
 *               age:
 *                 type: string
 *                 example: "8 months"
 *               sex:
 *                 type: string
 *                 enum: [Male, Female, Unknown]
 *                 example: "Unknown"
 *               color:
 *                 type: string
 *                 example: "Blue"
 *               healthStatus:
 *                 type: string
 *                 example: "Excellent - vet checked"
 *               vaccinationStatus:
 *                 type: string
 *                 example: "Up to date"
 *               shippingAvailable:
 *                 type: boolean
 *                 default: false
 *               localPickupOnly:
 *                 type: boolean
 *                 default: true
 *               locationCity:
 *                 type: string
 *                 example: "Los Angeles"
 *               locationState:
 *                 type: string
 *                 example: "California"
 *               locationCountry:
 *                 type: string
 *                 example: "USA"
 *               latitude:
 *                 type: number
 *                 example: 34.0522
 *               longitude:
 *                 type: number
 *                 example: -118.2437
 *     responses:
 *       201:
 *         description: Listing created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Listing created successfully
 *                 listing:
 *                   $ref: '#/components/schemas/Listing'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
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