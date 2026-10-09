# Deploy PetPal: Vercel web + Docker API

For a full server walkthrough with DNS, Docker installation, Caddy HTTPS, OAuth, backups and troubleshooting, see [Docker API server setup](DOCKER-API-SERVER-SETUP.md).

The web client deploys to Vercel. The API is a long-running Docker service with a persistent local SQLite volume. [Vercel does not support this local SQLite persistence model](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel). This package does not create a hosting account, purchase a plan, register domains or configure OAuth applications.

For browser-based hosting from Windows, see [Render and Railway deployment](RENDER-RAILWAY-DEPLOYMENT.md).

## 1. Configure the API

Copy `apps/backend/.env.production.example` to root `.env.production` for Docker Compose. Generate SESSION_SECRET with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`; place the output in the private environment file. Do not commit it.

Set real HTTPS origins for WEB_APP_URL, OAUTH_CALLBACK_BASE and CORS_ORIGIN. Example: web `https://app.example.com`, API `https://api.example.com`. Keep SESSION_COOKIE_SAMESITE=lax when these share the same registrable domain. Leave cookie Domain unset. Use DB_PATH=/var/lib/petpal/petpal.db, as provided by Compose.

Configure GitHub and/or Google credentials before enabling account access. Register `https://api.example.com/api/auth/github/callback` and/or `https://api.example.com/api/auth/google/callback` exactly. Without a configured provider, public food information works but accounts cannot sign in.

AI generation is optional. Production permanently gates unreviewed answers; attempting AI_CACHE_SERVE_UNREVIEWED=true rejects startup. Only the pinned, licensed BioVet dataset is loaded in production. Demo/legacy data remains available in development. Source-listed safe results are conditional information, not a clinical guarantee. Broad publisher species groups and review provenance remain visible in receipts.

## 2. Run the Docker API

```sh
docker compose config --quiet
docker compose up -d --build
node scripts/smoke-deployment.cjs http://127.0.0.1:3001
```

Compose binds the API to loopback only. Put an HTTPS reverse proxy in front of it on your Docker host. The proxy must overwrite X-Forwarded-For, X-Forwarded-Proto and Host correctly; the API trusts exactly one proxy hop. Block direct public access to the container. Set the proxy request timeout above 40 seconds, with HTTPS and body limits appropriate for the API's 100KB JSON limit. The API must be able to reach Google and Open Pet Food Facts if those optional lookups are used.

On a managed Docker host, build the repository-root Dockerfile, provide the environment through its secret settings, attach persistent storage at `/var/lib/petpal`, and route its public HTTPS endpoint to port 3001 (or the host-assigned PORT). Use `/api/ready` as the readiness check. Do not deploy multiple replicas with independent SQLite files. Network filesystem storage is not supported for WAL; see [SQLite WAL constraints](https://www.sqlite.org/wal.html).

The final image contains backend runtime dependencies, compiled API code and licensed source snapshots. Mobile tooling and legacy seed datasets are excluded. The container runs as the node user; Compose applies a read-only root filesystem, writable database volume, dropped Linux capabilities and no-new-privileges. A managed platform may need equivalent settings configured separately.

## 3. Deploy the web app to Vercel

Import the GitHub repository with the repository root as Root Directory. Select Node 22 (at least 22.12) or Node 24 in Vercel project settings. Use the root vercel.json, which builds only `@petpal/web` and publishes `apps/web/dist`.

Set **VITE_API_URL=https://api.example.com/api** in Vercel's Production environment before building. The build fails if this variable is absent or lacks an HTTPS API endpoint. Set the same variable separately for Preview if deploying previews; add only explicitly trusted preview origins to the backend allowlist. Do not expose provider secrets, SESSION_SECRET, ADMIN_TOKEN or GEMINI_API_KEY in VITE_ variables.

The Vercel configuration includes SPA deep-link routing and security headers. It permits Plausible scripts if deliberately configured. To enable a self-hosted Umami script, add its specific origin to script-src rather than disabling the CSP.

For a `*.vercel.app` frontend and API on a different site, set SESSION_COOKIE_SAMESITE=none and include the exact frontend HTTPS origin in CORS_ORIGIN. This needs secure cookies and browser third-party cookie support. Custom app/api subdomains on one site are preferable for predictable login behavior.

## 4. Back up and test restore

```sh
docker compose exec api node scripts/backup-db.cjs /var/lib/petpal/backups/2026-10-09.db
```

Use a new filename each time; the command refuses to overwrite existing files. It uses SQLite's online backup API and verifies integrity. Copy the resulting file to encrypted storage outside the Docker host and test a restore regularly. A backup on the same volume alone is not disaster recovery. See [SQLite backup documentation](https://www.sqlite.org/backup.html).

Restore with the API stopped: preserve the current database as a separate rollback copy, restore the verified backup into the configured database location, ensure the node user can write it, then restart. Do not combine a restored database with stale WAL/SHM files from another state. Keep snapshots and backup retention under operator control; no automatic destructive restore command is included.

## 5. Release acceptance checklist

- [ ] Configure actual domains, HTTPS proxy and durable storage; pass the smoke command against the public API origin.
- [ ] Confirm `/login`, `/tokens` and other SPA deep links load through Vercel.
- [ ] Complete real GitHub/Google consent, callback, refresh, logout and restart persistence checks.
- [ ] Verify cookie attributes and CSRF behavior on the actual web/API origins and supported browsers.
- [ ] Restore representative account/key/session/review data from an off-host backup.
- [ ] Configure uptime/readiness monitoring and actionable alerts; rehearse rollback and secret rotation.
- [ ] Set traffic expectations and validate sustained load and latency against the chosen host.
- [ ] If AI is enabled, exercise real provider success, quota errors, cancellation and manual review.
- [ ] Assign ownership for FDA snapshot refreshes. Recall coverage is a partial US listing, not a complete monitoring service.
- [ ] Review clinical/source suitability for the audience. Publisher claims are not independent clinical validation.

The mobile app is not distributed by this Vercel/Docker release. Its HTTPS URL enforcement and request timeout were aligned, but store builds and physical-device acceptance remain a separate release.

## Verification commands

```sh
npm ci --ignore-scripts
npm run verify
npm run audit:release
npm run test:e2e
npm run test:load
```

CI also builds the production Docker image, checks health and public data policy, tests backup integrity and repeats smoke checks after restart. Local Windows checks cannot build Docker unless Docker Engine is installed; CI container results must pass before declaring the container verified.

Installation uses `--ignore-scripts` because better-sqlite3 13 packages N-API prebuilt binaries but npm otherwise attempts a native source rebuild when it sees binding.gyp. CI and Docker explicitly probe SQLite after installation, and the web build verifies its native build tooling. Do not assume an ignored install hook means a native dependency works: use the provided verification commands.

Release package verified at `ca244e8` by [CI run 37966484184](https://github.com/Sunayana225/Petpal/actions/runs/37966484184): Node 22/24 checks, browser/load tests, Docker build, restart persistence and representative online backup integrity all passed. Complete the live-origin acceptance checklist before public launch.
