const mongoose = require('mongoose');

const editHistorySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  editedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 4000
  },
  messageType: {
    type: String,
    required: true,
    enum: ['text', 'image', 'file', 'emoji'],
    default: 'text'
  },
  replyTo: {
    type: String,
    default: null,
    index: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [editHistorySchema],
  // Metadata for enhanced features
  mentions: [{
    userId: String,
    username: String
  }],
  reactions: [{
    userId: String,
    emoji: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'video']
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }]
}, {
  timestamps: true,
  collection: 'chatMessages'
});

// Compound indexes for optimal query performance
chatMessageSchema.index({ roomId: 1, createdAt: -1 });
chatMessageSchema.index({ roomId: 1, createdAt: 1 });
chatMessageSchema.index({ senderId: 1, createdAt: -1 });
chatMessageSchema.index({ content: 'text' }); // Full-text search

// Virtual for formatted creation date
chatMessageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toISOString();
});

// Instance method to add reaction
chatMessageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(r => r.userId === userId && r.emoji === emoji);
  if (!existingReaction) {
    this.reactions.push({ userId, emoji });
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove reaction
chatMessageSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(r => !(r.userId === userId && r.emoji === emoji));
  return this.save();
};

// Static method to find messages with pagination
chatMessageSchema.statics.findByRoomPaginated = function(roomId, limit = 50, skip = 0) {
  return this.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Static method to search messages
chatMessageSchema.statics.searchInRoom = function(roomId, searchTerm, limit = 20) {
  return this.find({
    roomId,
    $text: { $search: searchTerm }
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;