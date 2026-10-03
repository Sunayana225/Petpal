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

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-sky-100 text-sky-800',
  POST: 'bg-violet-100 text-violet-800',
};

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          API documentation
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          The checker above is a thin client over this API. Every endpoint is
          JSON, rate-limited to 100 requests / 15 minutes, and returns an honest
          <code className="mx-1 rounded bg-slate-100 px-1">unknown</code>
          rather than guessing.
        </p>
      </header>

      <section aria-labelledby="endpoints">
        <h2 id="endpoints" className="text-lg font-semibold text-slate-900">
          Endpoints
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-4 py-3">Method</th>
                <th scope="col" className="px-4 py-3">Path</th>
                <th scope="col" className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((endpoint) => (
                <tr key={`${endpoint.method}${endpoint.path}`} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${METHOD_STYLES[endpoint.method]}`}
                    >
                      {endpoint.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-slate-800">
                    {endpoint.path}
                  </td>
                  <td className="px-4 py-3 align-top text-slate-600">
                    {endpoint.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="example" className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 id="example" className="text-lg font-semibold text-slate-900">
            Example request
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
{`curl -X POST /api/food-safety/check \\
  -H "Content-Type: application/json" \\
  -d '{"pet":"dog","food":"chocolate"}'`}
          </pre>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Example response</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
{`{
  "pet": "dog",
  "food": "chocolate",
  "safety": "unsafe",
  "source": "database",
  "message": "❌ chocolate is NOT SAFE for dog…",
  "processingTime": "1ms"
}`}
          </pre>
        </div>
      </section>

      <section aria-labelledby="verdicts">
        <h2 id="verdicts" className="text-lg font-semibold text-slate-900">
          Verdicts
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <dt className="font-semibold text-green-800">✅ safe</dt>
            <dd className="mt-1 text-sm text-green-700">
              Generally fine in normal amounts.
            </dd>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <dt className="font-semibold text-amber-800">⚠️ caution</dt>
            <dd className="mt-1 text-sm text-amber-700">
              Moderation only — check with your vet.
            </dd>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <dt className="font-semibold text-red-800">❌ unsafe</dt>
            <dd className="mt-1 text-sm text-red-700">
              Do not feed. Contact a vet if consumed.
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <dt className="font-semibold text-slate-800">❓ unknown</dt>
            <dd className="mt-1 text-sm text-slate-600">
              We have no data — consult a veterinarian.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
