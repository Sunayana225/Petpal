import { Reveal } from '../motion/primitives';
import { SAFETY_META } from '../pets';
import type { SafetyLevel } from '../types';

interface Endpoint {
  method: string;
  path: string;
  description: string;
}

const ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/', description: 'Service info and endpoint index' },
  { method: 'GET', path: '/api/health', description: 'Liveness + dependency status' },
  { method: 'GET', path: '/api/info', description: 'Version, supported pets, endpoints' },
  {
    method: 'POST',
    path: '/api/food-safety/check',
    description: 'Check a food for a pet — body: { pet, food }',
  },
  {
    method: 'GET',
    path: '/api/food-safety/check?pet=dog&food=chocolate',
    description: 'Same check via query string (linkable)',
  },
  {
    method: 'GET',
    path: '/api/food-safety/search?q=apple',
    description: 'Type-ahead search across every species',
  },
  { method: 'GET', path: '/api/food-safety/pets', description: 'Supported species' },
  { method: 'GET', path: '/api/food-safety/stats', description: 'Record counts per species' },
  { method: 'GET', path: '/api/food-safety/safe/:pet', description: 'All safe foods for a pet' },
  { method: 'GET', path: '/api/food-safety/caution/:pet', description: 'All caution foods' },
  { method: 'GET', path: '/api/food-safety/unsafe/:pet', description: 'All unsafe foods' },
  { method: 'GET', path: '/api/monitoring/status', description: 'Process health snapshot' },
];

const VERDICTS: SafetyLevel[] = ['safe', 'caution', 'unsafe', 'unknown'];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-10">
      <Reveal>
        <p className="eyebrow">API reference</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-light leading-tight tracking-tight text-ink sm:text-6xl">
          Every endpoint, plainly documented.
        </h1>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-stone">
          The checker is a thin client over this API. Every endpoint is JSON, rate-limited to
          100 requests / 15 minutes, and returns an honest{' '}
          <span className="font-mono text-charcoal">unknown</span> rather than guessing.
        </p>
      </Reveal>

      {/* Endpoints */}
      <section aria-labelledby="endpoints" className="mt-16">
        <h2 id="endpoints" className="eyebrow">
          Endpoints
        </h2>
        <div className="mt-6 border-t border-slate">
          {ENDPOINTS.map((endpoint) => (
            <div
              key={`${endpoint.method}${endpoint.path}`}
              className="grid grid-cols-[4rem_1fr] items-baseline gap-x-8 gap-y-1 border-b border-slate py-4 transition-colors duration-500 hover:bg-alabaster sm:grid-cols-[4rem_minmax(18rem,1fr)_1.2fr] sm:px-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide-cap text-forest">
                {endpoint.method}
              </span>
              <code className="font-mono text-xs text-charcoal sm:text-[13px]">
                {endpoint.path}
              </code>
              <span className="col-span-2 text-sm text-stone sm:col-span-1">
                {endpoint.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Examples */}
      <section className="mt-20 grid gap-8 lg:grid-cols-2">
        <Reveal>
          <h2 className="eyebrow">Example request</h2>
          <pre className="mt-6 overflow-x-auto bg-carbon p-6 text-xs leading-relaxed text-parchment/90">
{`curl -X POST /api/food-safety/check \\
  -H "Content-Type: application/json" \\
  -d '{"pet":"dog","food":"chocolate"}'`}
          </pre>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="eyebrow">Example response</h2>
          <pre className="mt-6 overflow-x-auto bg-carbon p-6 text-xs leading-relaxed text-parchment/90">
{`{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "source": "database",
  "message": "❌ chocolate is NOT SAFE for dog…",
  "processingTime": "1ms"
}`}
          </pre>
        </Reveal>
      </section>

      {/* Verdicts */}
      <section aria-labelledby="verdicts" className="mt-20">
        <h2 id="verdicts" className="eyebrow">
          Verdicts
        </h2>
        <div className="mt-6 grid gap-px border border-slate bg-slate sm:grid-cols-2 lg:grid-cols-4">
          {VERDICTS.map((verdict) => {
            const meta = SAFETY_META[verdict];
            return (
              <div key={verdict} className="bg-parchment p-6">
                <p className={`font-display text-2xl ${meta.text}`}>{meta.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-stone">{meta.gloss}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
