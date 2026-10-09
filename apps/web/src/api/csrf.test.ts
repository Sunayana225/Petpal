import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('hydrates CSRF before a cookie mutation',async()=>{
const fetch=vi.fn().mockResolvedValueOnce(new Response('{"csrfToken":"token"}')).mockResolvedValue(new Response('{"ok":true}'));vi.stubGlobal('fetch',fetch);
await requestJson('/auth/logout',{method:'POST'});expect(fetch).toHaveBeenCalledTimes(2);expect((fetch.mock.calls[1][1].headers as Headers).get('X-CSRF-Token')).toBe('token');
});
