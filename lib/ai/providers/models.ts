/**
 * AI Model Registry
 * 
 * Comprehensive registry of all available AI models across providers
 */

import { AIModel } from './types'

export const AI_MODELS: AIModel[] = [
  // ============================================
  // OPENAI Models
  // ============================================
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    capabilities: ['chat', 'vision', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    isOpenSource: false,
    speed: 'medium',
  },
  {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    capabilities: ['chat', 'vision', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    isOpenSource: false,
    speed: 'fast',
  },
  {
    id: 'gpt-4-turbo',
    provider: 'openai',
    name: 'GPT-4 Turbo',
    capabilities: ['chat', 'vision', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 128000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.01,
    costPer1kOutput: 0.03,
    isOpenSource: false,
    speed: 'medium',
  },
  {
    id: 'o1',
    provider: 'openai',
    name: 'o1 (Reasoning)',
    capabilities: ['chat', 'code'],
    contextWindow: 200000,
    maxOutputTokens: 100000,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.06,
    isOpenSource: false,
    speed: 'slow',
  },
  {
    id: 'o1-mini',
    provider: 'openai',
    name: 'o1 Mini',
    capabilities: ['chat', 'code'],
    contextWindow: 128000,
    maxOutputTokens: 65536,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.012,
    isOpenSource: false,
    speed: 'medium',
  },
  {
    id: 'text-embedding-3-large',
    provider: 'openai',
    name: 'Embedding 3 Large',
    capabilities: ['embedding'],
    contextWindow: 8191,
    maxOutputTokens: 0,
    costPer1kInput: 0.00013,
    isOpenSource: false,
    speed: 'fast',
  },
  {
    id: 'text-embedding-3-small',
    provider: 'openai',
    name: 'Embedding 3 Small',
    capabilities: ['embedding'],
    contextWindow: 8191,
    maxOutputTokens: 0,
    costPer1kInput: 0.00002,
    isOpenSource: false,
    speed: 'fast',
  },

  // ============================================
  // ANTHROPIC Models
  // ============================================
  {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming'],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    isOpenSource: false,
    speed: 'medium',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Haiku',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming'],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    isOpenSource: false,
    speed: 'fast',
  },
  {
    id: 'claude-3-opus-20240229',
    provider: 'anthropic',
    name: 'Claude 3 Opus',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming'],
    contextWindow: 200000,
    maxOutputTokens: 4096,
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    isOpenSource: false,
    speed: 'slow',
  },

  // ============================================
  // GROQ Models (Fast Inference)
  // ============================================
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    name: 'Llama 3.3 70B (Groq)',
    capabilities: ['chat', 'code', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 128000,
    maxOutputTokens: 32768,
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
    isOpenSource: true,
    speed: 'fast',
  },
  {
    id: 'llama-3.1-8b-instant',
    provider: 'groq',
    name: 'Llama 3.1 8B Instant (Groq)',
    capabilities: ['chat', 'code', 'streaming', 'json-mode'],
    contextWindow: 128000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.00008,
    isOpenSource: true,
    speed: 'fast',
  },
  {
    id: 'mixtral-8x7b-32768',
    provider: 'groq',
    name: 'Mixtral 8x7B (Groq)',
    capabilities: ['chat', 'code', 'streaming', 'json-mode'],
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00024,
    costPer1kOutput: 0.00024,
    isOpenSource: true,
    speed: 'fast',
  },
  {
    id: 'gemma2-9b-it',
    provider: 'groq',
    name: 'Gemma 2 9B (Groq)',
    capabilities: ['chat', 'streaming', 'json-mode'],
    contextWindow: 8192,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0002,
    costPer1kOutput: 0.0002,
    isOpenSource: true,
    speed: 'fast',
  },

  // ============================================
  // xAI Grok Models
  // ============================================
  {
    id: 'grok-2-latest',
    provider: 'xai',
    name: 'Grok 2',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming'],
    contextWindow: 131072,
    maxOutputTokens: 8192,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.01,
    isOpenSource: false,
    speed: 'medium',
  },
  {
    id: 'grok-2-vision-latest',
    provider: 'xai',
    name: 'Grok 2 Vision',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming'],
    contextWindow: 32768,
    maxOutputTokens: 8192,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.01,
    isOpenSource: false,
    speed: 'medium',
  },

  // ============================================
  // GOOGLE Gemini Models
  // ============================================
  {
    id: 'gemini-2.0-flash-exp',
    provider: 'google',
    name: 'Gemini 2.0 Flash',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    isOpenSource: false,
    speed: 'fast',
  },
  {
    id: 'gemini-1.5-pro',
    provider: 'google',
    name: 'Gemini 1.5 Pro',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    isOpenSource: false,
    speed: 'medium',
  },
  {
    id: 'gemini-1.5-flash',
    provider: 'google',
    name: 'Gemini 1.5 Flash',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    isOpenSource: false,
    speed: 'fast',
  },

  // ============================================
  // META Llama Models (Open Source)
  // ============================================
  {
    id: 'llama-3.3-70b',
    provider: 'meta',
    name: 'Llama 3.3 70B',
    capabilities: ['chat', 'code', 'function-calling', 'streaming'],
    contextWindow: 128000,
    maxOutputTokens: 8192,
    isOpenSource: true,
    speed: 'medium',
  },
  {
    id: 'llama-3.2-90b-vision',
    provider: 'meta',
    name: 'Llama 3.2 90B Vision',
    capabilities: ['chat', 'vision', 'code', 'streaming'],
    contextWindow: 128000,
    maxOutputTokens: 8192,
    isOpenSource: true,
    speed: 'medium',
  },
  {
    id: 'llama-3.1-405b',
    provider: 'meta',
    name: 'Llama 3.1 405B',
    capabilities: ['chat', 'code', 'function-calling', 'streaming'],
    contextWindow: 128000,
    maxOutputTokens: 8192,
    isOpenSource: true,
    speed: 'slow',
  },

  // ============================================
  // AWS Bedrock Models
  // ============================================
  {
    id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    provider: 'aws-bedrock',
    name: 'Claude 3.5 Sonnet (Bedrock)',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming'],
    contextWindow: 200000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    isOpenSource: false,
    speed: 'medium',
  },
  {
    id: 'amazon.titan-text-premier-v1:0',
    provider: 'aws-bedrock',
    name: 'Amazon Titan Text Premier',
    capabilities: ['chat', 'streaming'],
    contextWindow: 32000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.0005,
    costPer1kOutput: 0.0015,
    isOpenSource: false,
    speed: 'fast',
  },
  {
    id: 'meta.llama3-70b-instruct-v1:0',
    provider: 'aws-bedrock',
    name: 'Llama 3 70B (Bedrock)',
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 8192,
    maxOutputTokens: 2048,
    costPer1kInput: 0.00265,
    costPer1kOutput: 0.0035,
    isOpenSource: true,
    speed: 'medium',
  },

  // ============================================
  // Azure OpenAI Models
  // ============================================
  {
    id: 'gpt-4o-azure',
    provider: 'azure-openai',
    name: 'GPT-4o (Azure)',
    capabilities: ['chat', 'vision', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 128000,
    maxOutputTokens: 16384,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    isOpenSource: false,
    speed: 'medium',
  },

  // ============================================
  // Google Cloud Vertex AI Models
  // ============================================
  {
    id: 'gemini-1.5-pro-vertex',
    provider: 'google-vertex',
    name: 'Gemini 1.5 Pro (Vertex AI)',
    capabilities: ['chat', 'vision', 'code', 'function-calling', 'streaming', 'json-mode'],
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    isOpenSource: false,
    speed: 'medium',
  },

  // ============================================
  // Local Ollama Models
  // ============================================
  {
    id: 'llama3.3:70b',
    provider: 'ollama',
    name: 'Llama 3.3 70B (Local)',
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 128000,
    maxOutputTokens: 8192,
    isOpenSource: true,
    speed: 'medium',
  },
  {
    id: 'qwen2.5-coder:32b',
    provider: 'ollama',
    name: 'Qwen 2.5 Coder 32B (Local)',
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 32768,
    maxOutputTokens: 8192,
    isOpenSource: true,
    speed: 'medium',
  },
  {
    id: 'deepseek-coder-v2:latest',
    provider: 'ollama',
    name: 'DeepSeek Coder V2 (Local)',
    capabilities: ['chat', 'code', 'streaming'],
    contextWindow: 128000,
    maxOutputTokens: 8192,
    isOpenSource: true,
    speed: 'medium',
  },
]

export function getModelsByProvider(provider: string): AIModel[] {
  return AI_MODELS.filter(m => m.provider === provider)
}

export function getModelsByCapability(capability: string): AIModel[] {
  return AI_MODELS.filter(m => m.capabilities.includes(capability as any))
}

export function getOpenSourceModels(): AIModel[] {
  return AI_MODELS.filter(m => m.isOpenSource)
}

export function getFastModels(): AIModel[] {
  return AI_MODELS.filter(m => m.speed === 'fast')
}

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(m => m.id === id)
}
