# PetPal API: server, persistent database and HTTPS setup

Prepared 9 October 2026. This guide uses **one fresh Ubuntu 24.04 LTS x86-64 server**, Docker Compose and Caddy. The frontend stays on Vercel. You can use any provider that offers a Linux virtual machine with durable local disk, a public IP and SSH access. Commands below are instructions for your server; they have not been executed on a live host for you.

## What you will have when finished

```text
Users → https://app.example.com → Vercel frontend
Users/API clients → https://api.example.com → Caddy HTTPS proxy
                                            → 127.0.0.1:3001 → Docker API
                                                              → SQLite volume
```

Caddy runs on the server and obtains/renews certificates. Only SSH and web ports are public. SQLite, accounts, keys, sessions and review records live in a Docker volume outside the container filesystem. Keep one API instance: independent SQLite files cannot share account state across replicas. [SQLite WAL requires local filesystem access](https://www.sqlite.org/wal.html).

## 1. Gather these values

| Value | Example / requirement |
|---|---|
| Server | Fresh Ubuntu 24.04, x86-64, durable local disk |
| Starting resources | 2 vCPUs, 2–4 GB RAM and 25+ GB disk are a planning estimate; measure your traffic before sizing production |
| Server IP | Your provider's public IPv4 address |
| SSH account | A user with sudo access, authenticated with an SSH key |
| Domain | A domain you control, with access to its DNS settings |
| Web origin | `https://app.example.com`, connected to Vercel |
| API origin | `https://api.example.com`, pointing to this server |
| OAuth | GitHub or Google client ID and secret |
| Backup destination | A separate encrypted backup location outside this server |

Replace **every** `example.com`, `SERVER_IP` and `SERVER_USER` below with your actual values. Buying/provisioning a server and domain is done in your hosting account; this document does not purchase them.

## 2. Create the server and DNS records

In the provider dashboard, create the server with your SSH public key. Choose durable local storage and enable provider backups if available. Note its IP.

At your domain's DNS provider:

- Add an **A** record: name `api`, value your server's IPv4 address.
- Configure `app` using the exact DNS record Vercel shows in your project's Domains settings.
- Add an API **AAAA** record only if IPv6 works on the server and the firewall allows web traffic over IPv6. Remove an incorrect AAAA record before requesting HTTPS.
- For this guide, use direct DNS for `api`, without an additional CDN/proxy layer. The API trusts one reverse proxy hop; adding another proxy needs a separate forwarding configuration review.

Use a custom `app` domain on the same parent domain as `api` for more predictable cookie login. If you keep a `project.vercel.app` frontend, see the cookie settings in step 5.

## 3. Connect from your Windows computer

Open PowerShell or CMD on your computer:

```powershell
ssh SERVER_USER@SERVER_IP
```

Confirm the SSH host fingerprint against your provider's information on first connection. From here on, commands marked `bash` run **inside the SSH session on Ubuntu**, not in Windows CMD.

On a fresh server:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl ca-certificates gnupg nano ufw dnsutils
```

Configure the provider's network firewall to allow TCP 22 from your own IP and TCP 80/443 from the internet. If your SSH service uses another port, allow that port instead of 22. Then configure Ubuntu's firewall, keeping the current SSH connection open:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Open a second SSH session and confirm you can still connect. Do not expose port 3001. Docker-published ports can bypass UFW rules; PetPal's Compose file deliberately binds port 3001 to loopback. [Docker firewall guidance](https://docs.docker.com/engine/install/ubuntu/#firewall-limitations).

## 4. Install Docker and Compose

These commands target a fresh server. If Docker or containerd is already installed, follow Docker's conflict-removal guidance before changing it. Use the official repository rather than the convenience installation script for production.

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

The test should print a successful Docker greeting. This guide uses `sudo docker` throughout. [Official Ubuntu installation instructions](https://docs.docker.com/engine/install/ubuntu/).

## 5. Download PetPal and configure production

```bash
sudo mkdir -p /opt/petpal
sudo chown "$(id -un):$(id -gn)" /opt/petpal
git clone --branch master https://github.com/Sunayana225/Petpal.git /opt/petpal
cd /opt/petpal
git rev-parse HEAD
cp apps/backend/.env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 48
nano .env.production
```

Copy the generated random value into `SESSION_SECRET`. Keep it stable across routine restarts and deploys. Changing it invalidates existing sessions. Keep this file private and never commit it or paste it into frontend variables.

Set these values, using your real domains and secrets:

```dotenv
NODE_ENV=production
PORT=3001
SESSION_SECRET=PASTE_YOUR_GENERATED_RANDOM_VALUE
WEB_APP_URL=https://app.example.com
OAUTH_CALLBACK_BASE=https://api.example.com
CORS_ORIGIN=https://app.example.com
SESSION_COOKIE_SAMESITE=lax
DB_PATH=/var/lib/petpal/petpal.db
AI_CACHE_SERVE_UNREVIEWED=false
GITHUB_CLIENT_ID=YOUR_GITHUB_OAUTH_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_GITHUB_OAUTH_CLIENT_SECRET
```

Keep the remaining supported settings from the copied template. Configure Google instead of, or in addition to, GitHub if preferred. Leave optional AI credentials blank for an initial launch without AI generation. Do not enable development login. Production refuses the unreviewed-AI override.

The Compose configuration passes `.env.production` to the API; Node alone does not automatically load that filename. The database path is inside the mounted volume, not inside the ephemeral image.

**If the frontend uses `https://your-project.vercel.app`:** set `WEB_APP_URL` and `CORS_ORIGIN` to that exact origin and set `SESSION_COOKIE_SAMESITE=none`. Cross-site login then depends on browser third-party cookie support. Custom `app.example.com` and `api.example.com` origins with `lax` are preferable. Do not put a path or trailing slash in an origin setting.

### Register OAuth

For a GitHub OAuth application, set the homepage to your web origin and the authorization callback URL to:

```text
https://api.example.com/api/auth/github/callback
```

For a Google OAuth web client, set the authorized redirect URI to:

```text
https://api.example.com/api/auth/google/callback
```

Configure Google's consent/audience settings so intended users can sign in; a test-only application can restrict access to designated test users. Copy provider secrets only into the server environment file. Without a configured provider, public information can work but users cannot sign in to create API keys.

## 6. Start the API with persistent storage

Always run Compose from `/opt/petpal` with the same project name:

```bash
cd /opt/petpal
sudo docker compose -p petpal config --quiet
sudo docker compose -p petpal up -d --build
sudo docker compose -p petpal ps
sudo docker compose -p petpal logs --tail=100 api
curl --fail http://127.0.0.1:3001/api/ready
sudo docker volume inspect petpal_petpal-data
```

Readiness should return HTTP 200. The volume name is `petpal_petpal-data` when using `-p petpal` with the current Compose file. Docker manages the volume on the server's persistent disk. Routine container recreation keeps it; a new server does not automatically receive it.

Do not use `docker compose down -v`, volume removal or volume pruning against this database. Keep disk space available for SQLite, WAL, backups and image builds. The API image already runs as a non-root user; the database directory is writable while the root filesystem stays read-only.

You do not need to install Node on Ubuntu to run the packaged API. Run the project's smoke script through its Node image:

```bash
sudo docker run --rm --network host \
  -v /opt/petpal/scripts/smoke-deployment.cjs:/smoke.cjs:ro \
  node:22-bookworm-slim node /smoke.cjs http://127.0.0.1:3001
```

The smoke script checks readiness, expected local verdicts, source evidence, disabled development login, anonymous access refusal and recall coverage disclosure.

## 7. Install Caddy for HTTPS

Install the stable package using Caddy's official instructions:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Back up the initial config, then edit it:

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.before-petpal
sudo nano /etc/caddy/Caddyfile
```

Replace its contents with this configuration, changing the hostname:

```caddyfile
api.example.com {
    reverse_proxy 127.0.0.1:3001 {
        transport http {
            response_header_timeout 60s
        }
    }
}
```

Caddy preserves the API path and handles forwarding headers. Do not strip `/api` or add a second public proxy in this configuration. The response timeout accommodates the backend's remote lookup budget. The application enforces its JSON body limit.

Check DNS, validate and start HTTPS:

```bash
dig +short api.example.com A
dig +short api.example.com AAAA
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
sudo journalctl -u caddy --no-pager -n 60
curl --fail https://api.example.com/api/ready
```

The DNS address must reach this server. Ports 80 and 443 must be reachable so Caddy can obtain a certificate. Caddy handles renewal; keep its service and persistent certificate storage intact. Do not bypass certificate verification with `curl -k` to declare success. [Caddy installation](https://caddyserver.com/docs/install), [automatic HTTPS](https://caddyserver.com/docs/automatic-https), [proxy configuration](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Run the public HTTPS smoke test:

```bash
sudo docker run --rm \
  -v /opt/petpal/scripts/smoke-deployment.cjs:/smoke.cjs:ro \
  node:22-bookworm-slim node /smoke.cjs https://api.example.com
```

## 8. Connect your Vercel frontend

In Vercel, import `Sunayana225/Petpal` and keep the repository root as the Root Directory. Use Node 22.12+ or Node 24. The root `vercel.json` supplies the install/build commands and output directory.

Add this **Production** environment variable:

```text
VITE_API_URL=https://api.example.com/api
```

Add `app.example.com` in Vercel's Domains settings and apply its DNS instructions. Deploy/redeploy after setting the variable: Vite embeds it during the build, so changing it without rebuilding does not update the browser bundle. Provider secrets, session secrets and admin tokens belong only on the API server.

Open the site and confirm `/login` and `/tokens` load directly. Do not allow arbitrary Vercel preview origins to use production account sessions; use explicitly trusted origins and preferably a separate preview API.

## 9. Test the complete user journey

1. Visit the Vercel site and check a known food.
2. Sign in through the configured real OAuth provider.
3. Open the keys page, create an API key and store it privately.
4. Use the example request in the site's `/docs` page, changing its API hostname to yours and supplying your key as `Authorization: Bearer ...`.
5. Confirm authenticated usage is recorded and unauthenticated protected requests return 401.
6. Sign out, confirm protected pages redirect, then sign in again.
7. Restart the API and confirm accounts, keys and sessions remain:

```bash
cd /opt/petpal
sudo docker compose -p petpal restart api
curl --fail https://api.example.com/api/ready
```

The readiness request may briefly fail during restart; retry once the service is ready. The single-instance setup has brief deployment/restart downtime. Record your test outcome before opening public registration.

## 10. Create an online backup and copy it off the server

Use the project's backup command, which checks integrity and refuses to overwrite an existing destination:

```bash
cd /opt/petpal
backup_name="$(date -u +%Y%m%dT%H%M%SZ).db"
sudo docker compose -p petpal exec -T api \
  node scripts/backup-db.cjs "/var/lib/petpal/backups/$backup_name"
install -m 700 -d /opt/petpal-backups
sudo docker compose -p petpal cp \
  "api:/var/lib/petpal/backups/$backup_name" "/opt/petpal-backups/$backup_name"
sudo chown "$(id -un):$(id -gn)" "/opt/petpal-backups/$backup_name"
chmod 600 "/opt/petpal-backups/$backup_name"
printf '%s\n' "$backup_name"
```

On your Windows computer, replace the filename with the printed value and download it:

```powershell
scp SERVER_USER@SERVER_IP:/opt/petpal-backups/BACKUP_FILENAME.db .
```

The database contains private account/session/key metadata. Store backups in encrypted storage outside the server with restricted access. Copies on this host or its Docker volume are not protection against server loss. Back up before every update and at a cadence appropriate to how much data loss you can tolerate; automate delivery, retention and failure alerts on your chosen backup service. Keep an independent protected copy of deployment configuration/secrets needed for recovery.

### Restore rehearsal

Test restore on an isolated staging server before relying on backups. Stop the API, preserve the entire current database state as a rollback copy, and restore the verified snapshot as `/var/lib/petpal/petpal.db` in the correct volume. Move the old main DB and its WAL/SHM companions together out of the active location before placing the backup; do not combine a restored DB with old WAL files. Give the image's `node` user ownership/write access, start the service and test real account/key/session/review records. Keep rollback copies until acceptance passes. Restoring production changes live state, so schedule it deliberately.

Use SQLite's online backup, not a copy of an actively written main file. [SQLite backup reference](https://www.sqlite.org/backup.html).

## 11. Update and roll back the application

Before updating, create an off-server database backup and record the current revision and image. Deploy only a revision whose CI passed:

```bash
cd /opt/petpal
git rev-parse HEAD
sudo docker compose -p petpal images
git fetch origin master
git log -1 origin/master
```

Review the release and database migration notes. Then update the clean checkout and rebuild:

```bash
git pull --ff-only origin master
sudo docker compose -p petpal up -d --build
curl --fail https://api.example.com/api/ready
sudo docker compose -p petpal logs --tail=100 api
```

Re-run the public smoke and login checks. Container replacement preserves the named volume. If the new revision fails, return to the recorded revision and rebuild only after checking database migration compatibility. An older binary may not understand a migrated database; a database restore must use a compatible verified backup and the restore procedure above. Do not discard the volume to fix a build problem.

## 12. Troubleshooting

| Symptom | Check / action |
|---|---|
| Docker build fails | Read the first error in `docker compose -p petpal build`; confirm a current CI-green revision and free disk/RAM |
| API exits immediately | Read API logs; check SESSION_SECRET, HTTPS origins, DB_PATH and production source snapshot |
| SQLite permission error | Confirm the volume mounts at `/var/lib/petpal` and the container's node user can write it; do not use world-writable permissions |
| Caddy returns 502 | Test localhost readiness, Compose status and API logs; verify upstream is `127.0.0.1:3001` |
| Certificate issuance fails | Check A/AAAA records, ports 80/443, domain spelling and Caddy logs; DNS must point here |
| Login callback mismatch | Match the provider's redirect URI exactly, including `/api/auth/.../callback` |
| Login succeeds then appears logged out | Check exact CORS/web origin, HTTPS forwarding, cookie policy and browser third-party cookie blocking |
| Browser calls localhost or wrong API | Correct VITE_API_URL in Vercel and redeploy the frontend |
| CORS rejection | CORS_ORIGIN must match the browser's exact trusted origin; never solve credentialed requests with `*` |
| Missing records after redeploy | Confirm project name/volume identity; do not create a second empty volume |
| Unknown food/AI pending | Production deliberately withholds unsupported/unreviewed verdicts; this is not a hosting failure |

## 13. Launch checklist

- [ ] API public HTTPS readiness and smoke pass without certificate bypass.
- [ ] Port 3001 is not publicly reachable; one API instance uses the intended volume.
- [ ] Vercel production frontend uses the correct HTTPS API URL and custom domain.
- [ ] Real OAuth, keys, logout and restart persistence pass in supported browsers.
- [ ] Off-server backup and representative staging restore have been tested.
- [ ] Uptime alerts monitor `/api/ready`; an owner responds to failures.
- [ ] Monitor disk space, memory, error rates and quota abuse; measure expected traffic.
- [ ] Establish an update/rollback process and secret rotation procedure.
- [ ] Assign ownership for recall-data refreshes and source/clinical suitability review.

The software package passed Docker, persistence, backup, browser/load and Node 22/24 CI. That does not verify this newly provisioned server or certify dietary advice. Complete these live checks before public launch.

## Community Wisdom

DevRelay lookup was attempted for Docker/SQLite/Caddy deployment pitfalls but returned “Not connected to MLH.” No community findings are claimed. Commands and operational constraints above use the linked primary Docker, Caddy and SQLite documentation.
