import { Router } from 'express';
import { CustomError } from '../../middleware/errorHandler';
import type { FoodSafetyService } from '../../services/foodSafetyService';
import { normalizeFoodKey, normalizePetKey, normalizePetLabel } from '../../utils/normalization';
import { objectInput, parseCheck, textInput } from './input';
import type { FoodSafetyResult } from '../../domain/foodSafety';

/** Bulk endpoints deliberately use curated data only; one request cannot amplify paid calls. */
export function createBatchRouter(service: FoodSafetyService): Router {
  const router = Router();
  router.post('/batch-check', (req, res) => {
    const body = objectInput(req.body, ['items']);
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20) throw new CustomError('items must contain 1–20 checks.', 400);
    const inputs = body.items.map(item => {
      const parsed = parseCheck(item);
      if (objectInput(item, ['pet', 'food', 'mode']).mode && parsed.mode !== 'local') throw new CustomError('Batch checks support local mode only.', 400);
      return parsed;
    });
    if (req.header('x-gemini-key')) throw new CustomError('Batch checks do not accept Gemini keys.', 400);
    const cache = new Map<string, FoodSafetyResult>();
    const results = inputs.map(({ pet, food }, inputIndex) => {
      const key = JSON.stringify([normalizePetKey(pet) ?? normalizePetLabel(pet), normalizeFoodKey(food)]);
      let result = cache.get(key);
      if (!result) { result = service.checkLocal(pet, food); cache.set(key, result); }
      // Rebuild the display message for aliases; never echo another item's input.
      const displayed = service.withLocalInput(result, pet, food);
      return { ...displayed, inputIndex };
    });
    res.set('Cache-Control', 'no-store').json({ results, count: results.length, uniqueChecks: cache.size, mode: 'local', revision: service.revision, requestId: res.locals.requestId });
  });
  router.post('/compare', (req, res) => {
    const body = objectInput(req.body, ['food', 'pets']);
    const food = textInput(body.food, 'food', 100);
    if (!Array.isArray(body.pets) || !body.pets.length || body.pets.length > 10) throw new CustomError('pets must contain 1–10 species.', 400);
    const pets = body.pets.map(value => textInput(value, 'pet', 50));
    const canonical = pets.map(pet => normalizePetKey(pet));
    if (canonical.some(pet => !pet)) throw new CustomError('Comparison requires supported species.', 400);
    if (new Set(canonical).size !== canonical.length) throw new CustomError('Comparison species must be distinct, including aliases.', 400);
    if (req.header('x-gemini-key')) throw new CustomError('Comparison does not accept Gemini keys.', 400);
    const results = pets.map(pet => service.checkLocal(pet, food));
    const bySafety = Object.fromEntries(['safe', 'caution', 'unsafe', 'unknown'].map(safety => [safety, results.filter(result => result.safety === safety).map(result => result.pet)]));
    res.set('Cache-Control', 'no-store').json({ food, results, count: results.length, bySafety, consistent: new Set(results.map(result => result.safety)).size === 1, mode: 'local', revision: service.revision, requestId: res.locals.requestId });
  });
  router.all(['/batch-check', '/compare'], (_req, res) => res.set('Allow', 'POST, OPTIONS').status(405).json({ error: 'Method Not Allowed', message: 'Bulk checks require POST.' }));
  return router;
}
