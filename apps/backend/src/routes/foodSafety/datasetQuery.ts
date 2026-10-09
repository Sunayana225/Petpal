import { createHash } from 'crypto';
import type { Request } from 'express';
import type { IndexedFood } from '../../repositories/foodSafetyRepository';
import { CustomError } from '../../middleware/errorHandler';
import { normalizeFoodKey, normalizePetKey, SAFETY_RANK } from '../../utils/normalization';
import { objectInput, textInput } from './input';

export const DATASET_FIELDS = ['food', 'pet', 'safety', 'description', 'symptoms', 'benefits', 'severity', 'alternatives', 'preparation', 'recommendation', 'caution', 'source', 'brand', 'product_name', 'barcode', 'image_url', 'ingredients'] as const;
export const DATASET_OPTIONS = ['pet', 'safety', 'severity', 'source', 'q', 'match', 'sort', 'order', 'fields', 'has', 'limit', 'offset', 'cursor'] as const;
function scalar(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) throw new CustomError(`${field} must be a nonempty string.`, 400);
  return value.trim();
}
function member(value: unknown, field: string, values: readonly string[], fallback?: string): string | undefined {
  const parsed = scalar(value, field) ?? fallback;
  if (parsed !== undefined && !values.includes(parsed)) throw new CustomError(`${field} must be one of: ${values.join(', ')}.`, 400);
  return parsed;
}
function integer(value: unknown, field: string, fallback: number, max: number, min = 0): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value) || Number(value) < min || Number(value) > max) throw new CustomError(`${field} must be an integer from ${min} to ${max}.`, 400);
  return Number(value);
}
export interface DatasetQuery {
  pet?: string; safety?: string; severity?: string; source?: string; q?: string;
  match: string; sort: string; order: string; fields?: string[]; has?: string;
  limit: number; offset: number; cursor?: string; fingerprint: string;
}
export function datasetFingerprint(query: Pick<DatasetQuery, 'pet' | 'safety' | 'severity' | 'source' | 'q' | 'match' | 'sort' | 'order' | 'fields' | 'has'>): string {
  const { pet, safety, severity, source, q, match, sort, order, fields, has } = query;
  return createHash('sha256').update(JSON.stringify({ pet, safety, severity, source, q, match, sort, order, fields, has })).digest('hex').slice(0, 24);
}
export function datasetQuery(req: Request, category?: string, pathPet?: string): DatasetQuery {
  const input = objectInput(req.query, DATASET_OPTIONS);
  const rawPet = scalar(input.pet, 'pet');
  const pet = rawPet ? normalizePetKey(textInput(rawPet, 'pet', 50)) : undefined;
  const pathKey = pathPet ? normalizePetKey(textInput(pathPet, 'pet', 50)) : undefined;
  if ((rawPet && !pet) || (pathPet && !pathKey)) throw new CustomError('Unsupported pet species.', 400);
  if (pet && pathKey && pet !== pathKey) throw new CustomError('Query pet conflicts with path pet.', 400);
  const safety = member(input.safety, 'safety', ['safe', 'caution', 'unsafe']);
  if (safety && category && safety !== category) throw new CustomError('Safety filter conflicts with category.', 400);
  const severity = member(input.severity, 'severity', ['low', 'medium', 'high']);
  const source = scalar(input.source, 'source');
  if (source && source.length > 100) throw new CustomError('source exceeds 100 characters.', 400);
  const q = input.q === undefined ? undefined : textInput(input.q, 'food', 100);
  const match = member(input.match, 'match', ['contains', 'prefix', 'exact'], 'contains')!;
  if (input.match !== undefined && !q) throw new CustomError('match requires q.', 400);
  const sort = member(input.sort, 'sort', ['food', 'pet', 'safety', 'severity', 'source'], 'food')!;
  const order = member(input.order, 'order', ['asc', 'desc'], 'asc')!;
  const rawFields = scalar(input.fields, 'fields');
  const fields = rawFields?.split(',');
  if (fields && (fields.length > 10 || new Set(fields).size !== fields.length || fields.some(field => !(DATASET_FIELDS as readonly string[]).includes(field)))) throw new CustomError('fields must contain up to 10 unique supported names.', 400);
  const has = member(input.has, 'has', ['symptoms', 'benefits', 'alternatives', 'preparation', 'recommendation', 'ingredients']);
  const limit = integer(input.limit, 'limit', 100, 100, 1);
  const offset = integer(input.offset, 'offset', 0, 100000);
  const cursor = scalar(input.cursor, 'cursor');
  if (cursor && input.offset !== undefined) throw new CustomError('Use cursor or offset, not both.', 400);
  if (cursor && (cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor))) throw new CustomError('Invalid cursor.', 400);
  const filters = { pet: pathKey ?? pet ?? undefined, safety: category ?? safety, severity, source: source?.toLowerCase(), q: q ? normalizeFoodKey(q) : undefined, match, sort, order, fields, has };
  const fingerprint = datasetFingerprint(filters);
  return { ...filters, limit, offset, cursor, fingerprint };
}
function sortValue(item: IndexedFood, field: string): string | number {
  if (field === 'food') return normalizeFoodKey(item.food);
  if (field === 'safety') return SAFETY_RANK[item.safety];
  if (field === 'severity') return { low: 1, medium: 2, high: 3 }[item.severity ?? 'low'] * (item.severity ? 1 : 0);
  return String(item[field as keyof IndexedFood] ?? '').toLowerCase();
}
export function filterFoods(records: IndexedFood[], query: DatasetQuery): IndexedFood[] {
  const result = records.filter(item => {
    if (query.pet && item.pet !== query.pet) return false;
    if (query.safety && item.safety !== query.safety) return false;
    if (query.severity && item.severity !== query.severity) return false;
    if (query.source && !item.source?.toLowerCase().includes(query.source)) return false;
    if (query.has) {
      const value = item[query.has as keyof IndexedFood];
      if (!value || (Array.isArray(value) && !value.length)) return false;
    }
    if (query.q) {
      const food = normalizeFoodKey(item.food);
      if (query.match === 'exact' && food !== query.q) return false;
      if (query.match === 'prefix' && !food.startsWith(query.q)) return false;
      if (query.match === 'contains' && !query.q.split(' ').every(term => food.includes(term))) return false;
    }
    return true;
  });
  return result.sort((a, b) => {
    const av = sortValue(a, query.sort), bv = sortValue(b, query.sort);
    const compared = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'en');
    return (query.order === 'desc' ? -compared : compared) || a.pet.localeCompare(b.pet, 'en') || normalizeFoodKey(a.food).localeCompare(normalizeFoodKey(b.food), 'en');
  });
}
export function foodPage(records: IndexedFood[], query: DatasetQuery, revision: string) {
  let offset = query.offset;
  if (query.cursor) {
    let token: { v?: unknown; offset?: unknown; revision?: unknown; fingerprint?: unknown };
    try { token = JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')); }
    catch { throw new CustomError('Invalid cursor.', 400); }
    if (!token || token.v !== 1 || !Number.isSafeInteger(token.offset) || Number(token.offset) < 0 || Number(token.offset) > 100000 || typeof token.revision !== 'string' || typeof token.fingerprint !== 'string') throw new CustomError('Invalid cursor.', 400);
    if (token.revision !== revision) throw new CustomError('Dataset changed; restart pagination.', 409);
    if (token.fingerprint !== query.fingerprint) throw new CustomError('Cursor does not match these filters.', 400);
    offset = Number(token.offset);
  }
  const page = records.slice(offset, offset + query.limit);
  const items = query.fields ? page.map(item => Object.fromEntries([...new Set(['food', 'pet', 'safety', ...query.fields!])].filter(field => item[field as keyof IndexedFood] !== undefined).map(field => [field, item[field as keyof IndexedFood]]))) : page;
  const hasNext = offset + page.length < records.length;
  const nextCursor = hasNext ? Buffer.from(JSON.stringify({ v: 1, offset: offset + query.limit, revision, fingerprint: query.fingerprint })).toString('base64url') : null;
  return { items, pagination: { total: records.length, limit: query.limit, offset, hasNext, nextCursor }, revision };
}
