import { useState, type FormEvent } from 'react';

import { PETS } from '../pets';
import { api, ApiError } from '../services/api';
import type { FoodSafetyResult } from '../types';
import ResultCard from './ResultCard';

const QUICK_TRIES = [
  { food: 'chocolate', label: '🍫 chocolate' },
  { food: 'apple', label: '🍎 apple' },
  { food: 'grapes', label: '🍇 grapes' },
  { food: 'carrot', label: '🥕 carrot' },
];

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
      setResult(await api.checkFoodSafety(pet, trimmed));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">
            1. Who is eating?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {PETS.map((item) => {
              const selected = item.key === pet;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={selected}
                  title={item.blurb}
                  onClick={() => setPet(item.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    selected
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-700'
                  }`}
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6">
          <label htmlFor="food" className="text-sm font-semibold text-slate-700">
            2. What food?
          </label>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="food"
              name="food"
              type="text"
              autoComplete="off"
              list="common-foods"
              value={food}
              onChange={(event) => setFood(event.target.value)}
              placeholder='e.g. "chocolate" or "bell peppers"'
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Checking…' : 'Check safety'}
            </button>
          </div>

          <datalist id="common-foods">
            {QUICK_TRIES.map((item) => (
              <option key={item.food} value={item.food} />
            ))}
          </datalist>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Try:</span>
            {QUICK_TRIES.map((item) => (
              <button
                key={item.food}
                type="button"
                onClick={() => setFood(item.food)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 transition hover:border-brand-400 hover:text-brand-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {loading && (
        <p role="status" className="mt-4 text-sm text-slate-500">
          Asking the veterinary database…
        </p>
      )}

      {result && !loading && (
        <div className="mt-4">
          <ResultCard result={result} />
        </div>
      )}
    </div>
  );
}
