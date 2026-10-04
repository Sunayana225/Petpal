import { AnimatePresence, motion } from 'framer-motion';
import { useState, type FormEvent } from 'react';

import { getGeminiKey } from '../lib/geminiKey';
import { EASE } from '../motion/tokens';
import { PETS } from '../pets';
import { api, ApiError } from '../services/api';
import type { FoodSafetyResult } from '../types';
import GeminiKeyPanel from './GeminiKeyPanel';
import ResultCard from './ResultCard';

const QUICK_TRIES = ['chocolate', 'apple', 'grapes', 'carrot'];

export default function CheckForm() {
  const [pet, setPet] = useState('dogs');
  const [food, setFood] = useState('');
  const [result, setResult] = useState<FoodSafetyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = food.trim();

    if (!trimmed) {
      setError('Enter a food name to check.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      setResult(await api.checkFoodSafety(pet, trimmed, getGeminiKey()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="border-t border-slate pt-10">
        <fieldset>
          <legend className="eyebrow">01 — Who is eating?</legend>
          <div className="mt-6 flex flex-wrap gap-2">
            {PETS.map((item) => {
              const selected = item.key === pet;
              return (
                <motion.button
                  key={item.key}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={selected}
                  title={item.blurb}
                  onClick={() => setPet(item.key)}
                  className={`relative overflow-hidden border px-4 py-2.5 text-[12px] uppercase tracking-wide-cap transition-colors duration-500 ${
                    selected
                      ? 'border-charcoal text-parchment'
                      : 'border-slate text-charcoal hover:border-charcoal'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="pet-selection"
                      className="absolute inset-0 bg-charcoal"
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <span aria-hidden="true" className="text-sm">
                      {item.emoji}
                    </span>
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-12">
          <label htmlFor="food" className="eyebrow block">
            02 — What food?
          </label>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              id="food"
              name="food"
              type="text"
              autoComplete="off"
              list="common-foods"
              value={food}
              onChange={(event) => setFood(event.target.value)}
              placeholder="Chocolate, bell peppers, salmon…"
              className="w-full border border-slate bg-transparent px-5 py-3.5 text-base text-ink placeholder:text-mist focus:border-ink focus:outline-none transition-colors duration-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="group relative overflow-hidden border border-charcoal bg-charcoal px-10 py-3.5 text-[12px] uppercase tracking-wide-cap text-parchment disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute inset-0 -translate-y-full bg-forest transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0" />
              <span className="relative z-10">{loading ? 'Checking…' : 'Check safety'}</span>
            </button>
          </div>

          <datalist id="common-foods">
            {QUICK_TRIES.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-wide-cap text-mist">
            <span>Try</span>
            {QUICK_TRIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFood(item)}
                className="link-line text-stone hover:text-ink transition-colors duration-500"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </form>

      <GeminiKeyPanel />

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mt-8 border-l-2 border-unsafe pl-4 text-sm text-unsafe"
          >
            {error}
          </motion.p>
        )}

        {loading && (
          <motion.p
            key="loading"
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-10 text-sm italic text-mist"
          >
            Consulting the veterinary database…
          </motion.p>
        )}

        {result && !loading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-14"
          >
            <ResultCard result={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
