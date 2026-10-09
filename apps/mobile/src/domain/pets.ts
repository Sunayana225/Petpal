import type { SafetyLevel } from './types';

export interface PetMeta {
  key: string;
  label: string;
  emoji: string;
}

export const PETS: PetMeta[] = [
  { key: 'dogs', label: 'Dog', emoji: '🐕' },
  { key: 'cats', label: 'Cat', emoji: '🐈' },
  { key: 'rabbits', label: 'Rabbit', emoji: '🐰' },
  { key: 'hamsters', label: 'Hamster', emoji: '🐹' },
  { key: 'birds', label: 'Bird', emoji: '🐦' },
  { key: 'turtles', label: 'Turtle', emoji: '🐢' },
  { key: 'fish', label: 'Fish', emoji: '🐠' },
  { key: 'lizards', label: 'Lizard', emoji: '🦎' },
  { key: 'snakes', label: 'Snake', emoji: '🐍' },
  { key: 'chickens', label: 'Chicken', emoji: '🐔' },
];

export const SAFETY_META: Record<SafetyLevel, { label: string; color: string; gloss: string }> = {
  safe: { label: 'Listed safe', color: '#3f5a3a', gloss: 'Source-listed suitability; preparation, quantity and health matter.' },
  caution: { label: 'Caution', color: '#945c26', gloss: 'Moderation only — check with your vet.' },
  unsafe: { label: 'Unsafe', color: '#7a2e22', gloss: 'Do not feed. Contact a vet if consumed.' },
  unknown: { label: 'Unknown', color: '#8f8f84', gloss: 'No data — consult a veterinarian.' },
};
