import { openapi } from '../config/openapi';
test('public and console API contracts describe keyed and session security', () => {
  expect(openapi.openapi).toBe('3.1.0');
  for (const path of ['/me/keys', '/sessions', '/auth/me', '/v1/food-safety/check', '/food-safety/check', '/admin/users/{id}']) expect(openapi.paths[path]).toBeDefined();
  const keyed = openapi.paths['/v1/food-safety/check'] as { get: { security: object[] } };
  expect(keyed.get.security).toEqual([{ bearerKey: [] }]);
});
