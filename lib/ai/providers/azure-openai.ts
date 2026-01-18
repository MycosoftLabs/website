/**
 * Azure OpenAI Provider
 */

import { 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig 
} from './types'

export class AzureOpenAIProvider {
  private apiKey: string
  private endpoint: string
  private apiVersion: string
  private deploymentName: string

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.AZURE_OPENAI_API_KEY || ''
    this.endpoint = config.baseUrl || process.env.AZURE_OPENAI_ENDPOINT || ''
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01'
    this.deploymentName = config.defaultModel || process.env.AZURE_OPENAI_DEPLOYMENT || ''
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const deployment = options.model || this.deploymentName
    const url = `${this.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${this.apiVersion}`

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: false,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        tools: options.functions?.map(f => ({
          type: 'function',
          function: f
        })),
        tool_choice: options.functionCall,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure OpenAI error: ${error}`)
    }

    const data = await response.json()
    const choice = data.choices[0]

    return {
      id: data.id,
      provider: 'azure-openai',
      model: deployment,
      content: choice.message.content || '',
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      functionCall: choice.message.tool_calls?.[0]?.function,
    }
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const deployment = options.model || 'text-embedding-ada-002'
    const url = `${this.endpoint}/openai/deployments/${deployment}/embeddings?api-version=${this.apiVersion}`

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        input: options.input,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Azure OpenAI Embeddings error: ${error}`)
    }

    const data = await response.json()

    return {
      provider: 'azure-openai',
      model: deployment,
      embeddings: data.data.map((d: any) => d.embedding),
      dimensions: data.data[0].embedding.length,
      usage: {
        totalTokens: data.usage.total_tokens,
      },
    }
  }

  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
    const deployment = options.model || this.deploymentName
    const url = `${this.endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${this.apiVersion}`

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Azure OpenAI streaming error: ${response.statusText}`)
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
      'api-key': this.apiKey,
    }
  }
}
