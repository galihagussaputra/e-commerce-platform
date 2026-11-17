const crypto = require('crypto');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const uniqueSlug = async (value, excludeId) => {
  const base = slugify(value) || `item-${crypto.randomBytes(3).toString('hex')}`;
  const filter = excludeId ? { _id: { $ne: excludeId } } : {};
  if (!(await Product.exists({ ...filter, slug: base }))) return base;
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
};

const resolveCategory = async (identifier) => {
  if (!identifier) return null;
  const filter = mongoose.isValidObjectId(identifier)
    ? { $or: [{ _id: identifier }, { slug: String(identifier).toLowerCase() }] }
    : { slug: String(identifier).toLowerCase() };
  return Category.findOne(filter);
};

const listProducts = async (query = {}) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    featured,
    status = 'active',
    sort = 'newest',
    page = 1,
    limit = 12,
  } = query;

  const filter = {};
  if (status !== 'all') filter.status = status;
  if (featured === 'true' || featured === true) filter.featured = true;

  if (category) {
    const resolved = await resolveCategory(category);
    filter.category = resolved ? resolved._id : "__none__";
    if (!resolved) return { items: [], total: 0, page, limit };
  }

  if (q) filter.$or = [
    { name: new RegExp(escapeRegex(q), 'i') },
    { description: new RegExp(escapeRegex(q), 'i') },
    { brand: new RegExp(escapeRegex(q), 'i') },
  ];

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  const sorting = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name: { name: 1 },
  }[sort] || { createdAt: -1 };

  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sorting)
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Product.countDocuments(filter),
  ]);
  return { items, total, page: safePage, limit: safeLimit };
};

const getProduct = async (identifier) => {
  const filter = mongoose.isValidObjectId(identifier)
    ? { $or: [{ _id: identifier }, { slug: String(identifier).toLowerCase() }] }
    : { slug: String(identifier).toLowerCase() };
  const product = await Product.findOne(filter).populate('category', 'name slug');
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return product;
};

const createProduct = async (payload) => {
  const resolved = await Category.findById(payload.category);
  if (!resolved) throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Category does not exist');
  const product = await Product.create({
    ...payload,
    slug: payload.slug ? slugify(payload.slug) : await uniqueSlug(payload.name),
    available: Number(payload.stock || 0),
  });
  return product.populate('category', 'name slug');
};

const updateProduct = async (id, payload) => {
  const product = await Product.findById(id);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  if (payload.category) {
    if (!(await Category.exists({ _id: payload.category }))) {
      throw new AppError(400, 'CATEGORY_NOT_FOUND', 'Category does not exist');
    }
  }
  Object.assign(product, payload);
  if (payload.name && !payload.slug) product.slug = await uniqueSlug(payload.name, product._id);
  if (payload.slug) product.slug = await uniqueSlug(payload.slug, product._id);
  if (payload.stock !== undefined) {
    product.available = Math.max(0, Number(payload.stock) - product.reserved);
  }
  await product.save();
  return product.populate('category', 'name slug');
};

const removeProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return product;
};

const listCategories = async () =>
  Category.find({ isActive: true }).sort({ name: 1 });

const buildCategoryPayload = ({ name, slug, description, image, isActive }) => ({
  ...(name !== undefined ? { name } : {}),
  ...(slug !== undefined ? { slug } : {}),
  ...(description !== undefined ? { description } : {}),
  ...(image !== undefined ? { image } : {}),
  ...(isActive !== undefined ? { isActive } : {}),
});

const createCategory = async (payload) => {
  const data = buildCategoryPayload(payload);
  if (!data.slug) data.slug = slugify(data.name);
  return Category.create(data);
};

const updateCategory = async (id, payload) => {
  const category = await Category.findByIdAndUpdate(id, buildCategoryPayload(payload), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  return category;
};

const removeCategory = async (id) => {
  if (await Product.exists({ category: id })) {
    throw new AppError(409, 'CATEGORY_IN_USE', 'Category still has products');
  }
  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
  return category;
};

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  removeProduct,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  slugify,
};
