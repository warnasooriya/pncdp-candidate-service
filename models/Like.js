const mongoose = require("mongoose");

const LikeSchema = new mongoose.Schema(
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
    likeType: {
      type: String,
      enum: ['like', 'love', 'celebrate', 'support', 'insightful', 'funny'],
      default: 'like',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate likes and improve query performance
LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
LikeSchema.index({ postId: 1, createdAt: -1 });

module.exports = mongoose.model("Like", LikeSchema);