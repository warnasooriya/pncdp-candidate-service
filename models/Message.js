const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true, // Index for faster lookups
    },
    senderId: {
      type: String,
      required: true,
      index: true, // Index for faster lookups
    },
    receiverId: {
      type: String,
      required: true,
      index: true, // Index for faster lookups
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000, // Limit message content length
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaFileName: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // For message reactions/emojis
    reactions: [{
      userId: {
        type: String,
        required: true,
      },
      emoji: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      }
    }],
    // For reply functionality
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });
MessageSchema.index({ conversationId: 1, isDeleted: 1, createdAt: -1 });

// Compound index for conversation participants
MessageSchema.index({ senderId: 1, receiverId: 1 });

module.exports = mongoose.model("Message", MessageSchema);