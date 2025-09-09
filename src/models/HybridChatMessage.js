const ChatMessage = require('./ChatMessage'); // PostgreSQL model
const ChatMessageMongo = require('./ChatMessageMongo'); // MongoDB model

class HybridChatMessage {
  constructor() {
    // Configuration flag to switch between databases
    this.useMongoDB = process.env.USE_MONGODB_CHAT === 'true' || false;
    this.fallbackEnabled = process.env.CHAT_FALLBACK_ENABLED === 'true' || true;
  }

  // Determine which database to use for operations
  getModel(operation = 'read') {
    // For high-frequency read operations, prefer MongoDB for better performance
    if (operation === 'read' || operation === 'search') {
      return this.useMongoDB ? ChatMessageMongo : ChatMessage;
    }
    
    // For write operations, use configured primary database
    return this.useMongoDB ? ChatMessageMongo : ChatMessage;
  }

  async executeWithFallback(operation, primaryModel, fallbackModel, ...args) {
    try {
      return await primaryModel[operation](...args);
    } catch (error) {
      console.error(`Primary database operation failed (${operation}):`, error);
      
      if (this.fallbackEnabled && fallbackModel && fallbackModel !== primaryModel) {
        try {
          console.log(`Attempting fallback to secondary database for ${operation}`);
          return await fallbackModel[operation](...args);
        } catch (fallbackError) {
          console.error(`Fallback operation failed (${operation}):`, fallbackError);
          throw error; // Throw original error
        }
      }
      
      throw error;
    }
  }

  async create(messageData) {
    const primaryModel = this.getModel('write');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('create', primaryModel, fallbackModel, messageData);
  }

  async findById(id) {
    const primaryModel = this.getModel('read');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('findById', primaryModel, fallbackModel, id);
  }

  async findByRoom(roomId, limit = 50, offset = 0) {
    const primaryModel = this.getModel('read');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('findByRoom', primaryModel, fallbackModel, roomId, limit, offset);
  }

  async findByRoomSince(roomId, since, limit = 100) {
    const primaryModel = this.getModel('read');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('findByRoomSince', primaryModel, fallbackModel, roomId, since, limit);
  }

  async getUnreadCount(roomId, userId, lastSeen) {
    const primaryModel = this.getModel('read');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('getUnreadCount', primaryModel, fallbackModel, roomId, userId, lastSeen);
  }

  async markAsRead(messageId, userId) {
    const primaryModel = this.getModel('write');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('markAsRead', primaryModel, fallbackModel, messageId, userId);
  }

  async markRoomAsRead(roomId, userId, upToTime = new Date()) {
    const primaryModel = this.getModel('write');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('markRoomAsRead', primaryModel, fallbackModel, roomId, userId, upToTime);
  }

  async getReadStatus(messageId) {
    const primaryModel = this.getModel('read');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('getReadStatus', primaryModel, fallbackModel, messageId);
  }

  async update(id, senderId, updates) {
    const primaryModel = this.getModel('write');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('update', primaryModel, fallbackModel, id, senderId, updates);
  }

  async delete(id, senderId) {
    const primaryModel = this.getModel('write');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('delete', primaryModel, fallbackModel, id, senderId);
  }

  async search(roomId, searchTerm, limit = 20) {
    // Search operations prefer MongoDB for better full-text search capabilities
    const primaryModel = this.useMongoDB ? ChatMessageMongo : ChatMessage;
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('search', primaryModel, fallbackModel, roomId, searchTerm, limit);
  }

  async getRoomStats(roomId) {
    const primaryModel = this.getModel('read');
    const fallbackModel = this.useMongoDB ? ChatMessage : ChatMessageMongo;
    
    return this.executeWithFallback('getRoomStats', primaryModel, fallbackModel, roomId);
  }

  // MongoDB-specific methods with graceful fallback
  async addReaction(messageId, userId, emoji) {
    if (this.useMongoDB && ChatMessageMongo.addReaction) {
      try {
        return await ChatMessageMongo.addReaction(messageId, userId, emoji);
      } catch (error) {
        console.error('MongoDB reaction operation failed:', error);
        // For PostgreSQL fallback, you'd need to implement reaction logic
        throw new Error('Reaction feature requires MongoDB');
      }
    } else {
      throw new Error('Reaction feature not available with current database configuration');
    }
  }

  async removeReaction(messageId, userId, emoji) {
    if (this.useMongoDB && ChatMessageMongo.removeReaction) {
      try {
        return await ChatMessageMongo.removeReaction(messageId, userId, emoji);
      } catch (error) {
        console.error('MongoDB reaction operation failed:', error);
        throw new Error('Reaction feature requires MongoDB');
      }
    } else {
      throw new Error('Reaction feature not available with current database configuration');
    }
  }

  // Utility method to get current configuration
  getConfig() {
    return {
      primaryDatabase: this.useMongoDB ? 'MongoDB' : 'PostgreSQL',
      fallbackEnabled: this.fallbackEnabled,
      supportedFeatures: {
        reactions: this.useMongoDB,
        fullTextSearch: true,
        messageHistory: this.useMongoDB
      }
    };
  }

  // Method to switch database preference (for testing)
  switchDatabase(useMongoDB = true) {
    this.useMongoDB = useMongoDB;
    console.log(`Switched to ${useMongoDB ? 'MongoDB' : 'PostgreSQL'} as primary database`);
  }
}

// Export singleton instance
module.exports = new HybridChatMessage();