/** A bounded queue: callers time out instead of holding unlimited sockets. */
export class ConcurrencyGate {
  private active = 0;
  private readonly queue: (() => void)[] = [];
  constructor(private readonly limit: number, private readonly maxQueue = 16) {}
  async run<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw signal.reason;
    if (this.active >= this.limit) {
      if (this.queue.length >= this.maxQueue) throw new Error('Upstream concurrency queue full');
      await new Promise<void>((resolve, reject) => {
        const enter = () => { cleanup(); this.active++; resolve(); };
        const abort = () => {
          const index = this.queue.indexOf(enter);
          if (index >= 0) this.queue.splice(index, 1);
          cleanup(); reject(new Error('Upstream queue wait cancelled'));
        };
        const timer = setTimeout(abort, 2000);
        const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
        this.queue.push(enter); signal?.addEventListener('abort', abort, { once: true });
      });
    } else this.active++;
    try { if (signal?.aborted) throw signal.reason; return await work(); }
    finally { this.active--; this.queue.shift()?.(); }
  }
}
