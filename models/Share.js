const mongoose = require("mongoose");

const ShareSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    originalPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    // The new post created when sharing (if user adds comment)
    sharedPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    shareComment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    shareType: {
      type: String,
      enum: ['direct', 'with_comment', 'repost'],
      default: 'direct',
    },
    privacy: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public',
    },
    // Track share engagement
    viewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // For analytics
    shareSource: {
      type: String,
      enum: ['feed', 'profile', 'direct_link', 'search'],
      default: 'feed',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
ShareSchema.index({ userId: 1, createdAt: -1 });
ShareSchema.index({ originalPostId: 1, createdAt: -1 });
ShareSchema.index({ sharedPostId: 1 });

// Compound index to prevent duplicate shares (optional, depending on business logic)
ShareSchema.index({ userId: 1, originalPostId: 1 });

module.exports = mongoose.model("Share", ShareSchema);