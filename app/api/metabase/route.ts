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
const METABASE_PASSWORD = process.env.METABASE_PASSWORD || "Mushroom1!"

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

// Natural language to SQL (placeholder - would use AI)
async function naturalLanguageQuery(question: string): Promise<{ sql: string; explanation: string }> {
  // This would ideally use an LLM to convert natural language to SQL
  // For now, we provide common query patterns
  const lowerQuestion = question.toLowerCase()
  
  let sql = ""
  let explanation = ""
  
  if (lowerQuestion.includes("count") && lowerQuestion.includes("species")) {
    sql = "SELECT COUNT(*) as total_species FROM species"
    explanation = "Counting total species in the database"
  } else if (lowerQuestion.includes("revenue") || lowerQuestion.includes("sales")) {
    sql = "SELECT SUM(amount) as total_revenue, DATE(created_at) as date FROM transactions GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30"
    explanation = "Getting revenue by day for the last 30 days"
  } else if (lowerQuestion.includes("user") && lowerQuestion.includes("count")) {
    sql = "SELECT COUNT(*) as total_users FROM users WHERE active = true"
    explanation = "Counting active users"
  } else if (lowerQuestion.includes("agent") && lowerQuestion.includes("task")) {
    sql = "SELECT agent_id, COUNT(*) as task_count FROM agent_tasks GROUP BY agent_id ORDER BY task_count DESC LIMIT 10"
    explanation = "Getting task counts by agent"
  } else {
    sql = ""
    explanation = "I couldn't determine the right query. Please be more specific about what data you need."
  }
  
  return { sql, explanation }
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
        const { sql, explanation } = await naturalLanguageQuery(naturalQuery)
        
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
          needsClarification: true
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
