const mongoose = require("mongoose");

const ConnectionSchema = new mongoose.Schema(
  {
    requester: {
      type: String,
      required: true,
      index: true, // Index for faster lookups
    },
    recipient: {
      type: String,
      required: true,
      index: true, // Index for faster lookups
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'blocked'],
      default: 'pending',
      required: true,
    },
    requestMessage: {
      type: String,
      maxlength: 300,
      default: '',
    },
    connectionDate: {
      type: Date,
      default: null, // Set when connection is accepted
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate connections
ConnectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Index for efficient queries
ConnectionSchema.index({ requester: 1, status: 1 });
ConnectionSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model("Connection", ConnectionSchema);