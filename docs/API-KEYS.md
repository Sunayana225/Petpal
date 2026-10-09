# API key management

Authenticate console requests with the HttpOnly session cookie. Obtain `csrfToken` from `GET /api/auth/me`, then include `X-CSRF-Token` on writes. Key creation, updates, revocation, and rotation require sign-in within the configured recent-authentication window.

Create with `POST /api/me/keys`: name (1–60 characters), numeric quotaLimit (0–1000000000 or null), quotaWindow (day/month/total), scope (food-safety/check/dataset), ipAllowlist (up to 20 IP literals), and expiresAt (future ISO timestamp within 366 days or null). Omitted quota values use server defaults. Account policy still applies to an unlimited key. Unknown fields and empty updates are rejected. Read errors through the stable errorCode/requestId envelope.

`PATCH /api/me/keys/{id}` changes name, enabled, quota, scope, IP rules, or expiry. JSON booleans must be actual booleans. `DELETE` revokes permanently; an update cannot resurrect a revoked key. Ownership is enforced for every operation.

`POST /api/me/keys/{id}/rotate` accepts graceSeconds from 0 to 86400 (default 300). Copy the newly returned rawKey, update consumers, and validate them before the old key expires. The previous key's original expiry can shorten the grace period. The new key inherits scope, quota, IP rules, and original expiry. Setting graceSeconds to zero disables old credentials immediately. Grace overlap may temporarily exceed the active-key count by one.

Present exactly one `Authorization: Bearer sk-...` header for keyed requests. Do not also send X-API-Key. Both the public dataset and `/api/v1/food-safety` surfaces enforce and meter admission. Failed admitted calls count toward quotas. A 429 may reflect key, account, or minute burst policy; Retry-After gives the minimum suggested delay, but a daily/total quota may require a longer wait or operator action.

`GET /api/me/keys`, `/api/me/usage`, `/api/me/keys/{id}/usage`, and `/api/me/audit` support limit and offset. Key lists expose hasMore; histories use stable timestamp/row ordering. Usage since must be within the past 366 days and not in the future. Default recent-page size is 50. Daily aggregates and totals remain independent of recent history pagination.

Creation, mutation, rotation, and revocation are transactionally audited without raw keys. Never store keys in browser localStorage, logs, screenshots, or source control. The console shows creation secrets once. Operational settings and incident procedures are in [OPERATIONS.md](OPERATIONS.md).
