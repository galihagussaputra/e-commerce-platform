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
            id: `cs_admin_${mockSessionCounter}`,
            url: `https://checkout.stripe.com/c/pay/admin/${mockSessionCounter}`,
            payment_intent: `pi_admin_${mockSessionCounter}`,
          };
        }),
      },
    },
    webhooks: { constructEvent: jest.fn(() => mockStripeEvent) },
    refunds: { create: jest.fn(async () => ({ id: 're_admin' })) },
  })),
}));

const { createApp } = require('../../src/app');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const StockMovement = require('../../src/models/StockMovement');
const { createBuyer, createAdmin, addToCart, startCheckout } = require('../helpers/factories');
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

describe('acceptance: administrative operations', () => {
  it('exercises admin product, inventory, order, and analytics workflows with RBAC', async () => {
    const adminToken = await createAdmin(app);
    const { token: customerToken } = await createBuyer(app);

    const categoryResponse = await request(app)
      .post('/api/products/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Category', slug: 'admin-category' })
      .expect(201);

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Admin Product',
        description: 'Created by the admin acceptance test.',
        price: 500000,
        category: categoryResponse.body.data._id,
        stock: 10,
        images: ['https://example.com/admin-product.jpg'],
      })
      .expect(201);
    const productId = created.body.data._id;

    await request(app)
      .put(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 600000 })
      .expect(200);
    expect((await Product.findById(productId)).price).toBe(600000);

    await request(app)
      .post(`/api/admin/inventory/adjust/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 5, reason: 'Acceptance restock' })
      .expect(200);
    expect(await Product.findById(productId)).toMatchObject({ stock: 15, available: 15 });

    const movements = await request(app)
      .get('/api/admin/inventory/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(movements.body.data.some((move) => move.type === 'adjustment')).toBe(true);

    const product = await Product.findById(productId);
    await addToCart(app, customerToken, product, 1);
    const checkout = await startCheckout(app, customerToken, 'idem-admin-acceptance');
    const orderId = checkout.body.data.order._id;
    await sendWebhook(paidSessionEvent({
      eventId: 'evt_admin_acceptance',
      orderId,
      amountTotal: checkout.body.data.order.total,
      paymentIntent: 'pi_admin_1',
    })).expect(200);

    const orders = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(orders.body.data.some((order) => order._id === orderId)).toBe(true);

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processing', note: 'Accepted for fulfillment' })
      .expect(200);
    expect((await Order.findById(orderId)).status).toBe('processing');

    const summary = await request(app)
      .get('/api/admin/analytics/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(summary.body.data.totalRevenue).toBeGreaterThan(0);

    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Forbidden',
        description: 'Customer should not create products.',
        price: 1000,
        category: categoryResponse.body.data._id,
      })
      .expect(403);
    expect(await StockMovement.countDocuments({ type: 'adjustment' })).toBe(1);
  });
});
