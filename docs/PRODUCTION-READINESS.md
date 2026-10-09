# PetPal production readiness review

Reviewed 2026-10-09 at commit `f5bc2165d80dce1702c3e67f0b96bea66be91aa9`.

**Verdict: NO GO for a public pet food-safety launch.** Automated engineering checks pass, but reproduced false-safe classifications and unverified data review prevent production sign-off. This is an implementation and local runtime review, not an independent veterinary validation or live-site penetration test.

## Verified checks

| Check | Result | Scope |
| --- | --- | --- |
| GitHub CI | Passed | [Run 37961343544](https://github.com/Sunayana225/Petpal/actions/runs/37961343544): Node 22 and 24 verification; browser and load job |
| Workspace lint and types | Passed again during this review | Backend/web lint; backend/web/mobile typecheck |
| Backend runtime npm audit | Zero findings | Actual backend production dependency tree |
| Full workspace npm audit | 53 findings | 33 moderate, 18 high, 2 critical; includes mobile and development/build tooling |
| Previous release tests | 325 backend, 13 web, 5 browser tests passed | Same reviewed commit; CI subsequently passed |
| Focused review tests | 24 tests in 4 suites passed | Environment, security hardening, unsupported species and answer cache; detectOpenHandles enabled |
| Production-mode HTTP smoke | Passed | Local compiled app with generated temporary session secret and explicit test HTTPS origin settings |
| Local data fallback | Passed | Dog/chocolate returns unsafe; unknown test food in local mode returns unknown |
| Production access controls | Passed | Dev login returns 404 even with DEV_AUTH=1; anonymous key access returns 401; untrusted origin gets no CORS allow-origin header |
| SQLite backup/restore smoke | Passed | Fresh temporary database, online backup, four migrations and restored integrity check |

The local production smoke used HTTP loopback to inspect the production middleware. It did not verify a real HTTPS reverse proxy, browser production cookies, live OAuth consent/token exchange, or paid Gemini generation. No production data or credentials were modified.

## Launch blockers and required fixes

### P0 â€” Commercial catalog metadata becomes a species-independent safety verdict

`apps/backend/src/services/externalApiService.ts:179` analyzes ingredients without species-specific evidence. At line 210, a category containing "pet" becomes `safe`. `searchAllSources` at line 220 ignores `_pet`; the answer adapter then labels the result with the requested species.

Reproduced through the compiled service using a synthetic product fixture, without a network call:

```text
Catalog product: Example dog kibble
Ingredients: beef, rice
Categories: pet food, dog food
Requested species: rabbits
Returned: pet=rabbits, safety=safe, source=external
```

- [ ] Treat commercial catalog information as product metadata, not evidence of dietary suitability.
- [ ] Require reviewed evidence for the requested species before returning a definitive verdict; otherwise return unknown or defer to a reviewed source.
- [ ] Add wrong-species, missing ingredients, ambiguous ingredients and product-category regression tests.

### P0 â€” AI text parsing can reverse a danger warning into safe

`apps/backend/src/services/aiService.ts:221` derives verdicts from substring matches. The broad safe branch at line 238 runs before toxic/dangerous checks. It excludes only specific negation strings.

Reproduced directly through the compiled parser, without a model call:

```text
Input: This food is not considered safe. It is toxic and dangerous.
Returned safety: safe
```

- [ ] Replace substring guessing with a strict, validated structured verdict schema.
- [ ] Fail closed to unknown for missing, malformed or contradictory assessments.
- [ ] Test negations, mixed/contradictory declarations and hazard warnings before enabling live AI results publicly.

### P1 â€” Demo data and pending answers enter the public decision path

The production repository unconditionally imports `foodSafety.generated.json` (`foodSafetyRepository.ts:43`). The generator explicitly describes those records as heuristic demo data, not veterinary-verified. `checkLocal()` returns local records directly, so disabling pending AI caching does not remove synthetic records from the public checker.

Observed merged dataset: 30,437 records. Winning source labels: 8,072 `AI (generated)`, 21,704 `Growli/ASPCA (CC BY 4.0)`, 524 BioVet, 76 generic veterinary-database, 61 ManyPets. Only 583 merged records have BioVet evidence receipts. A receipt's source verdict is not a review of every other record merged with it.

`env.serveUnreviewedAi` also defaults to true (`config/env.ts:170`). Pending remote answers may therefore be served publicly. Administrative approval does not independently establish veterinary qualifications.

- [ ] Exclude synthetic/demo records from production verdict resolution until reviewed.
- [ ] Make review-required serving the production default and cover fresh, cached, BYOK and local paths.
- [ ] Verify clinical review and source rights for each legacy import; preserve per-record provenance and avoid blanket "veterinary" claims.
- [ ] Obtain independent veterinary validation for the supported species and supported use cases before public safety claims.

### P1 â€” Production template and deployment acceptance are incomplete

`apps/backend/.env.production.example` omits `SESSION_SECRET`, `WEB_APP_URL`, `OAUTH_CALLBACK_BASE`, OAuth credentials and `DB_PATH`, while advertising unused JWT/database/Redis/Sentry settings. The entry point uses `dotenv.config()`; copying to `.env.production` alone does not make it load that file. With no production session secret, validation fails with `SESSION_SECRET must be set in production`; with a secret but default URLs, HTTPS validation fails.

No actual deployment URL or host configuration was supplied. The local checkout has no active environment files at the checked root/backend/web locations. This does not establish whether a remote host has environment variables configured.

- [ ] Replace the production template with actual supported variables and accurate loading instructions.
- [ ] Configure a real HTTPS deployment with correct proxy forwarding, same-site cookie strategy and persistent local SQLite storage.
- [ ] Exercise real GitHub/Google login, logout, restart persistence and cookie/CSRF behavior on the deployed origin.
- [ ] Exercise paid AI integration and failure/rate-limit behavior if AI is included in launch scope.
- [ ] Verify web deep-link/SPA fallback and the built client's production API base URL.

### P1 â€” Dependency and operational launch gates remain open

Full workspace audit on this review reports 53 findings, including critical Vitest/tinypool and high Vite/Expo/React Native/development-tool paths. These are not reported as API runtime vulnerabilities: the separately scoped backend runtime audit is clean. Determine which vulnerable tooling ships or executes in the release pipeline and remediate it with compatibility tests; do not apply blind forced npm downgrades.

The operator runbook documents backups and monitoring, but a written runbook is not evidence of configured infrastructure. The test backup used a fresh local database. Existing load checks cover quota contention and session reads, not sustained production capacity or availability targets.

- [ ] Remediate relevant critical/high build and mobile paths or explicitly exclude those surfaces from the release.
- [ ] Configure and verify off-host backups and restore of representative account/key/session/review data.
- [ ] Verify uptime/readiness monitoring, actionable alerts, secret rotation and rollback on the chosen host.
- [ ] Define expected traffic and run sustained load tests against a representative deployment.
- [ ] Keep a single instance with durable local SQLite storage, or migrate shared state before horizontal scaling. SQLite WAL is not supported on network filesystems, per [SQLite documentation](https://www.sqlite.org/wal.html).

### Mobile release gate

The mobile client falls back to localhost and times out at eight seconds (`apps/mobile/src/api/client.ts:13`), while AI requests may take up to 30 seconds and the remote resolver budgets 35 seconds. No production mobile build or device acceptance was performed.

- [ ] Align mobile timeout/cancellation behavior with the server's supported response budget.
- [ ] Configure an HTTPS production API endpoint and verify physical-device, offline and release-build behavior before distributing the mobile app.

## Data freshness limitation

FDA recall integration is a manually refreshed partial US listing of ten records. It is correctly disclosed as partial and includes medicines/supplements, not just food. No match is not safety clearance. Keep this limitation visible; define an owner and process for refreshes before promoting recall monitoring as a product promise.

## Evidence and release acceptance

Local review artifacts (git-ignored): `artifacts/readiness-smoke.json`, `artifacts/readiness-workspace-audit.json`, `artifacts/readiness-ci-jobs.json`. The smoke harness is `artifacts/readiness-smoke.cjs`; the separate parser probe is recorded in the JSON output. Test fixtures establish software behavior, not the dietary suitability of their sample ingredients.

Recheck readiness after closing the P0 verdict bugs and the production data/review gate, correcting configuration, and completing deployment acceptance. Passing the existing tests alone does not close these findings.

## Community Wisdom

DevRelay community lookup was attempted but returned "Not connected to MLH". No community evidence or citations are claimed. Primary operational references: [SQLite WAL constraints](https://www.sqlite.org/wal.html) and [SQLite online backup API](https://www.sqlite.org/backup.html). The default Gemini model is listed in [Google's current model documentation](https://ai.google.dev/gemini-api/docs/models); model availability for a configured production key remains untested.


## Remediation implementation (2026-10-09)

The findings above describe the reviewed baseline. The following changes are now implemented; final clean-install/container verification is tracked in the deployment guide and CI.

- [x] Catalog data always returns unknown suitability, including wrong-species products.
- [x] AI uses a validated JSON schema; negated danger warnings and contradictory assessments fail closed.
- [x] Production excludes synthetic and unverified legacy imports and requires the pinned BioVet receipt provenance.
- [x] Missing/invalid production source datasets stop startup.
- [x] Pending AI results are withheld for fresh, cached and BYOK requests; production rejects an unreviewed override.
- [x] Legacy cached/approved verdicts cannot bypass the current structured schema and approval policy.
- [x] Production requires durable DB_PATH and actual session/HTTPS configuration; the environment template contains supported settings.
- [x] Web Vite/Vitest tooling upgraded to remove the critical testing-tool advisories; release-scoped audit gates actual installed dependency locations.
- [x] Docker package includes a non-root runtime, persistent volume, health checks, restart configuration and an online backup command.
- [x] Vercel frontend configuration includes SPA routing, security headers and an explicit HTTPS API URL build gate.
- [x] Mobile production URL enforcement, timeout and cancellation aligned; mobile distribution remains a separate acceptance gate.
- [x] Verify final Docker build/restart/representative backup in GitHub CI (Docker is not installed on this Windows host).
- [ ] Configure real hosting, domains and OAuth credentials and complete the deployment checklist.

The package targets Vercel web + Docker API. It is not an all-Vercel SQLite deployment. See [deployment instructions](VERCEL-DOCKER-DEPLOYMENT.md). Source publisher claims remain explicitly disclosed; these software changes do not certify clinical accuracy or independently establish reviewer credentials.

Local remediation verification: full backend suite passed 341 tests in 75 suites; after the clean install and cache/source hardening, 61 focused tests passed. Workspace lint/types and both builds passed; web tests passed 13/13. Production smoke now loads only 583 BioVet records with receipts, defaults to withholding unreviewed AI, and returns unknown for the wrong-species catalog fixture. Final browser and container checks are recorded below when complete.

Additional remediation checks: release-scoped API runtime and web build audits both report zero advisories. React Router upgraded to 7.18.4; React runtimes are deduplicated and exiting animated auth guards stop repeat redirects. All five browser checks passed before the redirect refinement; the final browser pass is pending. The standalone online backup restored representative account, key, session and review fixtures with integrity intact. Full workspace/mobile advisories remain tracked outside this web/API release.

Final local browser run: 5/5 passed without repeated redirect warnings. Vercel builds reject a missing API URL and accept the HTTPS endpoint fixture. Initial container CI caught an omitted build cleanup helper; the Docker build stage now includes it, and container verification is being repeated.

Verified release code: `ca244e8f109e7ce28e22fb6fec19d587b226e658`, [successful GitHub CI run](https://github.com/Sunayana225/Petpal/actions/runs/37966484184). All four jobs passed: Node 22 and 24 verification, browser/load and production container. Container account/key/session/review persistence, restart smoke and backup integrity all passed. Local web tests 13/13, browser tests 5/5, focused auth redirect regression 1/1, and both Vercel URL build gates passed. Release-scoped audits report zero advisories; full workspace/mobile advisories remain outside this release scope. Real deployment acceptance and clinical/source suitability still require the checklist above.
