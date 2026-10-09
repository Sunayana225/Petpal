import { createHash } from 'crypto';
import { load } from 'cheerio';

export const FDA_URL = 'https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals';
export interface Recall {
  id: string; date: string; brand: string; product: string; reason: string; company: string;
  status: 'terminated' | 'not-marked-terminated'; sourceUrl: string;
}
export interface RecallSnapshot {
  publisher: string; sourceUrl: string; retrievedAt: string; country: string;
  coverage: string; contentHash: string; records: Recall[];
}

/** Only factual listing metadata; never infer food safety from a missing match. */
export function parseFdaListing(html: string, retrievedAt: string): RecallSnapshot {
  const $ = load(html);
  const headers = $('#datatable thead th').map((_i, el) => $(el).text().trim().replace(/\s+/g, ' ')).get();
  const expected = ['Date', 'Brand Name(s)', 'Product Description', 'Recall Reason Description', 'Company Name', 'Terminated Recall', 'Excerpt'];
  if (JSON.stringify(headers) !== JSON.stringify(expected)) throw new Error('FDA listing schema changed');
  const records: Recall[] = [];
  const seen = new Set<string>();
  $('#datatable tbody tr').each((_i, row) => {
    const cells = $(row).children('td');
    if (cells.length !== 7) throw new Error('Invalid FDA row');
    const value = (index: number) => cells.eq(index).text().trim().replace(/\s+/g, ' ');
    const date = cells.eq(0).find('time').attr('datetime')?.slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error('Invalid FDA date');
    const href = cells.eq(1).find('a').attr('href');
    if (!href) throw new Error('Missing FDA notice link');
    const sourceUrl = new URL(href, FDA_URL);
    if (sourceUrl.origin !== 'https://www.fda.gov' || !sourceUrl.pathname.startsWith('/safety/recalls-market-withdrawals-safety-alerts/')) throw new Error('Unexpected FDA notice URL');
    const fields = [value(1), value(2), value(3), value(4)];
    if (fields.some(field => !field || field.length > 2000)) throw new Error('Invalid FDA metadata');
    const terminated = value(5);
    if (terminated && !/^terminated$/i.test(terminated)) throw new Error('Unknown FDA recall status');
    const id = createHash('sha256').update(`${sourceUrl.href}|${fields[1]}`).digest('hex');
    if (seen.has(id)) throw new Error('Duplicate FDA recall');
    seen.add(id);
    records.push({ id, date, brand: fields[0], product: fields[1], reason: fields[2], company: fields[3], status: terminated ? 'terminated' : 'not-marked-terminated', sourceUrl: sourceUrl.href });
  });
  if (!records.length || records.length > 100) throw new Error('Unexpected FDA listing size');
  if (Number.isNaN(Date.parse(retrievedAt))) throw new Error('Invalid retrieval date');
  return { publisher: 'US Food and Drug Administration', sourceUrl: FDA_URL, retrievedAt, country: 'US', coverage: 'Partial snapshot of the displayed animal/veterinary listing; includes medicines and supplements. Not a complete recall registry. Unmarked notices may be ongoing or completed. No match is not a safety clearance.', contentHash: createHash('sha256').update(html).digest('hex'), records };
}

/** Fixed public source, no redirects, bounded transfer and deadline. */
export async function fetchFdaListing(): Promise<string> {
  const response = await fetch(FDA_URL, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'PetPal-source-sync/1.0', Accept: 'text/html' } });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html') || !response.body) throw new Error('FDA source unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2000000) throw new Error('FDA source exceeds transfer limit');
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel(); }
}
