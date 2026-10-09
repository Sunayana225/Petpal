# PetPal operator runbook

This checkout uses the npm workspace layout: `apps/backend`, `apps/web`, and `apps/mobile`. The API and console security work is covered by unit, API, browser, HTTPS-cookie, and SQLite writer-contention tests.

The original GitHub history is retained. `petpal-backend` is a compatibility directory whose npm scripts delegate to `apps/backend`; its original source and deployment notes are historical references. `petpal-web` and the old mobile gitlink remain preserved from that history. The maintained console is `apps/web`.

## Install, verify, and launch

Use Node 22 or 24 and run `npm ci --ignore-scripts` from the repository root. Copy `apps/backend/.env.example` to the backend's local `.env` and configure it there; do not commit secrets. Run `npm run verify`, `npm run test:e2e`, and `npm run test:load`. Chromium must first be installed with `npx playwright install chromium`; browser cookie tests also require OpenSSL (Git for Windows includes it).

Build from the root with `npm run build`. Launch the API from `apps/backend` using `npm run start:prod`. Set production environment values through the hosting service. Serve `apps/web/dist` with an SPA fallback and either proxy `/api` to the API or configure `VITE_API_URL` before building the web app. The development proxy can be overridden using `PETPAL_API_PROXY_TARGET` for isolated browser tests.

`GET /api/health` tests process liveness. `GET /api/ready` tests database availability. Route monitoring through readiness during rollout, and process restarts through liveness. `GET /api/openapi.json` publishes the current API contract.

## HTTPS, CORS, and cookies

Production requires HTTPS origin URLs for `WEB_APP_URL` and `OAUTH_CALLBACK_BASE`, plus a session signing secret with at least 32 bytes. Generate at least 32 random bytes; character length alone does not ensure entropy. `CORS_ORIGIN` is a comma-separated allowlist of exact HTTPS origins. Avoid trailing slashes.

For a same-site deployment, keep `SESSION_COOKIE_SAMESITE=lax`. For a web app and API on different sites, set it to `none` and include the web origin in `CORS_ORIGIN`. Secure and HttpOnly cookies are automatic. The browser must allow the relevant third-party cookie; deployment-specific browser policies may still block it. Hosting both endpoints on the same site avoids that restriction. Cookie Domain should normally remain unset; set a parent domain only when needed.

Production trusts one proxy hop; `TRUST_PROXY=1` enables this locally too. Keep the API inaccessible through a bypass around that proxy, and configure the proxy to overwrite forwarded headers. Register HTTPS termination and `X-Forwarded-Proto` correctly. CSRF checks compare both scheme and host, so incorrectly forwarded schemes also reject browser writes.

## OAuth setup and identities

Create GitHub and/or Google OAuth applications. Register `${OAUTH_CALLBACK_BASE}/api/auth/github/callback` and `${OAUTH_CALLBACK_BASE}/api/auth/google/callback` exactly. Set each provider's CLIENT_ID and CLIENT_SECRET before starting the process. Restart after changing credentials; strategies are registered at process startup. `/api/auth/providers` reports availability.

Each OAuth transaction has an independent random state, provider binding, browser-session binding, destination, and 10-minute default deadline. State is consumed once. Multiple sign-in tabs retain distinct destinations. Return paths are checked again before the redirect. Login errors distinguish cancellation, invalid/expired state, and provider failure.

The Security page links a provider through `GET /api/auth/{provider}?link=1&next=/security`. Linking requires a signed-in user with recent authentication, verified again when the provider returns. An identity owned by another user cannot be attached. Unlinking must preserve another sign-in method. Accounts are never merged solely by matching emails.

`ADMIN_EMAILS` only promotes users when the provider explicitly verifies the normalized email. GitHub retrieves raw email records so verification metadata is retained. Development identities cannot become admins through email configuration. Use `ADMIN_TOKEN` for operational account disablement, or an authenticated admin session. Disabling an account revokes its sessions and rejects its API keys. A session-authenticated admin cannot disable their own account.

Dev login is always disabled in production, including with `DEV_AUTH=1`. `DEV_AUTH=0` also disables it locally. Do not expose a development-mode API publicly.

## Sessions and CSRF

Defaults: absolute lifetime 24 hours, idle timeout 30 minutes, recent-authentication window 10 minutes. Configure `SESSION_ABSOLUTE_MS`, `SESSION_IDLE_MS`, and `REAUTH_MS` in milliseconds. Sessions created before this change without authentication timestamps must sign in again. Store expiration is bounded by all configured lifetimes; persisted activity survives restarts. Expired rows are cleaned in batches of 500, no more often than once a minute during store access.

The API lists owned sessions at `/api/sessions` using hashes of session IDs. The cookie bearer itself is never returned. Individual revocation and logout-all require recent authentication. The console updates authentication on focus at most once a minute; ordinary logout propagates to open tabs. Logout failures remain visible and preserve the authenticated UI.

Cookie-authenticated state changes require `X-CSRF-Token`, obtained from `/api/auth/me`. Read that endpoint with credentials included, then attach the token to writes. Native API clients using bearer keys have no cookie-authenticated user and are exempt. Admin-token-only callers are exempt. The local-only dev-login shortcut permits identity switching and does not require an existing CSRF token. Exact Origin and Fetch Metadata checks apply separately.

For session secret rotation, move the old secret into `SESSION_PREVIOUS_SECRETS` and set a new `SESSION_SECRET`. Restart. New signatures use the current secret while old signatures remain valid during the overlap. After the longest permitted absolute lifetime has elapsed, remove old secrets and restart. For an emergency compromise, remove old secrets immediately and delete affected sessions.

## API keys, quotas, and usage

Keys remain hashed at rest. Raw values appear only in creation and rotation responses, all marked no-store. See `docs/API-KEYS.md` for options and rotation. Default scopes permit food safety; restricted `check` and `dataset` scopes enforce their respective endpoints. IP allowlists accept individual IPv4/IPv6 addresses, up to 20; IPv4-mapped IPv6 addresses are normalized. CIDR is not supported. Correct proxy configuration is essential.

Admission reserves usage under SQLite's writer lock before a handler begins. Key quotas, rolling account-wide 24-hour quotas, and rolling per-key minute burst limits apply independently. Failed and disconnected admitted calls count. Public key-protected dataset routes are now metered too, preventing quota bypass. `MAX_ACTIVE_KEYS` defaults to 20; rotation permits one temporary overlapping key. Expired keys do not count toward the active limit.

`ACCOUNT_DAILY_QUOTA` defaults to 10000 and cannot be increased through a user-managed key. `KEY_BURST_LIMIT` defaults to 60 per minute. `DEFAULT_KEY_QUOTA` and `DEFAULT_KEY_WINDOW` define new-key defaults. Usage reports accept dates within the past 366 days and pagination limits of 1–100 with bounded offsets. Audit events contain action names and resource IDs, never raw credentials.

## SQLite backup and restore

Run one API instance per SQLite file on a supported local filesystem, with WAL enabled. Separate processes sharing that file coordinate writer admission through SQLite transactions and a five-second busy timeout. Do not assume a cloud network filesystem supports SQLite locking. For horizontal deployments, migrate sessions and quota reservations to a shared database rather than giving each node an independent quota ledger.

Use the SQLite online backup API while the database is open; copying only the main file may omit WAL writes. Alternatively, drain HTTP requests, stop the API, and copy the database together with its WAL/SHM files. Store encrypted backups outside the checkout. Test restore into a separate directory before changing the configured DB_PATH. Migrations are append-only and recorded transactionally. Reverting binaries does not revert schema migrations; restore a verified backup when a schema rollback is necessary.

SIGINT and SIGTERM drain HTTP requests, drop idle connections, and close the database. A 10-second hard cap terminates stuck drains. Do not rotate or move a live SQLite file manually.

## Login incident diagnosis

1. Check readiness and provider availability.
2. Verify registered callback URL, WEB_APP_URL, exact CORS origins, proxy scheme, cookie Secure/SameSite/Domain, and browser cookie policy.
3. Restart after credential changes. Check that production dev-login remains disabled.
4. For CSRF_INVALID, fetch `/auth/me` again to refresh the token. For REAUTH_REQUIRED, perform a fresh sign-in.
5. For state failures, start a new OAuth transaction; old callbacks cannot be replayed.
6. Use X-Request-Id to correlate client failures with logs. OAuth codes, state query strings, and rejected secret validation values are excluded from logs/errors.
7. For abuse, disable an account or revoke affected keys/sessions. Rotate compromised signing secrets and admin/provider credentials through the hosting service.

Monitoring endpoints require admin authorization. Metrics use bounded route labels and completed-request averages. Client errors carry correlation IDs. External response bodies are limited to 2MB under the request deadline; AI work has a bounded queue and concurrency limit. Shared cached requests retain their upstream budget even when an individual caller disconnects; BYOK requests propagate cancellation directly.

## Maintenance and test limits

Dependabot checks npm and GitHub Actions weekly. CI gates high/critical findings in the actual backend runtime dependency tree and stores full workspace audit reports. Existing development/mobile findings are separately tracked; see `docs/DEPENDENCY-POLICY.md`. Do not blindly apply forced audit downgrades or incompatible major upgrades.

Tests simulate provider state validation and local console login; live GitHub/Google consent and token exchanges require actual configured applications and are a deployment acceptance check. Browser tests validate credentialed cross-site HTTPS cookies and the local console. Load tests cover quota races across eight SQLite writers and concurrent session reads, not production capacity or availability targets.
