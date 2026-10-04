import {
  foodVariants,
  normalizeFoodKey,
  normalizePetKey,
  pluralize,
  singularize,
} from '../utils/normalization';

describe('normalizePetKey', () => {
  test('maps aliases onto canonical plural keys', () => {
    expect(normalizePetKey('Dog')).toBe('dogs');
    expect(normalizePetKey('  PUPPY  ')).toBe('dogs');
    expect(normalizePetKey('kittens')).toBe('cats');
    expect(normalizePetKey('gecko')).toBe('lizards');
    expect(normalizePetKey('tortoise')).toBe('turtles');
  });

  test('returns null for anything PetPal has no data for', () => {
    expect(normalizePetKey('dragon')).toBeNull();
    expect(normalizePetKey('')).toBeNull();
    // @ts-expect-error — guard against non-string input at the boundary.
    expect(normalizePetKey(undefined)).toBeNull();
  });
});

describe('normalizeFoodKey', () => {
  test('lowercases, trims and collapses punctuation to single spaces', () => {
    expect(normalizeFoodKey('  Bell-Peppers!! ')).toBe('bell peppers');
  });

  test('drops apostrophes without splitting the word', () => {
    expect(normalizeFoodKey("apple's")).toBe('apples');
  });

  test('is empty for blank input', () => {
    expect(normalizeFoodKey('   ')).toBe('');
  });
});

describe('singularize / pluralize', () => {
  test('leaves already-singular s-words alone', () => {
    expect(singularize('grass')).toBe('grass');
    expect(singularize('asparagus')).toBe('asparagus');
  });

  test('round-trips common foods', () => {
    expect(singularize('grapes')).toBe('grape');
    expect(pluralize('grape')).toBe('grapes');
    expect(pluralize('berry')).toBe('berries');
    expect(pluralize('peach')).toBe('peaches');
  });
});

describe('foodVariants', () => {
  test('includes both the singular and the plural form', () => {
    const variants = foodVariants('apples');
    expect(variants).toContain('apples');
    expect(variants).toContain('apple');
  });

  test('returns no variants for blank input', () => {
    expect(foodVariants('   ')).toEqual([]);
  });
});
