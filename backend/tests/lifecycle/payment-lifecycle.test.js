const request = require('supertest');

let mockStripeEvent = null;
let mockFailSessionCreate = false;
const mockRefundCalls = [];

jest.mock('../../src/config/stripe', () => ({
  getStripe: jest.fn(() => ({
    checkout: {
      sessions: {
        create: jest.fn(async () => {
          if (mockFailSessionCreate) throw Object.assign(new Error('Stripe unavailable'), { statusCode: 400 });
          return {
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/c/pay/test',
            payment_intent: 'pi_test_123',
          };
        }),
      },
    },
    webhooks: {
      constructEvent: jest.fn(() => mockStripeEvent),
    },
    refunds: {
      create: jest.fn(async (...args) => {
        mockRefundCalls.push(args);
        return { id: 're_test_123' };
      }),
    },
  })),
}));

const { createApp } = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Order = require('../../src/models/Order');
const Payment = require('../../src/models/Payment');
const Product = require('../../src/models/Product');
const StockMovement = require('../../src/models/StockMovement');
const WebhookEvent = require('../../src/models/WebhookEvent');
const {
  createBuyer,
  createCategory,
  createProduct,
  addToCart,
  startCheckout,
} = require('../helpers/factories');
const {
  paidSessionEvent,
  expiredSessionEvent,
  paymentIntentFailedEvent,
} = require('../helpers/webhooks');

const app = createApp();

const setupCheckout = async (key = 'idem-lifecycle') => {
  const { user, token } = await createBuyer(app);
  const category = await createCategory('Lifecycle', 'lifecycle');
  const product = await createProduct(category);
  await addToCart(app, token, product, 2);
  const checkout = await startCheckout(app, token, key);
  return {
    user,
    token,
    product,
    orderId: checkout.body.data.order._id,
    total: checkout.body.data.order.total,
  };
};

const sendWebhook = (event) => {
  mockStripeEvent = event;
  return request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', 'test-signature')
    .send(JSON.stringify(event));
};

describe('inventory and payment lifecycle', () => {
  beforeEach(() => {
    mockStripeEvent = null;
    mockFailSessionCreate = false;
    mockRefundCalls.length = 0;
  });

  it('persists shipping and finalizes a paid webhook with a matching amount', async () => {
    const { product, orderId, total } = await setupCheckout('idem-paid-amount');
    const orderBefore = await Order.findById(orderId);
    expect(orderBefore.shippingFee).toBe(25000);
    expect(total).toBe(3025000);

    const response = await sendWebhook(paidSessionEvent({
      eventId: 'evt_paid_amount',
      orderId,
      amountTotal: total,
    })).expect(200);

    expect(response.body.data.handled).toBe(true);
    expect(await Product.findById(product._id)).toMatchObject({ stock: 8, reserved: 0, available: 8 });
    expect((await Order.findById(orderId)).status).toBe('paid');
    expect((await Payment.findOne({ order: orderId })).status).toBe('paid');
    expect(await WebhookEvent.findOne({ eventId: 'evt_paid_amount' })).toMatchObject({
      status: 'processed',
      handled: true,
    });
  });

  it('rejects a mismatched paid amount, leaves stock reserved, and allows retry of the failed event', async () => {
    const { product, orderId, total } = await setupCheckout('idem-amount-mismatch');

    await sendWebhook(paidSessionEvent({
      eventId: 'evt_amount_retry',
      orderId,
      amountTotal: total - 1,
    })).expect(409);

    expect((await Order.findById(orderId)).status).toBe('pending_payment');
    expect(await Product.findById(product._id)).toMatchObject({ reserved: 2, available: 8 });
    expect(await WebhookEvent.findOne({ eventId: 'evt_amount_retry' })).toMatchObject({ status: 'failed' });

    await sendWebhook(paidSessionEvent({
      eventId: 'evt_amount_retry',
      orderId,
      amountTotal: total,
    })).expect(200);

    expect((await Order.findById(orderId)).status).toBe('paid');
    expect(await Product.findById(product._id)).toMatchObject({ stock: 8, reserved: 0, available: 8 });
  });

  it('releases an expired reservation once and ignores a duplicate expiry event', async () => {
    const { product, orderId } = await setupCheckout('idem-expired');
    const event = expiredSessionEvent({ eventId: 'evt_expired_once', orderId });

    const first = await sendWebhook(event).expect(200);
    expect(first.body.data.handled).toBe(true);

    const duplicate = await sendWebhook(event).expect(200);
    expect(duplicate.body.data.duplicate).toBe(true);

    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
    expect(await StockMovement.countDocuments({ order: orderId, type: 'release' })).toBe(1);
    expect((await Order.findById(orderId)).status).toBe('cancelled');
    expect((await Payment.findOne({ order: orderId })).status).toBe('failed');
  });

  it('refunds a late paid webhook after expiry without double-restoring stock', async () => {
    const { product, orderId, total } = await setupCheckout('idem-late-paid');
    await sendWebhook(expiredSessionEvent({
      eventId: 'evt_late_expired',
      orderId,
    })).expect(200);

    const latePaid = await sendWebhook(paidSessionEvent({
      eventId: 'evt_late_paid',
      orderId,
      amountTotal: total,
      paymentIntent: 'pi_test_123',
    })).expect(200);

    expect(latePaid.body.data.handled).toBe(true);
    expect(mockRefundCalls).toHaveLength(1);
    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
    expect((await Order.findById(orderId)).paymentStatus).toBe('refunded');
    expect((await Payment.findOne({ order: orderId })).status).toBe('refunded');

    await sendWebhook(paidSessionEvent({
      eventId: 'evt_late_paid_again',
      orderId,
      amountTotal: total,
    })).expect(200);
    expect(mockRefundCalls).toHaveLength(1);
  });

  it('refunds and restocks a paid order once after a late payment-failure event', async () => {
    const { product, orderId, total } = await setupCheckout('idem-paid-fail');
    await sendWebhook(paidSessionEvent({
      eventId: 'evt_before_fail',
      orderId,
      amountTotal: total,
    })).expect(200);
    expect(await Product.findById(product._id)).toMatchObject({ stock: 8, reserved: 0, available: 8 });

    await sendWebhook(paymentIntentFailedEvent({
      eventId: 'evt_paid_fail',
      paymentIntent: 'pi_test_123',
    })).expect(200);

    expect(mockRefundCalls).toHaveLength(1);
    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
    expect((await Order.findById(orderId)).status).toBe('cancelled');
    expect((await Payment.findOne({ order: orderId })).status).toBe('refunded');

    await sendWebhook(paymentIntentFailedEvent({
      eventId: 'evt_paid_fail_duplicate',
      paymentIntent: 'pi_test_123',
    })).expect(200);
    expect(mockRefundCalls).toHaveLength(1);
    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
  });

  it('releases inventory and restores the cart when Stripe session creation fails', async () => {
    const { token, product } = await createBuyer(app).then(async ({ user, token }) => {
      const category = await createCategory('Failure', 'failure');
      const createdProduct = await createProduct(category);
      await addToCart(app, token, createdProduct, 2);
      return { token, product: createdProduct };
    });
    mockFailSessionCreate = true;

    const response = await request(app)
      .post('/api/checkout/session')
      .set('Authorization', `Bearer ${token}`)
      .send({ idempotencyKey: 'idem-stripe-fail' })
      .expect(502);

    expect(response.body.data).toBeUndefined();
    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
    expect((await Cart.findOne({})).items[0]).toMatchObject({ quantity: 2 });
    expect((await Order.findOne({})).status).toBe('cancelled');
    expect((await Payment.findOne({})).status).toBe('failed');
  });
});
