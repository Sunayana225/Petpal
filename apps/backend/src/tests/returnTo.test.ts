import { safeReturnPath } from '../auth/returnTo';

describe('safeReturnPath', () => {
  it('accepts an internal path', () => {
    expect(safeReturnPath('/tokens')).toBe('/tokens');
    expect(safeReturnPath('/usage?range=month')).toBe('/usage?range=month');
  });

  it('trims surrounding whitespace', () => {
    expect(safeReturnPath('  /dashboard  ')).toBe('/dashboard');
  });

  it('rejects anything that is not an internal path', () => {
    expect(safeReturnPath(undefined)).toBeNull();
    expect(safeReturnPath(null)).toBeNull();
    expect(safeReturnPath(42)).toBeNull();
    expect(safeReturnPath('')).toBeNull();
    expect(safeReturnPath('   ')).toBeNull();
    expect(safeReturnPath('dashboard')).toBeNull(); // not rooted
  });

  it('rejects absolute and protocol-relative URLs (open redirect)', () => {
    expect(safeReturnPath('https://evil.example')).toBeNull();
    expect(safeReturnPath('//evil.example')).toBeNull();
    expect(safeReturnPath('http://evil.example/path')).toBeNull();
  });

  it('rejects backslashes that browsers treat as slashes', () => {
    expect(safeReturnPath('/\\evil.example')).toBeNull();
    expect(safeReturnPath('/..\\evil.example')).toBeNull();
  });

  it('rejects control characters and over-long values', () => {
    expect(safeReturnPath('/a\nSet-Cookie: x=1')).toBeNull();
    expect(safeReturnPath(`/${'a'.repeat(600)}`)).toBeNull();
  });
});
