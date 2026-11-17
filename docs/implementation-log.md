# Implementation Log

## Phase 1 — Audit (2026-11-17)

**Completed**
- Inspected full repository, git status/history/remotes, both package manifests and lockfiles, all source files, env files, README, and tooling availability.
- Verified all working-tree modifications are line-ending-only (`git diff --ignore-all-space` produced no output for all modified source files). No user edits were discarded.
- Confirmed Node v24.15.0/npm 11.12.1, Docker Engine 29.7.2 and Compose v5.5.0 are available.
- Wrote `docs/initial-audit.md` with architecture, stack, features, gaps, debt, security findings, migration decisions and priorities.

**Key decisions**
- Preserve Express/Mongoose/Stripe foundation; restructure into layered modules.
- Replace unusable CRA/`react-scripts@0.0.0` frontend with Vite + React + Redux Toolkit + React Router + Tailwind.
- Move Stripe from client-amount PaymentIntent to server-created Checkout Sessions with signed, idempotent webhooks.
- Untrack (do not delete) committed `backend/node_modules` for reproducible container builds.

**Tests executed:** none (audit only).
**Known limitations:** application cannot currently build or run; frontend renders nothing; login and product-create are broken.
**Remaining work:** all implementation phases.

## Phase 2 — Backend foundation and domain services

**Completed**
- Replaced non-existent `backend/index.js` entry with `backend/server.js` and layered `backend/src/...`.
- Added `config`, `database`, `stripe`, `helmet`, CORS, rate limits, validation, `AppError`, `asyncHandler`, and normalized error middleware.
- Implemented models and indexes for User, Category, Product, Cart, Order, Payment, StockMovement, WebhookEvent.
- Implemented auth with bcrypt hashing, JWT issuance/verification, profile/address management, RBAC, and safe user serialization.
- Implemented catalog service with search, category/slug resolution, price filters, sorting, pagination, featured products, and admin CRUD.
- Implemented cart service with populated lines, server-side subtotal, guest sync, and cart restoration.
- Implemented checkout service with address selection, cart validation, server-owned totals, idempotency, atomic stock reservation, and Stripe Checkout Session creation.
- Implemented payment webhook with raw-body signature verification, event-ID idempotency, order/payment finalization, and failure handling.
- Implemented inventory service with reserve/release/finalize/restock/adjust operations and append-only stock movements.
- Implemented order service with ownership checks, status enum transitions, cancellation, cart restore, reservation expiry cleanup, and timeline updates.
- Implemented real MongoDB aggregation analytics for summary, sales trend, top products, recent transactions, inventory value, and low stock.
- Added deterministic seed: 4 categories, 10 products, admin and customer accounts.

**Bugs fixed during verification**
- `backend/src/app.js` imported `../config` and `../middleware/...`; corrected to `./config` and `./middleware/...`.
- `backend/src/routes/auth.routes.js` address update lacked validation middleware; added `validator.address, validate`.
- `backend/src/models/User.js` `safeObject()` did not expose `id`; added `object.id = object._id.toString()`.
- Mongoose 9.12.2 deprecated `new: true` in update options; replaced with `returnDocument: 'after'` in product, auth, and inventory services.
- Mongoose 9.12.2 + Jest 30 dynamic-import incompatibility caused `Missing required sub-document 'driver' in the client metadata document`; test setup now passes `runtimeAdapters: { os }`.

## Phase 3 — Frontend application

**Completed**
- Migrated from broken CRA/`react-scripts@0.0.0` to Vite with React 19, Redux Toolkit, React Router 7, Tailwind CSS 3, and Axios.
- Removed stale CRA files: `App.js`, `App.css`, `App.test.js`, `index.js`, `reportWebVitals.js`, `setupTests.js`, `logo.svg`, `public/index.html`, `logo192.png`, `logo512.png`, `manifest.json`.
- Built shared Axios client with bearer token injection, 401 cleanup, normalized errors, and `data` envelope unwrapping.
- Implemented Redux slices/thunks for auth, products, cart, checkout, orders, and admin.
- Implemented reusable UI, customer layout, admin layout, loading/error/empty feedback, guards, and responsive styling.
- Implemented customer pages: home, catalog, product detail, cart, checkout, login, register, account, orders, order detail, not found.
- Implemented admin pages: dashboard, products, inventory, orders, analytics.
- Wired final route tree in `frontend/src/App.jsx` with protected customer routes and `/admin` RBAC routes.

**Bugs fixed during verification**
- Feature slices imported `../services/api`; changed to `../../services/api`.
- `AdminDashboard.jsx` imported `../features/admin/adminSlice` and `../components/ui/...`; changed to `../../...`.
- RTK rejected `builder.addCase` after `builder.addMatcher` in `ordersSlice.js` and `adminSlice.js`; reordered all `addCase` calls first.
- `adminSlice.updateUserRole.fulfilled` used only `user._id`; now accepts `user.id || user._id`.
- `AdminAnalytics.jsx` role dropdown used only `_id`; now accepts `id || _id`.
- `LoginPage` cart-sync test failed because no cart items existed; test now dispatches `setItems` before rendering.

## Phase 4 — Docker and environment

**Completed**
- Added root `.env.example`, `backend/.env.example`, `frontend/.env.example` with no real credentials.
- Added Compose stack: MongoDB 8 with persistent `mongodb_data`, backend, frontend, shared network, healthchecks, and dependency conditions.
- Verified `docker compose config -q` and full rebuild.
- Fixed frontend healthcheck `wget: can't connect to remote host: Connection refused` by using `http://127.0.0.1:5173/` instead of `localhost` (IPv6 resolution issue).
- Verified all three containers healthy and seeded database after rebuild.

## Phase 5 — Tests and documentation

**Completed**
- Added backend Jest integration tests for auth, catalog/cart, and checkout/webhook/inventory lifecycle.
- Added frontend Vitest tests for cart slice and login flow.
- Rewrote `README.md` with setup, scripts, env reference, Stripe webhook instructions, routes, screenshots, and docs links.
- Added `docs/architecture.md`, `docs/database-design.md`, `docs/api-documentation.md`, `docs/testing-report.md`.
- Captured and inspected screenshots: `home.png`, `catalog.png`, `product.png`, `cart.png`, `login.png`.
- Verified production dependency audits are clean after patching same-major versions.

## Phase 6 — Final verification

**Completed**
- Backend tests: 3 suites, 8 tests passed.
- Frontend tests: 2 files, 2 tests passed.
- Frontend production build: succeeded with Vite 7.3.8.
- Docker: config valid; images rebuilt; backend/frontend/mongodb healthy.
- API health: success JSON; frontend HTTP 200; seeded catalog returns 10 products.
- Final state: no commits made, no push performed, no feature branch created.
- Staged change remains: `backend/node_modules` untracked via `git rm --cached`; files remain on disk.

**Remaining limitations**
- Live Stripe checkout requires real test keys and webhook forwarding.
- Authenticated admin screenshots were not captured.
- Development-only npm audit advisories remain in Jest/Vitest toolchains.
- JWT `localStorage`, row-key warning risk in `AdminInventory.jsx`, and webhook-failure cart restoration are documented as follow-ups.
