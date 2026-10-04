import { useEffect, useState } from 'react';

import { Reveal } from '../motion/primitives';
import { ApiError } from '../api';
import { consoleApi } from '../api';
import type { UsageResponse } from '../domain/types';

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    consoleApi
      .usage()
      .then(setUsage)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load usage.'),
      );
  }, []);

  const daily = usage?.daily ?? [];
  const peak = Math.max(1, ...daily.map((day) => day.count));

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-10">
      <Reveal>
        <p className="eyebrow">Usage</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-ink sm:text-5xl">
          Calls, over time.
        </h1>
      </Reveal>

      {error && <p className="mt-8 text-sm text-unsafe">{error}</p>}

      <div className="mt-14 grid gap-px border border-slate bg-slate sm:grid-cols-2">
        <div className="bg-parchment p-6">
          <p className="eyebrow">Total calls</p>
          <p className="mt-3 font-display text-4xl text-ink">{usage?.totals.total ?? 0}</p>
        </div>
        <div className="bg-parchment p-6">
          <p className="eyebrow">Calls · 30 days</p>
          <p className="mt-3 font-display text-4xl text-ink">{usage?.totals.since ?? 0}</p>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="eyebrow">Daily</h2>
        {daily.length === 0 ? (
          <p className="mt-6 text-sm italic text-mist">No calls in this window yet.</p>
        ) : (
          <div className="mt-8 flex h-40 items-end gap-2 border-b border-slate">
            {daily.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full bg-forest/80 transition-[height] duration-700"
                  style={{ height: `${(day.count / peak) * 100}%`, minHeight: 2 }}
                  title={`${day.day}: ${day.count}`}
                />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wide-cap text-mist">
          <span>{daily[0]?.day ?? ''}</span>
          <span>{daily[daily.length - 1]?.day ?? ''}</span>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="eyebrow">Recent calls</h2>
        {usage && usage.recent.length > 0 ? (
          <div className="mt-6 border-t border-slate">
            {usage.recent.map((event) => (
              <div
                key={event.id}
                className="grid grid-cols-[3.5rem_1fr_4rem_4rem] gap-4 border-b border-slate py-3 text-sm"
              >
                <span className="font-mono text-[11px] text-forest">{event.method}</span>
                <span className="truncate font-mono text-[11px] text-stone">{event.path}</span>
                <span className="text-right text-charcoal">{event.status}</span>
                <span className="text-right text-mist">{event.latencyMs}ms</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm italic text-mist">No calls recorded yet.</p>
        )}
      </section>
    </div>
  );
}
