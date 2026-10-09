import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler, CustomError } from '../../middleware/errorHandler';
import type { FoodSafetyService } from '../../services/foodSafetyService';
import { conditionalJson } from '../../utils/conditionalJson';
import { DATASET_FIELDS, datasetFingerprint, datasetQuery, filterFoods, foodPage } from './datasetQuery';
import { checkInput, type CheckInput } from './input';

export function createDatasetRouter(service: FoodSafetyService): Router {
  const router = Router();
  function browse(kind = 'foods', category?: string) {
    return asyncHandler(async (req: Request, res: Response) => {
      const pet = req.params.pet ? String(req.params.pet) : undefined;
      const query = datasetQuery(req, category, pet);
      if ((kind === 'search' || kind === 'suggestions') && !query.q) throw new CustomError('Query parameter q is required.', 400);
      if (kind === 'suggestions') {
        if (req.query.match && req.query.match !== 'prefix') throw new CustomError('Autocomplete uses prefix matching.', 400);
        if (req.query.limit && query.limit > 20) throw new CustomError('Autocomplete limit must be at most 20.', 400);
        query.limit = Math.min(query.limit, 20);
        query.match = 'prefix';
        query.fingerprint = datasetFingerprint(query);
      }
      const cacheKey = `${service.revision}:${query.fingerprint}`;
      let records = service.datasetCache.get(cacheKey);
      if (!records) {
        records = filterFoods(service.getFoods(query.pet), query);
        service.datasetCache.set(cacheKey, records, 300000);
      }
      const { items, pagination, revision } = foodPage(records, query, service.revision);
      if (pagination.nextCursor) {
        const url = new URL(req.originalUrl, 'http://localhost');
        url.searchParams.delete('offset');
        url.searchParams.set('cursor', pagination.nextCursor);
        res.set('Link', `<${url.pathname}${url.search}>; rel="next"`);
      }
      const name = category ? `${category}Foods` : kind === 'search' ? 'results' : kind;
      conditionalJson(req, res, {
        ...(pet ? { pet } : {}),
        ...(kind === 'search' || kind === 'suggestions' ? { query: String(req.query.q).trim(), pet: req.query.pet ?? null } : {}),
        [name]: items, count: items.length, pagination, revision,
      }, revision);
    });
  }
  router.get('/foods', browse());
  router.get('/search', browse('search'));
  router.get('/autocomplete', browse('suggestions'));
  for (const category of ['safe', 'caution', 'unsafe']) router.get(`/${category}/:pet`, browse('foods', category));
  router.get('/lookup', checkInput(), (req, res) => {
    const { pet, food, mode } = res.locals.checkInput as CheckInput;
    if (req.query.mode && mode !== 'local') throw new CustomError('Lookup supports local mode only.', 400);
    conditionalJson(req, res, service.checkLocal(pet, food), service.revision);
  });
  router.get('/pets', (req, res) => {
    if (Object.keys(req.query).length) throw new CustomError('This endpoint accepts no query parameters.', 400);
    const supportedPets = service.getSupportedPets();
    conditionalJson(req, res, { supportedPets, count: supportedPets.length }, service.revision);
  });
  router.get('/species', (req, res) => {
    if (Object.keys(req.query).length) throw new CustomError('This endpoint accepts no query parameters.', 400);
    const stats = service.getStats();
    conditionalJson(req, res, { species: service.getSupportedPets().map(pet => ({ pet, ...stats[pet] })), revision: service.revision }, service.revision);
  });
  router.get('/stats', (req, res) => {
    if (Object.keys(req.query).length) throw new CustomError('Use summary for filtered statistics.', 400);
    conditionalJson(req, res, { stats: service.getStats(), supportedPets: service.getSupportedPets(), totalEntries: service.totalEntries, revision: service.revision }, service.revision);
  });
  router.get('/summary', (req, res) => {
    const query = datasetQuery(req);
    if (['cursor', 'offset', 'limit', 'fields', 'sort', 'order'].some(key => req.query[key] !== undefined)) throw new CustomError('Summary accepts filters only.', 400);
    const records = filterFoods(service.getFoods(query.pet), query);
    const counts = (values: string[]) => {
      const totals = new Map<string, number>();
      for (const value of values) totals.set(value, (totals.get(value) ?? 0) + 1);
      return Object.fromEntries([...totals].sort(([a], [b]) => a.localeCompare(b, 'en')));
    };
    conditionalJson(req, res, {
      total: records.length, distinctFoods: new Set(records.map(item => item.food.toLowerCase())).size,
      byPet: counts(records.map(item => item.pet)), bySafety: counts(records.map(item => item.safety)),
      bySeverity: counts(records.map(item => item.severity ?? 'unspecified')), bySource: counts(records.map(item => item.source ?? 'unspecified')),
      withSymptoms: records.filter(item => item.symptoms?.length).length, withPreparation: records.filter(item => item.preparation).length,
      withAlternatives: records.filter(item => item.alternatives?.length).length, revision: service.revision,
    }, service.revision);
  });
  router.get('/sources', (req, res) => {
    if (Object.keys(req.query).length) throw new CustomError('This endpoint accepts no query parameters.', 400);
    const counts = new Map<string, number>();
    for (const item of service.getFoods()) counts.set(item.source ?? 'unspecified', (counts.get(item.source ?? 'unspecified') ?? 0) + 1);
    conditionalJson(req, res, { sources: [...counts].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([source, count]) => ({ source, count })), revision: service.revision }, service.revision);
  });
  router.get('/metadata', (req, res) => {
    if (Object.keys(req.query).length) throw new CustomError('This endpoint accepts no query parameters.', 400);
    conditionalJson(req, res, {
      revision: service.revision, totalEntries: service.totalEntries, supportedPets: service.getSupportedPets(),
      fields: DATASET_FIELDS, filters: ['pet', 'safety', 'severity', 'source', 'q', 'has'],
      matches: ['contains', 'prefix', 'exact'], sorts: ['food', 'pet', 'safety', 'severity', 'source'], orders: ['asc', 'desc'],
      limits: { page: 100, autocomplete: 20, batch: 20, compare: 10, offset: 100000 },
      pagination: ['offset', 'cursor'], cache: 'private revalidation', batchMode: 'local',
    }, service.revision);
  });
  // Return useful method errors for known routes; unknown paths remain 404.
  router.use((req, res, next) => {
    if (/^\/(foods|search|autocomplete|lookup|pets|species|stats|summary|sources|metadata|(?:safe|caution|unsafe)\/[^/]+)\/?$/i.test(req.path)) {
      return res.set('Allow', 'GET, HEAD, OPTIONS').status(405).json({ error: 'Method Not Allowed', message: 'Dataset endpoints use GET.' });
    }
    next();
  });
  return router;
}
