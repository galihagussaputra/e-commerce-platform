const request = require('supertest');
const Stripe = require('stripe');

const { createApp } = require('../src/app');

const app = createApp();
const stripe = new Stripe('sk_test_dummy');
const webhookSecret = 'whsec_test';

const postWebhook = (payload, signature) => request(app)
  .post('/api/payments/webhook')
  .set('Content-Type', 'application/json')
  .set('Stripe-Signature', signature)
  .send(payload);

describe('Stripe webhook signature verification', () => {
  it('accepts a correctly signed raw body and ignores an unhandled event type', async () => {
    const event = {
      id: 'evt_signature_valid',
      object: 'event',
      type: 'customer.created',
      data: { object: { id: 'cus_test' } },
    };
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

    const response = await postWebhook(payload, signature).expect(200);
    expect(response.body.data).toMatchObject({
      duplicate: false,
      type: 'customer.created',
      handled: false,
    });
  });

  it('rejects an invalid signature before business logic runs', async () => {
    const payload = JSON.stringify({
      id: 'evt_signature_invalid',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { metadata: {} } },
    });

    const response = await postWebhook(payload, 't=1,v1=invalid').expect(400);
    expect(response.body.error.code).toBe('INVALID_SIGNATURE');
  });
});
