# PetPal Mobile

The native client for PetPal — Expo + React Native + TypeScript, sharing the same
API and the same restrained editorial design language as `apps/web`.

## Screens

- **Checker** — pick a species, enter a food, get a verdict from the same API.
- **Info** — how resolution works, the endpoint index, emergency contacts.

## Running

This app is part of an npm workspace, so dependencies are installed **once** at
the repository root:

```bash
npm install                 # once, from the repository root
npm run dev:api             # the API on :3001 (separate terminal)
npm run dev:mobile          # Expo; press a / i / w, or scan with Expo Go
```

Prefer to run it on its own? From this folder, `npm run start` works too.

Copy `.env.example` to `.env` to point `EXPO_PUBLIC_API_URL` at your API. On a
**physical device**, `localhost` refers to the phone — use your machine's LAN
address (e.g. `http://192.168.1.20:3001/api`).

## Checks

```bash
npm run typecheck
```

## Monorepo note

`metro.config.js` watches the workspace root and resolves packages from both the
app and the root `node_modules`. That is what lets Metro work inside a workspace
instead of failing to find hoisted dependencies.
