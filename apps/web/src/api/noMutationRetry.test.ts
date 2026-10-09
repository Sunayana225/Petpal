import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('never retries mutations',async()=>{
setCsrfToken('csrf');const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:503}));vi.stubGlobal('fetch',fetch);
await expect(requestJson('/me/keys',{method:'POST',body:'{}'})).rejects.toMatchObject({status:503});expect(fetch).toHaveBeenCalledTimes(1);
});
