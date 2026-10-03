import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { Reveal } from '../motion/primitives';
import { EASE } from '../motion/tokens';
import { CATEGORY_META, PETS, PET_BY_KEY, SAFETY_META } from '../pets';
import { api, ApiError } from '../services/api';
import type { FoodCategory, FoodItem } from '../types';

const CATEGORIES: FoodCategory[] = ['safe', 'caution', 'unsafe'];

const FETCHERS = {
  safe: api.getSafeFoods,
  caution: api.getCautionFoods,
  unsafe: api.getUnsafeFoods,
} as const;

const EMPTY_STATE: Record<FoodCategory, string> = {
  safe: 'No safe foods indexed for this pet yet.',
  caution: 'No caution foods indexed for this pet yet.',
  unsafe: 'No unsafe foods indexed for this pet yet.',
};

export default function BrowsePage() {
  const [pet, setPet] = useState('dogs');
  const [category, setCategory] = useState<FoodCategory>('safe');
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    FETCHERS[category](pet)
      .then((response) => {
        if (cancelled) return;
        setItems(response.safeFoods ?? response.cautionFoods ?? response.unsafeFoods ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setItems([]);
        setError(err instanceof ApiError ? err.message : 'Could not load foods.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pet, category]);

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query ? items.filter((item) => item.food.toLowerCase().includes(query)) : items;
  }, [items, filter]);

  const meta = PET_BY_KEY[pet];

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-10">
      <Reveal>
        <p className="eyebrow">The library</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-light leading-tight tracking-tight text-ink sm:text-6xl">
          The food database, in full.
        </h1>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-stone">
          Everything PetPal has on record, straight from the veterinary data sources — no AI
          involved.
        </p>
      </Reveal>

      {/* Controls */}
      <Reveal delay={0.15}>
        <div className="mt-14 flex flex-wrap items-end gap-x-12 gap-y-6 border-t border-slate pt-8">
          <div className="flex flex-col gap-3">
            <label htmlFor="pet-select" className="eyebrow">
              Species
            </label>
            <div className="relative">
              <select
                id="pet-select"
                value={pet}
                onChange={(event) => setPet(event.target.value)}
                className="appearance-none border border-slate bg-transparent py-2.5 pr-12 pl-4 text-sm text-charcoal focus:border-ink focus:outline-none transition-colors duration-500"
              >
                {PETS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.emoji} {item.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-mist"
              >
                ↓
              </span>
            </div>
          </div>

          <div className="flex min-w-[12rem] flex-1 flex-col gap-3">
            <label htmlFor="food-filter" className="eyebrow">
              Filter
            </label>
            <input
              id="food-filter"
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search within this list…"
              className="w-full border border-slate bg-transparent px-4 py-2.5 text-sm text-charcoal placeholder:text-mist focus:border-ink focus:outline-none transition-colors duration-500"
            />
          </div>
        </div>
      </Reveal>

      {/* Category tabs */}
      <div role="tablist" aria-label="Safety category" className="mt-12 flex gap-10 border-b border-slate">
        {CATEGORIES.map((item) => {
          const active = item === category;
          return (
            <button
              key={item}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setCategory(item)}
              className="relative -mb-px py-4 text-[12px] uppercase tracking-wide-cap transition-colors duration-500"
            >
              <span className={active ? 'text-ink' : 'text-stone hover:text-charcoal'}>
                {CATEGORY_META[item].label}
              </span>
              {active && (
                <motion.span
                  layoutId="browse-underline"
                  className="absolute inset-x-0 bottom-0 h-px bg-ink"
                  transition={{ duration: 0.5, ease: EASE }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-baseline justify-between text-[11px] uppercase tracking-wide-cap text-mist">
        <span>
          {meta?.label} · {CATEGORY_META[category].gloss}
        </span>
        <span>
          {visible.length} of {items.length}
        </span>
      </div>

      {loading && <p className="mt-16 text-sm italic text-mist">Loading…</p>}

      {error && (
        <p role="alert" className="mt-16 border-l-2 border-unsafe pl-4 text-sm text-unsafe">
          {error}
        </p>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="mt-16 border border-dashed border-slate p-10 text-center text-sm text-mist">
          {filter ? 'Nothing matches that filter.' : EMPTY_STATE[category]}
        </p>
      )}

      {!loading && !error && visible.length > 0 && (
        <motion.ul layout className="mt-12 grid gap-px border border-slate bg-slate sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((item) => (
              <motion.li
                key={item.food}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="group bg-parchment p-6 transition-colors duration-500 hover:bg-alabaster"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-xl capitalize text-ink">{item.food}</h3>
                  <span className={`text-[10px] uppercase tracking-wide-cap ${SAFETY_META[item.safety].text}`}>
                    {SAFETY_META[item.safety].label}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone">
                  {item.description}
                </p>
                <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-wide-cap text-mist">
                  <span>{item.source}</span>
                  {item.severity && <span>{item.severity} severity</span>}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
