const request = require('supertest');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');

const app = createApp();

const seedCatalog = async () => {
  const category = await Category.create({ name: 'Audio', slug: 'audio' });
  const product = await Product.create({
    name: 'Studio Headphones',
    slug: 'studio-headphones',
    description: 'Comfortable over-ear headphones.',
    price: 1500000,
    category: category._id,
    stock: 10,
    available: 10,
    images: ['/placeholder.svg'],
    variants: [{ name: 'Default', sku: 'AUD-001' }],
  });
  return { category, product };
};

const login = async () => {
  await User.create({ name: 'Buyer', email: 'buyer@example.com', password: 'Demo12345' });
  const response = await request(app).post('/api/auth/login')
    .send({ email: 'buyer@example.com', password: 'Demo12345' }).expect(200);
  return response.body.data.token;
};

describe('catalog and cart APIs', () => {
  it('lists only active products and filters by search', async () => {
    const { product } = await seedCatalog();
    await Product.create({
      name: 'Archived Lamp', slug: 'archived-lamp', description: 'Hidden', price: 100000,
      category: product.category, stock: 2, available: 2, status: 'archived',
    });

    const all = await request(app).get('/api/products').expect(200);
    expect(all.body.data).toHaveLength(1);
    expect(all.body.data[0].slug).toBe('studio-headphones');
    expect(all.body.meta.total).toBe(1);

    const searched = await request(app).get('/api/products?q=headphones').expect(200);
    expect(searched.body.data).toHaveLength(1);

    const missing = await request(app).get('/api/products?q=unknown').expect(200);
    expect(missing.body.data).toHaveLength(0);
  });

  it('syncs a guest cart and calculates server-side totals', async () => {
    const token = await login();
    const { product } = await seedCatalog();

    const synced = await request(app).post('/api/cart/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 3 }] })
      .expect(200);

    expect(synced.body.data.itemCount).toBe(3);
    expect(synced.body.data.subtotal).toBe(4500000);
    expect(synced.body.data.items[0].unitPrice).toBe(1500000);

    const tooMany = await request(app).post('/api/cart/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId: product._id.toString(), quantity: 99 }] })
      .expect(200);
    expect(tooMany.body.data.itemCount).toBe(10);
  });
});
