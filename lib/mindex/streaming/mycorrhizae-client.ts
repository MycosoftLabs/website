export interface MycorrhizaeChannel {
  type: "device" | "aggregate" | "computed" | "alert"
  id: string
  filters?: Record<string, unknown>
}

export interface MycorrhizaeEvent<T = unknown> {
  channel: string
  event: string
  data: T
  id: string
  timestamp: string
}

export function channelToKey(channel: MycorrhizaeChannel): string {
  return `${channel.type}/${channel.id}`
}

export function subscribeToChannel(channel: MycorrhizaeChannel): EventSource {
  if (typeof window === "undefined") {
    throw new Error("subscribeToChannel must be called in the browser (EventSource)")
  }

  const params = new URLSearchParams()
  params.set("type", channel.type)
  params.set("id", channel.id)
  if (channel.filters) params.set("filters", JSON.stringify(channel.filters))

  return new EventSource(`/api/mindex/stream/subscribe?${params.toString()}`)
}

