const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    // For nested comments/replies
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    // Track if this is a reply
    isReply: {
      type: Boolean,
      default: false,
    },
    // Comment engagement
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // For mentions in comments
    mentions: [{
      type: String, // userId of mentioned users
    }],
    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },
    // For moderation
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1, createdAt: 1 });
CommentSchema.index({ mentions: 1 });

module.exports = mongoose.model("Comment", CommentSchema);