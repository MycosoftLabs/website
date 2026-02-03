import { NextRequest, NextResponse } from "next/server"

/**
 * Memory API v2.0 - Scoped Memory with Namespace Support
 * 
 * Created: February 3, 2026
 * Updated: February 3, 2026 - Added scope/namespace, safer deletion
 * 
 * ARCHITECTURE PRINCIPLE:
 * - Memory is NAMESPACED by scope (conversation, agent, system, user)
 * - Deletion requires explicit scope + namespace_id
 * - Summarization is a separate action (not a side effect of GET)
 * 
 * Stores voice conversation history, context, and user preferences
 * for long-term and short-term memory integration with MYCA
 */

// ============================================================================
// Types
// ============================================================================

export type MemoryScope = "conversation" | "agent" | "system" | "user"

export interface MemoryEntry {
  scope: MemoryScope
  namespace_id: string       // conversation_id, agent_id, user_id, or "global"
  key: string
  value: unknown
  type: string               // e.g., "voice_session", "preference", "context"
  created_at: string
  updated_at: string
  expires_at?: string        // Optional TTL
  metadata?: Record<string, unknown>
}

// ============================================================================
// In-Memory Storage (replace with Redis/Supabase in production)
// ============================================================================

// Main memory store: Map<fullKey, MemoryEntry>
// Full key format: "${scope}:${namespace_id}:${key}"
const memoryStore = new Map<string, MemoryEntry>()

// Short-term memory (session context, last 10 items per scope+namespace)
const shortTermMemory = new Map<string, MemoryEntry[]>()

// Long-term memory persistence threshold (items older than this move to long-term)
const LONG_TERM_THRESHOLD = 1000 * 60 * 60 // 1 hour

// ============================================================================
// Helper Functions
// ============================================================================

function createFullKey(scope: MemoryScope, namespaceId: string, key: string): string {
  return `${scope}:${namespaceId}:${key}`
}

function createShortTermKey(scope: MemoryScope, namespaceId: string): string {
  return `stm:${scope}:${namespaceId}`
}

function isValidScope(scope: string): scope is MemoryScope {
  return ["conversation", "agent", "system", "user"].includes(scope)
}

/**
 * GET /api/memory
 * 
 * Query params:
 * - scope: conversation | agent | system | user (required for scoped queries)
 * - namespace_id: The namespace to search in
 * - key: Specific key to retrieve
 * - type: Filter by type (e.g., "voice_session")
 * - limit: Max items to return (default 10)
 * 
 * Legacy support: If no scope provided, searches all scopes
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope")
  const namespaceId = searchParams.get("namespace_id")
  const key = searchParams.get("key")
  const type = searchParams.get("type")
  const limit = parseInt(searchParams.get("limit") || "10")
  
  // Scoped key lookup
  if (scope && namespaceId && key) {
    if (!isValidScope(scope)) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 })
    }
    const fullKey = createFullKey(scope, namespaceId, key)
    const entry = memoryStore.get(fullKey)
    if (entry) {
      return NextResponse.json(entry)
    }
    return NextResponse.json({ error: "Key not found" }, { status: 404 })
  }
  
  // Legacy key lookup (searches all)
  if (key && !scope) {
    // Search all entries for matching key
    const matches: MemoryEntry[] = []
    memoryStore.forEach((entry) => {
      if (entry.key === key) {
        matches.push(entry)
      }
    })
    if (matches.length > 0) {
      return NextResponse.json({ items: matches, total: matches.length })
    }
    return NextResponse.json({ error: "Key not found" }, { status: 404 })
  }
  
  // Scoped listing
  if (scope && namespaceId) {
    if (!isValidScope(scope)) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 })
    }
    const prefix = `${scope}:${namespaceId}:`
    const items: MemoryEntry[] = []
    memoryStore.forEach((entry, fullKey) => {
      if (fullKey.startsWith(prefix)) {
        if (!type || entry.type === type) {
          items.push(entry)
        }
      }
    })
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json({ items: items.slice(0, limit), total: items.length, scope, namespace_id: namespaceId })
  }
  
  // Type filter across all scopes
  if (type) {
    const items: MemoryEntry[] = []
    memoryStore.forEach((entry) => {
      if (entry.type === type) {
        items.push(entry)
      }
    })
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return NextResponse.json({ items: items.slice(0, limit), total: items.length })
  }
  
  // Get all items (limited for safety)
  const items: MemoryEntry[] = []
  memoryStore.forEach((entry) => {
    items.push(entry)
  })
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return NextResponse.json({ items: items.slice(0, limit), total: items.length })
}

/**
 * POST /api/memory
 * 
 * Body:
 * - scope: conversation | agent | system | user (default: "conversation")
 * - namespace_id: Required - the namespace (conversation_id, agent_id, etc.)
 * - key: The key within the namespace
 * - value: The value to store
 * - type: Entry type (e.g., "voice_session", "preference")
 * - expires_at: Optional TTL timestamp
 * - metadata: Optional additional metadata
 * 
 * Legacy support: If no scope/namespace provided, uses "conversation" scope with key as namespace
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      key, 
      value, 
      type = "general",
      scope = "conversation",
      namespace_id,
      expires_at,
      metadata,
    } = body
    
    if (value === undefined) {
      return NextResponse.json({ error: "value is required" }, { status: 400 })
    }
    
    if (!isValidScope(scope)) {
      return NextResponse.json({ error: "Invalid scope. Must be: conversation, agent, system, or user" }, { status: 400 })
    }
    
    // Determine namespace_id (legacy support)
    const effectiveNamespaceId = namespace_id || `legacy_${Date.now()}`
    const effectiveKey = key || `entry_${Date.now()}`
    
    const now = new Date().toISOString()
    
    const entry: MemoryEntry = {
      scope,
      namespace_id: effectiveNamespaceId,
      key: effectiveKey,
      value,
      type,
      created_at: now,
      updated_at: now,
      expires_at,
      metadata,
    }
    
    // Store in memory
    const fullKey = createFullKey(scope, effectiveNamespaceId, effectiveKey)
    memoryStore.set(fullKey, entry)
    
    // Also add to short-term memory for quick context retrieval
    const stmKey = createShortTermKey(scope, effectiveNamespaceId)
    if (!shortTermMemory.has(stmKey)) {
      shortTermMemory.set(stmKey, [])
    }
    const stm = shortTermMemory.get(stmKey)!
    stm.unshift(entry)
    
    // Keep only last 10 items in short-term memory
    while (stm.length > 10) {
      stm.pop()
    }
    
    // Log for debugging
    console.log(`[Memory] Stored: ${fullKey} (type=${type}, scope=${scope})`)
    
    return NextResponse.json({ 
      success: true, 
      full_key: fullKey,
      scope,
      namespace_id: effectiveNamespaceId,
      key: effectiveKey,
      created_at: now,
      short_term_count: stm.length,
      total_count: memoryStore.size,
    })
  } catch (error) {
    console.error("[Memory] Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * DELETE /api/memory
 * 
 * SAFETY: Deletion now requires explicit scope + namespace_id.
 * This prevents accidental broad deletion.
 * 
 * Query params:
 * - scope: Required (conversation, agent, system, user)
 * - namespace_id: Required - the namespace to delete from
 * - key: Optional - specific key to delete. If omitted, deletes entire namespace.
 * - confirm: Required for namespace-wide deletion (must be "true")
 * 
 * Special admin params (use with caution):
 * - clear_all: Clears ALL memory (requires confirm="DELETE_ALL_MEMORY")
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const scope = searchParams.get("scope")
  const namespaceId = searchParams.get("namespace_id")
  const key = searchParams.get("key")
  const confirm = searchParams.get("confirm")
  const clearAll = searchParams.get("clear_all")
  
  // DANGER: Clear all memory (requires special confirmation)
  if (clearAll === "true") {
    if (confirm !== "DELETE_ALL_MEMORY") {
      return NextResponse.json({ 
        error: "To clear all memory, set confirm=DELETE_ALL_MEMORY",
        warning: "This will delete ALL stored memory permanently."
      }, { status: 400 })
    }
    const count = memoryStore.size
    memoryStore.clear()
    shortTermMemory.clear()
    console.log(`[Memory] ADMIN: Cleared all memory (${count} entries)`)
    return NextResponse.json({ success: true, message: "All memory cleared", deleted: count })
  }
  
  // Require scope for any deletion
  if (!scope) {
    return NextResponse.json({ 
      error: "scope is required for deletion (conversation, agent, system, user)",
      hint: "This prevents accidental broad deletion. Specify the scope explicitly."
    }, { status: 400 })
  }
  
  if (!isValidScope(scope)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 })
  }
  
  // Require namespace_id
  if (!namespaceId) {
    return NextResponse.json({ 
      error: "namespace_id is required for deletion",
      hint: "Specify the namespace_id (e.g., conversation_id, agent_id)"
    }, { status: 400 })
  }
  
  // Delete specific key within namespace
  if (key) {
    const fullKey = createFullKey(scope, namespaceId, key)
    const deleted = memoryStore.delete(fullKey)
    console.log(`[Memory] Deleted: ${fullKey} (success=${deleted})`)
    return NextResponse.json({ 
      success: deleted, 
      scope, 
      namespace_id: namespaceId, 
      key,
      full_key: fullKey,
    })
  }
  
  // Delete entire namespace (requires confirmation)
  if (confirm !== "true") {
    // Count entries that would be deleted
    const prefix = `${scope}:${namespaceId}:`
    let count = 0
    memoryStore.forEach((_, fullKey) => {
      if (fullKey.startsWith(prefix)) count++
    })
    
    return NextResponse.json({ 
      error: "Namespace deletion requires confirm=true",
      scope,
      namespace_id: namespaceId,
      entries_to_delete: count,
      hint: "Add confirm=true to the query to proceed with deletion"
    }, { status: 400 })
  }
  
  // Delete all entries in namespace
  const prefix = `${scope}:${namespaceId}:`
  let deletedCount = 0
  const keysToDelete: string[] = []
  
  memoryStore.forEach((_, fullKey) => {
    if (fullKey.startsWith(prefix)) {
      keysToDelete.push(fullKey)
    }
  })
  
  keysToDelete.forEach(fullKey => {
    memoryStore.delete(fullKey)
    deletedCount++
  })
  
  // Also clear short-term memory for this namespace
  const stmKey = createShortTermKey(scope, namespaceId)
  shortTermMemory.delete(stmKey)
  
  console.log(`[Memory] Deleted namespace: ${scope}:${namespaceId} (${deletedCount} entries)`)
  
  return NextResponse.json({ 
    success: true, 
    scope, 
    namespace_id: namespaceId, 
    deleted: deletedCount,
  })
}

/**
 * PUT /api/memory
 * 
 * Special operations on memory (context retrieval, summarization)
 * 
 * Body:
 * - action: "get_context" | "summarize"
 * - scope: conversation | agent | system | user (default: "conversation")
 * - namespace_id: Required - the namespace to operate on
 * - limit: Max entries for context (default: 10)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action, 
      scope = "conversation",
      namespace_id,
      limit = 10,
    } = body
    
    if (!action) {
      return NextResponse.json({ error: "action is required (get_context, summarize)" }, { status: 400 })
    }
    
    if (!isValidScope(scope)) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 })
    }
    
    if (action === "get_context") {
      // Return recent short-term memory for context
      if (namespace_id) {
        const stmKey = createShortTermKey(scope, namespace_id)
        const stm = shortTermMemory.get(stmKey) || []
        
        return NextResponse.json({
          context: stm.slice(0, limit),
          count: stm.length,
          scope,
          namespace_id,
        })
      }
      
      // Get context across all namespaces for a scope
      const allContext: MemoryEntry[] = []
      shortTermMemory.forEach((entries, key) => {
        if (key.startsWith(`stm:${scope}:`)) {
          allContext.push(...entries)
        }
      })
      allContext.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      return NextResponse.json({
        context: allContext.slice(0, limit),
        count: allContext.length,
        scope,
      })
    }
    
    if (action === "summarize") {
      // Get entries to summarize
      const entries: MemoryEntry[] = []
      
      if (namespace_id) {
        const stmKey = createShortTermKey(scope, namespace_id)
        const stm = shortTermMemory.get(stmKey) || []
        entries.push(...stm)
      } else {
        shortTermMemory.forEach((stm, key) => {
          if (key.startsWith(`stm:${scope}:`)) {
            entries.push(...stm)
          }
        })
      }
      
      // Sort by date
      entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      // Create summary (in production, this would call an LLM)
      const summary = entries.slice(0, limit).map(entry => {
        const val = entry.value as Record<string, unknown>
        if (val?.input && val?.output) {
          return `User: ${String(val.input).substring(0, 50)}... MYCA: ${String(val.output).substring(0, 50)}...`
        }
        return JSON.stringify(entry.value).substring(0, 100)
      }).join("\n")
      
      return NextResponse.json({
        summary,
        item_count: entries.length,
        scope,
        namespace_id: namespace_id || "(all)",
      })
    }
    
    return NextResponse.json({ 
      error: "Invalid action. Valid actions: get_context, summarize" 
    }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
