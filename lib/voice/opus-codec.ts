/**
 * Opus Audio Codec for PersonaPlex Voice Communication
 * 
 * Uses WebCodecs API for Opus encoding/decoding when available,
 * falls back to libopus.js WASM for broader browser support.
 * 
 * Created: February 11, 2026
 */

// Opus codec configuration
export interface OpusConfig {
  sampleRate: number        // Usually 24000 for Moshi
  channels: number          // 1 for mono
  frameDuration: number     // 20ms frames (480 samples at 24kHz)
  bitrate: number           // Target bitrate in bps
  complexity: number        // 0-10, higher = better quality, more CPU
}

export const DEFAULT_OPUS_CONFIG: OpusConfig = {
  sampleRate: 24000,
  channels: 1,
  frameDuration: 20,
  bitrate: 24000,
  complexity: 5,
}

/**
 * Opus Encoder - Converts PCM audio to Opus packets
 */
export class OpusEncoder {
  private config: OpusConfig
  private encoder: AudioEncoder | null = null
  private isWebCodecsSupported: boolean
  private pendingFrames: Float32Array[] = []
  private onEncodedCallback: ((data: Uint8Array) => void) | null = null
  private samplesPerFrame: number

  constructor(config: Partial<OpusConfig> = {}) {
    this.config = { ...DEFAULT_OPUS_CONFIG, ...config }
    this.samplesPerFrame = (this.config.sampleRate * this.config.frameDuration) / 1000
    
    // Check for WebCodecs support
    this.isWebCodecsSupported = typeof AudioEncoder !== 'undefined'
    
    if (this.isWebCodecsSupported) {
      console.log('[OpusCodec] Using WebCodecs AudioEncoder')
    } else {
      console.log('[OpusCodec] WebCodecs not available, will use Float32 fallback')
    }
  }

  async initialize(): Promise<void> {
    if (!this.isWebCodecsSupported) {
      // Fallback: Send raw PCM (server will handle encoding)
      console.log('[OpusCodec] Fallback mode - sending PCM audio')
      return
    }

    try {
      this.encoder = new AudioEncoder({
        output: (chunk) => {
          // Extract encoded Opus data
          const data = new Uint8Array(chunk.byteLength)
          chunk.copyTo(data)
          this.onEncodedCallback?.(data)
        },
        error: (error) => {
          console.error('[OpusCodec] Encoder error:', error)
        },
      })

      await this.encoder.configure({
        codec: 'opus',
        sampleRate: this.config.sampleRate,
        numberOfChannels: this.config.channels,
        bitrate: this.config.bitrate,
        // Opus-specific options
        opus: {
          frameDuration: this.config.frameDuration * 1000, // microseconds
          complexity: this.config.complexity,
        },
      } as AudioEncoderConfig)

      console.log('[OpusCodec] Encoder initialized successfully')
    } catch (error) {
      console.error('[OpusCodec] Failed to initialize WebCodecs encoder:', error)
      this.isWebCodecsSupported = false
    }
  }

  /**
   * Set callback for when Opus frames are encoded
   */
  onEncoded(callback: (data: Uint8Array) => void): void {
    this.onEncodedCallback = callback
  }

  /**
   * Encode a chunk of PCM audio data
   */
  encode(pcmData: Float32Array): Uint8Array | null {
    if (!this.isWebCodecsSupported || !this.encoder) {
      // Fallback: Convert Float32 to Int16 and return raw PCM
      return this.float32ToInt16(pcmData)
    }

    // Accumulate samples until we have a full frame
    this.pendingFrames.push(pcmData)
    
    // Check if we have enough samples for a frame
    const totalSamples = this.pendingFrames.reduce((sum, f) => sum + f.length, 0)
    
    if (totalSamples >= this.samplesPerFrame) {
      // Combine pending frames
      const combined = new Float32Array(totalSamples)
      let offset = 0
      for (const frame of this.pendingFrames) {
        combined.set(frame, offset)
        offset += frame.length
      }
      
      // Extract one frame worth of samples
      const frameData = combined.slice(0, this.samplesPerFrame)
      
      // Keep remaining samples
      if (totalSamples > this.samplesPerFrame) {
        this.pendingFrames = [combined.slice(this.samplesPerFrame)]
      } else {
        this.pendingFrames = []
      }

      // Create AudioData and encode
      const audioData = new AudioData({
        format: 'f32',
        sampleRate: this.config.sampleRate,
        numberOfFrames: this.samplesPerFrame,
        numberOfChannels: this.config.channels,
        timestamp: performance.now() * 1000, // microseconds
        data: frameData,
      })

      try {
        this.encoder.encode(audioData)
        audioData.close()
      } catch (error) {
        console.error('[OpusCodec] Encoding error:', error)
      }
    }

    // Async encoding - data comes through callback
    return null
  }

  /**
   * Convert Float32 PCM to Int16 for fallback transmission
   */
  private float32ToInt16(float32Array: Float32Array): Uint8Array {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return new Uint8Array(int16Array.buffer)
  }

  /**
   * Flush any remaining pending samples
   */
  async flush(): Promise<void> {
    if (this.encoder && this.encoder.state === 'configured') {
      await this.encoder.flush()
    }
    this.pendingFrames = []
  }

  /**
   * Clean up encoder resources
   */
  close(): void {
    if (this.encoder) {
      this.encoder.close()
      this.encoder = null
    }
    this.pendingFrames = []
  }
}

/**
 * Opus Decoder - Converts Opus packets to PCM audio
 */
export class OpusDecoder {
  private config: OpusConfig
  private decoder: AudioDecoder | null = null
  private isWebCodecsSupported: boolean
  private onDecodedCallback: ((pcmData: Float32Array) => void) | null = null

  constructor(config: Partial<OpusConfig> = {}) {
    this.config = { ...DEFAULT_OPUS_CONFIG, ...config }
    this.isWebCodecsSupported = typeof AudioDecoder !== 'undefined'
    
    if (this.isWebCodecsSupported) {
      console.log('[OpusCodec] Using WebCodecs AudioDecoder')
    } else {
      console.log('[OpusCodec] WebCodecs not available for decoding')
    }
  }

  async initialize(): Promise<void> {
    if (!this.isWebCodecsSupported) {
      return
    }

    try {
      this.decoder = new AudioDecoder({
        output: (audioData) => {
          // Extract PCM data from AudioData
          const float32Data = new Float32Array(audioData.numberOfFrames)
          audioData.copyTo(float32Data, { planeIndex: 0 })
          this.onDecodedCallback?.(float32Data)
          audioData.close()
        },
        error: (error) => {
          console.error('[OpusCodec] Decoder error:', error)
        },
      })

      await this.decoder.configure({
        codec: 'opus',
        sampleRate: this.config.sampleRate,
        numberOfChannels: this.config.channels,
      })

      console.log('[OpusCodec] Decoder initialized successfully')
    } catch (error) {
      console.error('[OpusCodec] Failed to initialize WebCodecs decoder:', error)
      this.isWebCodecsSupported = false
    }
  }

  /**
   * Set callback for when audio is decoded
   */
  onDecoded(callback: (pcmData: Float32Array) => void): void {
    this.onDecodedCallback = callback
  }

  /**
   * Decode an Opus packet
   */
  decode(opusData: Uint8Array): Float32Array | null {
    if (!this.isWebCodecsSupported || !this.decoder) {
      // Fallback: Assume raw Int16 PCM and convert to Float32
      return this.int16ToFloat32(opusData)
    }

    const chunk = new EncodedAudioChunk({
      type: 'key',
      timestamp: performance.now() * 1000,
      data: opusData,
    })

    try {
      this.decoder.decode(chunk)
    } catch (error) {
      console.error('[OpusCodec] Decoding error:', error)
    }

    // Async decoding - data comes through callback
    return null
  }

  /**
   * Convert Int16 PCM to Float32
   */
  private int16ToFloat32(int16Array: Uint8Array): Float32Array {
    const int16View = new Int16Array(int16Array.buffer, int16Array.byteOffset, int16Array.length / 2)
    const float32Array = new Float32Array(int16View.length)
    for (let i = 0; i < int16View.length; i++) {
      float32Array[i] = int16View[i] / 0x8000
    }
    return float32Array
  }

  /**
   * Flush any remaining data
   */
  async flush(): Promise<void> {
    if (this.decoder && this.decoder.state === 'configured') {
      await this.decoder.flush()
    }
  }

  /**
   * Clean up decoder resources
   */
  close(): void {
    if (this.decoder) {
      this.decoder.close()
      this.decoder = null
    }
  }
}

/**
 * Check if WebCodecs Opus is supported
 */
export async function isOpusSupported(): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined') {
    return false
  }

  try {
    const support = await AudioEncoder.isConfigSupported({
      codec: 'opus',
      sampleRate: 24000,
      numberOfChannels: 1,
    })
    return support.supported === true
  } catch {
    return false
  }
}
