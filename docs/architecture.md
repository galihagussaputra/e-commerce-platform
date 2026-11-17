# Architecture

## Overview

```text
Browser (React SPA)
  │  Axios /api + Bearer JWT
  ▼
Vite dev server or static build
  │  /api proxy in local dev
  ▼
Express API
  routes → validators → auth/RBAC → controllers → services → models
  │
  ├── MongoDB (catalog, users, carts, orders, payments, inventory, webhook events)
  └── Stripe (Checkout Sessions, signed webhooks)
```

The frontend never calculates trusted order totals. It sends product IDs and quantities; the backend reloads prices, computes subtotal/shipping/tax, creates the order, reserves stock, and redirects the browser to Stripe-hosted checkout.

## Backend layers

- `routes`: endpoint definitions and middleware composition only.
- `validators`: `express-validator` chains for params, query, and body.
- `middleware`: JWT `protect`, `requireAdmin`, validation result handling, rate limits, error normalization.
- `controllers`: thin HTTP adapters using `utils/apiResponse`.
- `services`: all business logic, including transactions and external provider calls.
- `models`: schemas, indexes, hooks, and serialization helpers.
- `config`: environment parsing, database connection, Stripe client.
- `utils`: `AppError`, `asyncHandler`, money helpers, response helpers.

All API responses use `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

## Authentication and authorization

- Passwords are hashed with bcryptjs cost 12 and excluded from queries by `select: false`.
- JWTs are signed with `JWT_SECRET` and expire according to `JWT_EXPIRES_IN`.
- `User.safeObject()` removes `password` and exposes `id` alongside `_id`.
- `protect` verifies the bearer token and loads the user; `requireAdmin` enforces `role === 'admin'`.
- Admin-only route groups: product/category mutations, user listing/role changes, order status changes, analytics, and inventory adjustments.
- The frontend stores the token in `localStorage`, removes it on 401, and restores the session via `GET /api/auth/me` on startup.

## Checkout sequence

1. User selects a shipping address and submits checkout with an optional `idempotencyKey`.
2. `checkout.service` validates the address, cart, product availability, and existing idempotency key.
3. Inside a MongoDB transaction, stock is reserved (`available--`, `reserved++`), the order is created as `pending_payment`, stock movements are recorded, and the cart is cleared.
4. A Stripe Checkout Session is created with server-generated line items and order metadata.
5. A `Payment` record stores the session URL, provider IDs, amount, and status; the order becomes `paymentStatus: pending`.
6. If Stripe session creation fails, stock is released, the order is cancelled, and the error is returned.
7. The browser redirects to Stripe's hosted checkout URL.

## Webhook sequence

`POST /api/payments/webhook` uses the raw JSON body and verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET`.

- `checkout.session.completed` / paid intents finalize the order: stock temporarily reserved becomes an actual sale, order status becomes `paid`, and the payment record becomes `paid`.
- Payment failure paths release or restock reserved inventory and mark the payment failed.
- Event IDs are stored in `WebhookEvent`; duplicate deliveries are acknowledged without mutating state again.
- This endpoint is registered before `express.json()` so the signature sees untouched bytes.

## Inventory model

Each product tracks:

- `stock`: physical units on hand.
- `reserved`: units held for pending checkouts.
- `available`: `stock - reserved`, maintained atomically with `$inc`.

Reservation checks use a filtered `findOneAndUpdate` so concurrent checkouts cannot oversell. Stock movements are append-only records with type, quantity, reason, order/user references, and resulting balance.

A server-side cleanup task runs every 60 seconds and cancels pending orders whose `reservationExpiresAt` has passed; cancellation releases or restocks inventory and restores the cart for user-initiated cancels.

## Analytics

Admin analytics are computed with MongoDB aggregations over real order/payment/product data: revenue and order counts, AOV, sales trend, top products, recent transactions, inventory valuation, and low-stock reporting. No placeholder statistics remain.

## Security decisions

- Helmet security headers, explicit CORS origin, disabled `x-powered-by`.
- API and auth-specific rate limits.
- Trusted server-side pricing, signed webhooks, transaction-backed stock mutations.
- Validated Mongo IDs, schema enums, unique indexes, and normalized duplicate-key errors.
- Raw internal errors are hidden when `NODE_ENV=production`.

## Known production hardening items

- Move JWT storage from `localStorage` to secure, HTTP-only cookies for stronger XSS resistance.
- Add persistent idempotency/queueing for webhook processing under high concurrency.
- Add CI, observability, backup/restore procedures, and secret management.
- Replace development seed passwords and default Compose secrets before deployment.
