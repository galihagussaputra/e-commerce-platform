# Testing Report

Date: 2026-11-17
Repository: `/mnt/d/Projek/Github/e-commerce-platform`

## Environment

- Node `v24.15.0`, npm `11.12.1`.
- Docker Engine `29.7.2`, Docker Compose `v5.5.0`.
- On this WSL host, Node is exposed to the shell through `/tmp/opencode/nodebin`; commands below include the `PATH` prefix used locally. On a normal Node installation, omit it.
- Backend tests use `mongodb-memory-server` with `MongoMemoryReplSet` so transactions are exercised, not skipped.
- Docker uses `mongo:8.0` started as single-node replica set `rs0` by `docker/mongo-replica-init.sh`.

## Automated tests

| Command | Result |
|---|---|
| `PATH="/tmp/opencode/nodebin:$PATH" npm test` in `backend` | 12 suites, 28 tests, all passed (~94s). |
| `PATH="/tmp/opencode/nodebin:$PATH" npm test` in `frontend` | 2 test files, 2 tests, all passed (~8s). |
| `PATH="/tmp/opencode/nodebin:$PATH" npm run build` in `frontend` | Vite 7.3.8 build succeeded; `dist/index.html` 0.62 kB, CSS 26.96 kB, JS 414.69 kB. |
| `git diff --check` | Passed. |

### Backend coverage

- Auth: registration, login, bad credentials, missing tokens, RBAC denial, password omission.
- Security: server-side logout invalidation, password-change invalidation, public `status=all` draft hiding.
- Transactions: topology detection, commit, rollback, and multi-item inventory rollback.
- Lifecycle: paid webhook, amount mismatch/retry, expiry, duplicate events, refunds, failure-after-paid, Stripe session failure compensation.
- Acceptance: customer purchase, payment failure, admin operations, concurrent last-unit purchase.
- Stripe: valid signature accepted with real SDK/dummy secret, invalid signature rejected before business logic.
- Existing catalog/cart and checkout/webhook suites.

### Frontend coverage

- Cart slice quantity/removal behavior.
- Login form validation, login dispatch, cart sync, and navigation.
- Production build after session-expired handler, global reset, and form/error-handling fixes.

### Test compatibility note

Mongoose 9.12.2 uses MongoDB Node driver 7.6+, which dynamically imports the `os` adapter. Jest 30's VM runtime rejects that dynamic import, producing `Missing required sub-document 'driver' in the client metadata document`. `backend/tests/setup.js` passes `runtimeAdapters: { os }` to `mongoose.connect()` as a test-only shim. This does not affect production startup.

## Build and container verification

| Command / check | Result |
|---|---|
| `docker compose config -q` | Passed. |
| `docker compose up -d --build --remove-orphans` | Images rebuilt; stack recreated. |
| `docker compose ps` | `backend`, `frontend`, and `mongodb` healthy. |
| `docker compose exec -T mongodb mongosh --eval 'db.hello()'` | `isWritablePrimary: true`, `setName: rs0`, host `mongodb:27017`. |
| Backend topology probe | `topologyType=ReplicaSetWithPrimary`, `supportsTransactions=true`. |
| `curl -fsS http://localhost:5000/api/health` | Success JSON with `status: ok`. |
| `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/` | `200`. |
| Data survival check after container recreation | `users: 2`, `products: 10`, `categories: 4`, `orders: 0`. |
| `mongo-init` logs | First run initiated the replica set; rerun reported “already initialized” and exited cleanly. |

Two Docker-era defects were found and fixed during verification:

1. `TRUST_PROXY=false` was read as a string; Express parsed it as an IP and crashed with `invalid IP address: false`. `backend/src/config/index.js` now normalizes booleans and preserves numeric/subnet/IP values.
2. The original standalone MongoDB topology silently skipped transactions. Compose now starts a replica set and the backend waits for `mongo-init` completion.

## Browser QA

Windows Chrome headless was available at `C:\Program Files\Google\Chrome\Application\chrome.exe`. Fresh screenshots were captured from the running Docker stack:

- 1440x1000: `home-audit.png`, `catalog-audit.png`, `product-audit.png`, `login-audit.png`, `cart-audit.png`.
- 390x844: `home-mobile-audit.png`.

All files were written successfully and frontend HTTP checks returned `200`. This model cannot visually inspect image pixels; human visual review of the PNGs is still recommended. Authenticated/admin screens were not driven through a browser. See `docs/acceptance-test-report.md`.

## Dependency audit

| Scope | Result |
|---|---|
| `npm audit --omit=dev` in `backend` | 0 vulnerabilities. |
| `npm audit --omit=dev` in `frontend` | 0 vulnerabilities. |
| Full `npm audit` in `backend` | 18 moderate advisories, all in Jest/glob/minimatch test tooling. |
| Full `npm audit` in `frontend` | 3 advisories (1 moderate, 2 critical) in Vitest, `@vitest/mocker`, and `tinypool` test tooling. |

Remaining advisories are dev-toolchain-only and are not shipped in the production bundle.

## Admin browser QA

Authenticated admin workflows were later driven with Windows Chrome 157 through Chrome DevTools Protocol. Full evidence and screenshots are in `docs/admin-visual-qa.md` and `docs/screenshots/admin/`.

| Check | Result |
|---|---|
| Admin login redirect | Passed after fixing `LoginPage.jsx` role-aware destination. |
| Unauthenticated `/admin/*` guard | Redirected to `/login`. |
| Non-admin `/admin` guard | Customer redirected to `/`. |
| Customer login destination | Still `/account`. |
| Sign out | Passed. |
| Overview KPIs, chart, tables, range filter | Passed with local demo order data. |
| Product create, edit, delete, category options | Passed; temporary QA product removed afterward. |
| Stock adjustment and rollback | Passed; both movements recorded. |
| Order search, status filter, status transition, cancellation, detail | Passed. |
| Analytics date range, quick range, users/roles | Passed. |
| 390x844 responsive layout | Passed; no page-level horizontal overflow and admin nav reachable. |
| Browser console errors / uncaught exceptions | None recorded. |

A model-side limitation remains: PNG pixels cannot be visually inspected by this model, so visual review used rendered DOM/CSS geometry, text, active navigation state, and populated data rather than human pixel judgment. Human review of the PNGs is still recommended.

## Limitations

- Live Stripe checkout and webhook delivery were not exercised because no real Stripe test keys/webhook secret were available.
- Authenticated admin screenshots and browser-driven admin workflows were not captured in the earlier public-browser pass; Phase 8 covered them.
- JWTs remain in `localStorage`; production should prefer secure, HTTP-only cookies.
- Refund paths restore stock but do not reconstruct the customer cart.
- Human visual review of the captured screenshots is still recommended.

## Conclusion

Backend and frontend suites, production build, Docker replica-set initialization, transaction support, container health, seeded data persistence, and key public screens are verified. Live payment verification and human visual QA are the remaining external validation gaps.
