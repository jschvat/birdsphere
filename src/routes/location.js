const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

/**
 * @swagger
 * /api/location/nearby/listings:
 *   get:
 *     tags: [Location]
 *     summary: Find nearby listings
 *     description: Find listings near specified coordinates
 *     parameters:
 *       - name: latitude
 *         in: query
 *         required: true
 *         description: Latitude coordinate
 *         schema:
 *           type: number
 *           example: 34.0522
 *       - name: longitude
 *         in: query
 *         required: true
 *         description: Longitude coordinate
 *         schema:
 *           type: number
 *           example: -118.2437
 *       - name: radius
 *         in: query
 *         description: Search radius in kilometers
 *         schema:
 *           type: number
 *           default: 50
 *           example: 100
 *       - name: category
 *         in: query
 *         description: Category filter
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: species
 *         in: query
 *         description: Species filter
 *         schema:
 *           type: string
 *           example: Budgerigar
 *       - name: maxPrice
 *         in: query
 *         description: Maximum price filter
 *         schema:
 *           type: number
 *           example: 200
 *     responses:
 *       200:
 *         description: Nearby listings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 listings:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Listing'
 *                       - type: object
 *                         properties:
 *                           distance:
 *                             type: object
 *                             properties:
 *                               km:
 *                                 type: number
 *                               formatted:
 *                                 type: string
 *                 searchCenter:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                 searchRadius:
 *                   type: number
 *                 count:
 *                   type: integer
 *       400:
 *         description: Invalid coordinates
 */
router.get('/nearby/listings', locationController.getNearbyListings);

/**
 * @swagger
 * /api/location/distance:
 *   get:
 *     tags: [Location]
 *     summary: Calculate distance between two points
 *     description: Calculate the distance between two geographic coordinates
 *     parameters:
 *       - name: lat1
 *         in: query
 *         required: true
 *         description: First point latitude
 *         schema:
 *           type: number
 *           example: 34.0522
 *       - name: lng1
 *         in: query
 *         required: true
 *         description: First point longitude
 *         schema:
 *           type: number
 *           example: -118.2437
 *       - name: lat2
 *         in: query
 *         required: true
 *         description: Second point latitude
 *         schema:
 *           type: number
 *           example: 32.7157
 *       - name: lng2
 *         in: query
 *         required: true
 *         description: Second point longitude
 *         schema:
 *           type: number
 *           example: -117.1611
 *     responses:
 *       200:
 *         description: Distance calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 distance:
 *                   type: object
 *                   properties:
 *                     km:
 *                       type: number
 *                       example: 179.41
 *                     miles:
 *                       type: number
 *                       example: 111.48
 *                     formatted:
 *                       type: string
 *                       example: "111.5 miles"
 *                 points:
 *                   type: object
 *                   properties:
 *                     point1:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     point2:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *       400:
 *         description: Invalid coordinates
 */
router.get('/distance', locationController.calculateDistanceBetweenPoints);

router.get('/nearby/breeders', locationController.getNearbyBreeders);

module.exports = router;