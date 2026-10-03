import { describe, expect, it } from 'vitest';

import { ApiError, buildQuery } from './api';

describe('buildQuery', () => {
  it('joins params with a leading ?', () => {
    expect(buildQuery({ pet: 'dog', food: 'apple' })).toBe('?pet=dog&food=apple');
  });

  it('skips empty values so URLs stay clean', () => {
    expect(buildQuery({ pet: 'dog', food: '' })).toBe('?pet=dog');
  });

  it('returns an empty string when nothing is provided', () => {
    expect(buildQuery({ pet: undefined, food: null })).toBe('');
  });

  it('percent-encodes reserved characters', () => {
    expect(buildQuery({ q: 'bell peppers & more' })).toBe(
      '?q=bell+peppers+%26+more',
    );
  });
});

describe('ApiError', () => {
  it('is an Error that carries a status code', () => {
    const error = new ApiError('Route not found', 404);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Route not found');
  });
});
