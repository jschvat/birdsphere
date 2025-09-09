const mongoose = require('mongoose');

const messageReadStatusSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  readAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: false,
  collection: 'messageReadStatus'
});

// Compound unique index to prevent duplicate read status entries
messageReadStatusSchema.index({ messageId: 1, userId: 1 }, { unique: true });

// Index for user-based queries
messageReadStatusSchema.index({ userId: 1, readAt: -1 });

// Static method to mark multiple messages as read
messageReadStatusSchema.statics.markMessagesRead = function(messageIds, userId) {
  const readStatuses = messageIds.map(messageId => ({
    messageId,
    userId,
    readAt: new Date()
  }));
  
  return this.insertMany(readStatuses, { ordered: false });
};

// Static method to get read status for messages
messageReadStatusSchema.statics.getReadStatusForMessages = function(messageIds) {
  return this.find({ messageId: { $in: messageIds } }).lean();
};

const MessageReadStatus = mongoose.model('MessageReadStatus', messageReadStatusSchema);

module.exports = MessageReadStatus;