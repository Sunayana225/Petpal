import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { clearGeminiKey, getGeminiKey, setGeminiKey } from '../lib/geminiKey';
import { EASE } from '../motion/tokens';
import { api, ApiError } from '../services/api';

type SaveState = 'idle' | 'checking' | 'valid' | 'invalid';

/**
 * Optional BYOK: let a visitor supply their own Gemini key so AI fallback calls
 * spend their quota instead of ours. Kept in sessionStorage only.
 */
export default function GeminiKeyPanel() {
  const existing = getGeminiKey();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(existing ?? '');
  const [state, setState] = useState<SaveState>(existing ? 'valid' : 'idle');
  const [message, setMessage] = useState<string | null>(
    existing ? 'Your key is set for this session.' : null,
  );

  async function save() {
    const key = value.trim();
    if (!key) {
      setState('invalid');
      setMessage('Enter a key first.');
      return;
    }

    setState('checking');
    setMessage('Checking with Google…');

    try {
      const { valid } = await api.validateGeminiKey(key);
      if (valid) {
        setGeminiKey(key);
        setState('valid');
        setMessage('Key is valid — AI answers will use it.');
      } else {
        clearGeminiKey();
        setState('invalid');
        setMessage('Invalid key — Google rejected it.');
      }
    } catch (err) {
      setState('invalid');
      setMessage(err instanceof ApiError ? err.message : 'Could not validate the key.');
    }
  }

  function clear() {
    clearGeminiKey();
    setValue('');
    setState('idle');
    setMessage('Key removed.');
  }

  return (
    <div className="mt-10 border-t border-slate pt-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-end justify-between text-left"
      >
        <span>
          <span className="eyebrow block">Optional</span>
          <span className="mt-2 block font-display text-xl text-ink">Use your own Gemini key</span>
        </span>
        <span className="text-[11px] uppercase tracking-wide-cap text-mist">
          {open ? 'Hide' : state === 'valid' ? 'Set ✓' : 'Add key'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-stone">
              Unknown foods use our own AI. Add your own Gemini key and those calls use it
              instead. The key stays in this browser tab and is only sent with a check — never
              stored on our servers.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="password"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="AIza…"
                autoComplete="off"
                spellCheck={false}
                aria-label="Gemini API key"
                className="w-full border border-slate bg-transparent px-4 py-3 text-sm text-ink placeholder:text-mist focus:border-ink focus:outline-none"
              />
              <button
                type="button"
                onClick={save}
                disabled={state === 'checking'}
                className="bg-charcoal px-6 py-3 text-[12px] uppercase tracking-wide-cap text-parchment disabled:opacity-60"
              >
                {state === 'checking' ? 'Checking…' : 'Save & check'}
              </button>
              {existing && (
                <button
                  type="button"
                  onClick={clear}
                  className="border border-slate px-6 py-3 text-[12px] uppercase tracking-wide-cap text-charcoal"
                >
                  Remove
                </button>
              )}
            </div>

            {message && (
              <p className={`mt-3 text-sm ${state === 'invalid' ? 'text-unsafe' : 'text-stone'}`}>
                {message}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
