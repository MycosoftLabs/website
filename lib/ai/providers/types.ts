/**
 * AI Provider Types
 * 
 * Unified type definitions for multi-provider AI system
 */

export type AIProvider = 
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'xai'
  | 'google'
  | 'meta'
  | 'aws-bedrock'
  | 'azure-openai'
  | 'google-vertex'
  | 'ollama'

export type ModelCapability = 
  | 'chat'
  | 'completion'
  | 'embedding'
  | 'vision'
  | 'code'
  | 'function-calling'
  | 'streaming'
  | 'json-mode'

export interface AIModel {
  id: string
  provider: AIProvider
  name: string
  capabilities: ModelCapability[]
  contextWindow: number
  maxOutputTokens: number
  costPer1kInput?: number
  costPer1kOutput?: number
  isOpenSource: boolean
  speed: 'fast' | 'medium' | 'slow'
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function'
  content: string
  name?: string
  functionCall?: {
    name: string
    arguments: string
  }
}

export interface ChatCompletionOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
  jsonMode?: boolean
  functions?: FunctionDefinition[]
  functionCall?: 'auto' | 'none' | { name: string }
}

export interface FunctionDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ChatCompletionResponse {
  id: string
  provider: AIProvider
  model: string
  content: string
  finishReason: 'stop' | 'length' | 'function_call' | 'content_filter'
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  functionCall?: {
    name: string
    arguments: string
  }
}

export interface EmbeddingOptions {
  model?: string
  input: string | string[]
}

export interface EmbeddingResponse {
  provider: AIProvider
  model: string
  embeddings: number[][]
  dimensions: number
  usage: {
    totalTokens: number
  }
}

export interface ProviderConfig {
  apiKey?: string
  baseUrl?: string
  organization?: string
  project?: string
  region?: string
  defaultModel?: string
  enabled: boolean
  priority: number
  rateLimitPerMinute?: number
}

export interface AIProviderStatus {
  provider: AIProvider
  status: 'active' | 'degraded' | 'unavailable'
  latencyMs?: number
  lastCheck: Date
  errorMessage?: string
}
