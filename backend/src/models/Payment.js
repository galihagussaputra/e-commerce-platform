const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    provider: { type: String, default: 'stripe' },
    checkoutSessionId: { type: String, default: '' },
    paymentIntentId: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'IDR' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    checkoutUrl: { type: String, default: '' },
    failureReason: { type: String, default: '' },
    processedEventId: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index(
  { checkoutSessionId: 1 },
  { unique: true, partialFilterExpression: { checkoutSessionId: { $gt: '' } } }
);
paymentSchema.index(
  { paymentIntentId: 1 },
  { unique: true, partialFilterExpression: { paymentIntentId: { $gt: '' } } }
);

module.exports = mongoose.model('Payment', paymentSchema);
