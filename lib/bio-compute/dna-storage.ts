/**
 * DNA Data Storage System
 * Encode, store, and retrieve data using DNA synthesis
 */

export interface DNAStorageJob {
  id: string
  type: 'encode' | 'decode'
  status: 'pending' | 'synthesizing' | 'sequencing' | 'processing' | 'completed' | 'failed'
  dataSize: number
  dnaLength?: number
  redundancy: number
  errorCorrectionLevel: 'low' | 'medium' | 'high'
  createdAt: string
  completedAt?: string
}

export interface StoredData {
  id: string
  name: string
  size: number
  dnaSequenceLength: number
  redundancy: number
  storedAt: string
  expiresAt?: string
  verified: boolean
  retrievalCount: number
}

export interface EncodingResult {
  jobId: string
  dataId: string
  dnaSequence: string
  checksum: string
  redundancy: number
  compressionRatio: number
}

export interface DecodingResult {
  jobId: string
  dataId: string
  data: string | ArrayBuffer
  errorsCorrected: number
  confidence: number
}

export interface StorageCapacity {
  totalCapacity: number // in bytes
  usedCapacity: number
  availableCapacity: number
  maxFileSize: number
  synthesisQueueLength: number
  sequencingQueueLength: number
}

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export class DNAStorageService {
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
      throw new Error(`DNA Storage Error: ${response.status}`)
    }
    
    return response.json()
  }

  // Capacity & Status
  async getCapacity(): Promise<StorageCapacity> {
    return this.request('/bio/dna-storage/capacity')
  }

  async listStoredData(): Promise<{ data: StoredData[] }> {
    return this.request('/bio/dna-storage/data')
  }

  async getStoredData(dataId: string): Promise<StoredData> {
    return this.request(`/bio/dna-storage/data/${dataId}`)
  }

  // Encoding (Store)
  async encodeData(
    data: string | ArrayBuffer,
    name: string,
    options?: { redundancy?: number; errorCorrection?: string }
  ): Promise<DNAStorageJob> {
    const payload = {
      data: typeof data === 'string' ? data : Buffer.from(data).toString('base64'),
      name,
      redundancy: options?.redundancy || 3,
      errorCorrectionLevel: options?.errorCorrection || 'medium',
    }
    return this.request('/bio/dna-storage/encode', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getEncodingResult(jobId: string): Promise<EncodingResult> {
    return this.request(`/bio/dna-storage/encode/${jobId}/result`)
  }

  // Decoding (Retrieve)
  async decodeData(dataId: string): Promise<DNAStorageJob> {
    return this.request(`/bio/dna-storage/decode/${dataId}`, { method: 'POST' })
  }

  async getDecodingResult(jobId: string): Promise<DecodingResult> {
    return this.request(`/bio/dna-storage/decode/${jobId}/result`)
  }

  // Job Management
  async getJob(jobId: string): Promise<DNAStorageJob> {
    return this.request(`/bio/dna-storage/jobs/${jobId}`)
  }

  async listJobs(type?: string): Promise<{ jobs: DNAStorageJob[] }> {
    const params = type ? `?type=${type}` : ''
    return this.request(`/bio/dna-storage/jobs${params}`)
  }

  async cancelJob(jobId: string): Promise<void> {
    return this.request(`/bio/dna-storage/jobs/${jobId}/cancel`, { method: 'POST' })
  }

  // Data Management
  async deleteData(dataId: string): Promise<void> {
    return this.request(`/bio/dna-storage/data/${dataId}`, { method: 'DELETE' })
  }

  async verifyData(dataId: string): Promise<{ valid: boolean; errors: number }> {
    return this.request(`/bio/dna-storage/data/${dataId}/verify`, { method: 'POST' })
  }

  async duplicateData(dataId: string, copies: number): Promise<void> {
    return this.request(`/bio/dna-storage/data/${dataId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ copies }),
    })
  }
}

export const dnaStorage = new DNAStorageService()
