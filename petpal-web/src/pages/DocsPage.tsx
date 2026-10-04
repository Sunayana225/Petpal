import type { ReactNode } from 'react';

import { Reveal } from '../motion/primitives';
import { SAFETY_META } from '../pets';
import type { SafetyLevel } from '../types';

const SAFETY_LEVELS: SafetyLevel[] = ['safe', 'caution', 'unsafe', 'unknown'];

interface Endpoint {
  method: string;
  path: string;
  description: string;
}

interface EndpointGroup {
  group: string;
  note: string;
  endpoints: Endpoint[];
}

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    group: 'Service',
    note: 'No authentication.',
    endpoints: [
      { method: 'GET', path: '/', description: 'Service info and endpoint index' },
      { method: 'GET', path: '/api/health', description: 'Liveness, uptime and dependency status' },
      { method: 'GET', path: '/api/info', description: 'Version, supported species, endpoint list' },
    ],
  },
  {
    group: 'Food safety (public)',
    note: 'No API key. IP rate-limited. This is what the web and mobile apps use.',
    endpoints: [
      { method: 'POST', path: '/api/food-safety/check', description: 'Check a food — body { pet, food }' },
      { method: 'GET', path: '/api/food-safety/check?pet=dog&food=chocolate', description: 'Same check via query string (linkable)' },
      { method: 'GET', path: '/api/food-safety/search?q=apple[&pet=dog]', description: 'Type-ahead across one or every species' },
      { method: 'GET', path: '/api/food-safety/pets', description: 'Supported species' },
      { method: 'GET', path: '/api/food-safety/stats', description: 'Record counts per species' },
      { method: 'GET', path: '/api/food-safety/safe/:pet', description: 'All safe foods for a species' },
      { method: 'GET', path: '/api/food-safety/caution/:pet', description: 'All caution foods' },
      { method: 'GET', path: '/api/food-safety/unsafe/:pet', description: 'All unsafe foods' },
    ],
  },
  {
    group: 'Food safety (keyed)',
    note: 'Identical handlers, behind an API key, with a per-key quota and usage logging.',
    endpoints: [
      { method: 'GET', path: '/api/v1/food-safety/check?pet=dog&food=chocolate', description: 'Requires Authorization: Bearer sk-…' },
      { method: 'GET', path: '/api/v1/food-safety/search?q=apple', description: 'Search across species' },
      { method: 'GET', path: '/api/v1/food-safety/safe/:pet', description: 'Safe foods for a species' },
      { method: 'GET', path: '/api/v1/food-safety/pets', description: 'Supported species' },
      { method: 'GET', path: '/api/v1/food-safety/stats', description: 'Record counts' },
    ],
  },
  {
    group: 'Bring your own key (Gemini)',
    note: 'Supply your own Gemini key for AI fallback calls.',
    endpoints: [
      { method: 'POST', path: '/api/gemini/validate', description: 'Check a Gemini key — body { apiKey } → { valid }' },
    ],
  },
  {
    group: 'Accounts & API keys',
    note: 'Session cookie (sign in). Manage keys and read usage.',
    endpoints: [
      { method: 'GET', path: '/api/auth/me', description: 'Current user, or null when signed out' },
      { method: 'GET', path: '/api/auth/:provider', description: 'Start GitHub/Google sign-in (redirect)' },
      { method: 'POST', path: '/api/auth/logout', description: 'End the session' },
      { method: 'GET', path: '/api/me/keys', description: 'List keys with live usage' },
      { method: 'POST', path: '/api/me/keys', description: 'Create a key — body { name, quotaLimit? }' },
      { method: 'PATCH', path: '/api/me/keys/:id', description: 'Rename / enable / change quota' },
      { method: 'DELETE', path: '/api/me/keys/:id', description: 'Revoke a key' },
      { method: 'GET', path: '/api/me/keys/:id/usage', description: 'Calls, per-day counts, recent calls for one key' },
      { method: 'GET', path: '/api/me/usage', description: 'Usage across all of the caller’s keys' },
    ],
  },
  {
    group: 'Operations',
    note: 'Admin token or admin session required.',
    endpoints: [
      { method: 'GET', path: '/api/admin/queue', description: 'AI answers captured for review' },
      { method: 'POST', path: '/api/admin/queue/:id/approve', description: 'Promote a captured answer' },
      { method: 'POST', path: '/api/admin/queue/:id/reject', description: 'Discard a captured answer' },
      { method: 'GET', path: '/api/monitoring/status', description: 'Process health snapshot' },
      { method: 'GET', path: '/api/monitoring/metrics', description: 'Request metrics' },
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
  { id: 'data', label: 'Data & resolution' },
  { id: 'auth', label: 'Authentication' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'result', label: 'Result object' },
  { id: 'verdicts', label: 'Verdicts' },
  { id: 'errors', label: 'Errors' },
  { id: 'limits', label: 'Limits & quotas' },
  { id: 'examples', label: 'Code examples' },
  { id: 'licence', label: 'Data & licence' },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto bg-carbon p-5 text-xs leading-relaxed text-parchment/90">
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
          Instant, veterinary-sourced answers to “can my pet eat this?” across ten species, with an
          AI fallback — and every response says which source produced it. JSON over HTTPS, open
          public endpoints plus API-key access.
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
          <p>Two access tiers, same handlers:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-charcoal">Public</strong> —{' '}
              <code className="font-mono">/api/food-safety/*</code>, no key, IP rate-limited. Used by
              the PetPal web and mobile apps.
            </li>
            <li>
              <strong className="text-charcoal">Keyed</strong> —{' '}
              <code className="font-mono">/api/v1/food-safety/*</code>, requires a bearer key, with a
              per-key quota and usage logging.
            </li>
          </ul>
        </Section>

        <Section id="data" eyebrow="02" title="Data & how answers are produced">
          <p>
            Every check resolves cheapest-and-most-trustworthy-first, and the response always labels
            which layer answered:
          </p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              <strong className="text-charcoal">Veterinary database</strong> — a merged in-memory
              index: the curated dataset, the BioVet vet-reviewed set, the Growli/ASPCA plant table,
              and a synthetic seed. Instant and free.
            </li>
            <li>
              <strong className="text-charcoal">Open Pet Food Facts</strong> — a free external
              product database, for foods we have no local record of.
            </li>
            <li>
              <strong className="text-charcoal">Gemini</strong> — the last resort, clearly labelled
              as AI-assisted.
            </li>
            <li>
              <strong className="text-charcoal">Unknown</strong> — when nothing can answer, it says
              so and advises a vet.
            </li>
          </ol>
          <p>
            Remote answers are cached, so the same food is never sent to the AI twice — even across
            restarts.
          </p>
        </Section>

        <Section id="auth" eyebrow="03" title="Authentication">
          <p>
            <strong className="text-charcoal">Public endpoints need nothing.</strong> Just call them
            (subject to the IP rate limit).
          </p>
          <p>
            <strong className="text-charcoal">Keyed endpoints</strong> expect a key on every request:
          </p>
          <Code>{`Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}</Code>
          <p>
            Create keys in the console (<a href="/login" className="link-line text-charcoal">sign in</a>{' '}
            → Tokens). A key is <strong className="text-charcoal">shown once</strong> — we store only
            a hash, so copy it somewhere safe. Send the key as a header; never in a query string.
          </p>
          <p>
            <strong className="text-charcoal">Bring your own Gemini key (optional).</strong> Pass a
            caller-supplied Gemini key as{' '}
            <code className="font-mono text-charcoal">X-Gemini-Key</code> and the AI fallback spends
            your quota instead. It is used for that one request and never stored. Validate one first
            with <code className="font-mono text-charcoal">POST /api/gemini/validate</code>.
          </p>
          <Code>{`curl "http://localhost:3001/api/v1/food-safety/check?pet=dog&food=chocolate" \\
  -H "Authorization: Bearer sk-your-key" \\
  -H "X-Gemini-Key: AIza-your-gemini-key"   # optional`}</Code>
        </Section>

        <Section id="quickstart" eyebrow="04" title="Quickstart">
          <p>Check a food with the public endpoint — no key, no setup:</p>
          <Code>{`curl -X POST http://localhost:3001/api/food-safety/check \\
  -H "Content-Type: application/json" \\
  -d '{"pet":"dog","food":"chocolate"}'`}</Code>
          <p>Or the linkable GET form:</p>
          <Code>{`curl "http://localhost:3001/api/food-safety/check?pet=dog&food=chocolate"`}</Code>
          <p>Response:</p>
          <Code>{`{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "message": "❌ chocolate is NOT SAFE for dog according to Veterinary database!",
  "source": "database",
  "details": {
    "food": "chocolate",
    "severity": "high",
    "description": "Chocolate contains theobromine and caffeine, which are toxic to dogs…",
    "symptoms": ["vomiting", "diarrhea", "increased heart rate", "seizures"],
    "alternatives": ["carob treats", "dog-safe cookies"]
  },
  "requestId": "mb3x1k2a-9f4d",
  "processingTime": "1ms"
}`}</Code>
        </Section>

        <Section id="endpoints" eyebrow="05" title="Endpoints">
          <p>
            Base URLs: <code className="font-mono text-charcoal">http://localhost:3001</code> locally,
            or your deployment host. All responses are JSON.
          </p>
          {ENDPOINT_GROUPS.map((group) => (
            <div key={group.group} className="mt-8">
              <h3 className="font-display text-lg text-ink">{group.group}</h3>
              <p className="mt-1 text-xs text-mist">{group.note}</p>
              <div className="mt-3 border-t border-slate">
                {group.endpoints.map((endpoint) => (
                  <div
                    key={`${endpoint.method}${endpoint.path}`}
                    className="grid grid-cols-[3.5rem_1fr] gap-x-6 gap-y-1 border-b border-slate py-3 sm:grid-cols-[3.5rem_minmax(20rem,1fr)_1.1fr]"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide-cap text-forest">
                      {endpoint.method}
                    </span>
                    <code className="break-all font-mono text-xs text-charcoal">{endpoint.path}</code>
                    <span className="col-span-2 text-sm text-stone sm:col-span-1">
                      {endpoint.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section id="result" eyebrow="06" title="The result object">
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
            <code className="font-mono text-charcoal">
              {'{ pet, safeFoods | cautionFoods | unsafeFoods, count }'}
            </code>
            ; search returns{' '}
            <code className="font-mono text-charcoal">{'{ query, pet, results, count }'}</code>.
          </p>
        </Section>

        <Section id="verdicts" eyebrow="07" title="Verdicts">
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

        <Section id="errors" eyebrow="08" title="Errors">
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

        <Section id="limits" eyebrow="09" title="Rate limits & quotas">
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

        <Section id="examples" eyebrow="10" title="Code examples">
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

        <Section id="licence" eyebrow="11" title="Data & licence">
          <p>
            Answers combine the repo’s curated dataset, the{' '}
            <strong className="text-charcoal">BioVet</strong> pet-food-safety dataset and the{' '}
            <strong className="text-charcoal">Growli/ASPCA</strong> plant table (both CC BY 4.0), plus
            a synthetic seed clearly tagged{' '}
            <code className="font-mono text-charcoal">AI (generated)</code>. The synthetic rows are
            not veterinary-verified; the API always tells you the source so you can judge it.
          </p>
          <p className="text-xs text-mist">
            This API provides general information and is not a substitute for professional veterinary
            care. If a pet has eaten something dangerous, contact a veterinarian or a poison helpline
            immediately.
          </p>
        </Section>
      </div>
    </div>
  );
}
