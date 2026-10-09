# PetPal: 100 API and login improvements

Reviewed 2026-10-09. Scope: `apps/backend` and `apps/web`. All 100 improvement items now have implementation or verification coverage. These were proposed improvements, not 100 confirmed vulnerabilities. Existing controls were verified and extended where needed. Existing mechanisms (hashed keys, session rotation, SQLite storage, input normalization) should be preserved.

## Login and OAuth (1–20)

1. **Implemented** — Enable session-backed OAuth state verification for GitHub.
2. **Implemented** — Enable session-backed OAuth state verification for Google.
3. **Implemented** — Block dev login in production even with DEV_AUTH=1.
4. **Implemented** — Honor DEV_AUTH=0 in development and tests.
5. **Implemented** — Validate dev-login email type, format, and length.
6. **Implemented** — Validate dev-login name type and length.
7. **Implemented** — Return a controlled 503 for an unconfigured OAuth callback.
8. **Implemented** — Add integration tests for missing, mismatched, and replayed OAuth state.
9. **Implemented** — Add an OAuth transaction expiry deadline.
10. **Implemented** — Support separate OAuth transactions for simultaneous browser tabs.
11. **Implemented** — Verify provider email ownership before email-based admin promotion.
12. **Implemented** — Prevent dev identities from receiving email-based admin privileges.
13. **Implemented** — Normalize provider emails before storing them.
14. **Implemented** — Add explicit account linking with reauthentication.
15. **Implemented** — Add a provider unlink flow that preserves at least one login method.
16. **Implemented** — Add a disabled-account flag checked during deserialization.
17. **Implemented** — Apply a dedicated login attempt rate limit.
18. **Implemented** — Distinguish OAuth cancellation from provider failure in the UI.
19. **Implemented** — Add provider outage messaging with a retry action.
20. **Implemented** — Validate production OAuth callback and web URLs at startup.

## Sessions and browser security (21–40)

21. **Implemented** — Propagate Passport logout errors.
22. **Implemented** — Propagate session destruction errors.
23. **Implemented** — Clear the session cookie after logout using matching attributes.
24. **Implemented** — Prevent caching of auth responses.
25. **Implemented** — Prevent caching of key and usage responses, including raw keys.
26. **Implemented** — Include protocol in same-origin checks.
27. **Implemented** — Reject originless writes marked cross-site by Fetch Metadata.
28. **Implemented** — Add CSRF tokens for session-authenticated mutations, retaining native API clients.
29. **Implemented** — Add an absolute authenticated session lifetime.
30. **Implemented** — Add a separate inactivity timeout.
31. **Implemented** — Require recent authentication for sensitive account changes.
32. **Implemented** — Persist Passport's serialized user ID in the sessions user_id column.
33. **Implemented** — Add a list of active sessions for each user.
34. **Implemented** — Add individual session revocation.
35. **Implemented** — Add logout-all-devices.
36. **Implemented** — Delete expired SQLite session rows on a bounded cleanup schedule.
37. **Implemented** — Forward all session-store database exceptions through callbacks.
38. **Implemented** — Support session signing secret rotation.
39. **Implemented** — Enforce minimum production session-secret strength.
40. **Implemented** — Document and validate supported same-site and cross-site deployment configurations.

## API keys and authorization (41–60)

41. **Implemented** — Compare admin tokens using fixed-size timing-safe digests.
42. **Implemented** — Require string key names on creation.
43. **Implemented** — Require string key names on updates.
44. **Implemented** — Reject string booleans in key updates, avoiding truthy 'false'.
45. **Implemented** — Bound quota limits to safe integers.
46. **Implemented** — Reject empty key update payloads.
47. **Implemented** — Reject unknown key mutation fields.
48. **Implemented** — Add a maximum active-key count per account.
49. **Implemented** — Add API key expiry dates.
50. **Implemented** — Add overlapping key rotation with a documented grace period.
51. **Implemented** — Expose key scopes and enforce them per route.
52. **Implemented** — Add explicit key IP allowlist management with proxy-aware validation.
53. **Implemented** — Reject conflicting API key credential headers.
54. **Implemented** — Bound presented API key length before hashing or database work.
55. **Implemented** — Add atomic quota reservations to prevent concurrent overspend.
56. **Implemented** — Separate account policy quotas from user-configurable key quotas.
57. **Implemented** — Add per-key burst rate limits.
58. **Implemented** — Add key lifecycle audit events without raw secrets.
59. **Implemented** — Expand cross-user tests for every key read and mutation route.
60. **Implemented** — Add regression tests proving revoked and disabled keys cannot authenticate.

## HTTP contracts, validation, and operations (61–80)

61. **Implemented** — Install request IDs before body parsers and rate limiting.
62. **Implemented** — Include parser failures and rate-limited requests in metrics.
63. **Implemented** — Use the request correlation ID in rate-limit response bodies.
64. **Implemented** — Derive retry timing from the limiter header/configuration.
65. **Implemented** — Delegate errors when response headers were already sent.
66. **Implemented** — Explicitly disable X-Powered-By.
67. **Implemented** — Validate the account usage since parameter as an ISO date.
68. **Implemented** — Validate the per-key usage since parameter as an ISO date.
69. **Implemented** — Standardize API error codes and envelopes across route modules.
70. **Implemented** — Strip rejected secret values from validation error details.
71. **Implemented** — Use route templates for metrics labels to prevent unbounded cardinality.
72. **Implemented** — Compute response-time averages from completed requests.
73. **Implemented** — Protect operational metrics and system status with admin authorization.
74. **Implemented** — Add database readiness separately from process liveness.
75. **Implemented** — Add an OpenAPI specification for public and console endpoints.
76. **Implemented** — Validate all numeric environment settings with bounds at startup.
77. **Implemented** — Add graceful HTTP shutdown and database closing.
78. **Implemented** — Redact OAuth callback query strings from access/error logs.
79. **Implemented** — Return consistent correlation IDs in health and monitoring responses.
80. **Implemented** — Add CI dependency vulnerability checks and a lockfile maintenance policy.

## Reliability, client experience, and verification (81–100)

81. **Implemented** — Preserve caller cancellation signals in the shared web HTTP client.
82. **Implemented** — Merge Headers objects correctly rather than using object spread.
83. **Implemented** — Carry server request IDs in client ApiError objects.
84. **Implemented** — Handle successful empty responses explicitly in the JSON client.
85. **Implemented** — Retry only safe reads on transient failures with bounded jitter.
86. **Implemented** — Keep the authenticated UI until logout succeeds; show logout failures.
87. **Implemented** — Distinguish auth hydration network failure from an anonymous session.
88. **Implemented** — Refresh sessions on window focus with bounded request frequency.
89. **Implemented** — Synchronize logout across tabs using BroadcastChannel.
90. **Implemented** — Add a retry button for loading sign-in providers.
91. **Implemented** — Prevent duplicate dev sign-in submissions and announce progress accessibly.
92. **Implemented** — Add end-to-end login, return destination, logout, and route-guard coverage.
93. **Implemented** — Add deployment tests for HTTPS reverse proxies and Secure cookies.
94. **Implemented** — Add browser coverage for cross-site SameSite=None deployments.
95. **Implemented** — Paginate key lists and usage history with stable ordering.
96. **Implemented** — Limit usage date ranges and reject future-only ranges where inappropriate.
97. **Implemented** — Budget external API calls with timeouts and cancellation.
98. **Implemented** — Add bounded concurrency for AI fallback requests.
99. **Implemented** — Add authenticated load tests for quota races, SQLite contention, and session writes.
100. **Implemented** — Publish an operator runbook covering OAuth setup, secret rotation, backups, and login incident diagnosis.

## Implementation and verification

Completed work includes one-use expiring OAuth transactions, independent tab destinations, verified email privilege checks, explicit identity linking/unlinking, account disablement, session lifetimes and revocation, CSRF, atomic quota admission, key lifecycle controls, audit events, error contracts, readiness, OpenAPI, client reliability, browser tests, load tests, and an operator runbook.

Validation: workspace linting, TypeScript checks (backend/web/mobile), backend tests, web tests, production builds, Chromium end-to-end flows, HTTPS cross-site cookies, proxy cookies, SQLite writer contention, concurrent session reads, and the targeted runtime dependency audit. See OPERATIONS.md for commands and deployment acceptance checks. Live provider consent/token exchange requires configured applications; no claim of live provider verification is made.

Notable behavior changes: old sessions without authentication timestamps must sign in again; cookie writes require CSRF tokens; public keyed dataset requests are now metered; key quotas count admitted failed/disconnected requests; sensitive changes require recent sign-in; dev login cannot run in production.

The backend runtime audit reports zero findings. Existing development/mobile dependency findings remain recorded in DEPENDENCY-POLICY.md; item 80 implements audit checks and maintenance, not a promise that every pre-existing workspace dependency is vulnerability-free.

References: API-KEYS.md, OPERATIONS.md, DEPENDENCY-POLICY.md, and GET /api/openapi.json. Community Wisdom research was attempted through DevRelay but returned a connection requirement; no community findings are claimed. Official session guidance: https://expressjs.com/en/resources/middleware/session/ .
