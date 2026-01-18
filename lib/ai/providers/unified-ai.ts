/**
 * Unified AI Service
 * 
 * Orchestrates multiple AI providers with:
 * - Automatic fallback on errors
 * - Load balancing
 * - Cost optimization
 * - Provider health monitoring
 * - Capability-based routing
 */

import { 
  AIProvider, 
  ChatCompletionOptions, 
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
  AIProviderStatus,
  ModelCapability
} from './types'
import { OpenAIProvider } from './openai'
import { AnthropicProvider } from './anthropic'
import { GroqProvider } from './groq'
import { XAIProvider } from './xai'
import { GoogleProvider } from './google'
import { AWSBedrockProvider } from './aws-bedrock'
import { AzureOpenAIProvider } from './azure-openai'
import { GoogleVertexProvider } from './google-vertex'
import { AI_MODELS, getModelById, getModelsByCapability, getFastModels } from './models'

interface UnifiedAIConfig {
  providers: Partial<Record<AIProvider, ProviderConfig>>
  defaultProvider?: AIProvider
  fallbackOrder?: AIProvider[]
  enableLoadBalancing?: boolean
  enableCostOptimization?: boolean
  maxRetries?: number
}

const DEFAULT_FALLBACK_ORDER: AIProvider[] = [
  'groq',      // Fast & cheap
  'anthropic', // High quality
  'openai',    // Reliable
  'google',    // Large context
  'xai',       // Alternative
  'azure-openai',
  'aws-bedrock',
  'google-vertex',
]

export class UnifiedAI {
  private config: UnifiedAIConfig
  private providers: Map<AIProvider, any> = new Map()
  private providerStatus: Map<AIProvider, AIProviderStatus> = new Map()
  private requestCounts: Map<AIProvider, number> = new Map()

  constructor(config?: Partial<UnifiedAIConfig>) {
    this.config = {
      providers: {},
      defaultProvider: 'anthropic',
      fallbackOrder: DEFAULT_FALLBACK_ORDER,
      enableLoadBalancing: true,
      enableCostOptimization: false,
      maxRetries: 3,
      ...config,
    }

    this.initializeProviders()
  }

  private initializeProviders(): void {
    const providerConfigs = this.config.providers

    // Initialize each provider if configured or if env vars exist
    if (providerConfigs.openai?.enabled !== false && process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider(providerConfigs.openai || { enabled: true, priority: 2 }))
      this.initStatus('openai')
    }

    if (providerConfigs.anthropic?.enabled !== false && process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicProvider(providerConfigs.anthropic || { enabled: true, priority: 1 }))
      this.initStatus('anthropic')
    }

    if (providerConfigs.groq?.enabled !== false && process.env.GROQ_API_KEY) {
      this.providers.set('groq', new GroqProvider(providerConfigs.groq || { enabled: true, priority: 0 }))
      this.initStatus('groq')
    }

    if (providerConfigs.xai?.enabled !== false && process.env.XAI_API_KEY) {
      this.providers.set('xai', new XAIProvider(providerConfigs.xai || { enabled: true, priority: 3 }))
      this.initStatus('xai')
    }

    if (providerConfigs.google?.enabled !== false && process.env.GOOGLE_AI_API_KEY) {
      this.providers.set('google', new GoogleProvider(providerConfigs.google || { enabled: true, priority: 2 }))
      this.initStatus('google')
    }

    if (providerConfigs['aws-bedrock']?.enabled !== false && process.env.AWS_ACCESS_KEY_ID) {
      this.providers.set('aws-bedrock', new AWSBedrockProvider(providerConfigs['aws-bedrock'] || { enabled: true, priority: 4 }))
      this.initStatus('aws-bedrock')
    }

    if (providerConfigs['azure-openai']?.enabled !== false && process.env.AZURE_OPENAI_API_KEY) {
      this.providers.set('azure-openai', new AzureOpenAIProvider(providerConfigs['azure-openai'] || { enabled: true, priority: 3 }))
      this.initStatus('azure-openai')
    }

    if (providerConfigs['google-vertex']?.enabled !== false && process.env.GOOGLE_CLOUD_PROJECT) {
      this.providers.set('google-vertex', new GoogleVertexProvider(providerConfigs['google-vertex'] || { enabled: true, priority: 4 }))
      this.initStatus('google-vertex')
    }
  }

  private initStatus(provider: AIProvider): void {
    this.providerStatus.set(provider, {
      provider,
      status: 'active',
      lastCheck: new Date(),
    })
    this.requestCounts.set(provider, 0)
  }

  /**
   * Chat completion with automatic provider selection and fallback
   */
  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const providerOrder = this.getProviderOrder(options)
    let lastError: Error | null = null

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName)
      if (!provider) continue

      const status = this.providerStatus.get(providerName)
      if (status?.status === 'unavailable') continue

      try {
        const startTime = Date.now()
        const result = await provider.chat(options)
        
        // Update provider status
        this.updateProviderStatus(providerName, 'active', Date.now() - startTime)
        this.incrementRequestCount(providerName)
        
        return result
      } catch (error) {
        lastError = error as Error
        console.error(`Provider ${providerName} failed:`, error)
        this.updateProviderStatus(providerName, 'degraded', undefined, (error as Error).message)
      }
    }

    throw lastError || new Error('All AI providers failed')
  }

  /**
   * Streaming chat with fallback
   */
  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
    const providerOrder = this.getProviderOrder(options)
    let lastError: Error | null = null

    for (const providerName of providerOrder) {
      const provider = this.providers.get(providerName)
      if (!provider || !provider.streamChat) continue

      const status = this.providerStatus.get(providerName)
      if (status?.status === 'unavailable') continue

      try {
        for await (const chunk of provider.streamChat(options)) {
          yield chunk
        }
        this.updateProviderStatus(providerName, 'active')
        return
      } catch (error) {
        lastError = error as Error
        console.error(`Streaming from ${providerName} failed:`, error)
        this.updateProviderStatus(providerName, 'degraded', undefined, (error as Error).message)
      }
    }

    throw lastError || new Error('All streaming providers failed')
  }

  /**
   * Generate embeddings with fallback
   */
  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const embeddingProviders: AIProvider[] = ['openai', 'google', 'azure-openai', 'aws-bedrock', 'google-vertex']
    let lastError: Error | null = null

    for (const providerName of embeddingProviders) {
      const provider = this.providers.get(providerName)
      if (!provider || !provider.embed) continue

      try {
        return await provider.embed(options)
      } catch (error) {
        lastError = error as Error
        console.error(`Embeddings from ${providerName} failed:`, error)
      }
    }

    throw lastError || new Error('All embedding providers failed')
  }

  /**
   * Get the fastest available provider for a quick response
   */
  async fastChat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Prioritize Groq for speed
    const fastProviders: AIProvider[] = ['groq', 'anthropic', 'openai']
    const fastModels = getFastModels()
    
    // Select fastest available model
    for (const providerName of fastProviders) {
      const provider = this.providers.get(providerName)
      if (!provider) continue

      const providerModels = fastModels.filter(m => m.provider === providerName)
      if (providerModels.length === 0) continue

      try {
        return await provider.chat({
          ...options,
          model: providerModels[0].id,
        })
      } catch (error) {
        console.error(`Fast chat from ${providerName} failed:`, error)
      }
    }

    // Fallback to regular chat
    return this.chat(options)
  }

  /**
   * Route based on capability requirements
   */
  async chatWithCapability(
    options: ChatCompletionOptions, 
    requiredCapabilities: ModelCapability[]
  ): Promise<ChatCompletionResponse> {
    // Find models that support all required capabilities
    let candidates = AI_MODELS.filter(m => 
      requiredCapabilities.every(cap => m.capabilities.includes(cap))
    )

    if (this.config.enableCostOptimization) {
      // Sort by cost
      candidates = candidates.sort((a, b) => 
        (a.costPer1kInput || Infinity) - (b.costPer1kInput || Infinity)
      )
    }

    // Try each candidate
    for (const model of candidates) {
      const provider = this.providers.get(model.provider)
      if (!provider) continue

      try {
        return await provider.chat({
          ...options,
          model: model.id,
        })
      } catch (error) {
        console.error(`Capability-based chat failed for ${model.id}:`, error)
      }
    }

    // Fallback
    return this.chat(options)
  }

  /**
   * Use open source models only
   */
  async openSourceChat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const openSourceProviders: AIProvider[] = ['groq', 'ollama', 'aws-bedrock']
    
    for (const providerName of openSourceProviders) {
      const provider = this.providers.get(providerName)
      if (!provider) continue

      try {
        return await provider.chat(options)
      } catch (error) {
        console.error(`Open source chat from ${providerName} failed:`, error)
      }
    }

    throw new Error('No open source providers available')
  }

  /**
   * Get provider status for monitoring
   */
  getProviderStatuses(): AIProviderStatus[] {
    return Array.from(this.providerStatus.values())
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if a specific provider is available
   */
  isProviderAvailable(provider: AIProvider): boolean {
    return this.providers.has(provider) && 
           this.providerStatus.get(provider)?.status !== 'unavailable'
  }

  private getProviderOrder(options: ChatCompletionOptions): AIProvider[] {
    // If model is specified, determine the provider
    if (options.model) {
      const model = getModelById(options.model)
      if (model && this.providers.has(model.provider)) {
        return [model.provider, ...this.config.fallbackOrder!.filter(p => p !== model.provider)]
      }
    }

    // Use configured fallback order, filtered by availability
    if (this.config.enableLoadBalancing) {
      // Round-robin load balancing
      return [...this.config.fallbackOrder!].sort((a, b) => {
        const countA = this.requestCounts.get(a) || 0
        const countB = this.requestCounts.get(b) || 0
        return countA - countB
      })
    }

    return this.config.fallbackOrder!
  }

  private updateProviderStatus(
    provider: AIProvider, 
    status: 'active' | 'degraded' | 'unavailable',
    latencyMs?: number,
    errorMessage?: string
  ): void {
    this.providerStatus.set(provider, {
      provider,
      status,
      latencyMs,
      lastCheck: new Date(),
      errorMessage,
    })
  }

  private incrementRequestCount(provider: AIProvider): void {
    const current = this.requestCounts.get(provider) || 0
    this.requestCounts.set(provider, current + 1)
  }
}

// Singleton instance
let unifiedAI: UnifiedAI | null = null

export function getUnifiedAI(config?: Partial<UnifiedAIConfig>): UnifiedAI {
  if (!unifiedAI) {
    unifiedAI = new UnifiedAI(config)
  }
  return unifiedAI
}

// Convenience functions
export async function chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  return getUnifiedAI().chat(options)
}

export async function fastChat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
  return getUnifiedAI().fastChat(options)
}

export async function embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
  return getUnifiedAI().embed(options)
}

export async function* streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
  yield* getUnifiedAI().streamChat(options)
}
