# Analytics & campaign attribution

PetPal ships **no third-party scripts by default**. Attribution capture works
regardless; a provider is only loaded if you configure one.

## What is captured

On first load, [`src/lib/attribution.ts`](./src/lib/attribution.ts) reads these
query parameters and stores them, first-party, with no cookie of its own:

| Parameter | Meaning |
| --- | --- |
| `utm_source` | Where the visit came from — e.g. `chatgpt.com`, `newsletter` |
| `utm_medium` | The channel — e.g. `referral`, `email`, `social` |
| `utm_campaign` | The specific campaign name |
| `utm_term` | Paid keyword (optional) |
| `utm_content` | Creative/variant (optional) |
| `gclid` / `fbclid` | Click IDs from Google / Meta ads |
| `ref` | Generic short referral tag |

Values are kept for the **session** (last-touch) and the **browser**
(first-touch) — both in plain `sessionStorage`/`localStorage`, never cookies.

## Enabling a provider

Set exactly one of these in `.env` (see `.env.example`):

```bash
# Plausible — cookieless, no consent banner needed
VITE_PLAUSIBLE_DOMAIN=petpal.example.com

# …or Umami
VITE_UMAMI_WEBSITE_ID=00000000-0000-0000-0000-000000000000
VITE_UMAMI_SRC=https://analytics.example.com/script.js
```

`src/lib/analytics.ts` then:

- loads the provider's script once,
- emits **one pageview per route** (Plausible's own first-load pageview is
  deferred to; Umami auto-tracking is disabled so we control it),
- attaches the captured campaign values as custom properties,
- keeps a clean `<link rel="canonical">` (origin + path, no query) so `?utm_*`
  variants are never indexed as duplicate pages.

## Link conventions

Append UTMs to links **you publish** (bio links, posts, docs). Most AI
assistants append their own — ChatGPT emits `?utm_source=chatgpt.com`, which
this setup captures without any extra work.

```text
https://petpal.example.com/?utm_source=newsletter&utm_medium=email&utm_campaign=launch
https://petpal.example.com/browse?utm_source=chatgpt.com&utm_medium=referral
```

**Do not** add UTMs to PetPal's own internal links — it fragments sessions and
creates duplicate URLs.

## Notes

- Because this is a client-rendered SPA, the canonical tag and pageviews are set
  from JavaScript. If organic search matters, add prerendering/SSR so crawlers
  see a per-route canonical and title.
- No consent banner is required for the cookieless setup above; if you later
  switch to a cookie-based tool (e.g. GA4), that changes.
