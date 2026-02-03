/**
 * MYCA Multi-Agent System Service
 * Interface to the autonomous AI agent orchestrator
 */

const MYCA_URL = process.env.NEXT_PUBLIC_MYCA_URL || 'http://192.168.0.188:8001/myca'

export interface Agent {
  id: string
  name: string
  type: string
  status: 'idle' | 'busy' | 'error' | 'offline'
  currentTask?: string
  capabilities: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ChatResponse {
  message: string
  actions?: AgentAction[]
  context?: Record<string, unknown>
}

export interface AgentAction {
  type: string
  agent: string
  parameters: Record<string, unknown>
  status: 'pending' | 'executing' | 'completed' | 'failed'
  result?: unknown
}

export interface TaskRequest {
  taskType: string
  parameters: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'critical'
  agents?: string[]
}

export interface TaskResult {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  result?: unknown
  error?: string
  executionTime?: number
}

export class MYCAApiService {
  private baseUrl: string

  constructor(baseUrl: string = MYCA_URL) {
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
      throw new Error(`MYCA Error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }

  // Agent Management
  async getAgents(): Promise<{ agents: Agent[] }> {
    return this.request('/agents')
  }

  async getAgentStatus(agentId: string): Promise<Agent> {
    return this.request(`/agents/${agentId}`)
  }

  async assignTask(agentId: string, task: TaskRequest): Promise<TaskResult> {
    return this.request(`/agents/${agentId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    })
  }

  // Chat Interface
  async chat(message: string, context?: Record<string, unknown>): Promise<ChatResponse> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    })
  }

  async getChatHistory(sessionId?: string): Promise<{ messages: ChatMessage[] }> {
    const params = sessionId ? `?session=${sessionId}` : ''
    return this.request(`/chat/history${params}`)
  }

  // Task Execution
  async executeTask(request: TaskRequest): Promise<TaskResult> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getTaskStatus(taskId: string): Promise<TaskResult> {
    return this.request(`/tasks/${taskId}`)
  }

  async cancelTask(taskId: string): Promise<void> {
    return this.request(`/tasks/${taskId}/cancel`, { method: 'POST' })
  }

  // Scientific Agents
  async askScientist(question: string, context?: object): Promise<ChatResponse> {
    return this.request('/agents/scientist/ask', {
      method: 'POST',
      body: JSON.stringify({ question, context }),
    })
  }

  async requestExperiment(hypothesis: string, parameters?: object): Promise<TaskResult> {
    return this.executeTask({
      taskType: 'design_experiment',
      parameters: { hypothesis, ...parameters },
      agents: ['scientist', 'lab'],
    })
  }

  async analyzeData(dataId: string, analysisType: string): Promise<TaskResult> {
    return this.executeTask({
      taskType: 'analyze_data',
      parameters: { dataId, analysisType },
      agents: ['scientist'],
    })
  }

  // Lab Agents
  async controlInstrument(instrumentId: string, command: string, params?: object): Promise<TaskResult> {
    return this.request('/agents/lab/control', {
      method: 'POST',
      body: JSON.stringify({ instrumentId, command, params }),
    })
  }

  // Simulation Agents
  async requestSimulation(simType: string, config: object): Promise<TaskResult> {
    return this.executeTask({
      taskType: 'run_simulation',
      parameters: { type: simType, config },
      agents: ['simulation'],
    })
  }

  // Hypothesis Agents
  async generateHypothesis(context: string): Promise<{ hypothesis: string; confidence: number }> {
    return this.request('/agents/hypothesis/generate', {
      method: 'POST',
      body: JSON.stringify({ context }),
    })
  }

  async validateHypothesis(hypothesisId: string): Promise<{ valid: boolean; evidence: object[] }> {
    return this.request(`/agents/hypothesis/${hypothesisId}/validate`, { method: 'POST' })
  }
}

export const mycaApi = new MYCAApiService()
