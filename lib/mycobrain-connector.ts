export interface MycoBrainEvent {
  type: string
  timestamp: string
  payload: unknown
  source?: string
  deviceId?: string
}

export interface MycoBrainConnectorOptions {
  url?: string
  withCredentials?: boolean
  onOpen?: () => void
  onEvent?: (event: MycoBrainEvent) => void
  onError?: (error: Event) => void
}

export interface MycoBrainConnector {
  connect: () => void
  disconnect: () => void
  isConnected: () => boolean
}

const DEFAULT_STREAM_PATH = "/api/mycobrain/stream"

function resolveMycoBrainStreamUrl(url?: string) {
  if (url) return url
  const envUrl = process.env.NEXT_PUBLIC_MYCOBRAIN_STREAM_URL
  if (envUrl) return envUrl
  return DEFAULT_STREAM_PATH
}

function parseEventPayload(data: string): MycoBrainEvent | null {
  if (!data) return null
  try {
    const parsed = JSON.parse(data) as MycoBrainEvent
    if (!parsed?.type || !parsed?.timestamp) return null
    return parsed
  } catch {
    return null
  }
}

export function createMycoBrainConnector(options: MycoBrainConnectorOptions = {}): MycoBrainConnector {
  let source: EventSource | null = null
  let connected = false

  function connect() {
    if (typeof window === "undefined") return
    if (source) return
    const url = resolveMycoBrainStreamUrl(options.url)
    source = new EventSource(url, { withCredentials: options.withCredentials })
    source.onopen = () => {
      connected = true
      options.onOpen?.()
    }
    source.onerror = (event) => {
      connected = false
      options.onError?.(event)
    }
    source.onmessage = (event) => {
      const payload = parseEventPayload(event.data)
      if (!payload) return
      options.onEvent?.(payload)
    }
  }

  function disconnect() {
    if (!source) return
    source.close()
    source = null
    connected = false
  }

  function isConnected() {
    return connected
  }

  return {
    connect,
    disconnect,
    isConnected,
  }
}
