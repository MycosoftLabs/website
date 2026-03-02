import { NextRequest, NextResponse } from "next/server"

/**
 * Metabase API Integration for MYCA
 * 
 * This route provides:
 * - Natural language query execution via Metabase
 * - Database insights for MYCA chat
 * - Dashboard embedding support
 * 
 * Date: January 27, 2026
 */

const METABASE_URL = process.env.METABASE_URL || "http://192.168.0.188:3000"
const METABASE_API_KEY = process.env.METABASE_API_KEY || ""
const METABASE_USERNAME = process.env.METABASE_USERNAME || "morgan@mycosoft.org"
const METABASE_PASSWORD = process.env.METABASE_PASSWORD || ""
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

interface MetabaseSession {
  id: string
  expires_at: string
}

let cachedSessionToken: string | null = null
let sessionExpiry: Date | null = null

// Get Metabase session token
async function getSessionToken(): Promise<string | null> {
  // Return cached token if valid
  if (cachedSessionToken && sessionExpiry && new Date() < sessionExpiry) {
    return cachedSessionToken
  }
  
  try {
    const response = await fetch(`${METABASE_URL}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: METABASE_USERNAME,
        password: METABASE_PASSWORD
      })
    })
    
    if (response.ok) {
      const data: MetabaseSession = await response.json()
      cachedSessionToken = data.id
      // Set expiry to 13 days (Metabase sessions expire in 14 days)
      sessionExpiry = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000)
      return cachedSessionToken
    }
  } catch (error) {
    console.error("Metabase session error:", error)
  }
  
  return null
}

// Execute a native query
async function executeQuery(query: string, databaseId: number = 1): Promise<unknown> {
  const sessionToken = await getSessionToken()
  if (!sessionToken) {
    throw new Error("Failed to authenticate with Metabase")
  }
  
  const response = await fetch(`${METABASE_URL}/api/dataset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Metabase-Session": sessionToken
    },
    body: JSON.stringify({
      type: "native",
      native: {
        query: query,
        "template-tags": {}
      },
      database: databaseId
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Metabase query failed: ${error}`)
  }
  
  return response.json()
}

// Get available databases
async function getDatabases(): Promise<unknown[]> {
  const sessionToken = await getSessionToken()
  if (!sessionToken) return []
  
  try {
    const response = await fetch(`${METABASE_URL}/api/database`, {
      headers: { "X-Metabase-Session": sessionToken }
    })
    
    if (response.ok) {
      return response.json()
    }
  } catch (error) {
    console.error("Metabase databases error:", error)
  }
  
  return []
}

// Get saved questions (reports)
async function getSavedQuestions(): Promise<unknown[]> {
  const sessionToken = await getSessionToken()
  if (!sessionToken) return []
  
  try {
    const response = await fetch(`${METABASE_URL}/api/card`, {
      headers: { "X-Metabase-Session": sessionToken }
    })
    
    if (response.ok) {
      return response.json()
    }
  } catch (error) {
    console.error("Metabase cards error:", error)
  }
  
  return []
}

// Execute a saved question by ID
async function executeQuestion(questionId: number): Promise<unknown> {
  const sessionToken = await getSessionToken()
  if (!sessionToken) {
    throw new Error("Failed to authenticate with Metabase")
  }
  
  const response = await fetch(`${METABASE_URL}/api/card/${questionId}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Metabase-Session": sessionToken
    }
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Metabase question failed: ${error}`)
  }
  
  return response.json()
}

// Schema context for LLM (add tables/columns as Metabase schema evolves)
const METABASE_SCHEMA_CONTEXT = `
Common tables: taxa, compounds, observations, genetics, research, users, sessions.
When user asks for counts, aggregations, or analytics, generate appropriate SELECT with COUNT, SUM, GROUP BY.
`

// Natural language to SQL (LLM-backed)
async function naturalLanguageQuery(
  question: string,
  databaseId: number
): Promise<{ sql?: string; explanation: string; needsClarification?: boolean }> {
  const prompt = [
    "You are MYCA, a SQL assistant for Metabase.",
    "Rules:",
    "- Return ONLY JSON with keys: sql, explanation, needsClarification.",
    "- SQL must be a single SELECT statement (no writes, no DDL).",
    "- If the question is ambiguous, set needsClarification=true and leave sql empty.",
    `- Database ID: ${databaseId}.`,
    "- Schema context:" + METABASE_SCHEMA_CONTEXT,
    "",
    `Question: ${question}`,
  ].join("\n")

  try {
    const res = await fetch(`${MAS_API_URL}/voice/brain/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: prompt,
        provider: "auto",
        include_memory_context: false,
        user_id: "metabase-nlq",
        session_id: `metabase-nlq-${Date.now()}`,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      return {
        explanation: "Unable to generate SQL at this time.",
        needsClarification: true,
      }
    }

    const data = await res.json()
    const raw = (data.response || data.message || data.content || "").trim()
    if (!raw) {
      return {
        explanation: "No SQL was generated. Please clarify your question.",
        needsClarification: true,
      }
    }

    const parsed = JSON.parse(raw) as {
      sql?: string
      explanation?: string
      needsClarification?: boolean
    }

    return {
      sql: parsed.sql?.trim(),
      explanation: parsed.explanation || "Generated a SQL query for your request.",
      needsClarification: parsed.needsClarification,
    }
  } catch {
    return {
      explanation: "Unable to generate SQL at this time.",
      needsClarification: true,
    }
  }
}

// GET - Health check and available databases
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  
  try {
    // Check Metabase connectivity
    const healthResponse = await fetch(`${METABASE_URL}/api/health`, {
      signal: AbortSignal.timeout(5000)
    })
    
    const isHealthy = healthResponse.ok
    
    if (action === "databases") {
      const databases = await getDatabases()
      return NextResponse.json({ databases, healthy: isHealthy })
    }
    
    if (action === "questions") {
      const questions = await getSavedQuestions()
      return NextResponse.json({ questions, healthy: isHealthy })
    }
    
    return NextResponse.json({
      status: isHealthy ? "connected" : "unavailable",
      url: METABASE_URL,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: "offline",
      error: "Metabase is not reachable",
      url: METABASE_URL
    }, { status: 503 })
  }
}

// POST - Execute queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, query, questionId, naturalQuery, databaseId } = body
    
    switch (action) {
      case "query":
        // Execute raw SQL query
        if (!query) {
          return NextResponse.json({ error: "Query is required" }, { status: 400 })
        }
        const queryResult = await executeQuery(query, databaseId || 1)
        return NextResponse.json({ result: queryResult, type: "query" })
        
      case "question":
        // Execute a saved question
        if (!questionId) {
          return NextResponse.json({ error: "Question ID is required" }, { status: 400 })
        }
        const questionResult = await executeQuestion(questionId)
        return NextResponse.json({ result: questionResult, type: "question" })
        
      case "natural":
        // Natural language query
        if (!naturalQuery) {
          return NextResponse.json({ error: "Natural query is required" }, { status: 400 })
        }
        const { sql, explanation, needsClarification } = await naturalLanguageQuery(
          naturalQuery,
          databaseId || 1
        )
        
        if (sql) {
          try {
            const nlResult = await executeQuery(sql, databaseId || 1)
            return NextResponse.json({
              result: nlResult,
              sql,
              explanation,
              type: "natural"
            })
          } catch (queryError) {
            return NextResponse.json({
              sql,
              explanation,
              error: "Query generated but execution failed",
              type: "natural"
            })
          }
        }
        
        return NextResponse.json({
          explanation,
          type: "natural",
          needsClarification: needsClarification ?? true
        })
        
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Metabase API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Metabase operation failed" },
      { status: 500 }
    )
  }
}
