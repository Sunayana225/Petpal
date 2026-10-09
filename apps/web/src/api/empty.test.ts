import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('accepts successful empty HTTP responses',async()=>{
vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:204})));
await expect(requestJson('/info')).resolves.toBeUndefined();
});
