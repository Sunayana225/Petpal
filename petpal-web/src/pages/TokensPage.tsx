import { useCallback, useEffect, useState } from 'react';

import CreateKeyDialog from '../components/CreateKeyDialog';
import { Reveal } from '../motion/primitives';
import { ApiError } from '../services/api';
import { consoleApi } from '../services/consoleApi';
import type { ApiKey } from '../types';

function quotaLabel(key: ApiKey): string {
  if (key.quotaLimit === null) return 'Unlimited';
  return `${key.quotaLimit} / ${key.quotaWindow}`;
}

function dateLabel(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '—';
}

export default function TokensPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { keys: list } = await consoleApi.listKeys();
      setKeys(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your keys.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: ApiKey) {
    setBusy(key.id);
    setError(null);
    try {
      await consoleApi.updateKey(key.id, { enabled: !key.enabled });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the key.');
    } finally {
      setBusy(null);
    }
  }

  async function revoke(key: ApiKey) {
    if (!window.confirm(`Revoke "${key.name}"? This cannot be undone.`)) return;
    setBusy(key.id);
    setError(null);
    try {
      await consoleApi.revokeKey(key.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the key.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-10">
      <Reveal>
        <p className="eyebrow">API tokens</p>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h1 className="font-display text-4xl font-light tracking-tight text-ink sm:text-5xl">
            Your keys.
          </h1>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="border border-charcoal bg-charcoal px-6 py-3 text-[12px] uppercase tracking-wide-cap text-parchment transition-colors duration-500 hover:bg-forest"
          >
            Create token
          </button>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-stone">
          Tokens authenticate the keyed API. We store only a hash — the full key is shown
          once, when you create it.
        </p>
      </Reveal>

      {error && <p className="mt-8 text-sm text-unsafe">{error}</p>}

      {keys.length === 0 ? (
        <p className="mt-12 border border-dashed border-slate p-10 text-center text-sm text-mist">
          No keys yet. Create one to start calling the API.
        </p>
      ) : (
        <div className="mt-12 border-t border-slate">
          <div className="hidden grid-cols-[2fr_1.4fr_1fr_1fr_auto] gap-4 border-b border-slate py-3 text-[10px] uppercase tracking-wide-cap text-mist sm:grid">
            <span>Name</span>
            <span>Key</span>
            <span>Quota</span>
            <span>Last used</span>
            <span>Actions</span>
          </div>

          {keys.map((key) => (
            <div
              key={key.id}
              className="grid grid-cols-1 items-center gap-x-4 gap-y-2 border-b border-slate py-5 sm:grid-cols-[2fr_1.4fr_1fr_1fr_auto]"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 shrink-0 ${key.enabled ? 'bg-safe' : 'bg-mist'}`}
                  aria-hidden="true"
                />
                <span className="font-display text-lg text-ink">{key.name}</span>
              </div>

              <code className="font-mono text-xs text-stone">
                {key.prefix}••••••••{key.last4}
              </code>

              <span className="text-sm text-stone">{quotaLabel(key)}</span>

              <span className="text-sm text-stone">{dateLabel(key.lastUsedAt)}</span>

              <div className="flex items-center gap-4 text-[11px] uppercase tracking-wide-cap">
                <button
                  type="button"
                  disabled={busy === key.id}
                  onClick={() => toggle(key)}
                  className="text-charcoal transition-colors duration-500 hover:text-ink disabled:opacity-50"
                >
                  {key.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  disabled={busy === key.id}
                  onClick={() => revoke(key)}
                  className="text-unsafe transition-opacity duration-500 hover:opacity-70 disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateKeyDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => void load()}
      />
    </div>
  );
}
