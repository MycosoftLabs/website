/**
 * API Route: Chat with RAG (Retrieval Augmented Generation)
 * 
 * Uses LangChain with Supabase vector store for context-aware chat
 */

import { NextRequest, NextResponse } from 'next/server'
import { similaritySearch } from '@/lib/ai/langchain-setup'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { message, conversation_id, table = 'documents' } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Perform semantic search to get relevant context
    const relevantDocs = await similaritySearch(message, 4, { tableName: table as 'documents' | 'species' })

    // Build context from retrieved documents
    const context = relevantDocs
      .map((doc) => doc.pageContent)
      .join('\n\n')

    // TODO: Integrate with your LLM (OpenAI, Anthropic, etc.)
    // For now, return the context
    // In production, you would:
    // 1. Create a prompt with the context
    // 2. Call your LLM
    // 3. Return the response

    return NextResponse.json({
      success: true,
      message,
      context: relevantDocs,
      response: `Based on the context, here's a response to: ${message}`,
      // In production, this would be the LLM response
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
