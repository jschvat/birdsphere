const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const { messageSchema } = require('../utils/validation');

// All message routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     tags: [Messages]
 *     summary: Get user conversations
 *     description: Get all conversations for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Authentication required
 */
router.get('/conversations', messageController.getConversations);

/**
 * @swagger
 * /api/messages/conversations:
 *   post:
 *     tags: [Messages]
 *     summary: Start a new conversation
 *     description: Start a new conversation about a listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *             properties:
 *               listingId:
 *                 type: string
 *                 format: uuid
 *                 example: "b94f382a-e1b3-4ff2-8a40-eb804fc46f85"
 *               initialMessage:
 *                 type: string
 *                 example: "Hi! I'm interested in your budgerigar pair."
 *     responses:
 *       201:
 *         description: Conversation started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Conversation started successfully
 *                 conversation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     listingId:
 *                       type: string
 *                       format: uuid
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Listing not found
 */
router.post('/conversations', messageController.startConversation);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message
 *     description: Send a message in a conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         description: Conversation ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello! Are the birds still available?"
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Conversation not found
 */
router.post('/conversations/:conversationId/messages', validate(messageSchema), messageController.sendMessage);

router.delete('/conversations/:conversationId', messageController.deleteConversation);

// Message routes
router.get('/conversations/:conversationId/messages', messageController.getMessages);

// Utility routes
router.get('/unread-count', messageController.getUnreadCount);

module.exports = router;