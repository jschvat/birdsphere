// MongoDB initialization script for chat collections
db = db.getSiblingDB('birdsphere_chat');

// Create user for the birdsphere_chat database
db.createUser({
  user: 'birdsphere_user',
  pwd: 'birdsphere_password_123',
  roles: [
    {
      role: 'readWrite',
      db: 'birdsphere_chat'
    }
  ]
});

// Create collections with validation
db.createCollection('chatMessages', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['roomId', 'senderId', 'content', 'messageType', 'createdAt'],
      properties: {
        roomId: {
          bsonType: 'string',
          description: 'Room ID from PostgreSQL - required'
        },
        senderId: {
          bsonType: 'string', 
          description: 'User ID from PostgreSQL - required'
        },
        content: {
          bsonType: 'string',
          description: 'Message content - required'
        },
        messageType: {
          bsonType: 'string',
          enum: ['text', 'image', 'file', 'emoji'],
          description: 'Type of message - required'
        },
        replyTo: {
          bsonType: ['string', 'null'],
          description: 'Message ID this is replying to'
        },
        isEdited: {
          bsonType: 'bool',
          description: 'Whether message has been edited'
        },
        editHistory: {
          bsonType: 'array',
          description: 'History of message edits',
          items: {
            bsonType: 'object',
            properties: {
              content: { bsonType: 'string' },
              editedAt: { bsonType: 'date' }
            }
          }
        },
        createdAt: {
          bsonType: 'date',
          description: 'Message creation timestamp - required'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Message last update timestamp'
        }
      }
    }
  }
});

// Create indexes for optimal query performance
db.chatMessages.createIndex({ roomId: 1, createdAt: -1 });
db.chatMessages.createIndex({ senderId: 1 });
db.chatMessages.createIndex({ replyTo: 1 });
db.chatMessages.createIndex({ content: 'text' }); // Full-text search
db.chatMessages.createIndex({ roomId: 1, createdAt: 1 }); // Pagination queries

// Create collection for message read status
db.createCollection('messageReadStatus', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['messageId', 'userId', 'readAt'],
      properties: {
        messageId: {
          bsonType: 'string',
          description: 'MongoDB message ID - required'
        },
        userId: {
          bsonType: 'string',
          description: 'User ID from PostgreSQL - required'
        },
        readAt: {
          bsonType: 'date',
          description: 'When message was read - required'
        }
      }
    }
  }
});

// Index for read status queries
db.messageReadStatus.createIndex({ messageId: 1, userId: 1 }, { unique: true });
db.messageReadStatus.createIndex({ userId: 1, readAt: -1 });

// Create collection for typing indicators (temporary data)
db.createCollection('typingIndicators', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['roomId', 'userId', 'startedAt'],
      properties: {
        roomId: {
          bsonType: 'string',
          description: 'Room ID - required'
        },
        userId: {
          bsonType: 'string',
          description: 'User ID - required'
        },
        startedAt: {
          bsonType: 'date',
          description: 'When typing started - required'
        }
      }
    }
  }
});

// Index for typing indicators with TTL (auto-expire after 10 seconds)
db.typingIndicators.createIndex({ startedAt: 1 }, { expireAfterSeconds: 10 });
db.typingIndicators.createIndex({ roomId: 1, userId: 1 }, { unique: true });

print('MongoDB chat collections initialized successfully');