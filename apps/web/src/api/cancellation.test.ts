import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('preserves caller cancellation',async()=>{
const controller=new AbortController();controller.abort();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new DOMException('cancelled','AbortError')));
await expect(requestJson('/info',{signal:controller.signal})).rejects.toMatchObject({status:499});
});
