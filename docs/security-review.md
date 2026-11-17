# Security Review

Date: 2026-11-17

## Scope

Review of authentication, authorization, session management, public API exposure, Stripe handling, secrets, error responses, and deployment defaults after the functional audit.

## Verified controls

### Authentication and sessions

- Passwords are bcrypt-hashed and excluded from normal queries by `select: false`.
- JWT lifetime defaults to `1d`; `JWT_SECRET` is mandatory when `NODE_ENV=production`.
- `User.tokenVersion` is embedded in tokens and checked by `protect`.
- Logout and password change increment `tokenVersion`, invalidating previously issued tokens server-side.
- The frontend clears local state and all Redux slices on `SESSION_INVALID` or explicit logout.
- Auth routes are rate-limited.

### Authorization and data exposure

- Admin-only route groups enforce `requireAdmin`.
- Public product queries ignore `status=all` unless the caller is an admin, preventing draft exposure.
- Admin inventory adjustment reads the product ID from the route parameter, not the request body.
- Product category create/update uses a whitelist and validates route IDs.
- Order reads and updates enforce ownership except for admins.
- Search regular expressions are escaped to prevent regex injection.

### Stripe and payments

- Webhook signatures are verified against the raw request body before business logic runs.
- `WebhookEvent` claims events and records `processing`, `processed`, or `failed` status.
- Amount and currency are rechecked from the trusted order before finalization.
- Duplicate webhook deliveries are acknowledged without repeated stock or payment mutations.
- Refunds use Stripe idempotency keys and are processed once per order/payment outcome.
- Raw Stripe errors are mapped to a short whitelist of safe client messages.

### Configuration and deployment

- Docker Compose passes `JWT_SECRET` from the host environment instead of embedding a default.
- `TRUST_PROXY` is parsed as a boolean, numeric hop count, or trusted subnet/IP string; string `"false"` no longer crashes Express.
- Production seeding refuses missing, weak, or default admin passwords and skips demo users.
- CORS origins are explicit; Helmet and `x-powered-by` protection are enabled.
- AppError and error middleware hide internal details in production.

## Automated evidence

- `backend/tests/security.test.js`: logout invalidation, password-change invalidation, draft product hiding.
- `backend/tests/stripe-signature.test.js`: valid signature accepted, invalid signature rejected before business logic.
- `backend/tests/auth.test.js`: password omission, bad credentials, missing tokens, RBAC denial.
- `backend/tests/acceptance/admin-operations.test.js`: admin workflows remain role-protected.
- `npm audit --omit=dev`: 0 vulnerabilities in both `backend` and `frontend`.

## Remaining risks and hardening backlog

| Risk | Status / recommendation |
|---|---|
| JWT stored in `localStorage` | Still used; migrate to secure, HTTP-only cookies with CSRF protection for stricter XSS resistance. |
| In-memory rate limits | Adequate for a single-process demo; use Redis or an API gateway in multi-instance production. |
| Live Stripe checkout/webhook | Blocked by missing real Stripe test keys and webhook forwarding; signature verification is tested locally with the real SDK and dummy secret. |
| Secret management | Ensure `JWT_SECRET`, `ADMIN_SEED_PASSWORD`, Stripe keys, and proxy settings come from a managed secret store in production. |
| Backups and monitoring | No backup/restore, alerting, or audit-log pipeline is configured. |
| Dev-tool advisories | Jest/Vitest transitive advisories remain; they are not shipped in production bundles. |

## Verdict

No unresolved critical or high-severity defect was found in the implemented auth, RBAC, payment verification, or public-data paths. The remaining items are production-hardening work, not blockers for a local portfolio demo.
