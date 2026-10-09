import {
  aiAnswerRepository,
  type AiAnswerRepository,
  type AnswerStats,
  type AnswerStatus,
  type StoredAnswer,
} from '../repositories/aiAnswerRepository';
import type { FoodSafetyResult } from '../domain/foodSafety';
import { env } from '../config/env';
import { TTL, TtlCache } from '../utils/cache';
import { normalizeFoodKey } from '../utils/normalization';

/** Anything that can persist a remote answer so it is never asked for twice. */
export interface AnswerSink {
  recordAnswer(petKey: string, result: FoodSafetyResult): void;
}

/** A sink that can also serve previously stored answers. */
export interface AnswerStore extends AnswerSink {
  readonly revision?: number;
  getServable(petKey: string, foodKey: string): FoodSafetyResult | null;
  /** Only a human-approved answer — used to short-circuit BYOK requests. */
  getApproved(petKey: string, foodKey: string): FoodSafetyResult | null;
}

/**
 * `unknown` is usually a transient — no key configured, a bad key, or an
 * upstream blip — so it is cached only briefly. A longer TTL would lock a food
 * out of a fresh (and possibly successful) attempt.
 */
const UNKNOWN_TTL_MS = 15 * 60 * 1000;

function answerTtlMs(safety: FoodSafetyResult['safety']): number {
  if (safety === 'unknown') return UNKNOWN_TTL_MS;
  return env.aiAnswerTtlHours * 60 * 60 * 1000;
}

function serveUnreviewed(): boolean {
  return env.serveUnreviewedAi;
}

function productionEligible(stored: StoredAnswer): boolean {
  return !env.isProduction || stored.safety === 'unknown' || (stored.status === 'approved' && stored.source === 'ai' && stored.payload.assessmentVersion === 'structured-v1');
}

/**
 * Two-layer cache in front of the remote sources: an in-memory `TtlCache` for
 * the hot path, backed by the durable `ai_answers` table so a restart does not
 * re-spend a single Gemini call.
 */
export class DurableAnswerCache implements AnswerStore {
  private readonly memory = new TtlCache<FoodSafetyResult>(500);

  private memoryRevision = -1;

  get revision(): number { return this.repo.revision * 2 + (serveUnreviewed() ? 1 : 0); }

  clearMemory(): void { this.memory.clear(); }

  constructor(private readonly explicitRepo?: AiAnswerRepository) {}

  private get repo(): AiAnswerRepository {
    return this.explicitRepo ?? aiAnswerRepository();
  }

  getServable(petKey: string, foodKey: string): FoodSafetyResult | null {
    const revision = this.revision;
    if (this.memoryRevision !== revision) { this.memory.clear(); this.memoryRevision = revision; }
    const key = `${petKey}|${foodKey}`;

    const cached = this.memory.get(key);
    if (cached) return cached;

    const stored = this.repo.find(petKey, foodKey);
    if (!stored) return null;
    if (!productionEligible(stored)) {
      return { pet: petKey, food: foodKey, safety: 'unknown', source: 'none', message: 'This assessment requires validated human review. Please consult your veterinarian.' };
    }
    if (stored.status === 'rejected') return { pet: petKey, food: foodKey, safety: 'unknown', source: 'none', message: 'This answer was rejected during review. Please consult your veterinarian.' };

    if (stored.status === 'pending' && !serveUnreviewed()) {
      // Still avoids a repeat AI call, but does not serve unreviewed advice.
      return {
        pet: petKey,
        food: foodKey,
        safety: 'unknown',
        message:
          'This food is awaiting human review — please consult your veterinarian.',
        source: 'none',
      };
    }

    this.memory.set(key, stored.payload, stored.expiresAt === null ? TTL.ai : Math.max(0, Math.min(TTL.ai, stored.expiresAt - Date.now())));
    return stored.payload;
  }

  /**
   * A human-approved answer only. A BYOK caller is spending their own quota, so
   * they should get a fresh answer — a cached guess must not block them.
   */
  getApproved(petKey: string, foodKey: string): FoodSafetyResult | null {
    const stored = this.repo.find(petKey, foodKey);
    if (env.isProduction && stored && (stored.source !== 'ai' || stored.payload.assessmentVersion !== 'structured-v1')) return null;
    return stored && stored.status === 'approved' ? stored.payload : null;
  }

  recordAnswer(petKey: string, result: FoodSafetyResult): void {
    const food = normalizeFoodKey(result.food);
    if (!food) return;

    const ttlMs = answerTtlMs(result.safety);
    const status: AnswerStatus = result.safety === 'unknown' ? 'cached' : 'pending';

    const stored = this.repo.save({
      pet: petKey,
      food,
      safety: result.safety,
      payload: result,
      source: result.source ?? 'ai',
      status,
      ttlMs,
    });

    this.memory.delete(`${petKey}|${food}`);
    if (productionEligible(stored) && stored.status !== 'rejected' && (stored.status !== 'pending' || serveUnreviewed())) this.memory.set(`${petKey}|${food}`, stored.payload, stored.expiresAt === null ? TTL.ai : Math.max(0, Math.min(ttlMs, stored.expiresAt - Date.now())));
  }

  list(status?: AnswerStatus, limit = 100, offset = 0): StoredAnswer[] {
    return this.repo.list(status, limit, offset);
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
