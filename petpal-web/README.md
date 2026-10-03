# 🐾 PetPal Web

The React client for [PetPal](../README.md) — a food-safety checker for pets.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 (proxies /api -> localhost:3001)
```

Start the backend first:

```bash
cd ../petpal-backend
npm install
npm run dev        # http://localhost:3001
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server with an `/api` proxy |
| `npm run build` | Type-check (`tsc --noEmit`) then bundle to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run lint` / `lint:fix` | ESLint (flat config, React hooks rules) |
| `npm run typecheck` | Type-check only |

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
