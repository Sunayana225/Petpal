import type { Request, Response, NextFunction } from 'express';
import { hasControlCharacters } from '../../utils/text';
import { CustomError } from '../../middleware/errorHandler';
import { normalizeFoodKey, normalizePetLabel, normalizePetKey } from '../../utils/normalization';

export interface CheckInput { pet: string; food: string; mode: 'auto' | 'local' }
export function objectInput(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CustomError('Provide a JSON object.', 400);
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new CustomError('Unsupported input field.', 400);
  return input;
}
export function textInput(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw new CustomError(`${field} must be a string.`, 400);
  const text = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (hasControlCharacters(value) || !text || text.length > max) throw new CustomError(`${field} must contain 1–${max} readable characters.`, 400);
  if (field === 'pet' && !/^[\p{L} ]+$/u.test(text)) throw new CustomError('pet must contain letters and spaces.', 400);
  if (field === 'food' && (!/^[\p{L}\p{N} \-.,()'’/]+$/u.test(text) || !normalizeFoodKey(text))) throw new CustomError('food contains invalid characters.', 400);
  return text;
}
export function parseCheck(value: unknown, legacy = false): CheckInput {
  const input = objectInput(value, legacy ? ['pet', 'animal', 'food', 'mode'] : ['pet', 'food', 'mode']);
  if (legacy && input.pet !== undefined && input.animal !== undefined && (normalizePetKey(String(input.pet)) ?? normalizePetLabel(String(input.pet))) !== (normalizePetKey(String(input.animal)) ?? normalizePetLabel(String(input.animal)))) {
    throw new CustomError('pet and animal must agree when both are provided.', 400);
  }
  const pet = textInput(input.pet ?? (legacy ? input.animal : undefined), 'pet', 50);
  const food = textInput(input.food, 'food', 100);
  const mode = input.mode ?? 'auto';
  if (mode !== 'auto' && mode !== 'local') throw new CustomError('mode must be auto or local.', 400);
  return { pet, food, mode };
}
export function checkInput(legacy = false) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.locals.checkInput = parseCheck(req.method === 'POST' ? req.body : req.query, legacy);
      const key = req.header('x-gemini-key');
      if (key && (!/^[A-Za-z0-9_-]{10,200}$/.test(key) || res.locals.checkInput.mode === 'local')) throw new CustomError('Invalid Gemini key or key used with local mode.', 400);
      next();
    } catch (error) { next(error); }
  };
}
