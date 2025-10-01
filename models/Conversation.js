const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: String,
      required: true,
    }],
    conversationType: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    title: {
      type: String,
      default: null, // For group conversations
    },
    description: {
      type: String,
      default: null, // For group conversations
    },
    lastMessage: {
      content: {
        type: String,
        default: null,
      },
      senderId: {
        type: String,
        default: null,
      },
      timestamp: {
        type: Date,
        default: null,
      },
      messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text',
      }
    },
    unreadCounts: [{
      userId: {
        type: String,
        required: true,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      }
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    // For group conversations
    admins: [{
      type: String,
    }],
    createdBy: {
      type: String,
      required: true,
    },
    // Conversation settings
    settings: {
      muteNotifications: [{
        userId: {
          type: String,
          required: true,
        },
        mutedUntil: {
          type: Date,
          default: null, // null means muted indefinitely
        }
      }],
      allowedMessageTypes: [{
        type: String,
        enum: ['text', 'image', 'file'],
      }],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ 'lastMessage.timestamp': -1 });
ConversationSchema.index({ participants: 1, isActive: 1 });
ConversationSchema.index({ createdBy: 1, createdAt: -1 });

// Compound index for direct conversations (2 participants)
ConversationSchema.index({ 
  participants: 1, 
  conversationType: 1 
}, { 
  partialFilterExpression: { conversationType: 'direct' } 
});

// Method to generate conversation ID for direct messages
ConversationSchema.statics.generateDirectConversationId = function(userId1, userId2) {
  // Sort user IDs to ensure consistent conversation ID regardless of order
  const sortedIds = [userId1, userId2].sort();
  return `direct_${sortedIds[0]}_${sortedIds[1]}`;
};

// Method to find or create direct conversation
ConversationSchema.statics.findOrCreateDirectConversation = async function(userId1, userId2) {
  const conversationId = this.generateDirectConversationId(userId1, userId2);
  
  let conversation = await this.findOne({
    participants: { $all: [userId1, userId2] },
    conversationType: 'direct'
  });

  if (!conversation) {
    conversation = new this({
      participants: [userId1, userId2],
      conversationType: 'direct',
      createdBy: userId1,
      unreadCounts: [
        { userId: userId1, count: 0 },
        { userId: userId2, count: 0 }
      ]
    });
    await conversation.save();
  }

  return conversation;
};

module.exports = mongoose.model("Conversation", ConversationSchema);