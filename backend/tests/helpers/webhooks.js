const paidSessionEvent = ({
  eventId = 'evt_paid',
  orderId,
  amountTotal,
  currency = 'idr',
  paymentIntent = 'pi_test_123',
  paymentStatus = 'paid',
}) => ({
  id: eventId,
  type: 'checkout.session.completed',
  data: {
    object: {
      payment_status: paymentStatus,
      payment_intent: paymentIntent,
      currency,
      ...(amountTotal !== undefined ? { amount_total: amountTotal } : {}),
      metadata: { orderId },
    },
  },
});

const asyncPaidEvent = ({ eventId = 'evt_async_paid', orderId, paymentIntent = 'pi_test_123' }) => ({
  id: eventId,
  type: 'checkout.session.async_payment_succeeded',
  data: {
    object: {
      payment_status: 'paid',
      payment_intent: paymentIntent,
      metadata: { orderId },
    },
  },
});

const expiredSessionEvent = ({ eventId = 'evt_expired', orderId }) => ({
  id: eventId,
  type: 'checkout.session.expired',
  data: { object: { metadata: { orderId } } },
});

const asyncPaymentFailedEvent = ({ eventId = 'evt_async_failed', orderId }) => ({
  id: eventId,
  type: 'checkout.session.async_payment_failed',
  data: { object: { metadata: { orderId } } },
});

const paymentIntentFailedEvent = ({ eventId = 'evt_intent_failed', paymentIntent = 'pi_test_123' }) => ({
  id: eventId,
  type: 'payment_intent.payment_failed',
  data: { object: { id: paymentIntent } },
});

module.exports = {
  paidSessionEvent,
  asyncPaidEvent,
  expiredSessionEvent,
  asyncPaymentFailedEvent,
  paymentIntentFailedEvent,
};
