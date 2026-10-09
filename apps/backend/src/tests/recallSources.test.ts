import express from 'express';
import request from 'supertest';
import { parseFdaListing } from '../services/recallSources';
import { createRecallRouter } from '../routes/recalls';

const headers = ['Date', 'Brand Name(s)', 'Product Description', 'Recall Reason Description', 'Company Name', 'Terminated Recall', 'Excerpt'];
const row = (status = '') => `<tr><td><time datetime="2026-09-08T04:00:00Z">09/08/2026</time></td><td><a href="/safety/recalls-market-withdrawals-safety-alerts/test">Test &amp; Co</a></td><td>Supplement</td><td>Salmonella</td><td>Manufacturer</td><td>${status}</td><td></td></tr>`;
const html = (rows: string) => `<table id="datatable"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;

describe('FDA listing ingestion', () => {
  test('preserves factual provenance and does not label unmarked recalls active', () => {
    const result = parseFdaListing(html(row()), '2026-10-09T00:00:00Z');
    expect(result.records[0]).toMatchObject({ brand: 'Test & Co', status: 'not-marked-terminated', date: '2026-09-08' });
    expect(result.country).toBe('US');
    expect(result.coverage).toContain('No match is not a safety clearance');
    expect(result.contentHash).toHaveLength(64);
    expect(parseFdaListing(html(row('Terminated')), result.retrievedAt).records[0].status).toBe('terminated');
  });
  test('rejects missing rows, changed schema, duplicate notices and foreign links', () => {
    expect(() => parseFdaListing(html(''), '2026-10-09')).toThrow();
    expect(() => parseFdaListing(html(row()).replace('Company Name', 'Changed'), '2026-10-09')).toThrow();
    expect(() => parseFdaListing(html(row() + row()), '2026-10-09')).toThrow();
    expect(() => parseFdaListing(html(row()).replace('href="/safety/', 'href="https://evil.example/safety/'), '2026-10-09')).toThrow();
    expect(() => parseFdaListing(html(row('Active')), '2026-10-09')).toThrow();
  });
});

describe('Recall API', () => {
  const app = express();
  app.use('/recalls', createRecallRouter());
  test('returns dated coverage and supports matching, pagination and conditional reads', async () => {
    const all = await request(app).get('/recalls').expect(200);
    expect(all.body.source.retrievedAt).toBeTruthy();
    expect(all.body.records.length).toBeGreaterThan(0);
    expect(all.body.source.country).toBe('US');
    const match = await request(app).get('/recalls').query({ q: all.body.records[0].brand, limit: 1 }).expect(200);
    expect(match.body.records).toHaveLength(1);
    await request(app).get('/recalls').set('If-None-Match', all.headers.etag).expect(304);
    const empty = await request(app).get('/recalls?q=not-a-real-brand-xyz').expect(200);
    expect(empty.body.records).toEqual([]);
    expect(empty.body.source.coverage).toContain('No match is not a safety clearance');
  });
  test.each(['limit=0', 'limit=101', 'offset=-1', 'offset=100001', 'status=active', 'unknown=x', 'q[x]=y'])('rejects invalid query %s', async query => {
    await request(app).get(`/recalls?${query}`).expect(400);
  });
});
