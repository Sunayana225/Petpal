/** Shared with the API contract — mirrors the web client's types. */

export type SafetyLevel = 'safe' | 'unsafe' | 'caution' | 'unknown';

export type AnswerSource = 'database' | 'external' | 'ai' | 'none';

export type Severity = 'low' | 'medium' | 'high';

export interface FoodItem {
  food: string;
  safety: SafetyLevel;
  description: string;
  symptoms?: string[];
  benefits?: string[];
  severity?: Severity;
  alternatives?: string[];
  preparation?: string;
  recommendation?: string;
  source?: string;
}

export interface FoodSafetyResult {
  pet: string;
  food: string;
  safety: SafetyLevel;
  message: string;
  details?: FoodItem;
  source?: AnswerSource;
  requestId?: string;
  processingTime?: string;
}

export interface CategoryListResponse {
  pet: string;
  count: number;
  safeFoods?: FoodItem[];
  cautionFoods?: FoodItem[];
  unsafeFoods?: FoodItem[];
}

export type FoodCategory = 'safe' | 'caution' | 'unsafe';
