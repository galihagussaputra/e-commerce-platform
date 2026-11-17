const request = require('supertest');

let mockSessionCounter = 0;

jest.mock('../../src/config/stripe', () => ({
  getStripe: jest.fn(() => ({
    checkout: {
      sessions: {
        create: jest.fn(async () => {
          mockSessionCounter += 1;
          return {
            id: `cs_concurrent_${mockSessionCounter}`,
            url: `https://checkout.stripe.com/c/pay/concurrent/${mockSessionCounter}`,
            payment_intent: `pi_concurrent_${mockSessionCounter}`,
          };
        }),
      },
    },
    webhooks: { constructEvent: jest.fn() },
    refunds: { create: jest.fn(async () => ({ id: 're_concurrent' })) },
  })),
}));

const { createApp } = require('../../src/app');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const StockMovement = require('../../src/models/StockMovement');
const { createBuyer, createCategory, createProduct, addToCart } = require('../helpers/factories');

const app = createApp();

const attemptCheckout = (token, key) => request(app)
  .post('/api/checkout/session')
  .set('Authorization', `Bearer ${token}`)
  .send({ idempotencyKey: key });

describe('acceptance: concurrent purchase', () => {
  it('reserves the last unit for only one buyer without negative inventory', async () => {
    const firstBuyer = await createBuyer(app, 'buyer-one@example.com');
    const secondBuyer = await createBuyer(app, 'buyer-two@example.com');
    const category = await createCategory('Concurrent', 'concurrent');
    const product = await createProduct(category, {
      name: 'Last Unit',
      slug: 'last-unit',
      stock: 1,
      available: 1,
    });

    await addToCart(app, firstBuyer.token, product, 1);
    await addToCart(app, secondBuyer.token, product, 1);

    const results = await Promise.allSettled([
      attemptCheckout(firstBuyer.token, 'idem-concurrent-one'),
      attemptCheckout(secondBuyer.token, 'idem-concurrent-two'),
    ]);

    const responses = results.map((result) => {
      if (result.status === 'fulfilled') return result.value;
      throw result.reason;
    });
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);

    const failed = responses.find((response) => response.status === 409);
    expect(failed.body.error.code).toBe('OUT_OF_STOCK');

    expect(await Product.findById(product._id)).toMatchObject({ stock: 1, reserved: 1, available: 0 });
    expect(await Order.countDocuments()).toBe(1);
    expect(await StockMovement.countDocuments({ type: 'reserve' })).toBe(1);
    expect((await Order.findOne()).status).toBe('pending_payment');
  });
});
