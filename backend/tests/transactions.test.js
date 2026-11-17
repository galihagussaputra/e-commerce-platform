const mongoose = require('mongoose');
const { supportsTransactions, withTransaction } = require('../src/config/database');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const StockMovement = require('../src/models/StockMovement');
const { reserveItems } = require('../src/services/inventory.service');

const buildProduct = (category, overrides = {}) => ({
  name: 'Transaction Product',
  slug: 'transaction-product',
  description: 'Used by transaction tests.',
  price: 100000,
  category: category._id,
  stock: 5,
  available: 5,
  reserved: 0,
  ...overrides,
});

describe('MongoDB transactions', () => {
  it('detects replica-set topology and commits writes', async () => {
    const category = await Category.create({ name: 'Transaction', slug: 'transaction' });
    expect(supportsTransactions()).toBe(true);

    await withTransaction(async (session) => {
      await Product.create([buildProduct(category)], { session });
    });

    expect(await Product.countDocuments()).toBe(1);
  });

  it('rolls back document writes when the transaction throws', async () => {
    const category = await Category.create({ name: 'Transaction', slug: 'transaction' });

    await expect(withTransaction(async (session) => {
      await Product.create([buildProduct(category)], { session });
      throw new Error('force rollback');
    })).rejects.toThrow('force rollback');

    expect(await Product.countDocuments()).toBe(0);
  });

  it('rolls back an earlier inventory reservation when a later item is out of stock', async () => {
    const category = await Category.create({ name: 'Transaction', slug: 'transaction' });
    const first = await Product.create(buildProduct(category, { name: 'First', slug: 'first' }));
    const second = await Product.create(buildProduct(category, {
      name: 'Second',
      slug: 'second',
      stock: 0,
      available: 0,
    }));

    await expect(withTransaction(async (session) => {
      await reserveItems([
        { product: first._id, name: first.name, quantity: 2 },
        { product: second._id, name: second.name, quantity: 1 },
      ], {
        order: { _id: new mongoose.Types.ObjectId(), orderNumber: 'ORD-ROLLBACK' },
        performedBy: new mongoose.Types.ObjectId(),
        session,
      });
    })).rejects.toMatchObject({ code: 'OUT_OF_STOCK' });

    expect(await Product.findById(first._id)).toMatchObject({ stock: 5, available: 5, reserved: 0 });
    expect(await Product.findById(second._id)).toMatchObject({ stock: 0, available: 0, reserved: 0 });
    expect(await StockMovement.countDocuments()).toBe(0);
  });
});
