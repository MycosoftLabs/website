/**
 * MycoBrain Production System
 * Production-ready biological computing infrastructure
 */

export interface ComputeJob {
  id: string
  mode: 'graph_solving' | 'pattern_recognition' | 'analog_compute' | 'optimization'
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'timeout'
  priority: 'low' | 'normal' | 'high' | 'critical'
  input: unknown
  output?: unknown
  error?: string
  submittedAt: string
  startedAt?: string
  completedAt?: string
  processingTime?: number
  confidence?: number
}

export interface MycoBrainStatus {
  status: 'online' | 'offline' | 'degraded' | 'maintenance'
  health: number
  activeJobs: number
  queuedJobs: number
  completedToday: number
  avgProcessingTime: number
  errorRate: number
  capabilities: string[]
  networkStats: NetworkStats
}

export interface NetworkStats {
  totalNodes: number
  activeNodes: number
  signalStrength: number
  connectivity: number
  temperature: number
  humidity: number
  lastCalibration: string
}

export interface ComputeResult {
  jobId: string
  success: boolean
  output: unknown
  confidence: number
  processingTime: number
  errorCorrections: number
  validation: ValidationResult
}

export interface ValidationResult {
  valid: boolean
  checksum: string
  redundancy: number
  consensusScore: number
}

export interface BioComputeMetrics {
  throughput: number
  latency: number
  accuracy: number
  uptime: number
  energyEfficiency: number
}

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export class MycoBrainProductionService {
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
      throw new Error(`MycoBrain Error: ${response.status}`)
    }
    
    return response.json()
  }

  // Status & Health
  async getStatus(): Promise<MycoBrainStatus> {
    return this.request('/bio/mycobrain/status')
  }

  async getMetrics(): Promise<BioComputeMetrics> {
    return this.request('/bio/mycobrain/metrics')
  }

  async getNetworkStats(): Promise<NetworkStats> {
    return this.request('/bio/mycobrain/network')
  }

  // Job Management
  async submitJob(mode: string, input: unknown, priority = 'normal'): Promise<ComputeJob> {
    return this.request('/bio/mycobrain/jobs', {
      method: 'POST',
      body: JSON.stringify({ mode, input, priority }),
    })
  }

  async getJob(jobId: string): Promise<ComputeJob> {
    return this.request(`/bio/mycobrain/jobs/${jobId}`)
  }

  async listJobs(status?: string, limit = 50): Promise<{ jobs: ComputeJob[] }> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    params.append('limit', limit.toString())
    return this.request(`/bio/mycobrain/jobs?${params}`)
  }

  async cancelJob(jobId: string): Promise<void> {
    return this.request(`/bio/mycobrain/jobs/${jobId}/cancel`, { method: 'POST' })
  }

  async getResult(jobId: string): Promise<ComputeResult> {
    return this.request(`/bio/mycobrain/jobs/${jobId}/result`)
  }

  // Compute Operations
  async solveGraph(nodes: unknown[], edges: unknown[], algorithm = 'shortest_path'): Promise<ComputeJob> {
    return this.submitJob('graph_solving', { nodes, edges, algorithm }, 'normal')
  }

  async recognizePattern(signal: number[][], patternType = 'unknown'): Promise<ComputeJob> {
    return this.submitJob('pattern_recognition', { signal, patternType }, 'normal')
  }

  async optimizeProblem(objective: string, constraints: unknown[], variables: unknown[]): Promise<ComputeJob> {
    return this.submitJob('optimization', { objective, constraints, variables }, 'high')
  }

  async analogCompute(inputMatrix: number[][], operation: string): Promise<ComputeJob> {
    return this.submitJob('analog_compute', { inputMatrix, operation }, 'normal')
  }

  // Calibration & Maintenance
  async calibrate(): Promise<{ success: boolean; duration: number }> {
    return this.request('/bio/mycobrain/calibrate', { method: 'POST' })
  }

  async runDiagnostics(): Promise<{ healthy: boolean; issues: string[] }> {
    return this.request('/bio/mycobrain/diagnostics', { method: 'POST' })
  }

  async scheduleMaintenance(scheduledAt: string): Promise<void> {
    return this.request('/bio/mycobrain/maintenance', {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    })
  }

  // Error Correction
  async validateResult(jobId: string): Promise<ValidationResult> {
    return this.request(`/bio/mycobrain/jobs/${jobId}/validate`, { method: 'POST' })
  }

  async reprocessWithCorrection(jobId: string): Promise<ComputeJob> {
    return this.request(`/bio/mycobrain/jobs/${jobId}/reprocess`, { method: 'POST' })
  }
}

export const mycoBrainProduction = new MycoBrainProductionService()
