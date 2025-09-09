const mongoConnection = require('../config/mongodb');
const ChatMessage = require('../schemas/chatMessage');
const MessageReadStatus = require('../schemas/messageReadStatus');
const redis = require('../config/redis');

class ChatMessageMongo {
  static async ensureConnection() {
    await mongoConnection.connect();
  }

  static async create(messageData) {
    await this.ensureConnection();
    
    const {
      roomId,
      senderId,
      content,
      messageType = 'text',
      replyTo = null,
      mentions = [],
      attachments = []
    } = messageData;

    const message = new ChatMessage({
      roomId,
      senderId,
      content,
      messageType,
      replyTo,
      mentions,
      attachments
    });

    const savedMessage = await message.save();
    
    // Cache recent message for faster access
    const cacheKey = `recent_messages:${roomId}`;
    try {
      await redis.lPush(cacheKey, JSON.stringify({
        id: savedMessage._id.toString(),
        roomId: savedMessage.roomId,
        senderId: savedMessage.senderId,
        content: savedMessage.content,
        messageType: savedMessage.messageType,
        replyTo: savedMessage.replyTo,
        createdAt: savedMessage.createdAt,
        updatedAt: savedMessage.updatedAt
      }));
      
      // Keep only last 50 messages in cache
      await redis.lTrim(cacheKey, 0, 49);
      await redis.expire(cacheKey, 3600); // 1 hour TTL
    } catch (cacheError) {
      console.warn('Cache update failed:', cacheError);
    }

    return savedMessage;
  }

  static async findById(id) {
    await this.ensureConnection();
    
    // Try cache first
    const cacheKey = `message:${id}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      console.warn('Cache read failed:', cacheError);
    }

    const message = await ChatMessage.findById(id).lean();
    
    if (message) {
      // Cache the message for future reads
      try {
        await redis.setEx(cacheKey, 1800, JSON.stringify(message)); // 30 min TTL
      } catch (cacheError) {
        console.warn('Cache write failed:', cacheError);
      }
    }

    return message;
  }

  static async findByRoom(roomId, limit = 50, offset = 0) {
    await this.ensureConnection();
    
    // For recent messages with no offset, try cache first
    if (offset === 0 && limit <= 50) {
      const cacheKey = `recent_messages:${roomId}`;
      try {
        const cached = await redis.lRange(cacheKey, 0, limit - 1);
        if (cached && cached.length > 0) {
          const messages = cached.map(msg => JSON.parse(msg));
          return messages.reverse(); // Return in chronological order
        }
      } catch (cacheError) {
        console.warn('Cache read failed:', cacheError);
      }
    }

    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    return messages.reverse(); // Return in chronological order
  }

  static async findByRoomSince(roomId, since, limit = 100) {
    await this.ensureConnection();
    
    const messages = await ChatMessage.find({
      roomId,
      createdAt: { $gt: since }
    })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return messages;
  }

  static async getUnreadCount(roomId, userId, lastSeen) {
    await this.ensureConnection();
    
    const count = await ChatMessage.countDocuments({
      roomId,
      senderId: { $ne: userId },
      createdAt: { $gt: lastSeen }
    });

    return count;
  }

  static async markAsRead(messageId, userId) {
    await this.ensureConnection();
    
    const readStatus = new MessageReadStatus({
      messageId: messageId.toString(),
      userId,
      readAt: new Date()
    });

    try {
      await readStatus.save();
      return readStatus;
    } catch (error) {
      // Handle duplicate key error (message already marked as read)
      if (error.code === 11000) {
        return await MessageReadStatus.findOne({ messageId: messageId.toString(), userId });
      }
      throw error;
    }
  }

  static async markRoomAsRead(roomId, userId, upToTime = new Date()) {
    await this.ensureConnection();
    
    // Find all unread messages in the room
    const unreadMessages = await ChatMessage.find({
      roomId,
      senderId: { $ne: userId },
      createdAt: { $lte: upToTime }
    }).select('_id').lean();

    if (unreadMessages.length === 0) {
      return 0;
    }

    const messageIds = unreadMessages.map(msg => msg._id.toString());
    
    try {
      const readStatuses = await MessageReadStatus.markMessagesRead(messageIds, userId);
      return readStatuses.insertedCount || 0;
    } catch (error) {
      // Handle partial success in case of duplicates
      console.warn('Some messages already marked as read:', error);
      return messageIds.length;
    }
  }

  static async getReadStatus(messageId) {
    await this.ensureConnection();
    
    const readStatuses = await MessageReadStatus.find({
      messageId: messageId.toString()
    }).lean();

    return readStatuses;
  }

  static async update(id, senderId, updates) {
    await this.ensureConnection();
    
    const allowedFields = ['content'];
    const updateData = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return null;
    }

    const message = await ChatMessage.findById(id);
    if (!message || message.senderId !== senderId) {
      return null;
    }

    // Store edit history
    if (updateData.content && message.content !== updateData.content) {
      message.editHistory.push({
        content: message.content,
        editedAt: new Date()
      });
      message.isEdited = true;
    }

    Object.assign(message, updateData);
    const updatedMessage = await message.save();

    // Invalidate cache
    const cacheKey = `message:${id}`;
    try {
      await redis.del(cacheKey);
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError);
    }

    return updatedMessage;
  }

  static async delete(id, senderId) {
    await this.ensureConnection();
    
    const message = await ChatMessage.findOneAndDelete({
      _id: id,
      senderId: senderId
    });

    if (message) {
      // Clean up related data
      await MessageReadStatus.deleteMany({ messageId: id.toString() });
      
      // Invalidate cache
      const cacheKey = `message:${id}`;
      try {
        await redis.del(cacheKey);
      } catch (cacheError) {
        console.warn('Cache invalidation failed:', cacheError);
      }
    }

    return message;
  }

  static async search(roomId, searchTerm, limit = 20) {
    await this.ensureConnection();
    
    const messages = await ChatMessage.find({
      roomId,
      messageType: 'text',
      $text: { $search: searchTerm }
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean();

    return messages;
  }

  static async getRoomStats(roomId) {
    await this.ensureConnection();
    
    const stats = await ChatMessage.aggregate([
      { $match: { roomId } },
      {
        $group: {
          _id: null,
          total_messages: { $sum: 1 },
          unique_senders: { $addToSet: '$senderId' },
          first_message_at: { $min: '$createdAt' },
          last_message_at: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 0,
          total_messages: 1,
          unique_senders: { $size: '$unique_senders' },
          first_message_at: 1,
          last_message_at: 1
        }
      }
    ]);

    return stats[0] || {
      total_messages: 0,
      unique_senders: 0,
      first_message_at: null,
      last_message_at: null
    };
  }

  // Method to add reaction to message
  static async addReaction(messageId, userId, emoji) {
    await this.ensureConnection();
    
    const message = await ChatMessage.findById(messageId);
    if (!message) return null;

    await message.addReaction(userId, emoji);
    return message;
  }

  // Method to remove reaction from message
  static async removeReaction(messageId, userId, emoji) {
    await this.ensureConnection();
    
    const message = await ChatMessage.findById(messageId);
    if (!message) return null;

    await message.removeReaction(userId, emoji);
    return message;
  }
}

module.exports = ChatMessageMongo;