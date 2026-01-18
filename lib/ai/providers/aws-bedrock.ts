/**
 * AWS Bedrock Provider
 * 
 * Supports Claude, Llama, Titan, and other models via AWS
 */

import { 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  EmbeddingOptions,
  EmbeddingResponse,
  ProviderConfig,
  ChatMessage
} from './types'

export class AWSBedrockProvider {
  private accessKeyId: string
  private secretAccessKey: string
  private region: string
  private sessionToken?: string

  constructor(config: ProviderConfig) {
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || ''
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''
    this.region = config.region || process.env.AWS_REGION || 'us-east-1'
    this.sessionToken = process.env.AWS_SESSION_TOKEN
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Determine model family for correct request format
    const modelFamily = this.getModelFamily(options.model)
    
    const endpoint = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${options.model}/invoke`
    
    const body = this.formatRequest(options, modelFamily)
    const signedRequest = await this.signRequest('POST', endpoint, body)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: signedRequest.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AWS Bedrock error: ${error}`)
    }

    const data = await response.json()
    return this.parseResponse(data, options.model, modelFamily)
  }

  async embed(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const model = options.model || 'amazon.titan-embed-text-v2:0'
    const inputs = Array.isArray(options.input) ? options.input : [options.input]
    
    const embeddings: number[][] = []
    
    for (const text of inputs) {
      const endpoint = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${model}/invoke`
      
      const body = { inputText: text }
      const signedRequest = await this.signRequest('POST', endpoint, body)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: signedRequest.headers,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`AWS Bedrock Embeddings error: ${error}`)
      }

      const data = await response.json()
      embeddings.push(data.embedding)
    }

    return {
      provider: 'aws-bedrock',
      model,
      embeddings,
      dimensions: embeddings[0].length,
      usage: { totalTokens: 0 },
    }
  }

  private getModelFamily(model: string): 'anthropic' | 'meta' | 'amazon' | 'mistral' {
    if (model.startsWith('anthropic.')) return 'anthropic'
    if (model.startsWith('meta.')) return 'meta'
    if (model.startsWith('amazon.')) return 'amazon'
    if (model.startsWith('mistral.')) return 'mistral'
    return 'anthropic' // Default
  }

  private formatRequest(options: ChatCompletionOptions, family: string): Record<string, unknown> {
    const { systemMessage, messages } = this.convertMessages(options.messages)

    switch (family) {
      case 'anthropic':
        return {
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: options.maxTokens || 4096,
          system: systemMessage,
          messages,
          temperature: options.temperature ?? 0.7,
        }

      case 'meta':
        const prompt = this.formatLlamaPrompt(systemMessage, messages)
        return {
          prompt,
          max_gen_len: options.maxTokens || 2048,
          temperature: options.temperature ?? 0.7,
        }

      case 'amazon':
        return {
          inputText: this.formatTitanPrompt(systemMessage, messages),
          textGenerationConfig: {
            maxTokenCount: options.maxTokens || 2048,
            temperature: options.temperature ?? 0.7,
          },
        }

      default:
        return {
          prompt: this.formatLlamaPrompt(systemMessage, messages),
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature ?? 0.7,
        }
    }
  }

  private parseResponse(data: any, model: string, family: string): ChatCompletionResponse {
    let content = ''
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

    switch (family) {
      case 'anthropic':
        content = data.content?.[0]?.text || ''
        usage = {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        }
        break

      case 'meta':
        content = data.generation || ''
        usage = {
          promptTokens: data.prompt_token_count || 0,
          completionTokens: data.generation_token_count || 0,
          totalTokens: (data.prompt_token_count || 0) + (data.generation_token_count || 0),
        }
        break

      case 'amazon':
        content = data.results?.[0]?.outputText || ''
        usage = {
          promptTokens: data.inputTextTokenCount || 0,
          completionTokens: data.results?.[0]?.tokenCount || 0,
          totalTokens: 0,
        }
        usage.totalTokens = usage.promptTokens + usage.completionTokens
        break
    }

    return {
      id: `bedrock-${Date.now()}`,
      provider: 'aws-bedrock',
      model,
      content,
      finishReason: 'stop',
      usage,
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

  private formatLlamaPrompt(system: string, messages: Array<{ role: string; content: string }>): string {
    let prompt = ''
    if (system) {
      prompt += `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${system}<|eot_id|>`
    }
    for (const msg of messages) {
      prompt += `<|start_header_id|>${msg.role}<|end_header_id|>\n${msg.content}<|eot_id|>`
    }
    prompt += '<|start_header_id|>assistant<|end_header_id|>\n'
    return prompt
  }

  private formatTitanPrompt(system: string, messages: Array<{ role: string; content: string }>): string {
    let prompt = system ? `${system}\n\n` : ''
    for (const msg of messages) {
      const role = msg.role === 'user' ? 'User' : 'Bot'
      prompt += `${role}: ${msg.content}\n`
    }
    prompt += 'Bot: '
    return prompt
  }

  private async signRequest(
    method: string, 
    url: string, 
    body: Record<string, unknown>
  ): Promise<{ headers: HeadersInit }> {
    // AWS Signature V4 signing
    // In production, use @aws-sdk/signature-v4 or AWS SDK
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
    }

    if (this.sessionToken) {
      headers['X-Amz-Security-Token'] = this.sessionToken
    }

    // Note: For production, implement proper AWS SigV4 signing
    // This is a placeholder - use AWS SDK or aws4 library
    return { headers }
  }
}
