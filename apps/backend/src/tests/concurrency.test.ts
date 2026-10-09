import { ConcurrencyGate } from '../utils/concurrency';
test('upstream concurrency is bounded and released after failure', async () => {
  const gate = new ConcurrencyGate(2); let active = 0; let peak = 0;
  await Promise.all(Array.from({ length: 10 }, () => gate.run(async () => {
    active++; peak = Math.max(peak, active); await new Promise((resolve) => setTimeout(resolve, 5)); active--;
  })));
  expect(peak).toBe(2);
  await expect(gate.run(async () => { throw new Error('failed'); })).rejects.toThrow('failed');
  await expect(gate.run(async () => 'next')).resolves.toBe('next');
});
test('cancellation removes queued work and queue capacity is enforced', async () => {
  const gate = new ConcurrencyGate(1, 1); let release!: () => void;
  const first = gate.run(() => new Promise<void>((resolve) => { release = resolve; }));
  const controller = new AbortController(); const second = gate.run(async () => 'second', controller.signal);
  await expect(gate.run(async () => 'overflow')).rejects.toThrow(/full/);
  controller.abort(); await expect(second).rejects.toThrow(/cancelled/); release(); await first;
});
