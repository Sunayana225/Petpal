import { useEffect, useMemo, useState } from 'react';

import { CATEGORY_META, PETS, PET_BY_KEY } from '../pets';
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
        setItems(
          response.safeFoods ?? response.cautionFoods ?? response.unsafeFoods ?? [],
        );
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
    return query
      ? items.filter((item) => item.food.toLowerCase().includes(query))
      : items;
  }, [items, filter]);

  const meta = PET_BY_KEY[pet];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Browse the food database
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Everything PetPal has on record, straight from the veterinary data
          sources — no AI involved.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label htmlFor="pet-select" className="text-sm font-semibold text-slate-700">
            Pet
          </label>
          <select
            id="pet-select"
            value={pet}
            onChange={(event) => setPet(event.target.value)}
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {PETS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.emoji} {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="food-filter" className="text-sm font-semibold text-slate-700">
            Filter
          </label>
          <input
            id="food-filter"
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="e.g. grape"
            className="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div role="tablist" aria-label="Safety category" className="flex flex-wrap gap-2">
        {CATEGORIES.map((item) => {
          const active = item === category;
          return (
            <button
              key={item}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400'
              }`}
            >
              {CATEGORY_META[item].emoji} {CATEGORY_META[item].label}
            </button>
          );
        })}
      </div>

      {loading && <p role="status" className="text-sm text-slate-500">Loading…</p>}

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p className="text-xs text-slate-500">
            {meta?.emoji} {meta?.label} · {visible.length} of {items.length} foods
          </p>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              {filter ? 'Nothing matches that filter.' : EMPTY_STATE[category]}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <li
                  key={item.food}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold capitalize text-slate-900">
                      {item.food}
                    </h3>
                    <span className="text-xs text-slate-400">{item.source}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                    {item.description}
                  </p>
                  {item.severity && (
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {item.severity} severity
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
