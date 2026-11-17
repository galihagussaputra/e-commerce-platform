const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    priceAdjustment: { type: Number, default: 0 },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    brand: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    images: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
    featured: { type: Boolean, default: false },
    variants: { type: [variantSchema], default: [] },
  },
  { timestamps: true }
);

productSchema.virtual('isLowStock').get(function () {
  return this.available <= this.lowStockThreshold;
});

productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ status: 1, category: 1, price: 1 });
productSchema.index({ featured: 1, status: 1 });

module.exports = mongoose.model('Product', productSchema);
