const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: [
        'post_created',
        'post_liked',
        'post_commented',
        'post_shared',
        'connection_made',
        'job_applied',
        'profile_updated',
        'skill_added',
        'experience_added',
        'education_added',
        'certification_added'
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    relatedEntityId: {
      type: String, // ID of the related entity (post, job, user, etc.)
      default: null,
    },
    relatedEntityType: {
      type: String,
      enum: ['post', 'job', 'user', 'profile', 'skill', 'experience', 'education', 'certification'],
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Additional data specific to activity type
      default: {},
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    privacy: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ activityType: 1 });
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ relatedEntityId: 1, relatedEntityType: 1 });

module.exports = mongoose.model("Activity", ActivitySchema);