/**
 * xAI Grok Provider
 */

import { 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  ProviderConfig 
} from './types'

const DEFAULT_BASE_URL = 'https://api.x.ai/v1'

export class XAIProvider {
  private apiKey: string
  private baseUrl: string

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.XAI_API_KEY || ''
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`xAI API error: ${error}`)
    }

    const data = await response.json()
    const choice = data.choices[0]

    return {
      id: data.id,
      provider: 'xai',
      model: data.model,
      content: choice.message.content || '',
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    }
  }

  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`xAI streaming error: ${response.statusText}`)
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
        const data = line.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices[0]?.delta?.content
          if (content) yield content
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }
  }
}
