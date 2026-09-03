function finite(value) {
  return typeof value === "number" && Number.isFinite(value)
}

/** Parse an operator-selected local evidence file. Nothing is uploaded. */
export function parseFciEvidenceImport(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Evidence must be a JSON object.")
  const deviceId = typeof value.deviceId === "string" && value.deviceId.trim() ? value.deviceId.trim() : "imported-evidence"
  const sampleRate = finite(value.sampleRate) && value.sampleRate > 0 ? value.sampleRate : null
  const channels = Array.isArray(value.channels) ? value.channels : []
  const buffers = channels.map((channel, index) => {
    const source = channel && typeof channel === "object" ? channel : {}
    const samples = Array.isArray(source.samples) ? source.samples.filter(finite).slice(-8192) : []
    if (samples.length === 0) return null
    const channelId = finite(source.channel) ? source.channel : index
    const rate = finite(source.sampleRate) && source.sampleRate > 0 ? source.sampleRate : sampleRate
    if (!rate) return null
    return {
      deviceId,
      channel: channelId,
      samples,
      sampleRate: rate,
      timestamps: samples.map((_, offset) => offset * (1000 / rate)),
    }
  }).filter(Boolean)
  if (buffers.length === 0) throw new Error("No channel contained finite samples and a positive sample rate.")
  const events = Array.isArray(value.events) ? value.events.flatMap((event, index) => {
    if (!event || typeof event !== "object") return []
    const timestamp = typeof event.timestamp === "string" && !Number.isNaN(Date.parse(event.timestamp)) ? event.timestamp : null
    const type = typeof event.type === "string" && event.type.trim() ? event.type.trim() : null
    if (!timestamp || !type) return []
    return [{ id: typeof event.id === "string" ? event.id : `import-${index}`, type, timestamp, confidence: finite(event.confidence) ? Math.max(0, Math.min(1, event.confidence)) : Number.NaN }]
  }) : []
  return { deviceId, buffers, events, importedAt: new Date().toISOString() }
}
