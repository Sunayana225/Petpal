import { Reveal } from '../motion/primitives';
import { SAFETY_META } from '../domain/pets';
import type { FoodSafetyResult, SafetyLevel } from '../domain/types';
import SafetyBadge from './SafetyBadge';

const SOURCE_LABELS: Record<string, string> = {
  database: 'Local dataset',
  external: 'Open Pet Food Facts',
  ai: 'AI analysis',
  none: 'No data',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low severity',
  medium: 'Moderate severity',
  high: 'High severity',
};

/** A hairline-separated block of bulleted items, revealed as it enters view. */
function DetailSection({
  title,
  items,
  tone = 'unknown',
}: {
  title: string;
  items?: string[];
  tone?: SafetyLevel;
}) {
  if (!items || items.length === 0) return null;

  return (
    <Reveal>
      <div className="border-t border-slate pt-4">
        <h4 className="eyebrow">{title}</h4>
        <ul className={`mt-3 space-y-2 text-sm ${SAFETY_META[tone].text}`}>
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-current opacity-60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

export default function ResultCard({ result }: { result: FoodSafetyResult }) {
  const meta = SAFETY_META[result.safety];
  const details = result.details;
  const sourceLabel = result.source ? SOURCE_LABELS[result.source] : undefined;
  const hasDetails =
    details &&
    ((details.symptoms?.length ?? 0) > 0 ||
      (details.benefits?.length ?? 0) > 0 ||
      (details.alternatives?.length ?? 0) > 0 ||
      Boolean(details.preparation));

  return (
    <article aria-live="polite" className={`border-t-2 ${meta.border} bg-parchment`}>
      <header className="flex flex-wrap items-start justify-between gap-6 pt-8">
        <div>
          <p className="eyebrow">Verdict</p>
          <h2
            className={`mt-3 font-display text-5xl leading-none tracking-tight sm:text-6xl ${meta.text}`}
          >
            {meta.label}
          </h2>
          <p className="mt-4 text-[12px] uppercase tracking-wide-cap text-stone">
            {result.pet} · {result.food}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {details?.severity && (
            <span className="text-[11px] uppercase tracking-wide-cap text-mist">
              {SEVERITY_LABELS[details.severity]}
            </span>
          )}
          <SafetyBadge safety={result.safety} />
        </div>
      </header>

      <p className="mt-10 max-w-2xl font-display text-2xl leading-snug text-ink">
        {result.message}
      </p>

      {details?.description && details.description !== result.message && (
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-stone">
          {details.description}
        </p>
      )}

      {hasDetails && (
        <div className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          <DetailSection title="Warning signs" items={details?.symptoms} tone="unsafe" />
          <DetailSection title="Benefits" items={details?.benefits} tone="safe" />
          <DetailSection title="Safer alternatives" items={details?.alternatives} />
          <DetailSection
            title="How to prepare"
            items={details?.preparation ? [details.preparation] : undefined}
          />
        </div>
      )}

      {details?.recommendation && (
        <Reveal className="mt-12">
          <p className="border-l-2 border-forest pl-5 text-sm leading-relaxed text-charcoal">
            <span className="eyebrow block">Vet-minded advice</span>
            <span className="mt-2 block">{details.recommendation}</span>
          </p>
        </Reveal>
      )}

      {!!details?.evidence?.length && (
        <details className="mt-8 border-t border-slate pt-5 text-sm text-stone">
          <summary className="cursor-pointer">Source evidence ({details.evidence.length})</summary>
          <p className="mt-3">These receipts describe each publisher’s verdict. PetPal may combine sources into a more cautious result. Publisher review claims have not been independently verified.</p>
          {details.evidence.map((receipt, index) => (
            <div className="mt-4" key={`${receipt.itemId}-${receipt.assessedGroup}-${index}`}>
              <a className="underline" href={receipt.sourceUrl} target="_blank" rel="noopener noreferrer">{receipt.publisher}</a>
              <p>Source verdict: {receipt.sourceVerdict} · Assessed group: {receipt.assessedGroup}</p>
              <p>Retrieved: {receipt.retrievedAt.slice(0, 10)} · Review: publisher-reported</p>
              <p>{receipt.attribution} · <a className="underline" href={receipt.license} target="_blank" rel="noopener noreferrer">License</a></p>
              {receipt.references.filter(url => url.startsWith('https://')).map(url => <a className="mr-3 underline" key={url} href={url} target="_blank" rel="noopener noreferrer">Original reference</a>)}
            </div>
          ))}
        </details>
      )}

      <footer className="mt-12 flex flex-wrap gap-x-8 gap-y-2 border-t border-slate pt-5 text-[10px] uppercase tracking-wide-cap text-mist">
        {sourceLabel && (
          <span>
            Source · <span className="text-stone">{sourceLabel}</span>
          </span>
        )}
        {details?.source && <span>{details.source}</span>}
        {result.processingTime && <span>Answered in {result.processingTime}</span>}
        {result.requestId && <span>Ref {result.requestId}</span>}
      </footer>
    </article>
  );
}
