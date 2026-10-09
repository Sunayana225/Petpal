import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('preserves Headers instances and caller Accept values',async()=>{
const fetch=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetch);
await requestJson('/info',{headers:new Headers({'X-Test':'value',Accept:'application/custom'})});
const headers=fetch.mock.calls[0][1].headers as Headers;expect(headers.get('X-Test')).toBe('value');expect(headers.get('Accept')).toBe('application/custom');
});
