const Message = require('../models/Message');
const Listing = require('../models/Listing');

const getConversations = async (req, res) => {
  try {
    const conversations = await Message.getUserConversations(req.user.id);
    
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      listingId: conv.listing_id,
      otherUser: {
        username: conv.other_username,
        firstName: conv.other_first_name,
        lastName: conv.other_last_name,
        profileImage: conv.other_profile_image
      },
      listing: conv.listing_id ? {
        title: conv.listing_title,
        price: parseFloat(conv.listing_price || 0)
      } : null,
      lastMessage: conv.last_message,
      unreadCount: parseInt(conv.unread_count),
      lastMessageAt: conv.last_message_at,
      createdAt: conv.created_at
    }));

    res.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await Message.getConversationMessages(
      conversationId, 
      req.user.id, 
      parseInt(page), 
      parseInt(limit)
    );
    
    // Mark messages as read
    await Message.markMessagesAsRead(conversationId, req.user.id);
    
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.sender_id,
      sender: {
        username: msg.username,
        firstName: msg.first_name,
        lastName: msg.last_name,
        profileImage: msg.profile_image
      },
      isRead: msg.is_read,
      createdAt: msg.created_at
    }));

    res.json({
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    
    if (error.message === 'Conversation not found or access denied') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content } = req.validatedData;
    const { conversationId } = req.params;
    
    // Verify user is part of this conversation
    const conversations = await Message.getUserConversations(req.user.id);
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }
    
    const message = await Message.sendMessage(conversationId, req.user.id, content);
    
    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        id: message.id,
        content: message.content,
        senderId: message.sender_id,
        createdAt: message.created_at
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const startConversation = async (req, res) => {
  try {
    const { listingId, initialMessage } = req.body;
    
    if (!listingId) {
      return res.status(400).json({ error: 'Listing ID is required' });
    }
    
    // Get listing and verify it exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    // Can't message yourself
    if (listing.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }
    
    // Create or get existing conversation
    const conversation = await Message.createConversation(
      req.user.id, 
      listing.seller_id, 
      listingId
    );
    
    // Send initial message if provided
    if (initialMessage && initialMessage.trim()) {
      await Message.sendMessage(conversation.id, req.user.id, initialMessage.trim());
    }
    
    res.status(201).json({
      message: 'Conversation started successfully',
      conversation: {
        id: conversation.id,
        listingId: conversation.listing_id,
        createdAt: conversation.created_at
      }
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    await Message.deleteConversation(conversationId, req.user.id);
    
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    
    if (error.message === 'Conversation not found or access denied') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Message.getUnreadCount(req.user.id);
    
    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  deleteConversation,
  getUnreadCount
};