/**
 * AI Hypothesis Generation Engine
 * Generates and validates scientific hypotheses using AI
 */

export interface GeneratedHypothesis {
  id: string
  statement: string
  confidence: number
  reasoning: string
  relatedLiterature: LiteratureReference[]
  suggestedExperiments: ExperimentSuggestion[]
  knowledgeGaps: string[]
}

export interface LiteratureReference {
  title: string
  authors: string[]
  year: number
  doi?: string
  relevance: number
  keyFindings: string[]
}

export interface ExperimentSuggestion {
  name: string
  objective: string
  methodology: string
  expectedOutcome: string
  resources: string[]
  duration: string
}

export interface HypothesisValidation {
  hypothesisId: string
  status: 'pending' | 'testing' | 'validated' | 'rejected' | 'inconclusive'
  confidence: number
  supportingEvidence: Evidence[]
  contradictingEvidence: Evidence[]
  recommendation: string
}

export interface Evidence {
  source: string
  type: 'experiment' | 'literature' | 'computation' | 'observation'
  strength: number
  description: string
  data?: unknown
}

export interface ResearchAgenda {
  id: string
  goals: string[]
  hypotheses: GeneratedHypothesis[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  timeline: string
  progress: number
}

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export class HypothesisGenerationEngine {
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
      throw new Error(`Hypothesis Engine Error: ${response.status}`)
    }
    
    return response.json()
  }

  // Hypothesis Generation
  async generateFromContext(context: string, count = 5): Promise<GeneratedHypothesis[]> {
    return this.request('/hypothesis/generate', {
      method: 'POST',
      body: JSON.stringify({ context, count }),
    })
  }

  async generateFromData(dataId: string, analysisType: string): Promise<GeneratedHypothesis[]> {
    return this.request('/hypothesis/generate/data', {
      method: 'POST',
      body: JSON.stringify({ dataId, analysisType }),
    })
  }

  async generateFromLiterature(query: string, sources?: string[]): Promise<GeneratedHypothesis[]> {
    return this.request('/hypothesis/generate/literature', {
      method: 'POST',
      body: JSON.stringify({ query, sources }),
    })
  }

  async refineHypothesis(hypothesisId: string, feedback: string): Promise<GeneratedHypothesis> {
    return this.request(`/hypothesis/${hypothesisId}/refine`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    })
  }

  // Literature Mining
  async searchLiterature(query: string, limit = 20): Promise<LiteratureReference[]> {
    return this.request('/hypothesis/literature/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    })
  }

  async analyzePaper(doi: string): Promise<{ summary: string; hypotheses: string[]; methods: string[] }> {
    return this.request('/hypothesis/literature/analyze', {
      method: 'POST',
      body: JSON.stringify({ doi }),
    })
  }

  // Validation
  async validateHypothesis(hypothesisId: string): Promise<HypothesisValidation> {
    return this.request(`/hypothesis/${hypothesisId}/validate`, { method: 'POST' })
  }

  async getValidationStatus(hypothesisId: string): Promise<HypothesisValidation> {
    return this.request(`/hypothesis/${hypothesisId}/validation`)
  }

  async submitEvidence(hypothesisId: string, evidence: Omit<Evidence, 'strength'>): Promise<void> {
    return this.request(`/hypothesis/${hypothesisId}/evidence`, {
      method: 'POST',
      body: JSON.stringify({ evidence }),
    })
  }

  // Research Agenda
  async createAgenda(goals: string[], priority: string): Promise<ResearchAgenda> {
    return this.request('/hypothesis/agenda', {
      method: 'POST',
      body: JSON.stringify({ goals, priority }),
    })
  }

  async getAgenda(id: string): Promise<ResearchAgenda> {
    return this.request(`/hypothesis/agenda/${id}`)
  }

  async updateAgendaPriority(id: string, priority: string): Promise<void> {
    return this.request(`/hypothesis/agenda/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    })
  }

  // Pattern Discovery
  async discoverPatterns(dataIds: string[]): Promise<{ patterns: string[]; significance: number[] }> {
    return this.request('/hypothesis/patterns', {
      method: 'POST',
      body: JSON.stringify({ dataIds }),
    })
  }

  async findKnowledgeGaps(domain: string): Promise<string[]> {
    return this.request('/hypothesis/knowledge-gaps', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    })
  }
}

export const hypothesisEngine = new HypothesisGenerationEngine()
