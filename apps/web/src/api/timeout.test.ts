import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('aborts requests that exceed their deadline',async()=>{
vi.stubGlobal('fetch',vi.fn((_url: string, init: RequestInit)=>new Promise((_resolve,reject)=>init.signal?.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))));
await expect(requestJson('/info',{},10)).rejects.toMatchObject({status:408});
});
