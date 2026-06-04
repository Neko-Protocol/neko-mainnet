// Process-wide concurrency cap + 429 backoff for Soroban RPC calls. The public
// RPC rate-limits per burst, so unbounded fan-out drops random pools/vaults.

const MAX_CONCURRENT_RPC = 5;

let activeCount = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (activeCount < MAX_CONCURRENT_RPC) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => queue.push(resolve));
}

function release(): void {
  const next = queue.shift();
  if (next) {
    next();
  } else {
    activeCount--;
  }
}

function is429(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return msg.includes("429") || msg.includes("Too Many Requests");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRpcRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 4;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!is429(err) || attempt === maxAttempts - 1) throw err;
      const base = 500 * 2 ** attempt;
      await sleep(base + Math.random() * 250);
    }
  }
  throw lastErr;
}

export async function throttledRpc<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await withRpcRetry(fn);
  } finally {
    release();
  }
}
