const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../utils/validation');
const { messageSchema } = require('../utils/validation');

// All message routes require authentication
router.use(authenticateToken);

// Conversation routes
router.get('/conversations', messageController.getConversations);
router.post('/conversations', messageController.startConversation);
router.delete('/conversations/:conversationId', messageController.deleteConversation);

// Message routes
router.get('/conversations/:conversationId/messages', messageController.getMessages);
router.post('/conversations/:conversationId/messages', validate(messageSchema), messageController.sendMessage);

// Utility routes
router.get('/unread-count', messageController.getUnreadCount);

module.exports = router;