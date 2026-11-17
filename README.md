# E-Commerce Platform

A full-stack storefront and admin console built from the existing repository into a working, containerized application.

## Features

- Customer storefront: responsive catalog, search, category/price filters, sorting, pagination, product detail, featured products.
- Cart: guest cart in Redux, server-side cart for authenticated users, guest cart sync on login, server-calculated totals.
- Accounts: registration, login, profile, password change, multiple addresses, JWT session restore, 401 handling.
- Checkout: authenticated Stripe Checkout Sessions, server-owned prices, stock reservation, order lifecycle, cancellation, order history.
- Admin: role-protected console for products, categories, inventory adjustments and movements, low-stock monitoring, orders, status updates, and Mongo aggregation analytics.
- Platform: Docker Compose stack with MongoDB single-node replica set, healthchecks, persistent volume, validation, rate limits, Helmet, CORS, structured errors, signed and idempotent Stripe webhook, transaction-backed inventory changes.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite, React 19, React Router 7, Redux Toolkit, Tailwind CSS, Axios, Vitest |
| Backend | Node.js 20+, Express 5, Mongoose 9, express-validator, JWT, bcryptjs, Stripe 20, Jest |
| Database | MongoDB 8 |
| DevOps | Docker Engine, Docker Compose v5 |

## Architecture

```text
Browser (React SPA)
  │ Axios /api + Bearer JWT
  ▼
Vite dev server / static build
  │ /api proxy in local dev
  ▼
Express API
  routes → validators → auth/RBAC → controllers → services → models
  │                         │
  │                         ├── MongoDB 8 replica set rs0
  │                         │   catalog, users, carts, orders, payments,
  │                         │   inventory, webhook events, transactions
  │                         └── Stripe
  │                             Checkout Sessions + signed webhooks
  ▼
Docker Compose: frontend (5173) + backend (5000) + mongodb + mongo-init
```

MongoDB runs as a single-node replica set so multi-document transactions work in local and demo environments. `mongo-init` is idempotent: it initiates `rs0` on first boot and exits successfully on later boots. The backend starts only after the replica set is writable. A standalone MongoDB connection still works, but multi-document transactions are skipped.

## Quick start with Docker

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit the copied files. Set a long random `JWT_SECRET`; Stripe values can stay blank until payment testing.

```bash
docker compose up -d --build
docker compose exec -T backend npm run seed
```

Open:

- Storefront: `http://localhost:5173`
- API health: `http://localhost:5000/api/health`
- Seeded admin: `admin@example.com` / `admin12345` (development default when `ADMIN_SEED_PASSWORD` is unset)
- Seeded customer: `customer@example.com` / `Demo12345`

Set a strong `JWT_SECRET` and `ADMIN_SEED_PASSWORD` before any non-local deployment. Production seeding refuses missing, weak, or default admin passwords and skips the demo customer.

## Local development without Docker

Requirements: Node >= 20.19, npm, and MongoDB on `mongodb://localhost:27017/ecommerce`. For transactions, run MongoDB as a replica set (for example `rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })`) and use `mongodb://localhost:27017/ecommerce?replicaSet=rs0`.

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The Vite dev server proxies `/api` to `VITE_API_PROXY_TARGET` (`http://localhost:5000` by default).

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `JWT_SECRET` | backend | Signs access tokens; required outside tests. |
| `JWT_EXPIRES_IN` | backend | Token lifetime; defaults to `1d` (tests override). |
| `TRUST_PROXY` | backend | `false`, hop count, or trusted subnet/IP for Express proxy handling. |
| `MONGODB_URI` | backend | MongoDB connection string; include `replicaSet=rs0` when using the Compose stack. |
| `PORT` | backend | API port; defaults to `5000`. |
| `STRIPE_SECRET_KEY` | backend | Creates Checkout Sessions; `sk_test_...` only. |
| `STRIPE_WEBHOOK_SECRET` | backend | Verifies webhook signatures; `whsec_...`. |
| `STRIPE_PUBLISHABLE_KEY` | frontend | Browser Stripe key; `pk_test_...`. |
| `CLIENT_URL` / `CORS_ORIGIN` | backend | Redirect target and allowed browser origin. |
| `SHIPPING_FEE` / `TAX_RATE` | backend | Server-side order totals. |
| `RESERVATION_MINUTES` | backend | Pending-payment stock reservation window. |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | backend seed | Bootstrap admin account. |
| `VITE_API_URL` | frontend | API base path; `/api` behind Vite proxy. |
| `VITE_API_PROXY_TARGET` | frontend | Dev-only proxy target. |

Do not commit real credentials. `.env` files are ignored; only `*.env.example` files are tracked.

## Stripe webhook testing

1. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
2. Start the stack with `docker compose up -d --build`.
3. Run `stripe listen --forward-to localhost:5000/api/payments/webhook`.
4. Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the backend.
5. Complete checkout with a Stripe test card.

Checkout creation fails clearly when Stripe is not configured. Signed webhooks are verified with the raw request body, and duplicate events are ignored through `WebhookEvent`.

## Scripts

| Location | Command | Purpose |
|---|---|---|
| `backend` | `npm start` | Start API. |
| `backend` | `npm run dev` | Start API with nodemon. |
| `backend` | `npm run seed` | Seed categories, products, admin, and customer. |
| `backend` | `npm test` | Run Jest integration tests with in-memory MongoDB replica set. |
| `frontend` | `npm run dev` | Start Vite dev server. |
| `frontend` | `npm run build` | Build production bundle. |
| `frontend` | `npm test` | Run Vitest unit/component tests. |
| root | `docker compose up -d --build` | Run the full stack. |

## Project structure

```text
backend/src/
├── config/          environment, database, Stripe
├── controllers/     HTTP adapters
├── middleware/      auth, RBAC, validation, rate limits, errors
├── models/          Mongoose schemas
├── routes/          /api route definitions
├── services/        catalog, cart, checkout, payment, inventory, order, analytics
├── utils/           response, money, AppError, asyncHandler
└── seed/            deterministic development data
frontend/src/
├── components/      layout and reusable UI
├── features/        Redux slices and thunks
├── pages/           customer and admin screens
├── routes/          protected/admin route guards
├── services/        Axios client and API modules
└── store/           Redux store configuration
docs/                audit, design docs, API reference, test report, screenshots
```

## Verification

```bash
cd backend && npm test
cd frontend && npm test && npm run build
docker compose config -q
docker compose up -d --build
docker compose ps
docker compose exec -T mongodb mongosh --quiet --eval 'db.hello()'
curl -fsS http://localhost:5000/api/health
```

Current production-dependency audits are clean (`npm audit --omit=dev`). Remaining advisories are dev-toolchain-only (Jest and Vitest transitive packages) and are recorded in `docs/testing-report.md`.

## Screenshots

![Home](docs/screenshots/home-audit.png)

![Catalog](docs/screenshots/catalog-audit.png)

![Product detail](docs/screenshots/product-audit.png)

![Cart](docs/screenshots/cart-audit.png)

![Login](docs/screenshots/login-audit.png)

![Home mobile](docs/screenshots/home-mobile-audit.png)

## Admin Dashboard Screenshots

Authenticated admin screens driven through Chrome DevTools Protocol against the running Docker stack:

| Area | Desktop | Responsive |
|---|---|---|
| Overview | ![Admin overview](docs/screenshots/admin/admin-dashboard.png) | ![Admin overview mobile](docs/screenshots/admin/admin-dashboard-mobile.png) |
| Products | ![Admin products](docs/screenshots/admin/admin-products.png) | ![Admin products mobile](docs/screenshots/admin/admin-products-mobile.png) |
| Product form | ![Admin product form](docs/screenshots/admin/admin-product-form.png) | — |
| Inventory | ![Admin inventory](docs/screenshots/admin/admin-inventory.png) | ![Admin inventory mobile](docs/screenshots/admin/admin-inventory-mobile.png) |
| Stock movements | ![Admin stock movements](docs/screenshots/admin/admin-inventory-movements.png) | — |
| Orders | ![Admin orders](docs/screenshots/admin/admin-orders.png) | ![Admin orders mobile](docs/screenshots/admin/admin-orders-mobile.png) |
| Order detail | ![Admin order detail](docs/screenshots/admin/admin-order-detail.png) | — |
| Analytics & reports | ![Admin analytics](docs/screenshots/admin/admin-analytics.png) | — |

There is no dedicated category-management page; categories are exposed through the product form. Full QA evidence is in `docs/admin-visual-qa.md`.

## Documentation

- `docs/initial-audit.md`
- `docs/architecture.md`
- `docs/database-design.md`
- `docs/api-documentation.md`
- `docs/testing-report.md`
- `docs/implementation-log.md`
- `docs/inventory-lifecycle.md`
- `docs/security-review.md`
- `docs/acceptance-test-report.md`
