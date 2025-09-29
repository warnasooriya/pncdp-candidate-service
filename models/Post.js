const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Index for faster lookups
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000, // Limit post content length
    },
    mediaType: {
      type: String,
      enum: ['none', 'image', 'video', 'document'],
      default: 'none',
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaFileName: {
      type: String,
      default: null,
    },
    privacy: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // For tracking engagement
    engagementScore: {
      type: Number,
      default: 0,
    },
    // For hashtags and mentions
    hashtags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    mentions: [{
      type: String, // userId of mentioned users
    }],
    // Original post reference for shares
    originalPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    shareComment: {
      type: String,
      maxlength: 500,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ mentions: 1 });
PostSchema.index({ engagementScore: -1 });

// Virtual for calculating engagement score
PostSchema.pre('save', function(next) {
  // Simple engagement score calculation
  this.engagementScore = (this.likesCount * 1) + (this.commentsCount * 2) + (this.sharesCount * 3);
  next();
});

module.exports = mongoose.model("Post", PostSchema);