/**
 * PersonaPlex Client - Full Duplex Voice Integration
 * Connects to the local PersonaPlex/Moshi server on RTX 5090
 * 
 * Created: February 3, 2026
 */

export interface PersonaPlexConfig {
  serverUrl: string
  voicePrompt: string
  textPrompt: string
  textTemperature?: number
  audioTemperature?: number
  textTopk?: number
  audioTopk?: number
  onAudioReceived?: (audioData: ArrayBuffer) => void
  onTextReceived?: (text: string) => void
  onStatusChange?: (status: ConnectionStatus) => void
  onStatsUpdate?: (stats: AudioStats) => void
  onError?: (error: string) => void
  onConsoleLog?: (type: "info" | "warn" | "error" | "debug", message: string) => void
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export interface AudioStats {
  playedAudioDuration: number
  missedAudioDuration: number
  totalAudioMessages: number
  latency: number
  minPlaybackDelay: number
  maxPlaybackDelay: number
  packetsReceived: number
  packetsSent: number
}

export class PersonaPlexClient {
  private config: PersonaPlexConfig
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  private mediaStream: MediaStream | null = null
  private opusEncoder: any = null
  private status: ConnectionStatus = "disconnected"
  
  // Audio stats tracking
  private stats: AudioStats = {
    playedAudioDuration: 0,
    missedAudioDuration: 0,
    totalAudioMessages: 0,
    latency: 0,
    minPlaybackDelay: Infinity,
    maxPlaybackDelay: 0,
    packetsReceived: 0,
    packetsSent: 0,
  }
  
  // Latency tracking
  private latencyBuffer: number[] = []
  private lastPacketTime: number = 0
  
  constructor(config: PersonaPlexConfig) {
    this.config = {
      textTemperature: 0.8,
      audioTemperature: 0.8,
      textTopk: 50,
      audioTopk: 50,
      ...config,
    }
  }
  
  private log(type: "info" | "warn" | "error" | "debug", message: string) {
    console.log(`[PersonaPlex ${type.toUpperCase()}] ${message}`)
    this.config.onConsoleLog?.(type, message)
  }
  
  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.config.onStatusChange?.(status)
  }
  
  private buildWebSocketUrl(): string {
    const url = new URL(this.config.serverUrl)
    
    // Add query parameters for PersonaPlex
    url.searchParams.set("text_prompt", this.config.textPrompt)
    url.searchParams.set("voice_prompt", this.config.voicePrompt)
    url.searchParams.set("text_temperature", String(this.config.textTemperature))
    url.searchParams.set("audio_temperature", String(this.config.audioTemperature))
    url.searchParams.set("text_topk", String(this.config.textTopk))
    url.searchParams.set("audio_topk", String(this.config.audioTopk))
    url.searchParams.set("pad_mult", "1")
    url.searchParams.set("repetition_penalty", "1.0")
    url.searchParams.set("repetition_penalty_context", "64")
    url.searchParams.set("text_seed", String(Math.floor(Math.random() * 1000000)))
    url.searchParams.set("audio_seed", String(Math.floor(Math.random() * 1000000)))
    
    return url.toString()
  }
  
  async connect(): Promise<void> {
    this.log("info", "Connecting to PersonaPlex server...")
    this.setStatus("connecting")
    
    try {
      // Initialize audio context
      this.audioContext = new AudioContext({ sampleRate: 24000 })
      this.log("debug", `AudioContext created: sampleRate=${this.audioContext.sampleRate}`)
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      this.log("info", "Microphone access granted")
      
      // Build WebSocket URL with parameters
      const wsUrl = this.buildWebSocketUrl()
      this.log("debug", `WebSocket URL: ${wsUrl}`)
      
      // Connect WebSocket
      this.ws = new WebSocket(wsUrl)
      this.ws.binaryType = "arraybuffer"
      
      this.ws.onopen = () => {
        this.log("info", "WebSocket connected!")
        this.setStatus("connected")
        this.startAudioCapture()
      }
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }
      
      this.ws.onerror = (event) => {
        this.log("error", "WebSocket error")
        this.config.onError?.("WebSocket connection error")
        this.setStatus("error")
      }
      
      this.ws.onclose = (event) => {
        this.log("info", `WebSocket closed: code=${event.code}`)
        this.setStatus("disconnected")
        this.cleanup()
      }
      
    } catch (error) {
      this.log("error", `Connection failed: ${error}`)
      this.config.onError?.(String(error))
      this.setStatus("error")
      throw error
    }
  }
  
  private handleMessage(data: ArrayBuffer | string) {
    const now = performance.now()
    
    if (data instanceof ArrayBuffer) {
      const view = new Uint8Array(data)
      const kind = view[0]
      const payload = view.slice(1)
      
      // Track latency
      if (this.lastPacketTime > 0) {
        const latency = (now - this.lastPacketTime) / 1000
        this.latencyBuffer.push(latency)
        if (this.latencyBuffer.length > 100) {
          this.latencyBuffer.shift()
        }
        this.stats.latency = this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length
        this.stats.minPlaybackDelay = Math.min(this.stats.minPlaybackDelay, latency)
        this.stats.maxPlaybackDelay = Math.max(this.stats.maxPlaybackDelay, latency)
      }
      this.lastPacketTime = now
      
      if (kind === 1) {
        // Opus audio data
        this.stats.packetsReceived++
        this.stats.totalAudioMessages++
        this.stats.playedAudioDuration += 0.02 // 20ms per frame
        this.config.onAudioReceived?.(payload.buffer)
        this.playAudio(payload)
      } else if (kind === 2) {
        // Text data
        const text = new TextDecoder().decode(payload)
        this.log("debug", `Text received: ${text}`)
        this.config.onTextReceived?.(text)
      }
      
      // Update stats
      this.config.onStatsUpdate?.(this.stats)
      
    } else if (typeof data === "string") {
      this.log("debug", `String message: ${data}`)
      this.config.onTextReceived?.(data)
    }
  }
  
  private async playAudio(opusData: Uint8Array) {
    // For now, we'll accumulate and decode with Web Audio API
    // In production, use opus-decoder library
    try {
      // This is a placeholder - actual Opus decoding needs opus-decoder
      // The PersonaPlex client UI handles this with a decoder worker
    } catch (error) {
      this.log("error", `Audio playback error: ${error}`)
      this.stats.missedAudioDuration += 0.02
    }
  }
  
  private async startAudioCapture() {
    if (!this.audioContext || !this.mediaStream) return
    
    this.log("info", "Starting audio capture...")
    
    try {
      // Load the audio processor worklet
      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      
      // Create an analyser for visualization
      const analyser = this.audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      
      // For now, use ScriptProcessorNode (deprecated but widely supported)
      // In production, use AudioWorkletNode with opus-recorder
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      
      processor.onaudioprocess = (event) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0)
          // Convert to bytes and send
          // In production, encode to Opus first
          const bytes = new Float32Array(inputData)
          this.sendAudio(bytes.buffer)
        }
      }
      
      source.connect(processor)
      processor.connect(this.audioContext.destination)
      
      this.log("info", "Audio capture started")
      
    } catch (error) {
      this.log("error", `Audio capture error: ${error}`)
    }
  }
  
  private sendAudio(data: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Prefix with kind=1 for audio
      const prefixed = new Uint8Array(data.byteLength + 1)
      prefixed[0] = 1
      prefixed.set(new Uint8Array(data), 1)
      this.ws.send(prefixed)
      this.stats.packetsSent++
    }
  }
  
  disconnect() {
    this.log("info", "Disconnecting...")
    this.cleanup()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.setStatus("disconnected")
  }
  
  private cleanup() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
  
  getStats(): AudioStats {
    return { ...this.stats }
  }
  
  getStatus(): ConnectionStatus {
    return this.status
  }
  
  isConnected(): boolean {
    return this.status === "connected"
  }
}

// Default MYCA prompt for PersonaPlex
export const MYCA_PERSONAPLEX_PROMPT = `You are MYCA, the AI operator for Mycosoft's Multi-Agent System. You coordinate agents, monitor systems, and help users achieve goals.

PERSONALITY: Confident but humble. Warm. Proactive—anticipate needs. Patient. Honest about uncertainty. Efficient.

ROLE: Dispatch tasks to agents (code review, testing, deployment, monitoring). Track system status. Translate technical complexity clearly.

KNOWLEDGE: Mycosoft (NatureOS, MAS, CREP, MycoDAO). Dev (TypeScript, Python, Next.js, Docker). AI/ML. DevOps.

VOICE: Natural, conversational. Contractions. Concise—dialogue not monologues. Listen actively. Adapt energy to context.

VALUES: Empower users. Operational excellence. Honest partner. Human oversight.

Running on RTX 5090 with real-time duplex voice. Welcome to Mycosoft.`

// Helper to create a client with MYCA defaults
export function createMYCAClient(options?: Partial<PersonaPlexConfig>): PersonaPlexClient {
  return new PersonaPlexClient({
    serverUrl: "ws://localhost:8998/api/chat",
    voicePrompt: "NATURAL_F2.pt",
    textPrompt: MYCA_PERSONAPLEX_PROMPT,
    ...options,
  })
}
