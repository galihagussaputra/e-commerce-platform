# Initial Repository Audit

Date: 2026-11-17
Repository: `e-commerce-platform` (branch `main`, HEAD `692119b`)
Audit method: full source inspection, `git status`, `git log`, dependency/lockfile review, and tooling check.

## 1. Executive summary

The repository is an early prototype, not a working application:

- The frontend is a Create React App skeleton with a placeholder `react-scripts@0.0.0`. `App.js` has **no `return` statement**, so the page is blank. Search is broken by a misspelled state variable and calling a setter as a function. There is no router, no Redux, no Tailwind configuration, no login UI, and no usable checkout.
- The backend has 12 endpoints, 3 Mongoose models and JWT issuance, but **no JWT verification anywhere**, no authorization, no cart, no inventory logic, no Stripe webhook, and two broken flows (login calls a method that was never registered; product create references an undefined variable).
- There is no Docker configuration, no `.env.example`, no backend tests, and the README documents files that do not exist.
- `backend/node_modules` is tracked in Git (~thousands of files) despite `backend/.gitignore`.

Git state at audit time: branch `main`, up to date with `origin/main`. All working-tree modifications were verified with `git diff --ignore-all-space` to be **line-ending-only (CRLF -> LF)**, with no substantive user edits. Those modifications are preserved; no files were reverted during the audit.

## 2. Existing architecture

| Layer | Current implementation |
|---|---|
| Frontend | CRA (`react-scripts@0.0.0`), React 19, Axios, two component files, no build possible |
| Backend | Express 5 single-process app, CommonJS, three route files, three Mongoose models, all logic inside route handlers |
| Database | MongoDB via Mongoose 9, default connection `mongodb://localhost:27017/ecommerce` |
| Auth | JWT signed on register/login, never verified; `bcryptjs` hashing hook exists; `comparePassword` registration is broken |
| Payment | Stripe PaymentIntent with an amount supplied by the client; no webhook or order linkage |
| Tests | One CRA default test that cannot pass (`react-scripts@0.0.0`, stale assertion) |
| DevOps | None (no Dockerfile, compose, CI, healthcheck) |

## 3. Current technology stack

**Frontend** (`frontend/package.json`): React 19.2.1, ReactDOM 19.2.1, `react-scripts@0.0.0` (placeholder), axios 1.13.2, lucide-react 0.555.0, `@stripe/react-stripe-js` 5.4.1, `@stripe/stripe-js` 8.5.3, testing-library packages. **No** Redux, React Router, Tailwind, Vite, or TypeScript.

**Backend** (`backend/package.json`): Express 5.2.1, Mongoose 9.0.0, bcryptjs 3.0.3, jsonwebtoken 9.0.2, cors 2.8.5, dotenv 17.2.3, Stripe 20.0.0, nodemon 3.1.11. **No** validator, helmet, rate limiter, or test framework.

**Runtime available for implementation**: Node v24.15.0 and npm 11.12.1 (Windows Node via WSL interop), Docker Engine 29.7.2, Docker Compose v5.5.0.

## 4. Existing features (as implemented)

- `GET /api/products`, `GET /api/products/:id` — basic reads.
- `POST/PUT/DELETE /api/products` — mutations exist but create is broken and all are unauthenticated.
- `POST /api/auth/register` works (hash + JWT); `POST /api/auth/login` throws before responding successfully.
- `POST /api/orders/create-payment-intent` — creates a Stripe PaymentIntent from an arbitrary client amount.
- `POST/GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status` — unvalidated, no ownership checks.
- Frontend has handler stubs for product fetch, cart quantity changes, wishlist toggle, and order creation, but none render.
- An unwired `StripeCheckout` component uses `@stripe/react-stripe-js` with a placeholder publishable key.
- Seed script for 8 products (first product is missing the required `description`, so seeding fails validation).

## 5. Missing features

Authentication UI/session management, logout, profile/address management, password change, role-based authorization, protected routes, cart API/persistence, catalog search/filter/sort/pagination on the server, product variants/images/categories model, checkout state machine, Stripe Checkout Session + signed webhook + idempotency, inventory/stock movements/reservations, order ownership/lifecycle/cancellation, admin dashboard and real analytics, coupons, responsive UI, design system, automated tests, Docker, env documentation, screenshots.

## 6. Technical debt

- Business logic lives directly in route handlers; no controllers/services/middleware/validators/config layers.
- Inconsistent error handling: every route catches locally, returns raw `error.message`, and uses arbitrary statuses.
- Mass assignment: `new Order({ ...req.body })`, `findByIdAndUpdate(id, req.body)`.
- Frontend API typo: `productAPI.delete` calls `/product/:id` (singular).
- `Product.id` vs Mongo `_id` mismatch collapses all cart items into one entry.
- `package.json` `main: index.js` points to a nonexistent file; obsolete Mongoose connection options remain.
- README describes a Vite/TypeScript architecture that does not exist; CRA boilerplate files remain.
- `node_modules` committed to Git; no lockfile-driven container builds possible yet.

## 7. Security findings

1. **Critical:** No authentication or authorization on products, orders, or status updates. Anyone can delete products or read all customers' shipping PII.
2. **Critical:** Login is broken: `userSchema.method.comparePassword` (singular) never registers a document method; login returns a 500.
3. **Critical:** Client-controlled PaymentIntent amount and order total; no server-side price calculation. Price manipulation is trivial.
4. **High:** Hardcoded JWT fallback secret `your-secret-key` allows token forgery if `JWT_SECRET` is unset.
5. **High:** No Stripe webhook/signature verification; frontend redirect would be treated as payment proof.
6. **High:** Wildcard CORS (`cors()`), no security headers, no rate limiting on auth routes.
7. **High:** Raw error messages leak MongoDB/Stripe internals; 500 on malformed ObjectId.
8. **Medium:** Status updates bypass enum validation (`runValidators` missing); order numbers are timestamp-based and collision-prone.
9. **Medium:** JWT in `localStorage` (frontend) is XSS-exposed; no token expiry/401 handling.
10. **Medium:** No password policy, no input validation, unbounded request values, negative stock allowed.
11. **Medium:** `.env` files exist on disk but are untracked as of HEAD `692119b`; no example files or rotation guidance. No real credential was found in tracked source.
12. **Low:** Placeholder Stripe key `pk_test_your_stripe_public_key` in local `frontend/.env`; must be replaced with a real test publishable key for live Stripe UI testing.

## 8. Migration recommendations and deviations

The target stack is achievable without discarding working features: keep the Express/Mongoose/Stripe/JWT foundation, but restructure it into routes → controllers → services → models with middleware/validators. The frontend cannot be repaired incrementally: `react-scripts@0.0.0` makes the existing build system unusable and the app renders nothing. Migrate to **Vite** (React) while retaining existing React/Axios/Stripe dependencies and adding Redux Toolkit, React Router and Tailwind. This is a documented deviation from the README's stale CRA description and is necessary because the existing tooling cannot run at all.

Stripe must move from PaymentIntent + CardElement to **Checkout Sessions + signed webhook** to satisfy the trusted-server-payment requirement; the existing Stripe SDK dependency is retained. Currency stays IDR because existing data/UI are Indonesian-rupiah based; amounts will be handled as integer minor units only where the currency requires it (IDR is zero-decimal).

`node_modules` will be untracked (not deleted from disk) so containers and lockfiles are reproducible. The working-tree line-ending normalization will be committed as-is rather than reverted, preserving the user's on-disk state.

## 9. Implementation priorities

1. Docker Compose (frontend/backend/mongodb), env examples, healthcheck, persistent volume.
2. Backend foundation: config, error handling, validation, JWT auth + RBAC, secure models/indexes.
3. Catalog server-side query support; cart, checkout and order services with server-computed totals.
4. Atomic inventory reservation/release and stock movement history.
5. Stripe Checkout Session + signature-verified idempotent webhook.
6. Admin analytics aggregations with real data.
7. Frontend Vite/Redux/Tailwind app, responsive customer + admin interfaces.
8. Tests, documentation, screenshots, final verification.
