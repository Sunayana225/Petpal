# PetPal Mobile

The native client for PetPal — Expo + React Native + TypeScript, sharing the same
API and the same restrained editorial design language as `petpal-web/`.

## Screens

- **Checker** — pick a species, enter a food, get a verdict from the same API.
- **Browse** — the veterinary database by species and safety category.
- **Info** — how resolution works, the endpoint index, emergency contacts.

## Running

```bash
cd petpal-mobile
npm install
cp .env.example .env        # point EXPO_PUBLIC_API_URL at your API if needed
npx expo start              # then press a / i / w, or scan with Expo Go
```

The API must be running (`cd petpal-backend && npm run dev`). On a **physical
device**, `localhost` refers to the phone — set `EXPO_PUBLIC_API_URL` to your
machine's LAN address (e.g. `http://192.168.1.20:3001/api`).

## Checks

```bash
npm run typecheck
```
