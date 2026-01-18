/**
 * Anthropic Provider
 * 
 * Supports Claude models including Claude Code capabilities
 */

import { 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  ProviderConfig,
  ChatMessage
} from './types'

const DEFAULT_BASE_URL = 'https://api.anthropic.com'
const API_VERSION = '2023-06-01'

export class AnthropicProvider {
  private apiKey: string
  private baseUrl: string

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || ''
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Convert messages format for Anthropic
    const { systemMessage, messages } = this.convertMessages(options.messages)

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        system: systemMessage,
        messages,
        temperature: options.temperature ?? 0.7,
        tools: options.functions?.map(f => ({
          name: f.name,
          description: f.description,
          input_schema: f.parameters,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const data = await response.json()

    // Handle tool use
    const toolUse = data.content.find((c: any) => c.type === 'tool_use')
    const textContent = data.content.find((c: any) => c.type === 'text')

    return {
      id: data.id,
      provider: 'anthropic',
      model: data.model,
      content: textContent?.text || '',
      finishReason: this.mapStopReason(data.stop_reason),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      functionCall: toolUse ? {
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input),
      } : undefined,
    }
  }

  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
    const { systemMessage, messages } = this.convertMessages(options.messages)

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        system: systemMessage,
        messages,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic streaming error: ${response.statusText}`)
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
          if (data.type === 'content_block_delta' && data.delta?.text) {
            yield data.delta.text
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  /**
   * Claude Code / Computer Use capability
   */
  async computerUse(options: {
    model: string
    messages: ChatMessage[]
    computerTool?: boolean
    textEditor?: boolean
    bash?: boolean
  }): Promise<ChatCompletionResponse> {
    const { systemMessage, messages } = this.convertMessages(options.messages)

    const tools: any[] = []
    
    if (options.computerTool) {
      tools.push({
        type: 'computer_20241022',
        name: 'computer',
        display_width_px: 1024,
        display_height_px: 768,
        display_number: 1,
      })
    }
    
    if (options.textEditor) {
      tools.push({
        type: 'text_editor_20241022',
        name: 'str_replace_editor',
      })
    }
    
    if (options.bash) {
      tools.push({
        type: 'bash_20241022',
        name: 'bash',
      })
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'anthropic-beta': 'computer-use-2024-10-22',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: 4096,
        system: systemMessage,
        messages,
        tools,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic Computer Use error: ${error}`)
    }

    const data = await response.json()
    const textContent = data.content.find((c: any) => c.type === 'text')
    const toolUse = data.content.find((c: any) => c.type === 'tool_use')

    return {
      id: data.id,
      provider: 'anthropic',
      model: data.model,
      content: textContent?.text || '',
      finishReason: this.mapStopReason(data.stop_reason),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      functionCall: toolUse ? {
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input),
      } : undefined,
    }
  }

  private convertMessages(messages: ChatMessage[]): {
    systemMessage: string
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  } {
    const systemMsg = messages.find(m => m.role === 'system')
    const otherMsgs = messages.filter(m => m.role !== 'system')

    return {
      systemMessage: systemMsg?.content || '',
      messages: otherMsgs.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    }
  }

  private mapStopReason(reason: string): 'stop' | 'length' | 'function_call' | 'content_filter' {
    switch (reason) {
      case 'end_turn': return 'stop'
      case 'max_tokens': return 'length'
      case 'tool_use': return 'function_call'
      default: return 'stop'
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': API_VERSION,
    }
  }
}
