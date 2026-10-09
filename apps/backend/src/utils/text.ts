/** Includes ASCII control characters before whitespace normalization hides them. */
export function hasControlCharacters(value: string): boolean {
  return [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}
