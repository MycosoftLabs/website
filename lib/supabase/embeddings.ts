/**
 * Vector Embeddings Utilities for Supabase
 * 
 * Handles generation, storage, and search of vector embeddings
 * using Supabase pgvector extension
 */

import { createClient } from '@/lib/supabase/server'

export interface EmbeddingResult {
  id: string
  content: string
  embedding: number[]
  metadata?: Record<string, any>
  similarity?: number
}

/**
 * Generate embedding for text content
 * Uses OpenAI or Supabase's built-in embeddings
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Option 1: Use OpenAI (requires API key)
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // or 'text-embedding-ada-002'
        input: text,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.data[0].embedding
  }
  
  // Option 2: Use Supabase Edge Function for embeddings
  // This would call a Supabase Edge Function that generates embeddings
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ text }),
  })
  
  if (!response.ok) {
    throw new Error(`Embedding generation error: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.embedding
}

/**
 * Store embedding in Supabase
 */
export async function storeEmbedding(
  table: 'documents' | 'species',
  id: string,
  content: string,
  embedding: number[],
  metadata?: Record<string, any>
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from(table)
    .update({
      content,
      embedding,
      metadata: metadata || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  
  if (error) throw error
  return data
}

/**
 * Semantic search using vector similarity
 */
export async function semanticSearch(
  table: 'documents' | 'species',
  query: string,
  limit: number = 10,
  threshold: number = 0.7
): Promise<EmbeddingResult[]> {
  const supabase = await createClient()
  
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query)
  
  // Perform vector similarity search
  // Using pgvector's cosine similarity operator
  const { data, error } = await supabase.rpc('match_' + table, {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  })
  
  if (error) throw error
  return data || []
}

/**
 * Batch generate and store embeddings
 */
export async function batchGenerateEmbeddings(
  table: 'documents' | 'species',
  items: Array<{ id: string; content: string; metadata?: Record<string, any> }>
) {
  const results = []
  
  for (const item of items) {
    try {
      const embedding = await generateEmbedding(item.content)
      await storeEmbedding(table, item.id, item.content, embedding, item.metadata)
      results.push({ id: item.id, success: true })
    } catch (error) {
      results.push({ id: item.id, success: false, error: String(error) })
    }
  }
  
  return results
}

/**
 * Create vector similarity search function in Supabase
 * This SQL function needs to be created via migration
 */
export const createVectorSearchFunctionSQL = (table: 'documents' | 'species') => `
CREATE OR REPLACE FUNCTION match_${table}(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ${table}.id,
    ${table}.content,
    ${table}.metadata,
    1 - (${table}.embedding <=> query_embedding) as similarity
  FROM ${table}
  WHERE 1 - (${table}.embedding <=> query_embedding) > match_threshold
  ORDER BY ${table}.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`
