import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { requestJson, setCsrfToken } from './client';
beforeEach(()=>setCsrfToken(null));
afterEach(()=>vi.unstubAllGlobals());
test('carries server request IDs and error codes',async()=>{
vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({message:'denied',requestId:'server-id',errorCode:'AUTH_FAILED'}),{status:401})));
await expect(requestJson('/info')).rejects.toMatchObject({status:401,requestId:'server-id',errorCode:'AUTH_FAILED'});
});
