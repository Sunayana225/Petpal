# Architecture

How the PetPal repository is organised, why, and where to add things.

## Shape of the repo

PetPal is a small npm-workspace monorepo. One `npm install` at the root installs
everything; one `npm run verify` lints, type-checks, tests and builds it all.

```
Petpal/
├─ apps/
│  ├─ backend/   Express + TypeScript API      (repositories → services → routes)
│  ├─ web/       React + Vite client
│  └─ mobile/    Expo / React Native client
├─ docs/         cross-cutting documentation
├─ tsconfig.base.json      compiler options every app shares
├─ eslint.config.base.mjs  rules every app shares
└─ package.json            workspaces + root scripts
```

Each app is independently runnable (`npm run dev:api`, `npm run dev:web`,
`npm run dev:mobile`) and independently typed. Nothing imports across apps; they
share a contract, not code.

## The backend is layered

The dependency arrow always points **inward**:

```
routes  →  services  →  repositories  →  domain
                            ↓
                        datasets / db
```

| Layer | Owns | Never does |
| --- | --- | --- |
| `domain/` | Pure types. Imports nothing. | Know about HTTP, SQL or data files |
| `datasets/` | Generated data blobs | Contain logic |
| `repositories/` | Reading/writing data — SQLite and the in-memory dataset index | Business rules |
| `services/` | Business logic — how a verdict is reached, how keys/quota work | Talk to Express or SQL directly |
| `routes/` | HTTP shape — paths, validation, status codes | Construct their own services |
| `middleware/` | Cross-cutting request concerns (auth, keys, ids, errors) | Business logic |

`app.ts` is the **composition root**. It is the only place that constructs the
`FoodSafetyService` and hands it to `createApiRouter(...)`. Routers are factories
(`createCheckRouter(service)`), so a route module can be tested with a stub
without touching the database or the network.

### Routing: the surface is explicit

`routes/index.ts` states, in one place, what is public and what is keyed:

- `GET|POST /api/food-safety/check` — **public**; what the web and mobile apps call.
- `/api/food-safety/{search,pets,stats,safe|caution|unsafe}` — **key required**;
  these expose the whole dataset.
- `/api/v1/food-safety/*` — everything, keyed **and usage-metered**.
- `/api/auth`, `/api/me` — the developer console (session cookie).
- `/api/admin`, `/api/monitoring` — admin only.

Route modules never add auth middleware themselves; the mount decides. That way
"is this endpoint public?" is answered by reading one file.

### Configuration

`config/env.ts` is the only module that reads `process.env`. It exposes typed
**getters**, not a snapshot, so a missing value fails at the point of use with a
clear message and tests can change an environment variable and see the effect on
the next call.

## The clients are shaped the same way

`apps/web` and `apps/mobile` share one internal structure, so moving between them
is friction-free:

```
src/
  api/        client.ts (transport) + feature modules (foodSafety, console)
  domain/     types.ts and pets.ts — the shared vocabulary
  lib/        framework-free helpers (analytics, keys, auth context)
  components/ presentational components
  pages/ | screens/   one component per route
```

`api/client.ts` owns the base URL, timeout, `ApiError` and JSON encoding and
knows nothing about endpoints; `api/foodSafety.ts` and friends own the endpoints
and know nothing about HTTP. That split is why the client layer is testable with
a single mocked `fetch`.

## Naming conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Packages | `@petpal/<app>` | `@petpal/backend` |
| Backend modules | `camelCase.ts`, suffix by role | `apiKeyService.ts`, `foodSafetyRepository.ts` |
| Backend entry | `index.ts` | `apps/backend/src/index.ts` |
| Backend factories | `createXxx` | `createCheckRouter` |
| React pages / screens | `PascalCase.tsx` | `HomePage.tsx`, `CheckerScreen.tsx` |
| Everything else (front-end) | `camelCase.ts` | `attribution.ts` |
| Docs | `kebab-case.md` under `docs/` | `supported-animals.md` |

## Where do I add…?

- **A new endpoint** → a route module under `routes/`; construct it in
  `routes/index.ts` and mount it on the surface that matches its sensitivity.
- **A new data source** → an `AnswerSource` implementation in
  `services/answerSources.ts` and add it to the chain. Nothing else changes.
- **A new table** → a migration in `db/migrations.ts`, a repository in
  `repositories/`, then the service that uses it.
- **A new screen** → `src/pages/` (web) or `src/screens/` (mobile), plus a
  route/tab entry.
- **A new environment variable** → one getter in `config/env.ts`; never read
  `process.env` anywhere else.
- **Documentation** → `docs/`, unless it is specific to one app (then that app's
  `README.md`).
