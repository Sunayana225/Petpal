# 🐾 PetPal

**Instant, veterinary-sourced answers to "can my pet eat this?" — for ten species, with an AI fallback for the unusual stuff.**

PetPal is an open-source pet food-safety checker. It answers with data first, states
where every verdict came from, and prefers an honest `unknown` over a guess.

---

## How it works

Every check resolves in a fixed, cheapest-and-most-trustworthy-first order, and the
response always labels which layer produced the answer (`source`):

1. **Veterinary database** — a merged, in-memory index of curated, species-specific
   safety records. Instant, free, and the most trustworthy answer available.
2. **Open Pet Food Facts** — a free external database, used for foods we have no
   local record for.
3. **Gemini AI** — a last-resort, clearly-labelled analysis for everything else.
4. **`unknown`** — when nothing can answer, PetPal says so and advises a vet.

Common suffixes and spellings are normalised (`"Bell-Peppers!!"` → `"bell peppers"`,
`apple` ↔ `apples`, `dog` ↔ `puppy`), so lookups do not silently miss.

## AI answers & the review queue

An AI answer is **never trusted silently**. When Gemini produces a real verdict
for a food the database did not know, the answer is captured as a `pending`
record in `apps/backend/data/learned.json` (operational data, git-ignored, and
persisted across restarts).

A human then approves or rejects it through a token-protected admin API:

```bash
# List what is waiting (requires ADMIN_TOKEN)
curl http://localhost:3001/api/admin/queue?status=pending -H "x-admin-token: $ADMIN_TOKEN"

# Promote a record — merged into the live dataset immediately, no restart
curl -X POST http://localhost:3001/api/admin/queue/<id>/approve -H "x-admin-token: $ADMIN_TOKEN"

# Discard a record so it never reaches the dataset
curl -X POST http://localhost:3001/api/admin/queue/<id>/reject -H "x-admin-token: $ADMIN_TOKEN"
```

Approved records join the index as source `AI (approved)` and are the *least*
authoritative layer, so the more cautious verdict still wins on any conflict.
Set `ADMIN_TOKEN` in the environment; without it, every `/api/admin/*` request is
refused (it fails closed).

## Bring your own AI key (BYOK)

Visitors can supply their own Gemini key from the checker. It is kept in
`sessionStorage` only, validated against Google when saved (`POST /api/gemini/validate`,
a cheap read-only call), and sent as `X-Gemini-Key` on each check — used for that one
request, never stored or logged. A key that fails returns `unknown` and is **not**
written to the shared answer cache, so a bad key cannot poison everyone else's results.
Valid AI answers *are* cached and shared, exactly like the server key's.

## Developer platform (accounts, API keys, console)

Sign in with GitHub or Google, then create keys in the console (`/login` →
`/dashboard`).

- **Sessions** are httpOnly cookies backed by SQLite, so logins survive restarts.
- **Keys** — `POST /api/me/keys` returns the raw `sk-…` **once**; only a sha256
  hash is stored. Keys can be enabled/disabled, given a rolling quota, and revoked.
- **Keyed API** — `/api/v1/food-safety/*` is the *same* handlers behind
  `Authorization: Bearer sk-…`, with a per-key quota (`429` when exceeded) and
  usage logging. On the public mount only `/check` is open; the bulk/dataset
  endpoints (`search`, `pets`, `stats`, the category lists) require a key there too.
- **Usage** — one `usage_events` row per keyed call; `GET /api/me/usage` returns
  totals, per-day counts and recent calls.

### Registering OAuth apps (you must do this)

The API cannot create these for you:

- **GitHub** → Settings → Developer settings → OAuth Apps.
  Callback: `http://localhost:3001/api/auth/github/callback`
- **Google Cloud** → APIs & Services → Credentials → OAuth client (Web).
  Callback: `http://localhost:3001/api/auth/google/callback`

Set `SESSION_SECRET` and the client ids/secrets (see `.env.example`).

### Trying the console without OAuth (development only)

Key generation requires a signed-in user, so until OAuth is configured use the
dev shortcut: the web login page shows a **"Continue as dev user (local only)"**
button in development, backed by `POST /api/auth/dev-login`. It is refused in
production unless you deliberately set `DEV_AUTH=1`.

## Supported species

Ten: **dogs, cats, rabbits, hamsters, birds, turtles, fish, lizards, snakes,
chickens.** The live source of truth is `GET /api/food-safety/pets`; record counts
come from `GET /api/food-safety/stats` (both require an API key). The shipped
dataset is a few hundred merged records — see `/stats` rather than trusting a
number in prose.

## Repository layout

```
apps/backend/     Express + TypeScript API
  src/app.ts            composition root (middleware + route wiring)
  src/index.ts          process lifecycle + graceful shutdown
  src/config/           env parsing, API version
  src/domain/           pure domain types
  src/routes/           HTTP routes; foodSafety/ splits check from dataset
  src/services/         business logic (food safety, AI, keys, answers)
  src/repositories/     data access (SQLite + in-memory dataset index)
  src/datasets/         generated ManyPets dataset
  src/middleware/       auth, API keys, request id, errors
  src/utils/            cache, http, normalization, logger
  src/tests/            Jest + Supertest suites
  data/                 curated + imported JSON datasets

apps/web/         React 18 + Vite + Tailwind v4 client
  src/api/              HTTP client, food-safety + console endpoints
  src/domain/           shared types, species/verdict metadata
  src/pages/            one component per route
  src/components/       CheckForm, ResultCard, Header, Footer, …
  src/lib/              analytics, attribution, auth context
  src/motion/           motion tokens and primitives

apps/mobile/      Expo + React Native client (TypeScript)
  App.tsx               bottom-tab navigator
  src/api/              HTTP client + food-safety endpoints
  src/domain/           shared types, species/verdict metadata
  src/screens/          Checker, Info
  src/components/       Button, SafetyBadge, ResultView, Reveal
```

Cross-cutting documentation lives in [`docs/`](./docs): `architecture.md`,
`process-flow.md`, `supported-animals.md`, `analytics.md`, `seo-setup.md`.

The backend is a clean layering — **repository → service → routes** — with
dependencies injected through constructors, so the domain is testable without
module-level singletons.

## Quick start

Install **once** at the repository root — every package is an npm workspace.

```bash
npm install
cp apps/backend/.env.example apps/backend/.env   # optional: add GEMINI_API_KEY
```

Then start what you need:

```bash
npm run dev:api      # API on :3001
npm run dev:web      # web client on :3000 (proxies /api -> :3001)
npm run dev:mobile   # Expo
```

Without an AI key PetPal still works: unknown foods return professional
"consult your veterinarian" guidance instead of an AI answer.

`npm run verify` at the root lints, type-checks, tests and builds every package.

## Configuration

### Backend (`apps/backend/.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default `3001`) |
| `NODE_ENV` | `development` / `production` / `test` |
| `GEMINI_API_KEY` | Enables the AI fallback (optional) |
| `ADMIN_TOKEN` | Token for the `/api/admin/*` review queue; unset disables it |
| `SESSION_SECRET` | Signs session cookies (required in production) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client |
| `WEB_APP_URL` | Where the browser returns after sign-in |
| `OAUTH_CALLBACK_BASE` | Public base URL used to build OAuth callbacks |
| `ADMIN_EMAILS` | Comma-separated emails promoted to admin on login |
| `DB_PATH` | SQLite file (default `data/petpal.db`) |
| `DEFAULT_KEY_QUOTA` / `DEFAULT_KEY_WINDOW` | Default quota for new keys |
| `CORS_ORIGIN` | Comma-separated allowed origins in production |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | Rate-limit tuning |
| `TRUST_PROXY` | Set to `1` when behind a proxy without `NODE_ENV=production` |

`OPENAI_API_KEY` is **not** used — it appears in the example file only as a
placeholder for future work.

### Web (`apps/web/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL; defaults to same-origin `/api` |
| `VITE_PLAUSIBLE_DOMAIN` | Enable cookieless Plausible analytics |
| `VITE_UMAMI_WEBSITE_ID`, `VITE_UMAMI_SRC` | …or Umami |

With no analytics variables set, the client ships **zero third-party scripts**. See
[`docs/analytics.md`](./docs/analytics.md).

## API

Base URL: `http://localhost:3001/api` (or the deployed host).

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Service info and endpoint index |
| `GET` | `/api/health` | Liveness + dependency status |
| `GET` | `/api/info` | Version, supported pets, endpoints |
| `POST` | `/api/food-safety/check` | Check a food — body `{ pet, food }` (public) |
| `GET` | `/api/food-safety/check?pet=dog&food=chocolate` | Same check, linkable (public) |
| `GET` | `/api/food-safety/search?q=apple[&pet=dog]` | Type-ahead across species — key required |
| `GET` | `/api/food-safety/pets` | Supported species — key required |
| `GET` | `/api/food-safety/stats` | Record counts per species — key required |
| `GET` | `/api/food-safety/{safe\|caution\|unsafe}/:pet` | Category lists — key required |
| `GET` | `/api/monitoring/status` \| `/metrics` | Process health and metrics — admin only |

Only `/check` is public. Everything else needs `Authorization: Bearer sk-…`.

```bash
curl -X POST http://localhost:3001/api/food-safety/check \
  -H "Content-Type: application/json" \
  -d '{"pet":"dog","food":"chocolate"}'
```

```json
{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "source": "database",
  "message": "❌ chocolate is NOT SAFE for dog according to Veterinary database!",
  "requestId": "…",
  "processingTime": "1ms"
}
```

Verdicts: `safe`, `caution`, `unsafe`, `unknown`.

Sign-in: `GET /api/auth/providers` (public — what this server can offer),
`GET /api/auth/:provider?next=/path` (starts OAuth; `next` is validated),
`POST /api/auth/dev-login` (local only), `GET /api/auth/me`,
`POST /api/auth/logout`.
Console (session cookie): `GET|POST /api/me/keys`, `PATCH|DELETE /api/me/keys/:id`,
`GET /api/me/usage`.
Keyed API: `/api/v1/food-safety/*` (requires `Authorization: Bearer sk-…`).

## Testing

```bash
npm test              # every package, from the repository root

# or one package at a time
npm test --workspace @petpal/backend   # Jest + Supertest
npm test --workspace @petpal/web       # Vitest
```

Every package also exposes `npm run lint`, `npm run typecheck` and `npm run build`;
`npm run verify` at the root runs all of them. CI (`.github/workflows/ci.yml`) runs
lint, build and tests on Node 20 and 22.

## Design

The web client uses a deliberately restrained, editorial design language — a
parchment canvas, charcoal ink, hairline rules instead of shadows, square corners,
and a single botanical accent — with slow, decelerating motion and full
`prefers-reduced-motion` support. Design tokens live in `apps/web/src/index.css`.

## Clients

- **Web** (`apps/web/`) — React + Vite single-page app.
- **Mobile** (`apps/mobile/`) — Expo / React Native, sharing the same API and
  design language.

## Roadmap

- Prerendering/SSR for the web client so crawlers see per-route metadata.
- Native push notifications for food recalls.

## Data sources & attribution

- **Curated dataset** (`apps/backend/data/foodSafety.json`) — compiled into this repo.
- **BioVet pet-food-safety** — foods, plants, human medications and household hazards,
  vetted by veterinarians. Adapted from
  [Bio-Vet/pet-food-safety](https://github.com/Bio-Vet/pet-food-safety) under **CC BY 4.0**.
  *Data: BioVet veterinary clinic network, [bio.vet](https://bio.vet).*
  Import with `npx ts-node src/scripts/importBioVet.ts`.
- **Growli plant toxicity** — 10,900+ common houseplants and garden plants with
  ASPCA-sourced cat/dog verdicts. Adapted from
  [getgrowli.app/data/plant-toxicity](https://www.getgrowli.app/data/plant-toxicity) under
  **CC BY 4.0**. *Plant-toxicity data by Growli (getgrowli.app), sourced from the ASPCA.*
  Import with `npx ts-node src/scripts/importGrowliPlants.ts`.
- **Synthetic seed** (`data/foodSafety.generated.json`) — generated by
  `scripts/generateSeedData.ts` and tagged `source: "AI (generated)"`.
  **Not veterinary-verified**; it exists to populate the app and give the review
  queue volume.

Sources are ranked **curated → BioVet → Growli → synthetic**, so a vet-sourced verdict
always wins a conflict and a generated row can only ever fill a gap.

## Contributing

1. Fork and branch.
2. `npm install` in the project you are changing.
3. Ensure `npm run lint`, `npm run typecheck` and `npm test` pass.
4. Open a pull request with a clear description.

## License

MIT — see [LICENSE](./LICENSE).

## Disclaimer

PetPal provides general information only and is **not** a substitute for
professional veterinary care. If you suspect poisoning, contact your veterinarian or
the **Pet Poison Helpline (855) 764-7661** / **ASPCA Poison Control (888) 426-4435**.
