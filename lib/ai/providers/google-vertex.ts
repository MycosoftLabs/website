/**
 * Google Cloud Vertex AI Provider
 */

import { 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
  ChatMessage
} from './types'

export class GoogleVertexProvider {
  private projectId: string
  private location: string
  private accessToken?: string

  constructor(config: ProviderConfig) {
    this.projectId = config.project || process.env.GOOGLE_CLOUD_PROJECT || ''
    this.location = config.region || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    this.accessToken = process.env.GOOGLE_CLOUD_ACCESS_TOKEN
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const model = options.model || 'gemini-1.5-pro'
    const endpoint = this.getEndpoint(model)
    const contents = this.convertMessages(options.messages)

    const response = await fetch(`${endpoint}:generateContent`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens,
          responseMimeType: options.jsonMode ? 'application/json' : undefined,
        },
        tools: options.functions ? [{
          function_declarations: options.functions.map(f => ({
            name: f.name,
            description: f.description,
            parameters: f.parameters,
          }))
        }] : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI error: ${error}`)
    }

    const data = await response.json()
    const candidate = data.candidates[0]
    const content = candidate.content.parts[0]

    return {
      id: `vertex-${Date.now()}`,
      provider: 'google-vertex',
      model,
      content: content.text || '',
      finishReason: this.mapFinishReason(candidate.finishReason),
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      functionCall: content.functionCall ? {
        name: content.functionCall.name,
        arguments: JSON.stringify(content.functionCall.args),
      } : undefined,
    }
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const model = options.model || 'text-embedding-004'
    const inputs = Array.isArray(options.input) ? options.input : [options.input]
    
    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}:predict`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({
        instances: inputs.map(text => ({ content: text })),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Vertex AI Embeddings error: ${error}`)
    }

    const data = await response.json()
    const embeddings = data.predictions.map((p: any) => p.embeddings.values)

    return {
      provider: 'google-vertex',
      model,
      embeddings,
      dimensions: embeddings[0].length,
      usage: { totalTokens: 0 },
    }
  }

  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
    const model = options.model || 'gemini-1.5-pro'
    const endpoint = this.getEndpoint(model)
    const contents = this.convertMessages(options.messages)

    const response = await fetch(`${endpoint}:streamGenerateContent?alt=sse`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Vertex AI streaming error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '))

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6))
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) yield text
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  private getEndpoint(model: string): string {
    return `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model}`
  }

  private convertMessages(messages: ChatMessage[]): Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }> {
    const result: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    
    let systemPrefix = ''
    const systemMsg = messages.find(m => m.role === 'system')
    if (systemMsg) {
      systemPrefix = systemMsg.content + '\n\n'
    }

    let firstUser = true
    for (const msg of messages) {
      if (msg.role === 'system') continue
      
      const role = msg.role === 'user' ? 'user' : 'model'
      let content = msg.content

      if (role === 'user' && firstUser && systemPrefix) {
        content = systemPrefix + content
        firstUser = false
      }

      result.push({
        role,
        parts: [{ text: content }],
      })
    }

    return result
  }

  private mapFinishReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'STOP': return 'stop'
      case 'MAX_TOKENS': return 'length'
      case 'SAFETY': return 'content_filter'
      default: return 'stop'
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    // In production, use google-auth-library to get access token
    const token = this.accessToken || await this.getAccessToken()
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  private async getAccessToken(): Promise<string> {
    // Placeholder - in production use:
    // const {GoogleAuth} = require('google-auth-library')
    // const auth = new GoogleAuth()
    // const client = await auth.getClient()
    // const token = await client.getAccessToken()
    return this.accessToken || ''
  }
}
