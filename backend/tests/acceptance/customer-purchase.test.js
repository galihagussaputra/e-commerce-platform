const request = require('supertest');

let mockStripeEvent = null;
let mockSessionCounter = 0;

jest.mock('../../src/config/stripe', () => ({
  getStripe: jest.fn(() => ({
    checkout: {
      sessions: {
        create: jest.fn(async () => {
          mockSessionCounter += 1;
          return {
            id: `cs_acceptance_${mockSessionCounter}`,
            url: `https://checkout.stripe.com/c/pay/${mockSessionCounter}`,
            payment_intent: `pi_acceptance_${mockSessionCounter}`,
          };
        }),
      },
    },
    webhooks: { constructEvent: jest.fn(() => mockStripeEvent) },
    refunds: { create: jest.fn(async () => ({ id: 're_acceptance' })) },
  })),
}));

const { createApp } = require('../../src/app');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const StockMovement = require('../../src/models/StockMovement');
const { registerCustomer, createAdmin, createCategory, createProduct, startCheckout } = require('../helpers/factories');
const { paidSessionEvent } = require('../helpers/webhooks');

const app = createApp();

const sendWebhook = (event) => {
  mockStripeEvent = event;
  return request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', 'test-signature')
    .send(JSON.stringify(event));
};

describe('acceptance: customer purchase', () => {
  it('completes registration, catalog discovery, checkout, payment, and order history', async () => {
    const adminToken = await createAdmin(app);
    const category = await createCategory('Acceptance Audio', 'acceptance-audio');
    const product = await createProduct(category, {
      name: 'Acceptance Headphones',
      slug: 'acceptance-headphones',
    });
    const { token } = await registerCustomer(app, 'purchase@example.com');

    const catalog = await request(app)
      .get('/api/products?q=acceptance&category=acceptance-audio')
      .expect(200);
    expect(catalog.body.data.some((item) => item._id === product._id.toString())).toBe(true);

    await request(app)
      .post(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 })
      .expect(200);
    await request(app)
      .put(`/api/cart/items/${product._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 3 })
      .expect(200);

    const checkout = await startCheckout(app, token, 'idem-acceptance-purchase');
    const orderId = checkout.body.data.order._id;
    expect(await Product.findById(product._id)).toMatchObject({ reserved: 3, available: 7 });

    await sendWebhook(paidSessionEvent({
      eventId: 'evt_acceptance_purchase',
      orderId,
      amountTotal: checkout.body.data.order.total,
      paymentIntent: 'pi_acceptance_1',
    })).expect(200);

    expect((await Order.findById(orderId)).status).toBe('paid');
    expect(await Product.findById(product._id)).toMatchObject({ stock: 7, reserved: 0, available: 7 });
    expect(await StockMovement.countDocuments({ order: orderId, type: 'out' })).toBe(1);

    const history = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(history.body.data.some((order) => order._id === orderId)).toBe(true);

    const adminOrders = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminOrders.body.data.some((order) => order._id === orderId)).toBe(true);
  });
});
