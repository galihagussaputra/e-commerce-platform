# Inventory Lifecycle

Date: 2026-11-17

## Stock model

Each product keeps three counters:

| Field | Meaning |
|---|---|
| `stock` | Physical units owned and available to sell. |
| `reserved` | Units held by unpaid orders. |
| `available` | `stock - reserved`, maintained atomically with `$inc`. |

Orders additionally carry `reservationState`:

| State | Meaning |
|---|---|
| `held` | Stock is reserved for a pending payment. |
| `released` | Reservation was released; stock is available again. |
| `finalized` | Reservation was converted into a completed sale. |

The unique compound index `{ user: 1, idempotencyKey: 1 }` makes checkout retries safe for a signed-in user. Payment provider identifiers use partial unique indexes that ignore empty strings.

## State transitions

```text
(no order)
    │ checkout creates order + reserves stock
    ▼
pending_payment / held
    ├── paid webhook ─────────────► paid / finalized
    ├── customer cancel ──────────► cancelled / released (+ cart restore)
    ├── session expired ──────────► cancelled / released
    ├── async payment failed ─────► cancelled / released
    └── stale reservation sweep ──► cancelled / released
```

Late events after finalization do not mutate stock again:

| Late event | Behavior |
|---|---|
| Paid event after expiry | Order and payment remain cancelled; Stripe payment is refunded. |
| Failure event after payment | Stock is not restocked twice; paid order and payment are refunded once. |
| Duplicate event ID | Acknowledged without side effects. |

## Checkout reservation

1. The frontend generates an idempotency key and sends the selected address.
2. `checkout.service` reuses a still-valid pending order for the same key, or lazily expires a stale one.
3. Inside a MongoDB transaction, the service atomically decrements `available`, increments `reserved`, writes a `STOCK_RESERVATION` movement, creates the order and payment, and clears the cart.
4. Stripe Checkout Session creation uses the order ID as the Stripe idempotency key.
5. If Stripe or the final database update fails, the transaction compensation releases the reservation and restores the cart.

## Webhook finalization

`POST /api/payments/webhook` verifies the raw body with `stripe-signature`, then claims the event through `WebhookEvent.status`.

- Paid events require matching amount and currency before finalization.
- A mismatched amount leaves the reservation held and records a failed event that can be retried.
- `checkout.session.expired`, `async_payment_failed`, and `payment_intent.payment_failed` release held inventory once.
- Paid-after-expiry and failure-after-paid paths are refunded through `refund.service` with Stripe refund idempotency.

## Cleanup

- On server startup, `expireStaleReservations()` processes expired reservations before accepting traffic.
- `startReservationCleanup()` repeats the sweep every 60 seconds.
- An idempotency-key retry also performs a lazy expiry check for its own pending order.

## Verification

- `backend/tests/transactions.test.js`: commit, rollback, and multi-item rollback.
- `backend/tests/lifecycle/reservation-expiry.test.js`: automatic and lazy expiry.
- `backend/tests/lifecycle/payment-lifecycle.test.js`: paid, mismatch/retry, expiry, refund, failure-after-paid, and Stripe failure compensation.
- `backend/tests/acceptance/payment-failure.test.js` and `concurrent-purchase.test.js`: failure idempotency and last-unit race.
- Docker verification confirmed `topologyType=ReplicaSetWithPrimary` and `supportsTransactions=true`.

## Remaining behavior

Refund paths restore stock but intentionally do not reconstruct an abandoned cart. User-initiated cancellation and Stripe session creation failure do restore cart items.
