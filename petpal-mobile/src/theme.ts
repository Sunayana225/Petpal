import { Platform } from 'react-native';

/**
 * The same restrained palette as the web client, so the two feel like one
 * product: parchment canvas, charcoal ink, hairline rules, botanical accent.
 */
export const colors = {
  parchment: '#fffef2',
  alabaster: '#ffffff',
  ink: '#000000',
  carbon: '#1a1a18',
  charcoal: '#333333',
  stone: '#666666',
  mist: '#8f8f84',
  slate: '#d6d5cc',
  umber: '#945c26',
  forest: '#223a26',
  moss: '#486030',
  sage: '#909078',
  safe: '#3f5a3a',
  caution: '#945c26',
  unsafe: '#7a2e22',
  unknown: '#8f8f84',
} as const;

/** Platform-appropriate serif for display type. */
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
} as const;

/** 4pt spacing scale. */
export const space = (steps: number): number => steps * 4;
