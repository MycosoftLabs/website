export interface SSEPublishEvent {
  channel: string
  event: string
  data: unknown
  id?: string
  timestamp?: string
}

interface SSESubscriber {
  id: string
  write: (chunk: Uint8Array) => void
}

const encoder = new TextEncoder()

const state = {
  subscribersByChannel: new Map<string, Map<string, SSESubscriber>>(),
}

function formatSseMessage(input: { event?: string; id?: string; data: unknown }): Uint8Array {
  const lines: string[] = []
  if (input.id) lines.push(`id: ${input.id}`)
  if (input.event) lines.push(`event: ${input.event}`)
  lines.push(`data: ${JSON.stringify(input.data)}`)
  lines.push("") // blank line terminator
  return encoder.encode(lines.join("\n") + "\n")
}

export function listActiveChannels(): Array<{ channel: string; subscribers: number }> {
  const result: Array<{ channel: string; subscribers: number }> = []
  for (const [channel, subs] of state.subscribersByChannel.entries()) {
    result.push({ channel, subscribers: subs.size })
  }
  return result.sort((a, b) => b.subscribers - a.subscribers)
}

export function subscribeToChannel(channel: string, subscriberId: string, write: (chunk: Uint8Array) => void): () => void {
  const channelMap = state.subscribersByChannel.get(channel) ?? new Map<string, SSESubscriber>()
  channelMap.set(subscriberId, { id: subscriberId, write })
  state.subscribersByChannel.set(channel, channelMap)

  return () => {
    const existing = state.subscribersByChannel.get(channel)
    if (!existing) return
    existing.delete(subscriberId)
    if (existing.size === 0) state.subscribersByChannel.delete(channel)
  }
}

export function publishToChannel(event: SSEPublishEvent): { delivered: number } {
  const timestamp = event.timestamp || new Date().toISOString()
  const id = event.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const message = formatSseMessage({
    id,
    event: event.event,
    data: {
      ...event,
      id,
      timestamp,
    },
  })

  const subscribers = state.subscribersByChannel.get(event.channel)
  if (!subscribers) return { delivered: 0 }

  let delivered = 0
  for (const sub of subscribers.values()) {
    try {
      sub.write(message)
      delivered += 1
    } catch {
      // Best-effort cleanup: subscriber likely gone
      subscribers.delete(sub.id)
    }
  }

  if (subscribers.size === 0) state.subscribersByChannel.delete(event.channel)
  return { delivered }
}

export function createHeartbeatChunk(): Uint8Array {
  return formatSseMessage({ event: "ping", data: { type: "ping", timestamp: new Date().toISOString() } })
}

export function createConnectedChunk(subscriberId: string, channel: string): Uint8Array {
  return formatSseMessage({
    event: "connected",
    data: { type: "connected", subscriberId, channel, timestamp: new Date().toISOString() },
  })
}

