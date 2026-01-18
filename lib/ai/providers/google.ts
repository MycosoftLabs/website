/**
 * Google Gemini Provider
 */

import { 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
  ChatMessage
} from './types'

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export class GoogleProvider {
  private apiKey: string
  private baseUrl: string

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY || ''
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const contents = this.convertMessages(options.messages)
    
    const response = await fetch(
      `${this.baseUrl}/models/${options.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google AI error: ${error}`)
    }

    const data = await response.json()
    const candidate = data.candidates[0]
    const content = candidate.content.parts[0]

    // Handle function calls
    const functionCall = content.functionCall ? {
      name: content.functionCall.name,
      arguments: JSON.stringify(content.functionCall.args),
    } : undefined

    return {
      id: `gemini-${Date.now()}`,
      provider: 'google',
      model: options.model,
      content: content.text || '',
      finishReason: this.mapFinishReason(candidate.finishReason),
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      functionCall,
    }
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const inputs = Array.isArray(options.input) ? options.input : [options.input]
    const model = options.model || 'text-embedding-004'

    const embeddings: number[][] = []

    for (const text of inputs) {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text }] },
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Google Embeddings error: ${error}`)
      }

      const data = await response.json()
      embeddings.push(data.embedding.values)
    }

    return {
      provider: 'google',
      model,
      embeddings,
      dimensions: embeddings[0].length,
      usage: { totalTokens: 0 }, // Google doesn't return token count for embeddings
    }
  }

  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
    const contents = this.convertMessages(options.messages)

    const response = await fetch(
      `${this.baseUrl}/models/${options.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Google streaming error: ${response.statusText}`)
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

  private convertMessages(messages: ChatMessage[]): Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }> {
    const result: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    
    // Gemini combines system message with first user message
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
}
