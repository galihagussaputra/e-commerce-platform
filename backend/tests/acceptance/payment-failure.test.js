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
            id: `cs_failure_${mockSessionCounter}`,
            url: `https://checkout.stripe.com/c/pay/failure/${mockSessionCounter}`,
            payment_intent: 'pi_failure_acceptance',
          };
        }),
      },
    },
    webhooks: { constructEvent: jest.fn(() => mockStripeEvent) },
    refunds: { create: jest.fn(async () => ({ id: 're_failure' })) },
  })),
}));

const { createApp } = require('../../src/app');
const Cart = require('../../src/models/Cart');
const Order = require('../../src/models/Order');
const Payment = require('../../src/models/Payment');
const Product = require('../../src/models/Product');
const StockMovement = require('../../src/models/StockMovement');
const { createBuyer, createCategory, createProduct, addToCart, startCheckout } = require('../helpers/factories');
const { paymentIntentFailedEvent } = require('../helpers/webhooks');

const app = createApp();

const sendWebhook = (event) => {
  mockStripeEvent = event;
  return request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', 'test-signature')
    .send(JSON.stringify(event));
};

describe('acceptance: payment failure', () => {
  it('cancels the order, releases stock once, and ignores repeated failure events', async () => {
    const { user, token } = await createBuyer(app);
    const category = await createCategory('Failure Audio', 'failure-audio');
    const product = await createProduct(category, {
      name: 'Failure Headphones',
      slug: 'failure-headphones',
    });
    await addToCart(app, token, product, 2);
    const checkout = await startCheckout(app, token, 'idem-acceptance-failure');
    const orderId = checkout.body.data.order._id;

    const failed = await sendWebhook(paymentIntentFailedEvent({
      eventId: 'evt_failure_first',
      paymentIntent: 'pi_failure_acceptance',
    })).expect(200);
    expect(failed.body.data.handled).toBe(true);

    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
    expect((await Order.findById(orderId)).status).toBe('cancelled');
    expect((await Payment.findOne({ order: orderId })).status).toBe('failed');
    expect((await Cart.findOne({ user: user._id })).items[0]).toMatchObject({ quantity: 2 });

    await sendWebhook(paymentIntentFailedEvent({
      eventId: 'evt_failure_duplicate',
      paymentIntent: 'pi_failure_acceptance',
    })).expect(200);

    expect(await StockMovement.countDocuments({ order: orderId, type: 'release' })).toBe(1);
    expect(await Product.findById(product._id)).toMatchObject({ stock: 10, reserved: 0, available: 10 });
  });
});
