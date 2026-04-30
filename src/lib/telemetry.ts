export function withTiming<T>(name: string, fn: () => Promise<T>) {
  const startedAt = Date.now();
  return fn().finally(() => {
    const elapsed = Date.now() - startedAt;
    if (elapsed > 350) {
      console.info(`[telemetry] ${name} took ${elapsed}ms`);
    }
  });
}
