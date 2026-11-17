# Acceptance Test Report

Date: 2026-11-17

Scope: end-to-end API workflow verification using the Jest integration harness. Tests use a single-node `MongoMemoryReplSet`, so multi-document transactions run in tests. Stripe calls are mocked except for raw-body signature verification, which uses the real Stripe SDK with a dummy secret.

## Workflow A — Customer purchase

`backend/tests/acceptance/customer-purchase.test.js`

Covered:

- Registration.
- Catalog discovery and product lookup.
- Authenticated checkout with server-calculated totals.
- Paid webhook finalization.
- Order history and order detail retrieval.

Result: passed.

## Workflow B — Payment failure

`backend/tests/acceptance/payment-failure.test.js`

Covered:

- `async_payment_failed` event.
- Order cancellation.
- Single stock reservation release.
- Duplicate failure events ignored.

Result: passed.

## Workflow C — Admin operations

`backend/tests/acceptance/admin-operations.test.js`

Covered:

- Admin product create/update.
- Category create/update.
- Inventory adjustment and movement history.
- Order status update.
- Analytics endpoints.
- RBAC enforcement for admin-only routes.

Result: passed.

## Workflow D — Concurrent purchase

`backend/tests/acceptance/concurrent-purchase.test.js`

Covered:

- Two buyers racing for the last unit.
- Atomic filtered availability update.
- One successful reservation, one rejection.
- Inventory never becomes negative.

Result: passed.

## Supporting lifecycle and security tests

- `backend/tests/lifecycle/payment-lifecycle.test.js`: six payment/expiry/refund/compensation cases; passed.
- `backend/tests/lifecycle/reservation-expiry.test.js`: automatic and lazy reservation expiry; passed.
- `backend/tests/transactions.test.js`: commit, rollback, and multi-item inventory rollback; passed.
- `backend/tests/security.test.js`: session invalidation, password-change invalidation, and draft-product hiding; passed.
- `backend/tests/stripe-signature.test.js`: signed and unsigned webhook requests; passed.

## Browser QA

Windows Chrome headless was available and was used against the running Docker stack. Fresh screenshots were captured at 1440x1000 for home, catalog, product detail, login, and cart, plus 390x844 for responsive home:

- `docs/screenshots/home-audit.png`
- `docs/screenshots/catalog-audit.png`
- `docs/screenshots/product-audit.png`
- `docs/screenshots/login-audit.png`
- `docs/screenshots/cart-audit.png`
- `docs/screenshots/home-mobile-audit.png`

HTTP checks also returned backend health JSON and frontend HTTP `200`. This model cannot visually inspect image pixels, so the screenshots are evidence of successful headless rendering and file output, not a substitute for human visual review. Authenticated/admin browser flows were not driven through the UI; their API behavior is covered by integration tests.

## External blockers

Live Stripe Checkout and webhook delivery require real Stripe test keys, a webhook secret, and `stripe listen --forward-to localhost:5000/api/payments/webhook`. No real keys were available, so this remains unverified outside mocks and local signature tests.

## Summary

All four defined acceptance workflows and all supporting lifecycle/security/transaction suites pass. The stack is functionally ready for local and portfolio demonstration; live Stripe and human visual QA remain the only external validation gaps.
