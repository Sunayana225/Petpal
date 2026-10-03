import { SAFETY_META } from '../pets';
import SafetyBadge from './SafetyBadge';
import type { FoodSafetyResult } from '../types';

const SOURCE_LABELS: Record<string, string> = {
  database: 'Veterinary database',
  external: 'Open Pet Food Facts',
  ai: 'AI analysis',
  none: 'No data',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low severity',
  medium: 'Moderate severity',
  high: 'High severity',
};

/** A bulleted block with a heading, rendered only when it has content. */
function DetailSection({
  title,
  items,
  tone = 'slate',
}: {
  title: string;
  items?: string[];
  tone?: 'slate' | 'red' | 'green';
}) {
  if (!items || items.length === 0) return null;

  const bulletColors = {
    slate: 'text-slate-700',
    red: 'text-red-800',
    green: 'text-green-800',
  } as const;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <ul className={`mt-1 space-y-1 text-sm ${bulletColors[tone]}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResultCard({ result }: { result: FoodSafetyResult }) {
  const meta = SAFETY_META[result.safety];
  const details = result.details;
  const sourceLabel = result.source ? SOURCE_LABELS[result.source] : undefined;

  return (
    <article
      aria-live="polite"
      className={`rounded-2xl border-2 bg-white p-5 shadow-sm sm:p-6 ${meta.border}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {result.pet} · {result.food}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            {meta.emoji} {meta.label}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {details?.severity && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {SEVERITY_LABELS[details.severity]}
            </span>
          )}
          <SafetyBadge safety={result.safety} />
        </div>
      </header>

      <p className="mt-4 text-base leading-relaxed text-slate-800">{result.message}</p>

      {details?.description && details.description !== result.message && (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {details.description}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <DetailSection title="Warning signs" items={details?.symptoms} tone="red" />
        <DetailSection title="Benefits" items={details?.benefits} tone="green" />
        <DetailSection title="Safer alternatives" items={details?.alternatives} />
        <DetailSection
          title="How to prepare"
          items={details?.preparation ? [details.preparation] : undefined}
        />
      </div>

      {details?.recommendation && (
        <p className="mt-5 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900">
          <strong>Vet-minded advice:</strong> {details.recommendation}
        </p>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-400">
        {sourceLabel && (
          <span>
            Source: <strong className="text-slate-500">{sourceLabel}</strong>
          </span>
        )}
        {details?.source && <span>{details.source}</span>}
        {result.processingTime && <span>Answered in {result.processingTime}</span>}
        {result.requestId && <span>Request {result.requestId}</span>}
      </footer>
    </article>
  );
}
