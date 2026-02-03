/**
 * Autonomous Experiment Engine
 * Manages closed-loop experimentation with minimal human intervention
 */

export interface ExperimentStep {
  id: string
  name: string
  type: 'setup' | 'execute' | 'measure' | 'analyze' | 'decide'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: number
  endTime?: number
  result?: unknown
  error?: string
}

export interface ExperimentProtocol {
  id: string
  name: string
  version: string
  steps: ExperimentStep[]
  parameters: Record<string, unknown>
  constraints: Record<string, unknown>
}

export interface AutoExperiment {
  id: string
  name: string
  hypothesis: string
  protocol: ExperimentProtocol
  status: 'planning' | 'running' | 'paused' | 'completed' | 'failed'
  currentStep: number
  totalSteps: number
  startedAt?: string
  completedAt?: string
  results: unknown[]
  adaptations: Adaptation[]
}

export interface Adaptation {
  timestamp: number
  reason: string
  change: string
  automated: boolean
}

export interface ExperimentResult {
  experimentId: string
  hypothesisValidated: boolean
  confidence: number
  findings: Finding[]
  recommendations: string[]
  nextSteps: string[]
}

export interface Finding {
  metric: string
  expected: unknown
  observed: unknown
  significance: number
  interpretation: string
}

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export class AutonomousExperimentEngine {
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
      throw new Error(`Autonomous Engine Error: ${response.status}`)
    }
    
    return response.json()
  }

  // Experiment Management
  async createExperiment(hypothesis: string, parameters?: object): Promise<AutoExperiment> {
    return this.request('/autonomous/experiments', {
      method: 'POST',
      body: JSON.stringify({ hypothesis, parameters }),
    })
  }

  async getExperiment(id: string): Promise<AutoExperiment> {
    return this.request(`/autonomous/experiments/${id}`)
  }

  async listExperiments(status?: string): Promise<{ experiments: AutoExperiment[] }> {
    const params = status ? `?status=${status}` : ''
    return this.request(`/autonomous/experiments${params}`)
  }

  // Execution Control
  async startExperiment(id: string): Promise<void> {
    return this.request(`/autonomous/experiments/${id}/start`, { method: 'POST' })
  }

  async pauseExperiment(id: string): Promise<void> {
    return this.request(`/autonomous/experiments/${id}/pause`, { method: 'POST' })
  }

  async resumeExperiment(id: string): Promise<void> {
    return this.request(`/autonomous/experiments/${id}/resume`, { method: 'POST' })
  }

  async abortExperiment(id: string, reason: string): Promise<void> {
    return this.request(`/autonomous/experiments/${id}/abort`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  // Protocol Management
  async generateProtocol(hypothesis: string, constraints?: object): Promise<ExperimentProtocol> {
    return this.request('/autonomous/protocols/generate', {
      method: 'POST',
      body: JSON.stringify({ hypothesis, constraints }),
    })
  }

  async validateProtocol(protocol: ExperimentProtocol): Promise<{ valid: boolean; issues: string[] }> {
    return this.request('/autonomous/protocols/validate', {
      method: 'POST',
      body: JSON.stringify({ protocol }),
    })
  }

  // Adaptation
  async suggestAdaptation(experimentId: string): Promise<Adaptation[]> {
    return this.request(`/autonomous/experiments/${experimentId}/adapt`)
  }

  async applyAdaptation(experimentId: string, adaptation: Adaptation): Promise<void> {
    return this.request(`/autonomous/experiments/${experimentId}/adapt`, {
      method: 'POST',
      body: JSON.stringify({ adaptation }),
    })
  }

  // Results
  async getResults(experimentId: string): Promise<ExperimentResult> {
    return this.request(`/autonomous/experiments/${experimentId}/results`)
  }

  async analyzeResults(experimentId: string): Promise<{ analysis: string; confidence: number }> {
    return this.request(`/autonomous/experiments/${experimentId}/analyze`, { method: 'POST' })
  }

  // Resource Management
  async checkResources(): Promise<{ available: boolean; instruments: object[]; consumables: object[] }> {
    return this.request('/autonomous/resources')
  }

  async reserveResources(experimentId: string, resources: string[]): Promise<void> {
    return this.request('/autonomous/resources/reserve', {
      method: 'POST',
      body: JSON.stringify({ experimentId, resources }),
    })
  }
}

export const autoExperimentEngine = new AutonomousExperimentEngine()
