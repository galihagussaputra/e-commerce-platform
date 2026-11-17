# Database Design

Database: MongoDB 8, database `ecommerce` in Docker Compose. Mongoose owns schema validation, while indexes enforce uniqueness and support common queries.

## Collections

### `users`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, trimmed, max 100. |
| `email` | String | Required, unique, lowercase, trimmed. |
| `password` | String | Required, `select: false`, bcrypt hash cost 12. |
| `role` | String | `user` or `admin`; default `user`. |
| `addresses` | Address[] | Embedded subdocuments with label, contact, lines, city, postal code, country, default flag. |
| `passwordChangedAt` | Date | Available for token invalidation policies. |
| `createdAt` / `updatedAt` | Date | Timestamps. |

`safeObject()` removes `password` and adds `id`.

### `categories`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, unique by application logic, max 100. |
| `slug` | String | Required, unique, lowercase. |
| `description` / `image` | String | Optional metadata. |
| `isActive` | Boolean | Default `true`. |

### `products`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, max 150. |
| `slug` | String | Required, unique, lowercase. |
| `description` | String | Required. |
| `brand` | String | Optional. |
| `price` / `compareAtPrice` | Number | Non-negative; IDR integer amounts. |
| `category` | ObjectId | Required reference to `categories`. |
| `images` | String[] | HTTP(S) URLs. |
| `stock` | Number | Physical units. |
| `reserved` | Number | Units held by pending checkouts. |
| `available` | Number | `stock - reserved`; used for availability checks. |
| `lowStockThreshold` | Number | Default 5. |
| `status` | String | `active`, `draft`, or `archived`. |
| `featured` | Boolean | Homepage curation. |
| `variants` | Variant[] | Embedded name, SKU, options, price adjustment. |

Indexes: text index on name/description/brand; compound index on status/category/price; compound index on featured/status; unique slug.

Virtual: `isLowStock`.

### `carts`

| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId | Required, unique reference to `users`. |
| `items` | CartItem[] | Product reference plus quantity 1-99. |

Cart lines are validated against live products and prices on read and checkout, so stale client prices cannot be trusted.

### `orders`

| Field | Type | Notes |
|---|---|---|
| `orderNumber` | String | Required, unique. |
| `user` | ObjectId | Required reference to `users`. |
| `items` | OrderItem[] | Immutable product snapshot: name, image, SKU, unit price, quantity, line total. |
| `shippingAddress` | Object | Snapshot chosen at checkout. |
| `subtotal` / `shippingFee` / `tax` / `total` | Number | Server-computed, non-negative. |
| `currency` | String | Default `IDR`. |
| `status` | String | `pending_payment`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`. |
| `paymentStatus` | String | `unpaid`, `pending`, `paid`, `failed`, `refunded`. |
| `checkoutSessionId` / `paymentIntentId` | String | Stripe references. |
| `idempotencyKey` | String | Unique, sparse; prevents duplicate checkout submissions. |
| `reservationExpiresAt` | Date | Cleanup deadline for pending stock. |
| `timeline` | TimelineEntry[] | Status, timestamp, note. |
| `notes` | String | Optional admin/customer notes. |

Indexes: user + createdAt, status + createdAt, unique sparse idempotencyKey.

### `payments`

| Field | Type | Notes |
|---|---|---|
| `order` | ObjectId | Required, unique reference to `orders`. |
| `provider` | String | Default `stripe`. |
| `checkoutSessionId` / `paymentIntentId` | String | Unique sparse indexes. |
| `amount` / `currency` | Number / String | Authoritative captured amount. |
| `status` | String | `pending`, `paid`, `failed`, `refunded`. |
| `checkoutUrl` | String | Redirect URL returned by Stripe. |
| `failureReason` / `processedEventId` | String | Diagnostics and webhook linkage. |

### `stockmovements`

Append-only audit trail for reserve, release, sale (`out`), restock (`in`), and manual adjustment. Stores product, type, quantity, reason, order, performedBy, balanceAfter, and timestamps. Indexed by product + createdAt and order.

### `webhookevents`

| Field | Type | Notes |
|---|---|---|
| `eventId` | String | Required, unique Stripe event ID. |
| `type` | String | Stripe event type. |

This collection provides webhook idempotency.

## Relationships

```text
User 1 ──── 1 Cart
User 1 ──── * Order
User 1 ──── * StockMovement
Category 1 ──── * Product
Product 1 ──── * StockMovement
Order 1 ──── 1 Payment
Order 1 ──── * StockMovement
```

References are stored as ObjectIds and populated where UI needs names/slugs. Order items intentionally embed a product snapshot so historical orders survive product edits or deletion.

## Consistency rules

- Checkout and stock reservation are performed in a MongoDB transaction.
- Stock availability mutations are conditional atomic updates, preventing overselling.
- Payment finalization is idempotent by Stripe event ID and guarded by order/payment status.
- Cart restoration happens on user cancellation; failed webhook paths release/restock inventory without mutating the cart.
- Reservation cleanup cancels stale pending orders at most 100 per minute per tick.

## Seed data

`npm run seed` is idempotent: 4 categories, 10 products, one admin (`admin@example.com`), and one customer (`customer@example.com`) using credentials from environment variables or Compose defaults.
