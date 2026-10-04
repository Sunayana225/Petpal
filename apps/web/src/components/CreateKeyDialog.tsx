import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { EASE } from '../motion/tokens';
import { consoleApi } from '../api';
import { ApiError } from '../api';
import type { CreatedApiKey } from '../domain/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Creates a key and reveals the raw value exactly once — after this dialog
 * closes it can never be shown again.
 */
export default function CreateKeyDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [quota, setQuota] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName('');
    setQuota('');
    setCreated(null);
    setError(null);
    setCopied(false);
  }

  async function submit() {
    if (!name.trim()) {
      setError('Give the key a name.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await consoleApi.createKey(
        name.trim(),
        quota.trim() === '' ? undefined : Number(quota),
      );
      setCreated(result);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the key.');
    } finally {
      setCreating(false);
    }
  }

  async function copy() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.rawKey);
      setCopied(true);
    } catch {
      setError('Copy failed — select the key and copy it manually.');
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          onClick={() => {
            reset();
            onClose();
          }}
        >
          <motion.div
            className="w-full max-w-md border border-slate bg-parchment p-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, ease: EASE }}
            onClick={(event) => event.stopPropagation()}
          >
            {created ? (
              <>
                <p className="eyebrow">Key created</p>
                <h2 className="mt-3 font-display text-2xl text-ink">Copy it now.</h2>

                <div className="mt-5 border-l-2 border-unsafe pl-4">
                  <p className="text-sm font-semibold text-unsafe">
                    This key won’t be visible again.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-stone">
                    For security we store only a hash, so we can never show it again. Copy it
                    now and keep it safe — if you lose it, revoke it and create a new one.
                  </p>
                </div>

                <code className="mt-6 block break-all border border-slate bg-alabaster p-4 font-mono text-xs text-charcoal">
                  {created.rawKey}
                </code>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={copy}
                    className="flex-1 bg-charcoal px-5 py-3 text-[12px] uppercase tracking-wide-cap text-parchment"
                  >
                    {copied ? 'Copied' : 'Copy key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                    className="border border-slate px-5 py-3 text-[12px] uppercase tracking-wide-cap text-charcoal"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">New API key</p>
                <h2 className="mt-3 font-display text-2xl text-ink">Create a key</h2>

                <label className="mt-8 block eyebrow" htmlFor="key-name">
                  Name
                </label>
                <input
                  id="key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Production server"
                  className="mt-3 w-full border border-slate bg-transparent px-4 py-3 text-sm text-ink placeholder:text-mist focus:border-ink focus:outline-none"
                />

                <label className="mt-6 block eyebrow" htmlFor="key-quota">
                  Daily quota (optional)
                </label>
                <input
                  id="key-quota"
                  value={quota}
                  inputMode="numeric"
                  onChange={(event) => setQuota(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Leave blank for unlimited"
                  className="mt-3 w-full border border-slate bg-transparent px-4 py-3 text-sm text-ink placeholder:text-mist focus:border-ink focus:outline-none"
                />

                {error && <p className="mt-4 text-sm text-unsafe">{error}</p>}

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={submit}
                    disabled={creating}
                    className="flex-1 bg-charcoal px-5 py-3 text-[12px] uppercase tracking-wide-cap text-parchment disabled:opacity-60"
                  >
                    {creating ? 'Creating…' : 'Create key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                    className="border border-slate px-5 py-3 text-[12px] uppercase tracking-wide-cap text-charcoal"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
