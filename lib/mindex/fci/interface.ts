/**
 * Fungal Computer Interface (FCI) Protocol Layer
 * 
 * FCI is a gateway to mycelium computing - enabling bidirectional 
 * communication between digital systems and living fungal networks.
 * 
 * Core concepts:
 * - Signal translation between electrical and bioelectric domains
 * - Pattern recognition in mycelial response signals
 * - Standardized protocols for fungal-device interaction
 * - Bioelectric feedback loops for environmental adaptation
 * 
 * @see https://medium.com/@mycosoft.inc/fungal-computer-interface-fci-c0c444611cc1
 */

/**
 * FCI Signal Types - Different modes of fungal communication
 */
export enum FCISignalType {
  // Input signals (to fungal network)
  ELECTRICAL_PULSE = 'electrical_pulse',    // Direct electrical stimulation
  CHEMICAL_GRADIENT = 'chemical_gradient',  // Nutrient/chemical signals
  LIGHT_PATTERN = 'light_pattern',          // Photomorphogenic signals
  TEMPERATURE_CHANGE = 'temperature_change', // Thermal gradients
  MECHANICAL_STRESS = 'mechanical_stress',  // Physical pressure/touch
  
  // Output signals (from fungal network)
  BIOELECTRIC_SPIKE = 'bioelectric_spike',  // Action potential-like events
  IMPEDANCE_CHANGE = 'impedance_change',    // Resistance changes in mycelium
  GROWTH_DIRECTION = 'growth_direction',    // Tropism responses
  ENZYME_SECRETION = 'enzyme_secretion',    // Chemical output
  BIOLUMINESCENCE = 'bioluminescence',      // Light emission (Armillaria, etc.)
}

/**
 * FCI Channel - A communication pathway between device and mycelium
 */
export interface FCIChannel {
  id: string;
  name: string;
  type: 'input' | 'output' | 'bidirectional';
  signal_type: FCISignalType;
  
  // Physical properties
  electrode_config?: {
    count: number;
    spacing_mm: number;
    material: 'gold' | 'platinum' | 'stainless_steel' | 'carbon';
  };
  
  // Electrical properties
  impedance_range?: {
    min_ohms: number;
    max_ohms: number;
  };
  voltage_range?: {
    min_mv: number;
    max_mv: number;
  };
  
  // Sampling
  sample_rate_hz: number;
  buffer_size: number;
  
  // State
  active: boolean;
  last_reading?: FCIReading;
}

/**
 * FCI Reading - A single measurement from the interface
 */
export interface FCIReading {
  channel_id: string;
  timestamp: string;
  
  // Raw data
  raw_value: number;
  unit: 'mV' | 'uA' | 'kOhm' | 'lux' | 'celsius' | 'pascal' | 'ppm';
  
  // Processed data
  normalized_value: number;  // 0-1 normalized
  confidence: number;        // Quality score 0-1
  
  // Pattern recognition
  pattern?: {
    type: 'spike' | 'wave' | 'plateau' | 'oscillation' | 'random';
    frequency_hz?: number;
    amplitude?: number;
    duration_ms?: number;
  };
  
  // Metadata
  noise_floor: number;
  snr_db: number;  // Signal to noise ratio
}

/**
 * FCI Device - A physical device implementing the FCI protocol
 */
export interface FCIDevice {
  id: string;
  device_type: 'mycobrain' | 'myconode' | 'sporebase' | 'mushroom1' | 'hyphae1';
  firmware_version: string;
  
  // Channels
  channels: FCIChannel[];
  
  // Fungal substrate connection
  substrate?: {
    species_id?: string;        // MINDEX taxon ID
    species_name: string;
    inoculation_date?: string;
    estimated_density?: number;  // hyphae per cm²
    health_status: 'healthy' | 'stressed' | 'dormant' | 'contaminated';
  };
  
  // Location
  location?: {
    type: 'Point';
    coordinates: [number, number];
    environment: 'laboratory' | 'field' | 'greenhouse' | 'indoor' | 'outdoor';
  };
  
  // Connection status
  connected: boolean;
  last_seen: string;
  uptime_seconds: number;
}

/**
 * FCI Protocol Message - Standard message format
 */
export interface FCIMessage {
  version: '1.0';
  device_id: string;
  message_type: 'reading' | 'command' | 'event' | 'status' | 'error';
  timestamp: string;
  sequence_number: number;
  
  payload: FCIReading | FCICommand | FCIEvent | FCIStatus | FCIError;
  
  // Cryptographic integrity
  signature?: string;  // Ed25519 signature
  hash?: string;       // SHA-256 hash
}

/**
 * FCI Command - Instruction sent to the fungal interface
 */
export interface FCICommand {
  type: 'stimulate' | 'read' | 'configure' | 'calibrate' | 'reset';
  channel_id: string;
  
  // Stimulation parameters
  stimulation?: {
    waveform: 'pulse' | 'sine' | 'square' | 'triangle' | 'custom';
    amplitude_mv: number;
    frequency_hz: number;
    duration_ms: number;
    custom_samples?: number[];
  };
  
  // Configuration parameters
  config?: {
    sample_rate?: number;
    gain?: number;
    filter_low_hz?: number;
    filter_high_hz?: number;
  };
}

/**
 * FCI Event - Significant occurrence detected
 */
export interface FCIEvent {
  event_type: 
    | 'spike_detected'
    | 'pattern_change'
    | 'threshold_crossed'
    | 'connection_established'
    | 'connection_lost'
    | 'growth_detected'
    | 'stress_response'
    | 'contamination_suspected';
  
  severity: 'info' | 'warning' | 'critical';
  channel_id?: string;
  details: Record<string, unknown>;
}

/**
 * FCI Status - Device/channel status report
 */
export interface FCIStatus {
  device_healthy: boolean;
  battery_percent?: number;
  temperature_c?: number;
  memory_used_percent?: number;
  
  channel_status: Array<{
    channel_id: string;
    active: boolean;
    impedance_ohms: number;
    signal_quality: number;
  }>;
}

/**
 * FCI Error - Error report
 */
export interface FCIError {
  code: string;
  message: string;
  recoverable: boolean;
  suggested_action?: string;
}

/**
 * FCI Protocol Handler - Process FCI messages
 */
export class FCIProtocolHandler {
  private devices = new Map<string, FCIDevice>();
  private messageQueue: FCIMessage[] = [];
  private eventListeners: Map<string, ((event: FCIEvent) => void)[]> = new Map();
  private readingBuffer: Map<string, FCIReading[]> = new Map();
  
  /**
   * Register a device with the protocol handler
   */
  registerDevice(device: FCIDevice): void {
    this.devices.set(device.id, device);
    device.channels.forEach(channel => {
      this.readingBuffer.set(channel.id, []);
    });
  }
  
  /**
   * Process an incoming FCI message
   */
  async processMessage(message: FCIMessage): Promise<FCIMessage | null> {
    // Validate message structure
    if (message.version !== '1.0') {
      return this.createErrorResponse(message, 'UNSUPPORTED_VERSION', 'Protocol version not supported');
    }
    
    const device = this.devices.get(message.device_id);
    if (!device) {
      return this.createErrorResponse(message, 'DEVICE_NOT_FOUND', 'Device not registered');
    }
    
    switch (message.message_type) {
      case 'reading':
        return this.handleReading(message, device, message.payload as FCIReading);
      case 'command':
        return this.handleCommand(message, device, message.payload as FCICommand);
      case 'event':
        return this.handleEvent(message, device, message.payload as FCIEvent);
      case 'status':
        return this.handleStatus(message, device, message.payload as FCIStatus);
      default:
        return null;
    }
  }
  
  private async handleReading(
    message: FCIMessage,
    device: FCIDevice,
    reading: FCIReading
  ): Promise<null> {
    // Store reading in buffer
    const buffer = this.readingBuffer.get(reading.channel_id);
    if (buffer) {
      buffer.push(reading);
      // Keep buffer limited
      if (buffer.length > 1000) {
        buffer.shift();
      }
    }
    
    // Update channel state
    const channel = device.channels.find(c => c.id === reading.channel_id);
    if (channel) {
      channel.last_reading = reading;
    }
    
    // Analyze for patterns
    await this.analyzeReadingPattern(reading);
    
    return null;
  }
  
  private async handleCommand(
    message: FCIMessage,
    device: FCIDevice,
    command: FCICommand
  ): Promise<FCIMessage> {
    console.log(`[FCI] Processing command: ${command.type} on ${command.channel_id}`);
    
    // In production, this would send commands to physical devices
    return {
      version: '1.0',
      device_id: message.device_id,
      message_type: 'status',
      timestamp: new Date().toISOString(),
      sequence_number: message.sequence_number + 1,
      payload: {
        device_healthy: true,
        channel_status: device.channels.map(c => ({
          channel_id: c.id,
          active: c.active,
          impedance_ohms: 10000,
          signal_quality: 0.85,
        })),
      } as FCIStatus,
    };
  }
  
  private async handleEvent(
    message: FCIMessage,
    device: FCIDevice,
    event: FCIEvent
  ): Promise<null> {
    console.log(`[FCI] Event: ${event.event_type} (${event.severity})`);
    
    // Notify listeners
    const listeners = this.eventListeners.get(event.event_type) || [];
    listeners.forEach(listener => listener(event));
    
    // Check for critical events
    if (event.severity === 'critical') {
      console.error(`[FCI] Critical event on ${device.id}: ${event.event_type}`);
    }
    
    return null;
  }
  
  private async handleStatus(
    message: FCIMessage,
    device: FCIDevice,
    status: FCIStatus
  ): Promise<null> {
    device.connected = status.device_healthy;
    device.last_seen = message.timestamp;
    
    status.channel_status.forEach(cs => {
      const channel = device.channels.find(c => c.id === cs.channel_id);
      if (channel) {
        channel.active = cs.active;
      }
    });
    
    return null;
  }
  
  private async analyzeReadingPattern(reading: FCIReading): Promise<void> {
    const buffer = this.readingBuffer.get(reading.channel_id);
    if (!buffer || buffer.length < 10) return;
    
    // Simple pattern detection (in production, use ML models)
    const recentValues = buffer.slice(-10).map(r => r.normalized_value);
    const mean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const variance = recentValues.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / recentValues.length;
    
    // Detect spikes (value significantly above mean)
    if (reading.normalized_value > mean + 2 * Math.sqrt(variance)) {
      reading.pattern = {
        type: 'spike',
        amplitude: reading.normalized_value - mean,
        duration_ms: 50,
      };
      
      // Emit event
      this.emitEvent(reading.channel_id, {
        event_type: 'spike_detected',
        severity: 'info',
        channel_id: reading.channel_id,
        details: { amplitude: reading.normalized_value - mean },
      });
    }
    
    // Detect oscillations (regular variance)
    if (variance > 0.1 && variance < 0.5) {
      // Could be oscillation - would need FFT for proper detection
      reading.pattern = {
        type: 'oscillation',
        frequency_hz: 10, // Would calculate from FFT
      };
    }
  }
  
  private emitEvent(channelId: string, event: FCIEvent): void {
    const listeners = this.eventListeners.get(event.event_type) || [];
    listeners.forEach(listener => listener(event));
  }
  
  private createErrorResponse(
    originalMessage: FCIMessage,
    code: string,
    message: string
  ): FCIMessage {
    return {
      version: '1.0',
      device_id: originalMessage.device_id,
      message_type: 'error',
      timestamp: new Date().toISOString(),
      sequence_number: originalMessage.sequence_number + 1,
      payload: {
        code,
        message,
        recoverable: true,
      } as FCIError,
    };
  }
  
  /**
   * Subscribe to FCI events
   */
  onEvent(eventType: FCIEvent['event_type'], callback: (event: FCIEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);
  }
  
  /**
   * Get recent readings for a channel
   */
  getReadings(channelId: string, limit: number = 100): FCIReading[] {
    const buffer = this.readingBuffer.get(channelId) || [];
    return buffer.slice(-limit);
  }
  
  /**
   * Get all registered devices
   */
  getDevices(): FCIDevice[] {
    return Array.from(this.devices.values());
  }
  
  /**
   * Send a command to a device
   */
  async sendCommand(deviceId: string, command: FCICommand): Promise<FCIMessage | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;
    
    const message: FCIMessage = {
      version: '1.0',
      device_id: deviceId,
      message_type: 'command',
      timestamp: new Date().toISOString(),
      sequence_number: Date.now(),
      payload: command,
    };
    
    return this.processMessage(message);
  }
}

/**
 * Stimulation patterns optimized for fungal response
 */
export const STIMULATION_PATTERNS = {
  // Gentle wake-up pulse
  GENTLE_PULSE: {
    waveform: 'pulse' as const,
    amplitude_mv: 50,
    frequency_hz: 0.5,
    duration_ms: 100,
  },
  
  // High-frequency probe for impedance measurement
  IMPEDANCE_PROBE: {
    waveform: 'sine' as const,
    amplitude_mv: 10,
    frequency_hz: 1000,
    duration_ms: 1000,
  },
  
  // Rhythmic stimulus to encourage growth direction
  GROWTH_STIMULUS: {
    waveform: 'square' as const,
    amplitude_mv: 100,
    frequency_hz: 0.1,
    duration_ms: 10000,
  },
  
  // Stress test - high amplitude short burst
  STRESS_TEST: {
    waveform: 'pulse' as const,
    amplitude_mv: 200,
    frequency_hz: 10,
    duration_ms: 50,
  },
};

/**
 * Calculate optimal stimulation based on species and current readings
 */
export function calculateOptimalStimulation(
  device: FCIDevice,
  readings: FCIReading[]
): FCICommand['stimulation'] | null {
  if (!device.substrate?.species_name) return null;
  if (readings.length === 0) return STIMULATION_PATTERNS.GENTLE_PULSE;
  
  const lastReading = readings[readings.length - 1];
  
  // Low signal quality - use impedance probe
  if (lastReading.confidence < 0.5) {
    return STIMULATION_PATTERNS.IMPEDANCE_PROBE;
  }
  
  // Good signal, actively responding - use growth stimulus
  if (lastReading.pattern?.type === 'spike') {
    return STIMULATION_PATTERNS.GROWTH_STIMULUS;
  }
  
  // Default to gentle pulse
  return STIMULATION_PATTERNS.GENTLE_PULSE;
}
