import { fetchWithTimeout } from '../utils/http';
test('fetch budgets cover response bodies and caller cancellation', async () => {
  const previous = global.fetch;
  try {
    global.fetch = jest.fn(async (_url, options) => new Response(new ReadableStream({
      start(controller) { options?.signal?.addEventListener('abort', () => controller.error(new Error('cancelled'))); },
    })));
    await expect(fetchWithTimeout('https://example.test', {}, 10)).rejects.toThrow(/cancelled/);
    const controller = new AbortController();
    const work = fetchWithTimeout('https://example.test', { signal: controller.signal }, 10000); controller.abort();
    await expect(work).rejects.toThrow(/cancelled/);
  } finally { global.fetch = previous; }
});
