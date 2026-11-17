const request = require('supertest');

let mockWebhookEvent = null;

jest.mock('../src/config/stripe', () => ({
  getStripe: jest.fn(() => ({
    checkout: {
      sessions: {
        create: jest.fn(async () => ({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/c/pay/test',
          payment_intent: 'pi_test_123',
        })),
      },
    },
    webhooks: {
      constructEvent: jest.fn(() => mockWebhookEvent),
    },
  })),
}));

const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Cart = require('../src/models/Cart');
const StockMovement = require('../src/models/StockMovement');

const app = createApp();
const address = {
  label: 'Home', fullName: 'Test Buyer', phone: '08123456789', line1: 'Jalan Utama 1',
  city: 'Jakarta', postalCode: '12345', country: 'Indonesia', isDefault: true,
};

const createBuyer = async () => {
  const user = await User.create({ name: 'Test Buyer', email: 'buyer@example.com', password: 'Demo12345' });
  user.addresses.push(address);
  await user.save();
  const login = await request(app).post('/api/auth/login')
    .send({ email: user.email, password: 'Demo12345' }).expect(200);
  return { user, token: login.body.data.token };
};

const createAdmin = async () => {
  await User.create({ name: 'Admin', email: 'admin@example.com', password: 'Demo12345', role: 'admin' });
  const login = await request(app).post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Demo12345' }).expect(200);
  return login.body.data.token;
};

const createProduct = async () => {
  const category = await Category.create({ name: 'Audio', slug: 'audio' });
  return Product.create({
    name: 'Studio Headphones', slug: 'studio-headphones', description: 'Great sound.',
    price: 1500000, category: category._id, stock: 10, available: 10,
    images: ['/placeholder.svg'], variants: [{ name: 'Default', sku: 'AUD-001' }],
  });
};

const addToCart = async (token, product) => request(app)
  .post('/api/cart/sync')
  .set('Authorization', `Bearer ${token}`)
  .send({ items: [{ productId: product._id.toString(), quantity: 2 }] })
  .expect(200);

const startCheckout = async (token, key) => request(app)
  .post('/api/checkout/session')
  .set('Authorization', `Bearer ${token}`)
  .send({ idempotencyKey: key })
  .expect(201);

const sendWebhook = (event) => {
  mockWebhookEvent = event;
  return request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', 'test-signature')
    .send(JSON.stringify(event));
};

describe('checkout, webhook and inventory lifecycle', () => {
  it('reserves stock, finalizes a paid order, and ignores duplicate webhook events', async () => {
    const { token } = await createBuyer();
    const adminToken = await createAdmin();
    const product = await createProduct();
    await addToCart(token, product);

    const checkout = await startCheckout(token, 'idem-paid-1');
    expect(checkout.body.data.url).toBe('https://checkout.stripe.com/c/pay/test');
    expect(checkout.body.data.order.status).toBe('pending_payment');
    expect(checkout.body.data.order.total).toBe(3025000);

    let freshProduct = await Product.findById(product._id);
    expect(freshProduct.stock).toBe(10);
    expect(freshProduct.reserved).toBe(2);
    expect(freshProduct.available).toBe(8);

    const orderId = checkout.body.data.order._id;
    const event = {
      id: 'evt_completed_1',
      type: 'checkout.session.completed',
      data: { object: { payment_status: 'paid', payment_intent: 'pi_test_123', metadata: { orderId } } },
    };

    const paid = await sendWebhook(event).expect(200);
    expect(paid.body.data.handled).toBe(true);

    freshProduct = await Product.findById(product._id);
    expect(freshProduct.stock).toBe(8);
    expect(freshProduct.reserved).toBe(0);
    expect(freshProduct.available).toBe(8);

    const order = await Order.findById(orderId);
    expect(order.status).toBe('paid');
    expect(order.paymentStatus).toBe('paid');
    expect(await StockMovement.countDocuments({ order: order._id, type: 'out' })).toBe(1);

    const duplicate = await sendWebhook(event).expect(200);
    expect(duplicate.body.data.duplicate).toBe(true);
    expect((await Product.findById(product._id)).stock).toBe(8);

    const summary = await request(app).get('/api/admin/analytics/summary')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(summary.body.data.totalRevenue).toBe(3025000);
    expect(summary.body.data.averageOrderValue).toBe(3025000);
  });

  it('releases stock and restores the cart when a pending order is cancelled', async () => {
    const { token } = await createBuyer();
    const product = await createProduct();
    await addToCart(token, product);

    const checkout = await startCheckout(token, 'idem-cancel-1');
    const orderId = checkout.body.data.order._id;

    let freshProduct = await Product.findById(product._id);
    expect(freshProduct.reserved).toBe(2);
    expect(freshProduct.available).toBe(8);
    expect((await Cart.findOne({ user: checkout.body.data.order.user })).items).toHaveLength(0);

    await request(app).post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Changed mind' })
      .expect(200);

    freshProduct = await Product.findById(product._id);
    expect(freshProduct.stock).toBe(10);
    expect(freshProduct.reserved).toBe(0);
    expect(freshProduct.available).toBe(10);
    expect((await Cart.findOne({ user: checkout.body.data.order.user })).items).toHaveLength(1);
    expect((await Order.findById(orderId)).status).toBe('cancelled');
  });

  it('rejects invalid order transitions', async () => {
    const { user, token } = await createBuyer();
    const adminToken = await createAdmin();
    const product = await createProduct();
    await addToCart(token, product);
    const checkout = await startCheckout(token, 'idem-transition-1');

    await request(app).patch(`/api/orders/${checkout.body.data.order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' })
      .expect(409);

    expect((await Order.findById(checkout.body.data.order._id)).status).toBe('pending_payment');
    expect(user.email).toBe('buyer@example.com');
  });
});
