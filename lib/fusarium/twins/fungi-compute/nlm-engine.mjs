function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null
}

export function parseNlmEngineStatus(payload, httpStatus = 200) {
  if (httpStatus < 200 || httpStatus >= 300) {
    return { state: "unavailable", engine: "unavailable", training: "unknown", progress: null, epoch: null, message: `NLM status unavailable (HTTP ${httpStatus}).` }
  }
  const root = record(payload)
  const engine = record(root?.engine)
  const training = record(root?.training)
  if (!root || !engine || !training) {
    return { state: "error", engine: "unknown", training: "unknown", progress: null, epoch: null, message: "NLM status did not match the evidence contract." }
  }
  const progress = typeof training.progress === "number" && Number.isFinite(training.progress) ? training.progress : null
  const epoch = typeof training.epoch === "number" && Number.isFinite(training.epoch) ? training.epoch : null
  const providerState = typeof engine.state === "string" ? engine.state : "unavailable"
  const engineState = providerState === "available" && engine.health === "healthy" && engine.ready === true
    ? "healthy"
    : providerState === "available" || providerState === "degraded"
      ? "degraded"
      : "unavailable"
  const trainingState = progress !== null && progress >= 100 ? "completed" : typeof training.state === "string" ? training.state : "unknown"
  return {
    state: engineState === "healthy" ? "verified" : "unavailable",
    engine: engineState,
    training: trainingState,
    progress,
    epoch,
    message: engineState === "healthy"
      ? "The deployed NLM engine answered the read-only health and training contract."
      : "The NLM status route answered, but a healthy engine was not verified.",
  }
}
