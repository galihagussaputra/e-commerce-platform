# Admin Visual QA

Date: 2026-11-18

## Initial condition before changes

- Repository: `/mnt/d/Projek/Github/e-commerce-platform`.
- HEAD: `dd4899a feat: complete full-stack e-commerce platform`.
- All Phase 7 production-readiness audit changes remain uncommitted: 36 tracked files modified with 732 insertions / 269 deletions, plus untracked audit tests, helpers, docs, scripts, and screenshots.
- `git diff --check` passed. No `git reset`, `git checkout .`, rebase, commit, push, or destructive cleanup was performed.
- Previous verification baseline: backend 12 suites / 28 tests passed, frontend 2 files / 2 tests passed, Vite build passed, Compose config valid.
- Docker Compose was already running: `backend`, `frontend`, and `mongodb` healthy.
- MongoDB replica set `rs0` reported `isWritablePrimary: true`.
- Existing customer/public screenshots were preserved under `docs/screenshots/`.

## Documentation reviewed

- `docs/implementation-log.md`
- `docs/testing-report.md`
- `docs/acceptance-test-report.md`
- `docs/security-review.md`
- `README.md`

The reviewed docs confirm that authenticated/admin browser QA was the remaining visual validation gap, and that this model cannot visually inspect image pixels.

## Frontend route and page inventory

Admin routes are under `/admin` and are guarded by `AdminRoute` (`frontend/src/routes/AdminRoute.jsx`): unauthenticated users are redirected to `/login`, and non-admin users to `/`.

Admin pages available in `frontend/src/App.jsx`:

| Route | Component | Purpose |
|---|---|---|
| `/admin` | `AdminDashboard` | Overview, KPI cards, sales trend, low stock, top products, recent transactions. |
| `/admin/products` | `AdminProducts` | Product table plus inline add/edit form. |
| `/admin/inventory` | `AdminInventory` | Stock table, adjustment form, and stock movement history. |
| `/admin/orders` | `AdminOrders` | Order table, filters, status transitions, cancellation, detail links. |
| `/admin/analytics` | `AdminAnalytics` | Date-range reports, inventory position, recent transactions, users/roles. |

Customer-only protected routes are `/checkout`, `/account`, `/orders`, and `/orders/:id`; they require authentication but not the admin role.

No dedicated category-management route exists. Category data is used in the product form as a select, and category APIs exist in the backend, but there is no separate admin page to screenshot as a category manager. No separate stock-movement route exists; movements are a section of `/admin/inventory`. Order detail uses the customer route `/orders/:id`, not an admin-specific path.

## Seed login facts

- The development seed creates `admin@example.com` with role `admin`; the password is the development default configured by `ADMIN_SEED_PASSWORD`/`backend/src/config/index.js` and is intentionally not recorded here.
- Production seeding refuses default or weak admin passwords.
- The login page currently documents only the demo customer account; no admin credentials are shown in the UI.

## Browser tooling available

- Windows Chrome is installed at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Playwright and Puppeteer are not installed in the frontend or backend `node_modules`.
- The next step will attempt real browser interaction through Chrome DevTools Protocol using the running Chrome binary and the existing Docker stack. If authentication or interaction fails, this document will record the failure instead of claiming browser QA passed.

## Initial screenshot targets

Requested admin screenshots will be attempted from the real running app:

- `docs/screenshots/admin/admin-dashboard.png`
- `docs/screenshots/admin/admin-products.png`
- `docs/screenshots/admin/admin-product-form.png`
- `docs/screenshots/admin/admin-inventory.png`
- `docs/screenshots/admin/admin-inventory-movements.png`
- `docs/screenshots/admin/admin-orders.png`
- `docs/screenshots/admin/admin-order-detail.png`

`admin-categories.png` has no matching dedicated page and will not be fabricated. Any screenshot not produced will be listed with its reason in the final results.

## Browser QA

Chrome 157 was driven through DevTools Protocol against the running Docker stack. Login, navigation, forms, filters, confirmations, status transitions, detail links, and logout were real browser interactions, not static screenshot captures.

| Check | Result |
|---|---|
| Admin login lands on `/admin` | Passed after role-aware redirect fix. |
| Unauthenticated `/admin/products` redirects to `/login` | Passed. |
| Customer login still lands on `/account` | Passed. |
| Non-admin `/admin` redirects to `/` | Passed. |
| Sign out leaves the admin area | Passed. |
| Overview KPIs, chart, low stock, best sellers, recent transactions | Passed with populated local data. |
| Overview range filters (7/30/90/all) | Passed. |
| Product category options | Passed on recheck: 5 options loaded (`Select category`, Accessories, Audio, Wearables, Workspace). |
| Product create, edit, delete | Passed; temporary QA product removed afterward. |
| Stock adjustment and rollback | Passed on recheck; both movements recorded. |
| Order search, status filter, status transition, cancellation, detail | Passed on recheck. |
| Analytics date range, quick range, period summary, users/roles | Passed. |
| Browser console errors / uncaught exceptions | None recorded. |

Three initial automation failures were traced to the QA script, not the application: a category check ran before options loaded, an async IIFE was not invoked when reading a product ID, and an order-detail assertion ran before the detail view hydrated. All three were rerun successfully. The repeated automated logins hit the existing 15-minute rate limiter; the backend was restarted once to clear that in-memory limiter, and no data was lost.

## Screenshot

All screenshots were captured from the live authenticated app at 1440x900, with mobile captures at 390x844.

| File | Content |
|---|---|
| `admin-dashboard.png` | Populated overview with KPI cards, sales trend chart, low stock, top products, and recent transactions. |
| `admin-products.png` | Product table with real seeded data and the temporary QA product. |
| `admin-product-form.png` | Inline product form filled with realistic QA product data before submission. |
| `admin-inventory.png` | Inventory totals, adjustment form, and stock table. |
| `admin-inventory-movements.png` | Stock movement history after adjustment and rollback. |
| `admin-orders.png` | Order table with real demo orders and action buttons. |
| `admin-order-detail.png` | Order detail page reached by clicking an admin order link. |
| `admin-analytics.png` | Date-range analytics, summary, sales table, inventory position, and users/roles. |
| `admin-dashboard-mobile.png` | 390x844 overview. |
| `admin-products-mobile.png` | 390x844 products page. |
| `admin-inventory-mobile.png` | 390x844 inventory page. |
| `admin-orders-mobile.png` | 390x844 orders page. |

`admin-categories.png` was not produced because no dedicated category-management page exists. Categories are exposed as options in the product form. No passwords, tokens, or secrets appear in the screenshots or this report.

## Visual Review

This model cannot inspect PNG pixels, so visual review used rendered DOM/CSS state and geometry from the real browser:

- Inter UI font at 16px, dark text `rgb(28, 28, 26)` on the light admin surface.
- Correct single active navigation link on every page (`aria-current="page"` matched Overview, Products, Inventory, Orders, and Analytics).
- Expected surface/card and table counts on each route: dashboard 8/1, products 2/1, inventory 7/2, orders 1/1, analytics 6/4.
- Headings, filters, forms, action buttons, badges, and data rows rendered with non-empty text.
- No browser console errors or uncaught exceptions during the walkthrough.
- Human pixel review of the PNG artifacts is still recommended.

## Responsive QA

At 390x844, the dashboard, products, inventory, and orders pages had `document.documentElement.scrollWidth === window.innerWidth === 390`. The five admin navigation links remained present and horizontally reachable. Wide tables scroll inside their own containers rather than expanding the page.

## Regression Testing

Final commands were rerun after all QA and documentation edits:

| Check | Result |
|---|---|
| `cd backend && npm test` | 12 suites / 28 tests passed in 51.099s. |
| `cd frontend && npm test` | 2 files / 2 tests passed. |
| `cd frontend && npm run build` | Passed; JS bundle 414.75 kB, CSS 26.96 kB. |
| `docker compose config -q` | Passed. |
| `docker compose ps` | `backend`, `frontend`, `mongodb` healthy. |
| MongoDB `db.hello()` | `isWritablePrimary: true`, `setName: rs0`. |
| `curl http://localhost:5000/api/health` | Success. |
| `curl http://localhost:5173/` | `200`. |
| `git diff --check` | Passed. |

Local QA data changes were confined to the running development database: six QA orders, their payments, two QA stock movements, and the temporary QA product lifecycle. The tested pending order and paid order were restored to their pre-test states. No production data was changed.

## Documentation

- Added this `docs/admin-visual-qa.md` report.
- Added README `## Admin Dashboard Screenshots` with all 12 admin images and a note about the absent category page.
- Updated `docs/implementation-log.md` with Phase 8.
- Updated `docs/testing-report.md` with admin browser QA results.

## Remaining Issues

- No dedicated category-management page exists, so `admin-categories.png` is intentionally absent.
- Human pixel-level visual review of the PNGs remains recommended because this model cannot view images.
- Live Stripe checkout still requires real test keys and webhook forwarding.
- Repeated automated logins can trigger the existing 12-attempt/15-minute auth limiter and the 400-request/15-minute API limiter; this is expected security behavior.
- No commit or push was performed.

## Final Git state

`git status --short` shows 37 modified tracked files plus untracked audit tests, helpers, docs, scripts, Docker init files, customer screenshots, and the new `docs/screenshots/admin/` directory.

`git diff --stat`: **37 files changed, 807 insertions(+), 272 deletions(-)**.
