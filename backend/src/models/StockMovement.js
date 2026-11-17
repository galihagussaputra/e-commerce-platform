const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: {
      type: String,
      enum: ['in', 'out', 'reserve', 'release', 'adjustment'],
      required: true,
    },
    quantity: { type: Number, required: true },
    reason: { type: String, trim: true, default: '' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ order: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
