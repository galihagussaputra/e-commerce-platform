# Testing Report

Date: 2026-11-17
Repository: `/mnt/d/Projek/Github/e-commerce-platform`

## Environment

- Node `v24.15.0`, npm `11.12.1`.
- Docker Engine `29.7.2`, Docker Compose `v5.5.0`.
- On this WSL host, Node is exposed to the shell through `/tmp/opencode/nodebin`; commands below include the `PATH` prefix used locally. On a normal Node installation, omit it.
- MongoDB for tests is provided by `mongodb-memory-server`; Docker uses `mongo:8.0`.

## Automated tests

| Command | Result |
|---|---|
| `PATH="/tmp/opencode/nodebin:$PATH" npm test` in `backend` | 3 suites, 8 tests, all passed (~34s). |
| `PATH="/tmp/opencode/nodebin:$PATH" npm test` in `frontend` | 2 test files, 2 tests, all passed (~10s). |
| `PATH="/tmp/opencode/nodebin:$PATH" npm run build` in `frontend` | Vite 7.3.8 build succeeded; `dist/index.html` 0.62 kB, CSS 26.96 kB, JS 413.61 kB. |

Backend coverage includes:

- Register, login, bad credentials, missing tokens, RBAC denial, password omission.
- Product listing/search and guest cart sync with server-side totals.
- Checkout stock reservation, paid webhook finalization, duplicate webhook idempotency, cancellation/restock behavior, and invalid order transitions.

Frontend coverage includes:

- Cart slice quantity/removal behavior.
- Login form validation, login dispatch, cart sync, and navigation.

### Test compatibility note

Mongoose 9.12.2 uses MongoDB Node driver 7.6+, which dynamically imports the `os` adapter. Jest 30's VM runtime rejects that dynamic import, producing `Missing required sub-document 'driver' in the client metadata document`. `backend/tests/setup.js` passes `runtimeAdapters: { os }` to `mongoose.connect()` as a test-only shim. This does not affect production startup.

## Build and container verification

| Command / check | Result |
|---|---|
| `docker compose config -q` | Passed. |
| `docker compose up -d --build` | Both images built; containers recreated. |
| `docker compose ps` | `backend` healthy on `5000`, `frontend` healthy on `5173`, `mongodb` healthy. |
| `curl -fsS http://localhost:5000/api/health` | `{"success":true,"data":{"status":"ok","service":"backend",...}}`. |
| `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/` | `200`. |
| `docker compose exec -T backend npm run seed` | `Seed complete: 10 products, 4 categories`. |
| `GET /api/products?limit=100` | Returned 10 products after container rebuild. |

Docker healthchecks use `mongosh` for MongoDB, Node `fetch()` for the backend, and `wget` against `127.0.0.1:5173` for the frontend. The frontend healthcheck originally used `localhost`, which resolved to IPv6 and failed with `Connection refused`; it was changed to the IPv4 loopback address.

## Visual verification

Chrome headless screenshots were captured at 1440x1000 and inspected:

- `docs/screenshots/home.png`
- `docs/screenshots/catalog.png`
- `docs/screenshots/product.png`
- `docs/screenshots/cart.png`
- `docs/screenshots/login.png`

## Dependency audit

| Scope | Result |
|---|---|
| `npm audit --omit=dev` in `backend` | 0 vulnerabilities. |
| `npm audit --omit=dev` in `frontend` | 0 vulnerabilities. |
| Full `npm audit` in `backend` | 18 moderate advisories, all in Jest/glob/minimatch test tooling. |
| Full `npm audit` in `frontend` | 3 advisories (1 moderate, 2 critical) in Vitest, `@vitest/mocker`, and `tinypool` test tooling. |

Production dependencies were upgraded to patched, same-major versions: `mongoose@9.12.2`, `axios@1.21.1`, `postcss@8.5.33`, `vite@7.3.8`, `vitest@3.2.7`. Remaining dev-tool advisories require forced test-runner major changes and are not shipped in the production bundle.

## Limitations

- Live Stripe checkout and webhook delivery were not exercised because no real Stripe test keys/webhook secret were available. Session creation and webhook handlers are covered by mocked integration tests.
- Authenticated admin screenshots were not captured; admin routes, slices, and screens are covered by implementation review, build, and automated API tests.
- `frontend/src/pages/admin/AdminInventory.jsx` keys rows by `row.name`; duplicate product names could produce React key warnings.
- JWTs are stored in `localStorage`; a production deployment should prefer secure, HTTP-only cookies.
- On webhook payment-failure paths, inventory is released/restocked but the cart is not restored. User-initiated cancellation and Stripe session creation failure do restore the cart.

## Conclusion

Automated tests, production build, Docker build, container health, seeded data, API health, and key customer screens are verified. The stack is demo-ready with local development secrets; live payment verification remains the only external dependency.
