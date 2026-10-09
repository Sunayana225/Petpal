import type { SafetyLevel } from '../domain/foodSafety';

export interface AiAssessment { safety: SafetyLevel; description: string; hazardPresent: boolean }
export const assessmentSchema = {
  type: 'object', additionalProperties: false, required: ['safety', 'description', 'hazardPresent'],
  properties: {
    safety: { type: 'string', enum: ['safe', 'unsafe', 'caution', 'unknown'] },
    description: { type: 'string' }, hazardPresent: { type: 'boolean' },
  },
};

/** Validate structured output; free text and contradictory results never imply safe. */
export function parseAssessment(text: string): AiAssessment | null {
  if (text.length > 12000) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const keys = ['safety', 'description', 'hazardPresent'];
    if (Object.keys(record).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(record, key))) return null;
    // Only literal, unique schema keys are accepted, including before JSON.parse's last-key-wins behaviour.
    if (keys.some(key => (text.match(new RegExp(`"${key}"\\s*:`, 'g')) ?? []).length !== 1)) return null;
    if (!['safe', 'unsafe', 'caution', 'unknown'].includes(String(record.safety)) || typeof record.hazardPresent !== 'boolean' || typeof record.description !== 'string' || !record.description.trim() || record.description.length > 6000) return null;
    if ((record.safety === 'safe' && record.hazardPresent) || (record.safety === 'unsafe' && !record.hazardPresent)) return null;
    if (record.safety === 'safe' && /\b(toxic|dangerous|unsafe)\b|\bnot\b.{0,40}\bsafe\b/i.test(record.description)) return null;
    return { safety: record.safety as SafetyLevel, description: record.description.trim(), hazardPresent: record.hazardPresent };
  } catch { return null; }
}
