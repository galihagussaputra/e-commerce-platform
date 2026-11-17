const request = require('supertest');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const Product = require('../../src/models/Product');

const address = {
  label: 'Home',
  fullName: 'Test Buyer',
  phone: '081234567890',
  line1: 'Jalan Utama 1',
  city: 'Jakarta',
  postalCode: '12345',
  country: 'Indonesia',
  isDefault: true,
};

const createBuyer = async (app, email = 'buyer@example.com', password = 'Demo12345') => {
  const user = await User.create({ name: 'Test Buyer', email, password });
  user.addresses.push(address);
  await user.save();
  const login = await request(app).post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return { user, token: login.body.data.token };
};

const registerCustomer = async (app, email, password = 'Demo12345') => {
  const registered = await request(app).post('/api/auth/register')
    .send({ name: 'Registered Buyer', email, password })
    .expect(201);
  const token = registered.body.data.token;
  await request(app).post('/api/auth/addresses')
    .set('Authorization', `Bearer ${token}`)
    .send(address)
    .expect(201);
  return { token, user: registered.body.data.user };
};

const createAdmin = async (app, email = 'admin@example.com', password = 'Demo12345') => {
  await User.create({ name: 'Store Admin', email, password, role: 'admin' });
  const login = await request(app).post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return login.body.data.token;
};

const createCategory = async (name = 'Audio', slug = 'audio') =>
  Category.create({ name, slug });

const createProduct = async (category, overrides = {}) => Product.create({
  name: 'Studio Headphones',
  slug: 'studio-headphones',
  description: 'Great sound for focused work.',
  price: 1500000,
  category: category._id,
  stock: 10,
  available: 10,
  reserved: 0,
  images: ['https://example.com/product.jpg'],
  variants: [{ name: 'Default', sku: 'AUD-001' }],
  ...overrides,
});

const addToCart = async (app, token, product, quantity = 2) => request(app)
  .post('/api/cart/sync')
  .set('Authorization', `Bearer ${token}`)
  .send({ items: [{ productId: product._id.toString(), quantity }] })
  .expect(200);

const startCheckout = async (app, token, idempotencyKey) => request(app)
  .post('/api/checkout/session')
  .set('Authorization', `Bearer ${token}`)
  .send({ idempotencyKey })
  .expect(201);

module.exports = {
  address,
  createBuyer,
  registerCustomer,
  createAdmin,
  createCategory,
  createProduct,
  addToCart,
  startCheckout,
};
