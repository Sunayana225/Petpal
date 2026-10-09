import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('retries safe reads after transient responses',async()=>{
const fetch=vi.fn().mockResolvedValueOnce(new Response('{}',{status:503})).mockResolvedValue(new Response('{"ok":true}'));vi.stubGlobal('fetch',fetch);
await expect(requestJson('/info')).resolves.toEqual({ok:true});expect(fetch).toHaveBeenCalledTimes(2);
});
