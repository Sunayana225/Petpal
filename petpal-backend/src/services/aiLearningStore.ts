import { randomUUID } from 'crypto';

import type { SafetyCategory, Severity } from '../types/foodSafety';
import { dataFilePath, findDataFile, readJsonFile, writeJsonFile } from '../utils/dataFiles';
import type { PetKey } from '../utils/normalization';

/**
 * The review queue for answers PetPal produced from the AI fallback.
 *
 * A veterinary safety database must not absorb machine guesses unreviewed, so
 * AI answers are captured as `pending` and only folded into the curated dataset
 * once a human approves them. Records live in `data/learned.json`, which is
 * operational data (git-ignored) and survives restarts.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface LearnedRecord {
  id: string;
  pet: PetKey;
  food: string;
  safety: SafetyCategory;
  description?: string;
  symptoms?: string[];
  benefits?: string[];
  alternatives?: string[];
  preparation?: string;
  recommendation?: string;
  severity?: Severity;
  /** Provenance is fixed to the AI fallback for now. */
  source: 'ai';
  status: ReviewStatus;
  createdAt: string;
  reviewedAt?: string;
}

/** The shape a source hands to the sink — the store fills in id/status/time. */
export type NewLearnedRecord = Omit<
  LearnedRecord,
  'id' | 'source' | 'status' | 'createdAt' | 'reviewedAt'
>;

/** Anything that can capture an AI answer for later review. */
export interface LearningSink {
  recordAnswer(input: NewLearnedRecord): void;
}

export interface ReviewStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

const FILE_NAME = 'learned.json';

export class AiLearningStore implements LearningSink {
  private records: LearnedRecord[] = [];
  private readonly filePath: string;

  /** `filePath` is injectable so tests can point at a temp file. */
  constructor(filePath?: string) {
    const injected = filePath !== undefined;
    this.filePath = filePath ?? dataFilePath(FILE_NAME);

    // An explicitly injected path wins; otherwise prefer whichever copy of the
    // file already exists on disk (it may live beside the launched working
    // directory).
    const source = injected ? this.filePath : findDataFile(FILE_NAME) ?? this.filePath;
    const data = readJsonFile<LearnedRecord[]>(source, []);
    this.records = Array.isArray(data) ? data : [];
  }

  private persist(): void {
    writeJsonFile(this.filePath, this.records);
  }

  list(status?: ReviewStatus): LearnedRecord[] {
    return status ? this.records.filter((record) => record.status === status) : [...this.records];
  }

  listApproved(): LearnedRecord[] {
    return this.list('approved');
  }

  find(id: string): LearnedRecord | undefined {
    return this.records.find((record) => record.id === id);
  }

  /**
   * Queue an AI answer, ignoring duplicates: if the same pet + food is already
   * pending or approved we keep the existing record rather than piling up
   * repeats of the same question.
   */
  recordAnswer(input: NewLearnedRecord): LearnedRecord | null {
    const key = `${input.pet}|${input.food.trim().toLowerCase()}`;
    const exists = this.records.some(
      (record) =>
        `${record.pet}|${record.food.trim().toLowerCase()}` === key &&
        record.status !== 'rejected',
    );
    if (exists) return null;

    const entry: LearnedRecord = {
      ...input,
      id: randomUUID(),
      source: 'ai',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.records.push(entry);
    this.persist();
    return entry;
  }

  approve(id: string): LearnedRecord | null {
    return this.setStatus(id, 'approved');
  }

  reject(id: string): LearnedRecord | null {
    return this.setStatus(id, 'rejected');
  }

  stats(): ReviewStats {
    const counts: ReviewStats = { pending: 0, approved: 0, rejected: 0, total: this.records.length };
    for (const record of this.records) counts[record.status] += 1;
    return counts;
  }

  private setStatus(id: string, status: ReviewStatus): LearnedRecord | null {
    const record = this.find(id);
    if (!record) return null;
    if (record.status !== status) {
      record.status = status;
      record.reviewedAt = new Date().toISOString();
      this.persist();
    }
    return record;
  }
}

/** Process-wide queue backed by `data/learned.json`. */
export const aiLearningStore = new AiLearningStore();
