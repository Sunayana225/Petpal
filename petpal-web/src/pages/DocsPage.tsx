import type { ReactNode } from 'react';

import { Reveal } from '../motion/primitives';
import { SAFETY_META } from '../pets';
import type { SafetyLevel } from '../types';

const SAFETY_LEVELS: SafetyLevel[] = ['safe', 'caution', 'unsafe', 'unknown'];

type ParamIn = 'path' | 'query' | 'body' | 'header';

interface Param {
  name: string;
  in: ParamIn;
  type: string;
  required: boolean;
  description: string;
}

interface EndpointDoc {
  method: string;
  path: string;
  auth: string;
  summary: string;
  params?: Param[];
  request?: string;
  response: string;
}

interface DocGroup {
  group: string;
  note: string;
  endpoints: EndpointDoc[];
}

const DOC_GROUPS: DocGroup[] = [
  {
    group: 'Service',
    note: 'No authentication. Useful for uptime checks.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/health',
        auth: 'public',
        summary: 'Liveness, uptime and whether the AI key is configured.',
        response: `{
  "status": "OK",
  "message": "PetPal API is running!",
  "version": "2.0.0",
  "environment": "development",
  "uptime": 128,
  "services": { "gemini": true },
  "requestId": "mutm32uy-zluj7hukn"
}`,
      },
      {
        method: 'GET',
        path: '/api/info',
        auth: 'public',
        summary: 'Version, supported species and the endpoint index.',
        response: `{
  "name": "PetPal Food Safety API",
  "version": "2.0.0",
  "supportedPets": ["dogs", "cats", "rabbits", "…"],
  "endpoints": { "check": "POST /api/food-safety/check", "…": "…" }
}`,
      },
    ],
  },
  {
    group: 'Food safety — public',
    note: 'No API key. Only the single check is public — every bulk/dataset endpoint requires a key.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/food-safety/check',
        auth: 'public',
        summary: 'Check a food for a species. Prefer this when you control the client.',
        params: [
          { name: 'pet', in: 'body', type: 'string', required: true, description: 'Species, 1–50 chars, letters and spaces. Aliases accepted (dog / puppy / dogs).' },
          { name: 'food', in: 'body', type: 'string', required: true, description: 'Food name, 1–100 chars. Normalised automatically.' },
          { name: 'X-Gemini-Key', in: 'header', type: 'string', required: false, description: 'Optional BYOK key for the AI fallback.' },
        ],
        request: `curl -X POST http://localhost:3001/api/food-safety/check \\
  -H "Content-Type: application/json" \\
  -d '{"pet":"dog","food":"chocolate"}'`,
        response: `{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "message": "❌ chocolate is NOT SAFE for dog according to Veterinary database!",
  "source": "database",
  "details": {
    "food": "chocolate",
    "safety": "unsafe",
    "severity": "high",
    "description": "Chocolate contains theobromine and caffeine, which are toxic to dogs…",
    "symptoms": ["vomiting", "diarrhea", "increased heart rate", "seizures"],
    "alternatives": ["carob treats", "dog-safe cookies"],
    "source": "Veterinary database"
  },
  "requestId": "mutnvjrq-dket60fxt",
  "processingTime": "1ms"
}`,
      },
      {
        method: 'GET',
        path: '/api/food-safety/check?pet=dog&food=chocolate',
        auth: 'public',
        summary: 'Same check via query string — linkable and cacheable in a browser.',
        params: [
          { name: 'pet', in: 'query', type: 'string', required: true, description: 'Species (aliases accepted).' },
          { name: 'food', in: 'query', type: 'string', required: true, description: 'Food name.' },
          { name: 'X-Gemini-Key', in: 'header', type: 'string', required: false, description: 'Optional BYOK key.' },
        ],
        request: `curl "http://localhost:3001/api/food-safety/check?pet=dog&food=chocolate"`,
        response: `{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "source": "database",
  "message": "❌ chocolate is NOT SAFE for dog according to Veterinary database!",
  "requestId": "…",
  "processingTime": "1ms"
}`,
      },
    ],
  },
  {
    group: 'Food safety — keyed',
    note: 'Require Authorization: Bearer sk-… — both at /api/v1 and on the bulk endpoints of /api/food-safety. Per-key quota and usage logging.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/food-safety/check?pet=dog&food=chocolate',
        auth: 'Bearer key',
        summary: 'Identical result to the public endpoint, metered against your key’s quota.',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer sk-… — your API key.' },
          { name: 'pet', in: 'query', type: 'string', required: true, description: 'Species.' },
          { name: 'food', in: 'query', type: 'string', required: true, description: 'Food name.' },
          { name: 'X-Gemini-Key', in: 'header', type: 'string', required: false, description: 'Optional BYOK key.' },
        ],
        request: `curl "http://localhost:3001/api/v1/food-safety/check?pet=dog&food=chocolate" \\
  -H "Authorization: Bearer sk-your-key"`,
        response: `{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "source": "database",
  "message": "❌ chocolate is NOT SAFE for dog according to Veterinary database!",
  "requestId": "…",
  "processingTime": "1ms"
}

// Over quota (HTTP 429):
{
  "error": "Too Many Requests",
  "message": "API key quota exceeded.",
  "quota": { "limit": 1000, "used": 1000, "window": "day", "remaining": 0 }
}`,
      },
      {
        method: 'GET',
        path: '/api/food-safety/search?q=apple&pet=dog',
        auth: 'Bearer key',
        summary: 'Type-ahead across the whole dataset. Omit pet to sweep every species.',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer sk-… — your API key.' },
          { name: 'q', in: 'query', type: 'string', required: true, description: 'Search text, 1–100 chars.' },
          { name: 'pet', in: 'query', type: 'string', required: false, description: 'Narrow to one species.' },
        ],
        request: `curl "http://localhost:3001/api/food-safety/search?q=apple" \\
  -H "Authorization: Bearer sk-your-key"`,
        response: `{
  "query": "apple",
  "pet": null,
  "count": 3,
  "results": [
    { "food": "apples", "pet": "dogs", "safety": "safe", "description": "…" }
  ]
}`,
      },
      {
        method: 'GET',
        path: '/api/food-safety/safe/:pet',
        auth: 'Bearer key',
        summary: 'All safe foods for a species. Swap safe for caution or unsafe.',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer sk-… — your API key.' },
          { name: 'pet', in: 'path', type: 'string', required: true, description: 'Species (aliases accepted).' },
        ],
        request: `curl "http://localhost:3001/api/food-safety/safe/rabbits" \\
  -H "Authorization: Bearer sk-your-key"`,
        response: `{
  "pet": "rabbits",
  "count": 74,
  "safeFoods": [
    { "food": "timothy hay", "safety": "safe", "description": "…" }
  ]
}`,
      },
      {
        method: 'GET',
        path: '/api/food-safety/pets',
        auth: 'Bearer key',
        summary: 'Every supported species.',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer sk-… — your API key.' },
        ],
        response: `{
  "supportedPets": ["dogs","cats","rabbits","hamsters","birds","turtles","fish","lizards","snakes","chickens"],
  "count": 10
}`,
      },
      {
        method: 'GET',
        path: '/api/food-safety/stats',
        auth: 'Bearer key',
        summary: 'Record counts per species and the total coverage.',
        params: [
          { name: 'Authorization', in: 'header', type: 'string', required: true, description: 'Bearer sk-… — your API key.' },
        ],
        response: `{
  "stats": { "dogs": { "safe": 4854, "caution": 3495, "unsafe": 2912, "total": 11261 }, "…": {} },
  "supportedPets": ["dogs","cats","…"],
  "totalEntries": 30437,
  "timestamp": "2026-10-04T09:47:14.672Z"
}`,
      },
    ],
  },
  {
    group: 'Bring your own Gemini key',
    note: 'Let a caller supply their own Gemini key so the AI fallback spends their quota.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/gemini/validate',
        auth: 'public',
        summary: 'Check a Gemini key against Google (read-only; no generation quota spent).',
        params: [
          { name: 'apiKey', in: 'body', type: 'string', required: true, description: 'The Gemini key to check.' },
        ],
        request: `curl -X POST http://localhost:3001/api/gemini/validate \\
  -H "Content-Type: application/json" \\
  -d '{"apiKey":"AQ.Ab8…"}'`,
        response: `{ "valid": true }`,
      },
    ],
  },
  {
    group: 'Accounts & API keys',
    note: 'Session cookie required (sign in at /login). Manage keys and read usage.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/auth/me',
        auth: 'session',
        summary: 'The signed-in user, or null. Use it to hydrate a client.',
        response: `{
  "user": {
    "id": "a537d90f-…",
    "provider": "github",
    "email": "you@example.com",
    "name": "Your Name",
    "avatarUrl": "https://…",
    "role": "user"
  }
}`,
      },
      {
        method: 'GET',
        path: '/api/me/keys',
        auth: 'session',
        summary: 'List your active keys, each with live usage.',
        response: `{
  "keys": [
    {
      "id": "f6cc14c9-…",
      "name": "Production server",
      "prefix": "sk-0caaf",
      "last4": "9830",
      "enabled": true,
      "scope": "food-safety",
      "quotaLimit": 1000,
      "quotaWindow": "day",
      "createdAt": "2026-10-04T10:11:33.038Z",
      "lastUsedAt": "2026-10-04T10:11:42.697Z",
      "usage": { "limit": 1000, "used": 3, "window": "day", "remaining": 997 }
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/me/keys',
        auth: 'session',
        summary: 'Create a key. The full key is returned ONCE and never again.',
        params: [
          { name: 'name', in: 'body', type: 'string', required: true, description: 'A label, 1–60 chars.' },
          { name: 'quotaLimit', in: 'body', type: 'integer | null', required: false, description: 'Max calls per window; null = unlimited. Default from DEFAULT_KEY_QUOTA.' },
          { name: 'quotaWindow', in: 'body', type: '"day" | "month" | "total"', required: false, description: 'Rolling window for the quota. Default "day".' },
        ],
        request: `curl -X POST http://localhost:3001/api/me/keys \\
  -H "Content-Type: application/json" -b cookies.txt \\
  -d '{"name":"Production server","quotaLimit":1000,"quotaWindow":"day"}'`,
        response: `{
  "key": { "id": "f6cc14c9-…", "name": "Production server", "prefix": "sk-0caaf", "last4": "9830", "enabled": true, "quotaLimit": 1000, "quotaWindow": "day" },
  "rawKey": "sk-0caaf8bc4896190ad975f8a5ea4f3f453162ffba03f89830"
}`,
      },
      {
        method: 'PATCH',
        path: '/api/me/keys/:id',
        auth: 'session',
        summary: 'Rename, enable/disable, or change the quota of a key.',
        params: [
          { name: 'id', in: 'path', type: 'string', required: true, description: 'The key id.' },
          { name: 'name', in: 'body', type: 'string', required: false, description: 'New label.' },
          { name: 'enabled', in: 'body', type: 'boolean', required: false, description: 'Enable or disable.' },
          { name: 'quotaLimit', in: 'body', type: 'integer | null', required: false, description: 'New limit; null = unlimited.' },
          { name: 'quotaWindow', in: 'body', type: 'string', required: false, description: 'day | month | total.' },
        ],
        request: `curl -X PATCH http://localhost:3001/api/me/keys/f6cc14c9-… \\
  -H "Content-Type: application/json" -b cookies.txt \\
  -d '{"enabled":false}'`,
        response: `{ "key": { "id": "f6cc14c9-…", "enabled": false, "…": "…" } }`,
      },
      {
        method: 'DELETE',
        path: '/api/me/keys/:id',
        auth: 'session',
        summary: 'Revoke a key immediately. Requests with it then fail with 401.',
        params: [
          { name: 'id', in: 'path', type: 'string', required: true, description: 'The key id.' },
        ],
        request: `curl -X DELETE http://localhost:3001/api/me/keys/f6cc14c9-… -b cookies.txt`,
        response: `{ "key": { "id": "f6cc14c9-…", "enabled": false, "revokedAt": "2026-10-04T10:12:03.812Z" } }`,
      },
      {
        method: 'GET',
        path: '/api/me/keys/:id/usage',
        auth: 'session',
        summary: 'One key’s total calls, per-day counts and recent calls.',
        params: [
          { name: 'id', in: 'path', type: 'string', required: true, description: 'The key id.' },
          { name: 'since', in: 'query', type: 'ISO date', required: false, description: 'Start of the daily window. Default: 30 days.' },
        ],
        response: `{
  "key": { "id": "f6cc14c9-…", "prefix": "sk-0caaf", "last4": "9830" },
  "quota": { "limit": 1000, "used": 3, "window": "day", "remaining": 997 },
  "total": 3,
  "daily": [ { "day": "2026-10-04", "count": 3 } ],
  "recent": [ { "method": "GET", "path": "/api/v1/food-safety/check", "status": 200, "latencyMs": 1, "ts": "…" } ]
}`,
      },
      {
        method: 'GET',
        path: '/api/me/usage',
        auth: 'session',
        summary: 'Usage aggregated across all of your keys.',
        response: `{
  "totals": { "total": 3, "since": 3 },
  "daily": [ { "day": "2026-10-04", "count": 3 } ],
  "recent": [ { "method": "GET", "path": "…", "status": 200, "latencyMs": 1 } ]
}`,
      },
    ],
  },
  {
    group: 'Operations',
    note: 'Admin token (x-admin-token) or an admin session required.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/admin/queue?status=pending',
        auth: 'admin',
        summary: 'AI answers captured for human review.',
        params: [
          { name: 'x-admin-token', in: 'header', type: 'string', required: true, description: 'The ADMIN_TOKEN.' },
          { name: 'status', in: 'query', type: 'string', required: false, description: 'pending | approved | rejected.' },
        ],
        response: `{
  "stats": { "pending": 2, "approved": 1, "rejected": 0, "cached": 5, "total": 8 },
  "records": [ { "id": "…", "pet": "dogs", "food": "dragonfruit", "safety": "caution", "status": "pending" } ]
}`,
      },
      {
        method: 'POST',
        path: '/api/admin/queue/:id/approve',
        auth: 'admin',
        summary: 'Promote a captured answer (permanent, never expires).',
        response: `{ "record": { "id": "…", "status": "approved", "reviewedAt": "…" } }`,
      },
    ],
  },
];

const RESULT_FIELDS: { field: string; type: string; description: string }[] = [
  { field: 'pet', type: 'string', description: 'Echoes the caller’s pet, unchanged' },
  { field: 'food', type: 'string', description: 'Echoes the caller’s food, unchanged' },
  { field: 'safety', type: 'string', description: 'safe · caution · unsafe · unknown' },
  { field: 'message', type: 'string', description: 'Human-readable verdict line' },
  { field: 'source', type: 'string', description: 'database · external · ai · none — where the answer came from' },
  { field: 'details', type: 'object', description: 'description, symptoms, benefits, alternatives, preparation, recommendation, severity' },
  { field: 'requestId', type: 'string', description: 'Correlation id, also returned as an X-Request-Id header' },
  { field: 'processingTime', type: 'string', description: 'Server-side handling time, e.g. "1ms"' },
];

const ERRORS: { code: string; title: string; meaning: string }[] = [
  { code: '400', title: 'Bad Request', meaning: 'Missing or invalid input; the body lists the specific errors.' },
  { code: '401', title: 'Unauthorized', meaning: 'Missing/invalid API key, or a protected route without a session.' },
  { code: '403', title: 'Forbidden', meaning: 'Key not permitted from this IP, or a blocked cross-origin request.' },
  { code: '404', title: 'Not Found', meaning: 'Unknown route, key, or record.' },
  { code: '429', title: 'Too Many Requests', meaning: 'IP rate limit hit, or the key’s quota is exhausted.' },
  { code: '500', title: 'Internal Server Error', meaning: 'Unexpected failure — details are hidden in production.' },
];

const TOC = [
  { id: 'overview', label: 'What this API is' },
  { id: 'request', label: 'Request format' },
  { id: 'auth', label: 'Authentication' },
  { id: 'endpoints', label: 'Endpoints & examples' },
  { id: 'result', label: 'Response format' },
  { id: 'verdicts', label: 'Verdicts' },
  { id: 'errors', label: 'Errors' },
  { id: 'limits', label: 'Limits & quotas' },
  { id: 'examples', label: 'Code examples' },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto bg-carbon p-5 text-xs leading-relaxed text-parchment/90">
      {children}
    </pre>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-slate pt-10">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-2xl tracking-tight text-ink sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-stone">{children}</div>
    </section>
  );
}

function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="mt-4 border-t border-slate">
      <div className="hidden grid-cols-[11rem_4.5rem_9rem_4rem_1fr] gap-x-4 border-b border-slate py-2 text-[10px] uppercase tracking-wide-cap text-mist sm:grid">
        <span>Name</span>
        <span>In</span>
        <span>Type</span>
        <span>Req.</span>
        <span>Description</span>
      </div>
      {params.map((param) => (
        <div
          key={`${param.in}${param.name}`}
          className="grid grid-cols-1 gap-x-4 gap-y-1 border-b border-slate py-2.5 text-sm sm:grid-cols-[11rem_4.5rem_9rem_4rem_1fr]"
        >
          <code className="font-mono text-xs text-charcoal">{param.name}</code>
          <span className="text-xs text-mist">{param.in}</span>
          <span className="text-xs text-mist">{param.type}</span>
          <span className={`text-xs ${param.required ? 'text-unsafe' : 'text-mist'}`}>
            {param.required ? 'required' : 'optional'}
          </span>
          <span className="col-span-1 text-sm text-stone sm:col-span-1">{param.description}</span>
        </div>
      ))}
    </div>
  );
}

function EndpointCard({ doc }: { doc: EndpointDoc }) {
  return (
    <div className="mt-10 border-t border-slate pt-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide-cap text-forest">
          {doc.method}
        </span>
        <code className="break-all font-mono text-sm text-ink">{doc.path}</code>
        <span className="text-[10px] uppercase tracking-wide-cap text-mist">{doc.auth}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-stone">{doc.summary}</p>

      {doc.params && <ParamTable params={doc.params} />}

      {doc.request && (
        <>
          <p className="eyebrow mt-5">Request</p>
          <Code>{doc.request}</Code>
        </>
      )}
      <p className="eyebrow mt-5">Response</p>
      <Code>{doc.response}</Code>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-20 sm:px-10">
      <Reveal>
        <p className="eyebrow">API reference</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-light leading-tight tracking-tight text-ink sm:text-6xl">
          The PetPal API, documented properly.
        </h1>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-stone">
          Every endpoint below shows its exact parameters, a real request, and the response you get
          back — enough to build a client without guessing.
        </p>
      </Reveal>

      <Reveal delay={0.15}>
        <nav
          aria-label="Contents"
          className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-y border-slate py-4 text-[11px] uppercase tracking-wide-cap text-mist"
        >
          {TOC.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="link-line hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>
      </Reveal>

      <div className="mt-14 space-y-16">
        <Section id="overview" eyebrow="01" title="What this API is">
          <p>
            PetPal answers one question well:{' '}
            <strong className="text-charcoal">is a given food safe for a given animal?</strong> You
            send a species and a food name; you get back a verdict (
            <code className="font-mono text-charcoal">safe</code>,{' '}
            <code className="font-mono text-charcoal">caution</code>,{' '}
            <code className="font-mono text-charcoal">unsafe</code> or an honest{' '}
            <code className="font-mono text-charcoal">unknown</code>), a human-readable message,
            supporting detail, and the provenance of the answer.
          </p>
          <p>
            It supports ten species — dogs, cats, rabbits, hamsters, birds, turtles, fish, lizards,
            snakes and chickens — and normalises messy input, so{' '}
            <code className="font-mono text-charcoal">apple</code>,{' '}
            <code className="font-mono text-charcoal">apples</code> and{' '}
            <code className="font-mono text-charcoal">&quot;  Bell-Peppers!! &quot;</code> all resolve.
          </p>
          <p>Every check resolves cheapest-and-most-trustworthy-first, and the response labels which layer answered:</p>
          <ol className="ml-4 list-decimal space-y-1">
            <li><strong className="text-charcoal">Veterinary database</strong> — the merged in-memory index (curated + BioVet + Growli/ASPCA + synthetic seed). Instant, free.</li>
            <li><strong className="text-charcoal">Open Pet Food Facts</strong> — a free external product database.</li>
            <li><strong className="text-charcoal">Gemini</strong> — last resort, labelled as AI-assisted.</li>
            <li><strong className="text-charcoal">Unknown</strong> — nothing could answer; consult a vet.</li>
          </ol>
        </Section>

        <Section id="request" eyebrow="02" title="Request format">
          <p>
            Base URL: <code className="font-mono text-charcoal">http://localhost:3001</code> locally,
            or your deployment host. All bodies are JSON; send{' '}
            <code className="font-mono text-charcoal">Content-Type: application/json</code> for POST
            and PATCH. <code className="font-mono text-charcoal">GET</code> endpoints take their
            inputs as query parameters.
          </p>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate text-left text-[10px] uppercase tracking-wide-cap text-mist">
                  <th className="py-2 pr-4">Header</th>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2">Value</th>
                </tr>
              </thead>
              <tbody className="text-stone">
                <tr className="border-b border-slate">
                  <td className="py-2 pr-4"><code className="font-mono text-xs text-charcoal">Content-Type</code></td>
                  <td className="py-2 pr-4">POST / PATCH</td>
                  <td className="py-2"><code className="font-mono text-xs">application/json</code></td>
                </tr>
                <tr className="border-b border-slate">
                  <td className="py-2 pr-4"><code className="font-mono text-xs text-charcoal">Authorization</code></td>
                  <td className="py-2 pr-4">/api/v1/*, bulk endpoints</td>
                  <td className="py-2"><code className="font-mono text-xs">Bearer sk-…</code></td>
                </tr>
                <tr className="border-b border-slate">
                  <td className="py-2 pr-4"><code className="font-mono text-xs text-charcoal">X-Gemini-Key</code></td>
                  <td className="py-2 pr-4">optional</td>
                  <td className="py-2">A caller-supplied Gemini key (never stored)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code className="font-mono text-xs text-charcoal">Cookie</code></td>
                  <td className="py-2 pr-4">/api/me/*, /api/auth/*</td>
                  <td className="py-2">Session cookie set by sign-in</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="auth" eyebrow="03" title="Authentication">
          <p>
            <strong className="text-charcoal">Only the check endpoint is public.</strong>{' '}
            <code className="font-mono">GET|POST /api/food-safety/check</code> needs nothing (subject
            to the IP rate limit). Everything else — search, the food lists, stats — needs a key.
          </p>
          <p>
            <strong className="text-charcoal">Keyed endpoints</strong> require your key on every
            request:
          </p>
          <Code>{`Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
          <p>
            Create keys in the console (<a href="/login" className="link-line text-charcoal">sign in</a>{' '}
            → Tokens). A key is <strong className="text-charcoal">shown once</strong> — we store only
            a hash, so copy it somewhere safe. Send it as a header, never in a query string.
          </p>
          <p>
            <strong className="text-charcoal">Bring your own Gemini key (optional).</strong> Add{' '}
            <code className="font-mono text-charcoal">X-Gemini-Key: AIza…</code> and the AI fallback
            spends your quota; it is used for that one request and never stored.
          </p>
        </Section>

        <Section id="endpoints" eyebrow="04" title="Endpoints & examples">
          <p>Each endpoint lists its parameters, a real request, and the response.</p>
          {DOC_GROUPS.map((group) => (
            <div key={group.group} className="mt-12">
              <h3 className="font-display text-xl text-ink">{group.group}</h3>
              <p className="mt-1 text-xs text-mist">{group.note}</p>
              {group.endpoints.map((endpoint) => (
                <EndpointCard key={`${endpoint.method}${endpoint.path}`} doc={endpoint} />
              ))}
            </div>
          ))}
        </Section>

        <Section id="result" eyebrow="05" title="Response format">
          <p>The check result object, field by field:</p>
          <div className="border-t border-slate">
            {RESULT_FIELDS.map((field) => (
              <div
                key={field.field}
                className="grid grid-cols-[9rem_1fr] gap-x-6 gap-y-1 border-b border-slate py-3"
              >
                <code className="font-mono text-xs text-charcoal">{field.field}</code>
                <span className="text-sm text-stone">
                  <span className="text-mist">{field.type} · </span>
                  {field.description}
                </span>
              </div>
            ))}
          </div>
          <p className="pt-2">
            List endpoints return{' '}
            <code className="font-mono text-charcoal">{'{ pet, safeFoods | cautionFoods | unsafeFoods, count }'}</code>
            ; search returns <code className="font-mono text-charcoal">{'{ query, pet, results, count }'}</code>.
          </p>
        </Section>

        <Section id="verdicts" eyebrow="06" title="Verdicts">
          <div className="grid gap-px border border-slate bg-slate sm:grid-cols-2 lg:grid-cols-4">
            {SAFETY_LEVELS.map((verdict) => {
              const meta = SAFETY_META[verdict];
              return (
                <div key={verdict} className="bg-parchment p-5">
                  <p className={`font-display text-xl ${meta.text}`}>{meta.label}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{meta.gloss}</p>
                </div>
              );
            })}
          </div>
        </Section>

        <Section id="errors" eyebrow="07" title="Errors">
          <p>Failures use a consistent envelope:</p>
          <Code>{`{
  "error": "Bad Request",
  "code": 400,
  "message": "Pet and food parameters are required",
  "requestId": "mb3x1k2a-9f4d",
  "timestamp": "2026-10-04T10:31:22.446Z"
}`}</Code>
          <div className="mt-4 border-t border-slate">
            {ERRORS.map((error) => (
              <div
                key={error.code}
                className="grid grid-cols-[3rem_9rem_1fr] gap-x-4 gap-y-1 border-b border-slate py-3"
              >
                <code className="font-mono text-xs text-charcoal">{error.code}</code>
                <span className="text-sm text-charcoal">{error.title}</span>
                <span className="col-span-2 text-sm text-stone sm:col-span-1">{error.meaning}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="limits" eyebrow="08" title="Rate limits & quotas">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-charcoal">Public</strong> — 100 requests / 15 minutes per IP by
              default (<code className="font-mono">RATE_LIMIT_MAX_REQUESTS</code>,{' '}
              <code className="font-mono">RATE_LIMIT_WINDOW_MS</code>).
            </li>
            <li>
              <strong className="text-charcoal">Keyed</strong> — a per-key quota (set at creation,
              default from <code className="font-mono">DEFAULT_KEY_QUOTA</code>). Over quota returns{' '}
              <code className="font-mono">429</code> with the current quota in the body.
            </li>
            <li>
              Every keyed call is logged; read live usage at{' '}
              <code className="font-mono">/api/me/keys</code> and{' '}
              <code className="font-mono">/api/me/keys/:id/usage</code>.
            </li>
          </ul>
        </Section>

        <Section id="examples" eyebrow="09" title="Code examples">
          <p className="text-charcoal">JavaScript / TypeScript</p>
          <Code>{`const res = await fetch(
  'https://petpalapi.onrender.com/api/v1/food-safety/check?pet=cat&food=milk',
  { headers: { Authorization: 'Bearer sk-your-key' } },
);
const data = await res.json();
console.log(data.safety, data.source); // "caution" "database"`}</Code>
          <p className="text-charcoal">Python</p>
          <Code>{`import requests

r = requests.get(
    "https://petpalapi.onrender.com/api/v1/food-safety/check",
    params={"pet": "rabbit", "food": "carrot"},
    headers={"Authorization": "Bearer sk-your-key"},
)
data = r.json()
print(data["safety"], data["source"])  # safe database`}</Code>
        </Section>
      </div>
    </div>
  );
}
