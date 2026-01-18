/**
 * LangChain Integration with Supabase Vector Store
 * 
 * Sets up LangChain to use Supabase as a vector store for RAG
 */

import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createClient } from '@supabase/supabase-js'
import { Document } from '@langchain/core/documents'

// Lazy initialization to avoid build-time errors
let supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (supabase) return supabase
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }
  
  supabase = createClient(supabaseUrl, supabaseKey)
  return supabase
}

function getOpenAIApiKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new Error('OpenAI API key required for embeddings')
  }
  return key
}

/**
 * Create Supabase vector store for documents
 */
export function createDocumentVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: getOpenAIApiKey(),
    modelName: 'text-embedding-3-small',
  })
  
  return SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: getSupabaseClient(),
    tableName: 'documents',
    queryName: 'match_documents',
  })
}

/**
 * Create Supabase vector store for species
 */
export function createSpeciesVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: getOpenAIApiKey(),
    modelName: 'text-embedding-3-small',
  })
  
  return SupabaseVectorStore.fromExistingIndex(embeddings, {
    client: getSupabaseClient(),
    tableName: 'species',
    queryName: 'match_species',
  })
}

/**
 * Add documents to vector store
 */
export async function addDocumentsToStore(
  store: 'documents' | 'species',
  documents: Document[]
) {
  const vectorStore = store === 'documents' 
    ? createDocumentVectorStore()
    : createSpeciesVectorStore()
  
  await vectorStore.addDocuments(documents)
  return { success: true, count: documents.length }
}

/**
 * Similarity search in vector store
 */
export async function similaritySearch(
  store: 'documents' | 'species',
  query: string,
  k: number = 5,
  threshold: number = 0.7
) {
  const vectorStore = store === 'documents'
    ? createDocumentVectorStore()
    : createSpeciesVectorStore()
  
  const results = await vectorStore.similaritySearchWithScore(query, k)
  
  // Filter by threshold
  return results
    .filter(([_, score]) => score >= threshold)
    .map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      similarity: score,
    }))
}

/**
 * Create retriever for RAG
 */
export function createRetriever(
  store: 'documents' | 'species',
  k: number = 5,
  threshold: number = 0.7
) {
  const vectorStore = store === 'documents'
    ? createDocumentVectorStore()
    : createSpeciesVectorStore()
  
  return vectorStore.asRetriever({
    k,
    searchType: 'similarity',
    searchKwargs: {
      score_threshold: threshold,
    },
  })
}
