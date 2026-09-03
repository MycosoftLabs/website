/** Reuse one bounded read for concurrent requests for the same exact key. */
export function singleFlightByKey<T>(
  inFlight: Map<string, Promise<T>>,
  key: string,
  task: () => Promise<T>,
): Promise<T> {
  const current = inFlight.get(key)
  if (current) return current
  const pending = Promise.resolve().then(task).finally(() => {
    if (inFlight.get(key) === pending) inFlight.delete(key)
  })
  inFlight.set(key, pending)
  return pending
}
