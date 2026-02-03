/**
 * MAS API Service
 * Connects to the MYCA Multi-Agent System Orchestrator
 */

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export interface Instrument {
  id: string
  name: string
  type: string
  status: 'online' | 'offline' | 'busy' | 'maintenance'
  temperature?: number
  humidity?: number
  currentTask?: string
}

export interface Simulation {
  id: string
  name: string
  type: 'alphafold' | 'boltzgen' | 'mycelium' | 'cobrapy' | 'physics' | 'molecular'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  eta?: string
  gpu?: string
}

export interface Experiment {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  startedAt?: string
}

export interface Hypothesis {
  id: string
  statement: string
  status: 'proposed' | 'testing' | 'validated' | 'rejected'
  confidence?: number
  experiments?: string[]
}

export interface FCISession {
  id: string
  species: string
  strain?: string
  status: 'recording' | 'stimulating' | 'idle' | 'paused'
  duration: number
  electrodesActive: number
  totalElectrodes: number
  sampleRate: number
}

export class MASApiService {
  private baseUrl: string

  constructor(baseUrl: string = MAS_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`MAS API Error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  // Lab
  async getLabInstruments(): Promise<{ instruments: Instrument[] }> {
    return this.request('/lab/instruments')
  }

  async calibrateInstrument(id: string): Promise<void> {
    return this.request(`/lab/instruments/${id}/calibrate`, { method: 'POST' })
  }

  // Simulations
  async getSimulations(): Promise<{ simulations: Simulation[]; gpuUtilization: number }> {
    return this.request('/simulation/jobs')
  }

  async startSimulation(config: { type: string; name: string; config: object }): Promise<Simulation> {
    return this.request('/simulation/jobs', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  async controlSimulation(id: string, action: 'pause' | 'resume' | 'cancel'): Promise<void> {
    return this.request(`/simulation/jobs/${id}/${action}`, { method: 'POST' })
  }

  // Experiments
  async getExperiments(): Promise<{ experiments: Experiment[]; stats: object }> {
    return this.request('/experiments')
  }

  async createExperiment(data: { name: string; parameters: object }): Promise<Experiment> {
    return this.request('/experiments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Hypotheses
  async getHypotheses(): Promise<{ hypotheses: Hypothesis[] }> {
    return this.request('/hypotheses')
  }

  async createHypothesis(statement: string): Promise<Hypothesis> {
    return this.request('/hypotheses', {
      method: 'POST',
      body: JSON.stringify({ statement }),
    })
  }

  async testHypothesis(id: string): Promise<void> {
    return this.request(`/hypotheses/${id}/test`, { method: 'POST' })
  }

  // FCI
  async getFCISessions(): Promise<{ sessions: FCISession[]; signalQuality: number }> {
    return this.request('/bio/fci/sessions')
  }

  async startFCISession(species: string, strain?: string): Promise<FCISession> {
    return this.request('/bio/fci/sessions', {
      method: 'POST',
      body: JSON.stringify({ species, strain }),
    })
  }

  async controlFCISession(id: string, action: 'start' | 'pause' | 'stop' | 'stimulate'): Promise<void> {
    return this.request(`/bio/fci/sessions/${id}/${action}`, { method: 'POST' })
  }

  async getFCISignals(sessionId: string): Promise<{ channels: number[][]; sampleRate: number }> {
    return this.request(`/bio/fci/sessions/${sessionId}/signals`)
  }

  // MycoBrain
  async getMycoBrainStatus(): Promise<{ status: string; queuedComputations: number }> {
    return this.request('/bio/mycobrain/status')
  }

  async submitComputation(mode: string, input: object): Promise<{ jobId: string }> {
    return this.request('/bio/mycobrain/compute', {
      method: 'POST',
      body: JSON.stringify({ mode, input }),
    })
  }

  // NatureOS Devices
  async getDevices(): Promise<{ devices: object[] }> {
    return this.request('/natureos/devices')
  }

  async getTelemetry(deviceId: string, limit = 100): Promise<{ telemetry: object[] }> {
    return this.request(`/natureos/telemetry?device_id=${deviceId}&limit=${limit}`)
  }

  // Memory
  async getConversations(): Promise<{ conversations: object[] }> {
    return this.request('/memory/conversations')
  }

  async getFacts(query?: string): Promise<{ facts: object[] }> {
    const params = query ? `?query=${encodeURIComponent(query)}` : ''
    return this.request(`/memory/facts${params}`)
  }

  async storeFact(key: string, value: unknown, scope = 'user'): Promise<void> {
    return this.request('/memory/facts', {
      method: 'POST',
      body: JSON.stringify({ key, value, scope }),
    })
  }

  // Safety
  async getSafetyStatus(): Promise<{ metrics: object[]; overallStatus: string }> {
    return this.request('/safety/status')
  }
}

export const masApi = new MASApiService()
