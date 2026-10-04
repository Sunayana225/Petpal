import {
  aiAnswerRepository,
  type AiAnswerRepository,
  type AnswerStats,
  type AnswerStatus,
  type StoredAnswer,
} from '../repositories/aiAnswerRepository';
import type { FoodSafetyResult } from '../types/foodSafety';
import { TTL, TtlCache } from '../utils/cache';
import { normalizeFoodKey } from '../utils/normalization';

/** Anything that can persist a remote answer so it is never asked for twice. */
export interface AnswerSink {
  recordAnswer(petKey: string, result: FoodSafetyResult): void;
}

/** A sink that can also serve previously stored answers. */
export interface AnswerStore extends AnswerSink {
  getServable(petKey: string, foodKey: string): FoodSafetyResult | null;
}

const DEFAULT_TTL_HOURS = 168; // one week
const UNKNOWN_TTL_HOURS = 24;

function answerTtlMs(safety: FoodSafetyResult['safety']): number {
  const configured = Number.parseInt(process.env.AI_ANSWER_TTL_HOURS ?? '', 10);
  const hours = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_HOURS;
  const effective = safety === 'unknown' ? Math.min(hours, UNKNOWN_TTL_HOURS) : hours;
  return effective * 60 * 60 * 1000;
}

function serveUnreviewed(): boolean {
  return (process.env.AI_CACHE_SERVE_UNREVIEWED ?? 'true') !== 'false';
}

/**
 * Two-layer cache in front of the remote sources: an in-memory `TtlCache` for
 * the hot path, backed by the durable `ai_answers` table so a restart does not
 * re-spend a single Gemini call.
 */
export class DurableAnswerCache implements AnswerStore {
  private readonly memory = new TtlCache<FoodSafetyResult>(500);

  constructor(private readonly explicitRepo?: AiAnswerRepository) {}

  private get repo(): AiAnswerRepository {
    return this.explicitRepo ?? aiAnswerRepository();
  }

  getServable(petKey: string, foodKey: string): FoodSafetyResult | null {
    const key = `${petKey}|${foodKey}`;

    const cached = this.memory.get(key);
    if (cached) return cached;

    const stored = this.repo.find(petKey, foodKey);
    if (!stored || stored.status === 'rejected') return null;

    if (stored.status === 'pending' && !serveUnreviewed()) {
      // Still avoids a repeat AI call, but does not serve unreviewed advice.
      return {
        pet: petKey,
        food: foodKey,
        safety: 'unknown',
        message:
          'This food is awaiting veterinary review — please consult your veterinarian.',
        source: 'none',
      };
    }

    this.memory.set(key, stored.payload, TTL.ai);
    return stored.payload;
  }

  recordAnswer(petKey: string, result: FoodSafetyResult): void {
    const food = normalizeFoodKey(result.food);
    if (!food) return;

    const ttlMs = answerTtlMs(result.safety);
    const status: AnswerStatus = result.safety === 'unknown' ? 'cached' : 'pending';

    this.repo.save({
      pet: petKey,
      food,
      safety: result.safety,
      payload: result,
      source: result.source ?? 'ai',
      status,
      ttlMs,
    });

    this.memory.set(`${petKey}|${food}`, result, ttlMs);
  }

  list(status?: AnswerStatus): StoredAnswer[] {
    return this.repo.list(status);
  }

  stats(): AnswerStats {
    return this.repo.stats();
  }

  approve(id: string): StoredAnswer | null {
    const record = this.repo.setStatus(id, 'approved');
    this.memory.clear();
    return record;
  }

  reject(id: string): StoredAnswer | null {
    const record = this.repo.setStatus(id, 'rejected');
    this.memory.clear();
    return record;
  }
}

/** Shared cache — opens no database until first use. */
export const answerCache = new DurableAnswerCache();
