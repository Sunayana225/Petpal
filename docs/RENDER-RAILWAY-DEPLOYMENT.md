# Deploy PetPal from Windows: Render or Railway

Prepared 9 October 2026. Choose **one** API host below; keep your frontend on Vercel. You can complete the main setup in your Windows browser. You do not need to install Ubuntu, Docker or Caddy on your computer. These platforms build the repository's Dockerfile and provide HTTPS.

This is a setup guide, not evidence that your hosting account has been deployed. Confirm the live checks at the end before inviting users.

## Shared configuration

Your repository is `Sunayana225/Petpal`, production branch `master`. Keep the **repository root** as the build context; the Dockerfile needs the root lockfile and backend workspace. Do not choose `apps/backend` as the root directory. Deploy the root `Dockerfile`; the self-hosted `compose.yaml` is not the configuration used by these dashboards.

Choose a region near your users and budget for compute, persistent storage and network usage. Review the provider's current bill estimate before creating the service. Do not rely on a trial/free service as a permanent public API.

Set these in your API service's private environment-variable settings:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` (configure the public target port accordingly) |
| `DB_PATH` | `/var/lib/petpal/petpal.db` |
| `SESSION_SECRET` | A random secret generated below; keep stable across deployments |
| `WEB_APP_URL` | Exact frontend origin, e.g. `https://app.example.com` |
| `CORS_ORIGIN` | Same exact trusted frontend origin |
| `OAUTH_CALLBACK_BASE` | API HTTPS origin, e.g. `https://api.example.com` |
| `SESSION_COOKIE_SAMESITE` | `lax` for app/api subdomains on the same parent domain; `none` for a cross-site Vercel/host pair |
| `AI_CACHE_SERVE_UNREVIEWED` | `false` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Your GitHub OAuth application's credentials, if using GitHub login |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Your Google OAuth client's credentials, if using Google login |
| `LOG_LEVEL` | `info` |

Configure at least one OAuth provider for users to sign in and create keys. Optional AI credentials can remain unset for the initial deployment. The complete supported template is `apps/backend/.env.production.example` in the repository. Never put session secrets or OAuth/provider secrets into Vercel variables beginning with `VITE_`.

### Generate the session secret on Windows

In **Windows PowerShell**:

```powershell
$petpalSecretBytes = New-Object byte[] 48
$petpalRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$petpalRandom.GetBytes($petpalSecretBytes)
[Convert]::ToBase64String($petpalSecretBytes)
$petpalRandom.Dispose()
```

Copy the printed value into the API host's `SESSION_SECRET` setting. Store it privately. Do not regenerate it on every deploy; rotation invalidates sessions.

### Domains and cookies

For a first test, you can use the provider's generated API domain and your Vercel domain. Set `SESSION_COOKIE_SAMESITE=none` when these are different sites. Browser third-party-cookie restrictions can still prevent login.

For public launch, connect `app.example.com` to Vercel and `api.example.com` to the API host, using the precise DNS records each dashboard displays. Then use `lax`. Do not include `/api` or a trailing slash in the origin variables above. `VITE_API_URL`, configured later, **does** end in `/api`.

## Option A: Render

Render supports Docker builds and HTTPS web services. Persistent disks require a **paid service**. [Web-service setup](https://render.com/docs/web-services), [Docker support](https://render.com/docs/docker).

### A1. Create a Docker web service

1. Sign in to Render in your browser.
2. Choose **New → Web Service**.
3. Connect your GitHub account and select `Sunayana225/Petpal`.
4. Use these settings:

| Setting | PetPal value |
|---|---|
| Name | `petpal-api` or another unique service name |
| Branch | `master` |
| Region | Near your users |
| Root Directory | Leave blank: repository root |
| Runtime / Language | Docker |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | Repository root, if this setting is shown |
| Docker command override | Leave blank; use the image's CMD |
| Instance count | One |
| Plan | Paid web service supporting a persistent disk |
| Health Check Path | `/api/ready` |

Leave Node build/start command overrides unset when using Docker. Set `PORT=3001`; the API reads this variable. Render routes its HTTPS endpoint to the application's listening port.

### A2. Attach the database disk

In **Advanced** during creation, or the service's **Disk** page:

1. Add a persistent disk.
2. Mount it at **`/var/lib/petpal`**.
3. Select capacity with room for the database, WAL and backups; 1 GB is an initial small-project estimate, not a capacity guarantee.
4. Verify `DB_PATH=/var/lib/petpal/petpal.db`.

Only files under the mount survive redeployments. Use one instance and expect brief downtime during disk-backed redeploys. The disk is available at runtime, not during image builds or separate pre-deploy jobs. [Disk behavior and limitations](https://render.com/docs/disks).

### A3. Add secrets and deploy

Add the shared environment variables in the service settings. If the final generated API domain is not known yet, create the service, copy its assigned domain, update `OAUTH_CALLBACK_BASE` to that exact HTTPS origin and redeploy before testing login. A provisional URL must not remain in the final configuration.

Click **Create Web Service** or **Deploy**. Watch the deployment logs. The Docker build should finish, the API should start and `/api/ready` should pass. Keep the start command from the image.

### A4. Verify the endpoint and HTTPS

Copy the exact generated URL from the dashboard, for example `https://petpal-api-UNIQUE.onrender.com`. In your Windows browser, open:

```text
https://YOUR_RENDER_DOMAIN/api/ready
```

Or in PowerShell:

```powershell
curl.exe --fail "https://YOUR_RENDER_DOMAIN/api/ready"
```

Use the generated HTTPS domain immediately, or add `api.example.com` in the service's custom-domain settings and apply its DNS records. Update the callback base and OAuth redirect URLs when changing domains.

### A5. Backups on Render

Open the running service's **Shell** and run:

```sh
cd /app
node scripts/backup-db.cjs /var/lib/petpal/backups/backup-2026-10-09-unique.db
```

Use a new filename every time. Export the verified file off the service using Render's documented SSH/SCP transfer method and your dashboard's exact connection details. Run the download from Windows; do not invent an SSH hostname from the public API domain. The non-root image may not permit installing extra transfer tools through apt in its shell.

Keep an encrypted copy outside Render and rehearse a restore on an isolated service. Render's disk documentation warns against relying on disk-snapshot restore for custom database recovery; PetPal provides SQLite's online backup command for database-consistent snapshots. Do not use a separate cron/one-off service expecting to access this disk. [Disk transfers and database backup guidance](https://render.com/docs/disks).

## Option B: Railway

Railway builds Dockerfiles, supports volumes and provides HTTPS domains. Check the plan's current usage limits and billing settings before deployment. [Dockerfile builds](https://docs.railway.com/builds/dockerfiles), [public networking](https://docs.railway.com/networking/public-networking).

### B1. Create a project from GitHub

1. Sign in to Railway in your browser.
2. Choose **New Project → Deploy from GitHub repo**, or the equivalent GitHub service option.
3. Connect GitHub and select `Sunayana225/Petpal`.
4. Select branch `master`.
5. Keep **Root Directory** at the repository root.
6. Confirm the build uses the root `Dockerfile`. If detection chooses a different builder, select Dockerfile and set its path to `Dockerfile` (or the documented `RAILWAY_DOCKERFILE_PATH=Dockerfile` setting).
7. Leave the start-command override blank; use the image CMD.
8. Configure one replica and readiness path `/api/ready`. Keep the service available for public use; do not deliberately configure sleeping behavior for this release.

Do not assume the first automatic deployment has persistent storage. Complete B2/B3 and redeploy before creating user data.

### B2. Attach a volume

Add a volume to the API service using the project's canvas/service storage controls. Set its mount path to **`/var/lib/petpal`**. Verify the volume belongs to the API service in the correct environment and set `DB_PATH=/var/lib/petpal/petpal.db`.

Volumes mount at runtime, not build or pre-deploy time. Keep one replica; this guide does not implement replicated SQLite. [Railway volumes documentation](https://docs.railway.com/volumes).

### B3. Set variables and handle volume permissions

Add the shared production variables in the API service's **Variables** settings. Railway documents that volumes mount as root and recommends this setting for images that normally use a non-root user:

```text
RAILWAY_RUN_UID=0
```

PetPal's image normally runs as `node`. The setting above overrides that and runs the process as root on Railway so it can write the volume. This differs from the non-root self-hosted package. Follow Railway's supported volume-permission approach; retaining a non-root runtime would require a tested ownership-initialization change. Do not solve permissions by making the database world-writable. [Railway volume permissions](https://docs.railway.com/volumes#permissions).

Save/apply the variables and redeploy. If the API logs report a permission error, verify the mount and UID setting before continuing.

### B4. Generate the public HTTPS domain

In the API service's **Settings → Networking → Public Networking**, choose **Generate Domain**. Use target port **3001**, matching `PORT=3001`. Copy the actual HTTPS hostname Railway assigns.

Set `OAUTH_CALLBACK_BASE` to that exact HTTPS origin and redeploy. Verify:

```powershell
curl.exe --fail "https://YOUR_RAILWAY_DOMAIN/api/ready"
```

For a custom `api.example.com`, use **Custom Domain** and apply the exact DNS record Railway provides. Wait for HTTPS provisioning, then update callback base/provider redirect settings to the custom domain. [Domain and TLS setup](https://docs.railway.com/networking/public-networking).

### B5. Backups on Railway

Use a shell/SSH session into the **running deployed service**, not `railway run` on your Windows computer. `railway run` runs a local command with variables and does not place it inside the deployed container.

Inside the running API container:

```sh
cd /app
node scripts/backup-db.cjs /var/lib/petpal/backups/backup-2026-10-09-unique.db
```

Use a new filename. Railway's volume tooling supports file downloads. If using its CLI, install/authenticate it according to current official instructions and link/select the correct project, environment, service and volume. Download the backup to Windows and move it to restricted encrypted off-provider storage. Volume-manager paths are relative to the volume root; the file above is under `/backups/`, not the container's full `/var/lib/petpal/...` path. [Volume file tools](https://docs.railway.com/volumes).

Test restoring representative account/key/session/review data on a separate environment before relying on the backups. Platform backup features can supplement the application backup; confirm their restore behavior for your database.

## Connect either API to Vercel

1. Import the PetPal repository in Vercel with the repository root as Root Directory.
2. Use Node 22.12+ or Node 24. Keep the root `vercel.json` settings.
3. Set **Production** `VITE_API_URL` to the actual API endpoint:

```text
VITE_API_URL=https://YOUR_API_HOSTNAME/api
```

4. Set backend `WEB_APP_URL` and `CORS_ORIGIN` to the exact frontend origin.
5. Choose the correct cookie policy from the shared configuration above.
6. Deploy/redeploy Vercel after changing `VITE_API_URL`; it is embedded at build time.
7. Do not send production sessions from arbitrary preview domains; configure trusted previews separately.

## OAuth callback URLs

Register the selected API origin with your provider:

```text
GitHub: https://YOUR_API_HOSTNAME/api/auth/github/callback
Google: https://YOUR_API_HOSTNAME/api/auth/google/callback
```

Use your frontend origin as the app homepage. Configure Google's consent/audience settings for your intended users. The callback URL must match exactly. Update it if you switch from a generated domain to a custom domain.

## Acceptance tests for both options

- Open public `/api/ready` and confirm success over HTTPS without a certificate bypass.
- On Vercel, open `/login` and `/tokens` directly and confirm SPA routing works.
- Check a known food and inspect source evidence.
- Sign in with a real configured OAuth provider.
- Create an API key and call a protected endpoint using the site's `/docs` example and your API hostname.
- Confirm unauthenticated protected calls return 401 and authenticated usage is recorded.
- Sign out, confirm protected navigation redirects, then sign in again.
- Restart/redeploy the API; confirm account, keys and session state persist.
- Create an application backup, export it and rehearse restore on an isolated environment.
- Configure readiness monitoring, error alerts, disk-usage alerts and backup-failure alerts.

## Troubleshooting and ongoing operation

| Symptom | What to check |
|---|---|
| Build cannot find workspace files | Root directory/build context must be repository root |
| Service never becomes ready | Read logs; verify PORT, session secret, HTTPS origins and DB mount |
| Database permission denied | Volume ownership; Railway UID override; Render supported ownership configuration |
| Records vanish after redeploy | DB_PATH must be inside the attached persistent volume in the same environment |
| OAuth redirect mismatch | Exact callback URL and OAUTH_CALLBACK_BASE |
| Login appears to vanish | Cookie SameSite, exact CORS origin and third-party cookie blocking |
| Browser calls wrong hostname | Correct VITE_API_URL and rebuild Vercel |
| Unknown/pending verdict | Production withholds unsupported/unreviewed results by design |

Back up before updates. Prefer deploying commits whose GitHub CI passed; disable immediate auto-deploys until your update/acceptance process is established, or use the provider's CI-gated deployment setting if available. Expect short downtime for a single disk-backed instance. Never delete/detach the active volume as a fix for a build failure. Older app revisions may be incompatible with migrated databases, so review migration compatibility before rollback.

To restore SQLite, stop writes, preserve the current main database together with its WAL/SHM files as a rollback copy, install the verified compatible backup at DB_PATH with correct ownership, then restart and test. Do not mix old WAL files with a restored main DB. Plan this as maintenance; it changes live state.

The existing software CI validates Docker and representative persistence/backup behavior. These managed-host configurations still require live acceptance. Source suitability and recall-data refresh ownership remain operational responsibilities.

## Community Wisdom

The DevRelay lookup for managed Docker/SQLite hosting returned “Not connected to MLH.” No community evidence is claimed. This document uses the linked official Render/Railway references and the checked-in PetPal configuration. Provider UI labels and billing may change; confirm the service summary before creation.
