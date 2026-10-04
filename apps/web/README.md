# 🐾 PetPal Web

The React client for [PetPal](../../README.md) — a food-safety checker for pets.

## Quick start

This app is part of an npm workspace, so dependencies are installed **once** at
the repository root:

```bash
npm install                 # once, from the repository root
npm run dev:api             # the API on :3001 (separate terminal)
npm run dev:web             # Vite on :3000, proxying /api -> :3001
```

Prefer to run it on its own? From this folder, `npm run dev` works too.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server with an `/api` proxy |
| `npm run build` | Type-check (`tsc --noEmit`) then bundle to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run lint` / `lint:fix` | ESLint (flat config, React hooks rules) |
| `npm run typecheck` | Type-check only |

## Layout

```
src/
  api/          HTTP client, food-safety and console endpoints
  domain/       shared types and species/verdict metadata
  lib/          analytics, attribution, auth context, Gemini key storage
  components/   presentational components
  pages/        one component per route
  motion/       motion tokens and primitives
```

## Configuration

Copy `.env.example` to `.env` if the API is not on the same origin.

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `/api` | Base URL of the PetPal API |

The dev server proxies `/api` to `http://localhost:3001`, so no configuration is
needed to run locally.

## Deployment note

This is a single-page app, so any static host must rewrite unknown paths to
`index.html` (Vercel `_redirects` / `/* /index.html 200`, Netlify `/*  /index.html  200`).

## Stack

React 18 · TypeScript · Vite · Tailwind CSS v4 · React Router 6 · Vitest
