const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed'],
      default: 'processing',
    },
    handled: { type: Boolean, default: false },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
