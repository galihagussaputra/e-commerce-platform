# API Documentation

Base URL: `http://localhost:5000` (Docker) or the Vite `/api` proxy.

## Response format

Success:

```json
{
  "success": true,
  "data": { "..." : "..." },
  "meta": { "total": 10, "page": 1, "limit": 12 }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid data",
    "details": [{ "field": "price", "message": "Price must be a non-negative number" }]
  }
}
```

Authenticated endpoints expect `Authorization: Bearer <token>`. Admin endpoints additionally require the token's user to have `role: admin`.

## Public endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness probe with service name and timestamp. |
| POST | `/api/auth/register` | Create account and receive JWT. |
| POST | `/api/auth/login` | Authenticate and receive JWT. |
| GET | `/api/products` | List active products with filtering, sorting, and pagination. |
| GET | `/api/products/featured` | List featured active products. |
| GET | `/api/products/categories` | List active categories. |
| GET | `/api/products/:id` | Product detail. |
| POST | `/api/payments/webhook` | Stripe signed webhook. Raw JSON body only. |

### `GET /api/products` query parameters

| Parameter | Example | Notes |
|---|---|---|
| `q` | `headphone` | Regex search over name, description, brand. |
| `category` | `audio` or ObjectId | Resolves slug or ID. |
| `minPrice` / `maxPrice` | `100000` | Inclusive IDR range. |
| `featured` | `true` | Featured products only. |
| `status` | `active`, `all` | Defaults to `active`; `all` requires admin context in UI usage. |
| `sort` | `newest`, `oldest`, `price_asc`, `price_desc`, `name` | Default `newest`. |
| `page` / `limit` | `1` / `12` | Limit max 100. |

### Register / login bodies

```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "password123" }
```

```json
{ "email": "jane@example.com", "password": "password123" }
```

Responses contain `user` (password removed, `id` included) and `token`.

## Authenticated endpoints

### Auth and account

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/me` | Current user. |
| PUT | `/api/auth/profile` | Update name/email. |
| PUT | `/api/auth/password` | Change password using current password. |
| POST | `/api/auth/addresses` | Add shipping address. |
| PUT | `/api/auth/addresses/:id` | Update address. |
| DELETE | `/api/auth/addresses/:id` | Remove address. |

Address body fields: `label`, `fullName`, `phone`, `line1`, `line2`, `city`, `postalCode`, `country`, `isDefault`.

### Cart

| Method | Path | Description |
|---|---|---|
| GET | `/api/cart` | Cart with populated line details, subtotal, and item count. |
| POST | `/api/cart/sync` | Replace server cart with `{ "items": [{ "productId", "quantity" }] }`. |
| DELETE | `/api/cart` | Clear cart. |
| POST | `/api/cart/items/:productId` | Add item; body `{ "quantity": 1 }`. |
| PUT | `/api/cart/items/:productId` | Set item quantity. |
| DELETE | `/api/cart/items/:productId` | Remove item. |

### Checkout and orders

| Method | Path | Description |
|---|---|---|
| POST | `/api/checkout/session` | Create Stripe Checkout Session and pending order. |
| GET | `/api/orders` | List current user's orders; admins can filter with `status`, `from`, `to`, `limit`. |
| GET | `/api/orders/:id` | Order detail; ownership enforced for non-admins. |
| POST | `/api/orders/:id/cancel` | Cancel a pending/cancellable order; body `{ "reason": "..." }`. |
| PATCH | `/api/orders/:id/status` | Admin-only status update; body `{ "status", "note" }`. |

Checkout body:

```json
{
  "addressId": "68f1...",
  "idempotencyKey": "cart-session-abc"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/...",
    "order": { "...": "..." },
    "reused": false
  }
}
```

An omitted `addressId` uses the user's default address or first saved address. Checkout fails with `ADDRESS_REQUIRED` when none exists.

## Admin endpoints

All require `protect` + `requireAdmin`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/users` | List users with pagination/search. |
| PUT | `/api/auth/users/:id/role` | Set role; body `{ "role": "admin" }`. |
| POST | `/api/products` | Create product. |
| PUT | `/api/products/:id` | Update product. |
| DELETE | `/api/products/:id` | Delete product. |
| POST | `/api/products/categories` | Create category. |
| PUT | `/api/products/categories/:id` | Update category. |
| DELETE | `/api/products/categories/:id` | Delete category if unused. |
| GET | `/api/admin/analytics/summary` | Revenue/order summary; supports `from`, `to`. |
| GET | `/api/admin/analytics/sales-trend` | Grouped sales trend; supports `from`, `to`. |
| GET | `/api/admin/analytics/top-products` | Top products; supports `from`, `to`, `limit`. |
| GET | `/api/admin/analytics/recent-transactions` | Recent paid orders with payment provider; supports `limit`. |
| GET | `/api/admin/analytics/inventory` | Inventory value by category. |
| GET | `/api/admin/inventory/low-stock` | Products at or below threshold; supports `limit`. |
| GET | `/api/admin/inventory/movements` | Stock movement history; `product`, `type`, `page`, `limit`. |
| POST | `/api/admin/inventory/adjust/:productId` | Adjust stock; body `{ "delta": 5, "reason": "manual correction" }`. |

Product create body:

```json
{
  "name": "Wireless Headphones",
  "description": "Over-ear headphones",
  "price": 1500000,
  "category": "68f1...",
  "stock": 25,
  "images": ["https://example.com/headphones.jpg"],
  "status": "active"
}
```

## Webhook events

`POST /api/payments/webhook` expects Stripe's raw JSON body and `stripe-signature` header. The service verifies the signature before parsing business data, records the event ID, and applies state changes idempotently.

Common handled flows:

- Completed paid session: order `paid`, payment `paid`, reserved stock finalized.
- Failed/cancelled payment: payment `failed`, stock released/restocked, order cancelled where applicable.
- Duplicate event: acknowledged with `{ "success": true, "data": { "received": true } }` and no repeated mutation.
