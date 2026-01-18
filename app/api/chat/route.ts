/**
 * API Route: Chat with RAG (Retrieval Augmented Generation)
 * 
 * Uses LangChain with Supabase vector store for context-aware chat
 * NOTE: This route requires SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY at runtime
 */

import { NextRequest, NextResponse } from 'next/server'

// Force dynamic to skip static generation
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Check for required env vars at runtime
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Chat API not configured - missing Supabase credentials' },
        { status: 503 }
      )
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Chat API not configured - missing OpenAI API key' },
        { status: 503 }
      )
    }

    const { message, conversation_id, table = 'documents' } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Dynamic import to avoid build-time issues with LangChain
    const { similaritySearch } = await import('@/lib/ai/langchain-setup')

    // Perform semantic search to get relevant context
    const relevantDocs = await similaritySearch(table as 'documents' | 'species', message, 4)

    // Build context from retrieved documents
    const context = relevantDocs
      .map((doc: { content: string }) => doc.content)
      .join('\n\n')

    return NextResponse.json({
      success: true,
      message,
      context: relevantDocs,
      response: `Based on the context, here's a response to: ${message}`,
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
