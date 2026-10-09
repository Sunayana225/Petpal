/**
 * Shared food-safety domain types.
 *
 * This module is intentionally a leaf: it imports nothing from the rest of the
 * app so services, repositories and routes can share the types without ever
 * creating a circular import.
 */

/** Every verdict the API is allowed to return. */
export type SafetyLevel = 'safe' | 'unsafe' | 'caution' | 'unknown';

/** A verdict backed by actual data — i.e. everything except `unknown`. */
export type SafetyCategory = Exclude<SafetyLevel, 'unknown'>;

export type Severity = 'low' | 'medium' | 'high';

/**
 * Which layer produced an answer. Lets clients, logs and tests trace
 * provenance instead of guessing whether a result came from the veterinary
 * database, Open Pet Food Facts, or the Gemini fallback.
 */
export type AnswerSource = 'database' | 'external' | 'ai' | 'none';

export interface FoodItem {
  aliases?: string[];
  evidence?: EvidenceReceipt[];
  food: string;
  safety: SafetyLevel;
  description: string;
  symptoms?: string[];
  benefits?: string[];
  severity?: Severity;
  alternatives?: string[];
  preparation?: string;
  recommendation?: string;
  caution?: string;
  /** Human readable attribution, e.g. "ManyPets" or "Veterinary database". */
  source?: string;
  // External API (Open Pet Food Facts) fields
  brand?: string;
  product_name?: string;
  barcode?: string;
  image_url?: string;
  ingredients?: string[];
}

/** Each receipt describes its source verdict, not the merged PetPal verdict. */
export interface EvidenceReceipt {
  publisher: string;
  sourceUrl: string;
  itemId: string;
  sourceVerdict: SafetyCategory;
  assessedGroup: string;
  reviewStatus: 'publisher-reported';
  upstreamRevision: string;
  retrievedAt: string;
  license: string;
  attribution: string;
  references: string[];
}

export interface FoodSafetyResult {
  assessmentVersion?: 'structured-v1';
  /** Echoes back the caller's original, unmodified input. */
  pet: string;
  /** Echoes back the caller's original, unmodified input. */
  food: string;
  safety: SafetyLevel;
  message: string;
  details?: FoodItem;
  source?: AnswerSource;
}
