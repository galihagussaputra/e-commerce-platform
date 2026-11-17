const request = require('supertest');

let mockSessionCounter = 0;

jest.mock('../../src/config/stripe', () => ({
  getStripe: jest.fn(() => ({
    checkout: {
      sessions: {
        create: jest.fn(async () => {
          mockSessionCounter += 1;
          return {
            id: `cs_test_expiry_${mockSessionCounter}`,
            url: `https://checkout.stripe.com/c/pay/expiry/${mockSessionCounter}`,
            payment_intent: `pi_test_expiry_${mockSessionCounter}`,
          };
        }),
      },
    },
    webhooks: { constructEvent: jest.fn() },
    refunds: { create: jest.fn(async () => ({ id: 're_test' })) },
  })),
}));

const { createApp } = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Order = require('../../src/models/Order');
const Product = require('../../src/models/Product');
const StockMovement = require('../../src/models/StockMovement');
const { expireStaleReservations } = require('../../src/services/order.service');
const {
  createBuyer,
  createCategory,
  createProduct,
  addToCart,
  startCheckout,
} = require('../helpers/factories');

const app = createApp();

const setupExpiredCheckout = async (key) => {
  const { user, token } = await createBuyer(app);
  const category = await createCategory('Expiry', 'expiry');
  const product = await createProduct(category);
  await addToCart(app, token, product, 2);
  const checkout = await startCheckout(app, token, key);
  const orderId = checkout.body.data.order._id;
  await Order.updateOne({ _id: orderId }, { $set: { reservationExpiresAt: new Date(Date.now() - 1000) } });
  return { user, token, product, orderId };
};

describe('reservation expiry', () => {
  it('automatically releases stale reservations and restores the cart', async () => {
    const { product, orderId } = await setupExpiredCheckout('idem-expiry-sweep');

    const released = await expireStaleReservations();

    expect(released).toBe(1);
    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
    expect((await Cart.findOne({})).items[0]).toMatchObject({ quantity: 2 });
    expect((await Order.findById(orderId)).status).toBe('cancelled');
    expect(await StockMovement.countDocuments({ order: orderId, type: 'release' })).toBe(1);
    expect(await expireStaleReservations()).toBe(0);
  });

  it('lazily expires a stale reservation when an idempotency key is reused', async () => {
    const { token, product, orderId } = await setupExpiredCheckout('idem-expiry-lazy');

    const retry = await request(app)
      .post('/api/checkout/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ idempotencyKey: 'idem-expiry-lazy' })
      .expect(201);

    expect(retry.body.data.order._id).not.toBe(orderId);
    expect((await Order.findById(orderId)).status).toBe('cancelled');
    expect((await Order.findById(retry.body.data.order._id)).status).toBe('pending_payment');
    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 2, available: 8 });
  });
});
