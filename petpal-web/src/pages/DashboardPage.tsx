import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import { Reveal } from '../motion/primitives';
import { ApiError } from '../services/api';
import { consoleApi } from '../services/consoleApi';
import type { ApiKey, UsageResponse } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [keysResult, usageResult] = await Promise.all([
        consoleApi.listKeys(),
        consoleApi.usage(),
      ]);
      setKeys(keysResult.keys);
      setUsage(usageResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your console.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const callsThisMonth = usage?.totals.since ?? 0;

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-10">
      <Reveal>
        <p className="eyebrow">Console</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-ink sm:text-5xl">
          {user?.name ? `Welcome, ${user.name.split(' ')[0]}.` : 'Your API, at a glance.'}
        </h1>
      </Reveal>

      <div className="mt-14 grid gap-px border border-slate bg-slate sm:grid-cols-3">
        {[
          { label: 'Active keys', value: String(keys.length) },
          { label: 'Calls · 30 days', value: String(callsThisMonth) },
          { label: 'Total calls', value: String(usage?.totals.total ?? 0) },
        ].map((stat) => (
          <div key={stat.label} className="bg-parchment p-6">
            <p className="eyebrow">{stat.label}</p>
            <p className="mt-3 font-display text-4xl text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-8 text-sm text-unsafe">{error}</p>}

      <section className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">Quick start</h2>
          <Link to="/tokens" className="link-line text-[12px] uppercase tracking-wide-cap text-charcoal">
            Manage keys
          </Link>
        </div>
        <pre className="mt-6 overflow-x-auto bg-carbon p-6 text-xs leading-relaxed text-parchment/90">
{`curl "https://petpalapi.onrender.com/api/v1/food-safety/check?pet=dog&food=chocolate" \\
  -H "Authorization: Bearer sk_your_key_here"`}
        </pre>
        <p className="mt-4 text-sm text-stone">
          The keyed surface lives under <span className="font-mono">/api/v1</span>. The public
          endpoints the app uses need no key.
        </p>
      </section>
    </div>
  );
}
