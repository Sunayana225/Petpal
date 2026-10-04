/** Every verdict the API is allowed to return. */
export type SafetyLevel = 'safe' | 'unsafe' | 'caution' | 'unknown';

/** Which layer produced an answer — lets the UI explain *why*. */
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
  caution?: string;
  source?: string;
  /** Present on commercial-product answers from Open Pet Food Facts. */
  brand?: string;
  product_name?: string;
  barcode?: string;
  image_url?: string;
  ingredients?: string[];
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

export interface PetInfo {
  supportedPets: string[];
  count: number;
}

export interface CategoryListResponse {
  pet: string;
  count: number;
  safeFoods?: FoodItem[];
  cautionFoods?: FoodItem[];
  unsafeFoods?: FoodItem[];
}

export interface SearchResponse {
  query: string;
  pet: string | null;
  results: FoodItem[];
  count: number;
}

export interface StatsResponse {
  stats: Record<string, Record<string, number>>;
  supportedPets: string[];
  totalEntries: number;
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  timestamp: string;
  version: string;
  uptime: number;
}

export type FoodCategory = 'safe' | 'caution' | 'unsafe';

// ---- Developer console ------------------------------------------------------

export interface AuthUser {
  id: string;
  provider: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
}

export type QuotaWindow = 'day' | 'month' | 'total';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  enabled: boolean;
  scope: string;
  quotaLimit: number | null;
  quotaWindow: QuotaWindow;
  ipAllowlist: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiKey {
  key: ApiKey;
  /** The full key — available only in the response that created it. */
  rawKey: string;
}

export interface UsageEvent {
  id: string;
  keyId: string;
  ts: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  source: string | null;
}

export interface UsageResponse {
  totals: { total: number; since: number };
  daily: { day: string; count: number }[];
  recent: UsageEvent[];
}

