/**
 * Search Session Memory - Feb 2026
 * 
 * Persistent memory for search sessions with:
 * - Search history tracking
 * - Conversational context
 * - Related entity tracking
 * - Session continuity
 * - Cross-session user interests (localStorage)
 * - AI context building
 */

import type { SearchIntent } from "./intent-parser"

// =============================================================================
// TYPES
// =============================================================================

export interface SearchEntry {
  id: string
  query: string
  timestamp: Date
  results: {
    speciesCount: number
    compoundCount: number
    researchCount: number
  }
  selectedItems: string[] // IDs of items user clicked
}

export interface ConversationEntry {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  context?: string
}

export interface EntityContext {
  id: string
  type: "species" | "compound" | "research" | "taxonomy"
  name: string
  addedAt: Date
  interactions: number
}

export interface SearchSession {
  id: string
  startedAt: Date
  lastActiveAt: Date
  searches: SearchEntry[]
  conversations: ConversationEntry[]
  activeEntities: EntityContext[]
  preferences: {
    preferredTypes: string[]
    lastViewedSpecies: string[]
    lastViewedCompounds: string[]
  }
}

// Session storage key
const SESSION_KEY = "mycosoft_search_session"
const MAX_SEARCHES = 50
const MAX_CONVERSATIONS = 100
const MAX_ENTITIES = 20

/**
 * Search Session Memory Manager
 */
class SearchSessionMemory {
  private session: SearchSession
  private saveDebounceTimer: NodeJS.Timeout | null = null

  constructor() {
    this.session = this.loadOrCreateSession()
  }

  // Load existing session or create new one
  private loadOrCreateSession(): SearchSession {
    if (typeof window === "undefined") {
      return this.createNewSession()
    }

    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Rehydrate dates
        return {
          ...parsed,
          startedAt: new Date(parsed.startedAt),
          lastActiveAt: new Date(parsed.lastActiveAt),
          searches: parsed.searches.map((s: any) => ({
            ...s,
            timestamp: new Date(s.timestamp),
          })),
          conversations: parsed.conversations.map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
          })),
          activeEntities: parsed.activeEntities.map((e: any) => ({
            ...e,
            addedAt: new Date(e.addedAt),
          })),
        }
      }
    } catch (error) {
      console.warn("Failed to load search session:", error)
    }

    return this.createNewSession()
  }

  private createNewSession(): SearchSession {
    return {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startedAt: new Date(),
      lastActiveAt: new Date(),
      searches: [],
      conversations: [],
      activeEntities: [],
      preferences: {
        preferredTypes: [],
        lastViewedSpecies: [],
        lastViewedCompounds: [],
      },
    }
  }

  // Save session to storage (debounced)
  private saveSession(): void {
    if (typeof window === "undefined") return

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session))
      } catch (error) {
        console.warn("Failed to save search session:", error)
      }
    }, 500)
  }

  // Update activity timestamp
  private touch(): void {
    this.session.lastActiveAt = new Date()
    this.saveSession()
  }

  // ===== Search History =====

  /**
   * Add a search to history
   */
  addSearch(
    query: string,
    results: { speciesCount: number; compoundCount: number; researchCount: number }
  ): string {
    const entry: SearchEntry = {
      id: `search-${Date.now()}`,
      query,
      timestamp: new Date(),
      results,
      selectedItems: [],
    }

    this.session.searches.push(entry)

    // Trim to max size
    if (this.session.searches.length > MAX_SEARCHES) {
      this.session.searches = this.session.searches.slice(-MAX_SEARCHES)
    }

    this.touch()
    return entry.id
  }

  /**
   * Track item selection from search results
   */
  trackSelection(searchId: string, itemId: string): void {
    const search = this.session.searches.find((s) => s.id === searchId)
    if (search && !search.selectedItems.includes(itemId)) {
      search.selectedItems.push(itemId)
      this.touch()
    }
  }

  /**
   * Get recent searches
   */
  getRecentSearches(limit = 10): SearchEntry[] {
    return this.session.searches.slice(-limit).reverse()
  }

  /**
   * Get search suggestions based on history
   */
  getSearchSuggestions(currentQuery: string): string[] {
    if (!currentQuery.trim()) return []

    const normalizedQuery = currentQuery.toLowerCase()
    const suggestions = new Set<string>()

    // Find matching past queries
    this.session.searches.forEach((search) => {
      if (
        search.query.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(search.query.toLowerCase())
      ) {
        suggestions.add(search.query)
      }
    })

    return Array.from(suggestions).slice(0, 5)
  }

  // ===== Conversation History =====

  /**
   * Add conversation message
   */
  addConversation(
    role: "user" | "assistant",
    content: string,
    context?: string
  ): string {
    const entry: ConversationEntry = {
      id: `conv-${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
      context,
    }

    this.session.conversations.push(entry)

    // Trim to max size
    if (this.session.conversations.length > MAX_CONVERSATIONS) {
      this.session.conversations = this.session.conversations.slice(-MAX_CONVERSATIONS)
    }

    this.touch()
    return entry.id
  }

  /**
   * Get conversation history
   */
  getConversationHistory(limit = 20): ConversationEntry[] {
    return this.session.conversations.slice(-limit)
  }

  /**
   * Get formatted conversation for AI context
   */
  getConversationContext(limit = 10): Array<{ role: string; content: string }> {
    return this.session.conversations.slice(-limit).map((c) => ({
      role: c.role,
      content: c.content,
    }))
  }

  // ===== Entity Context =====

  /**
   * Add or update entity in active context
   */
  addEntity(
    id: string,
    type: EntityContext["type"],
    name: string
  ): void {
    const existing = this.session.activeEntities.find((e) => e.id === id)

    if (existing) {
      existing.interactions++
    } else {
      this.session.activeEntities.push({
        id,
        type,
        name,
        addedAt: new Date(),
        interactions: 1,
      })

      // Trim to max size (remove least interacted)
      if (this.session.activeEntities.length > MAX_ENTITIES) {
        this.session.activeEntities.sort((a, b) => a.interactions - b.interactions)
        this.session.activeEntities = this.session.activeEntities.slice(-MAX_ENTITIES)
      }
    }

    // Update preferences
    if (type === "species") {
      this.session.preferences.lastViewedSpecies = [
        id,
        ...this.session.preferences.lastViewedSpecies.filter((s) => s !== id),
      ].slice(0, 10)
    } else if (type === "compound") {
      this.session.preferences.lastViewedCompounds = [
        id,
        ...this.session.preferences.lastViewedCompounds.filter((s) => s !== id),
      ].slice(0, 10)
    }

    this.touch()
  }

  /**
   * Get active entities for context
   */
  getActiveEntities(): EntityContext[] {
    return [...this.session.activeEntities].sort(
      (a, b) => b.interactions - a.interactions
    )
  }

  /**
   * Build context summary for AI
   */
  buildContextSummary(): string {
    const parts: string[] = []

    // Recent searches
    const recentSearches = this.getRecentSearches(3)
    if (recentSearches.length > 0) {
      parts.push(
        `Recent searches: ${recentSearches.map((s) => s.query).join(", ")}`
      )
    }

    // Active entities
    const entities = this.getActiveEntities().slice(0, 5)
    if (entities.length > 0) {
      parts.push(
        `Currently exploring: ${entities.map((e) => `${e.name} (${e.type})`).join(", ")}`
      )
    }

    return parts.join("\n")
  }

  // ===== Session Management =====

  /**
   * Get current session info
   */
  getSessionInfo(): {
    id: string
    duration: number
    searchCount: number
    conversationCount: number
    entityCount: number
  } {
    return {
      id: this.session.id,
      duration: Date.now() - this.session.startedAt.getTime(),
      searchCount: this.session.searches.length,
      conversationCount: this.session.conversations.length,
      entityCount: this.session.activeEntities.length,
    }
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.session = this.createNewSession()
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }

  /**
   * Export session for persistence/sharing
   */
  exportSession(): string {
    return JSON.stringify(this.session)
  }

  /**
   * Import session
   */
  importSession(data: string): boolean {
    try {
      const parsed = JSON.parse(data)
      this.session = {
        ...parsed,
        startedAt: new Date(parsed.startedAt),
        lastActiveAt: new Date(),
        searches: parsed.searches.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
        })),
        conversations: parsed.conversations.map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp),
        })),
        activeEntities: parsed.activeEntities.map((e: any) => ({
          ...e,
          addedAt: new Date(e.addedAt),
        })),
      }
      this.saveSession()
      return true
    } catch (error) {
      console.error("Failed to import session:", error)
      return false
    }
  }
}

// =============================================================================
// PERSISTENT USER INTERESTS (cross-session via localStorage)
// =============================================================================

const INTERESTS_KEY = "mycosoft_user_interests"
const MAX_INTERESTS = 50

export interface UserInterest {
  topic: string
  category: "species" | "compound" | "research" | "location" | "general"
  score: number // 0-1, increases with interactions
  firstSeen: string
  lastSeen: string
  interactions: number
}

export interface PersistentUserContext {
  interests: UserInterest[]
  topTopics: string[]
  preferredResultTypes: string[]
  exploredAreas: string[]
  searchPatterns: {
    avgQueriesPerSession: number
    prefersToxicityInfo: boolean
    prefersLocationInfo: boolean
    prefersPsychedelicContent: boolean
  }
}

class UserInterestsManager {
  private interests: UserInterest[] = []

  constructor() {
    this.loadInterests()
  }

  private loadInterests(): void {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(INTERESTS_KEY)
      if (stored) {
        this.interests = JSON.parse(stored)
      }
    } catch {
      this.interests = []
    }
  }

  private saveInterests(): void {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(INTERESTS_KEY, JSON.stringify(this.interests))
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Record user interest from a search
   */
  recordInterest(
    topic: string,
    category: UserInterest["category"],
    weight: number = 1
  ): void {
    const now = new Date().toISOString()
    const existing = this.interests.find(
      (i) => i.topic.toLowerCase() === topic.toLowerCase()
    )

    if (existing) {
      existing.interactions++
      existing.lastSeen = now
      // Decay-adjusted score increase
      existing.score = Math.min(1, existing.score + 0.1 * weight)
    } else {
      this.interests.push({
        topic,
        category,
        score: 0.3 * weight,
        firstSeen: now,
        lastSeen: now,
        interactions: 1,
      })
    }

    // Trim and sort by score
    this.interests.sort((a, b) => b.score - a.score)
    this.interests = this.interests.slice(0, MAX_INTERESTS)

    // Decay old interests
    this.decayInterests()
    this.saveInterests()
  }

  /**
   * Apply time-based decay to interest scores
   */
  private decayInterests(): void {
    const now = Date.now()
    this.interests = this.interests.map((interest) => {
      const lastSeen = new Date(interest.lastSeen).getTime()
      const daysSinceLastSeen = (now - lastSeen) / (1000 * 60 * 60 * 24)
      // Decay 5% per day of inactivity
      const decay = Math.pow(0.95, daysSinceLastSeen)
      return {
        ...interest,
        score: interest.score * decay,
      }
    }).filter((i) => i.score > 0.01) // Remove very low scores
  }

  /**
   * Get top interests
   */
  getTopInterests(limit: number = 10): UserInterest[] {
    return this.interests.slice(0, limit)
  }

  /**
   * Get interests by category
   */
  getInterestsByCategory(category: UserInterest["category"]): UserInterest[] {
    return this.interests.filter((i) => i.category === category)
  }

  /**
   * Build AI context from user interests
   */
  buildInterestContext(): string {
    const parts: string[] = []
    
    const topInterests = this.getTopInterests(5)
    if (topInterests.length > 0) {
      parts.push(`User interests: ${topInterests.map((i) => i.topic).join(", ")}`)
    }

    const speciesInterests = this.getInterestsByCategory("species").slice(0, 3)
    if (speciesInterests.length > 0) {
      parts.push(`Favorite species: ${speciesInterests.map((i) => i.topic).join(", ")}`)
    }

    return parts.join(". ")
  }

  /**
   * Record interests from parsed search intent
   */
  recordFromIntent(intent: SearchIntent): void {
    // Record entities as interests
    for (const entity of intent.entities) {
      this.recordInterest(
        entity,
        intent.type === "compound" ? "compound" : "species",
        0.8
      )
    }

    // Record keywords
    for (const keyword of intent.keywords.slice(0, 3)) {
      this.recordInterest(keyword, "general", 0.5)
    }

    // Record location interest if present
    if (intent.filters.location) {
      const locName = intent.filters.location.city || 
                      intent.filters.location.region || 
                      intent.filters.location.state ||
                      "location-based search"
      this.recordInterest(locName, "location", 0.3)
    }
  }

  /**
   * Get user context for personalization
   */
  getUserContext(): PersistentUserContext {
    return {
      interests: this.interests,
      topTopics: this.interests.slice(0, 10).map((i) => i.topic),
      preferredResultTypes: this.inferPreferredResultTypes(),
      exploredAreas: this.getInterestsByCategory("location").map((i) => i.topic),
      searchPatterns: this.inferSearchPatterns(),
    }
  }

  private inferPreferredResultTypes(): string[] {
    const typeCounts: Record<string, number> = {}
    for (const interest of this.interests) {
      typeCounts[interest.category] = (typeCounts[interest.category] || 0) + interest.score
    }
    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)
  }

  private inferSearchPatterns() {
    const topics = this.interests.map((i) => i.topic.toLowerCase()).join(" ")
    return {
      avgQueriesPerSession: this.interests.reduce((sum, i) => sum + i.interactions, 0) / Math.max(1, this.interests.length),
      prefersToxicityInfo: topics.includes("poison") || topics.includes("toxic") || topics.includes("deadly"),
      prefersLocationInfo: this.getInterestsByCategory("location").length > 2,
      prefersPsychedelicContent: topics.includes("psilocybin") || topics.includes("psychedelic") || topics.includes("magic"),
    }
  }

  /**
   * Clear all interests
   */
  clearInterests(): void {
    this.interests = []
    if (typeof window !== "undefined") {
      localStorage.removeItem(INTERESTS_KEY)
    }
  }
}

// Singleton instances
export const searchSessionMemory = new SearchSessionMemory()
export const userInterestsManager = new UserInterestsManager()

// React hook for session memory
export function useSearchSession() {
  return searchSessionMemory
}

// React hook for user interests
export function useUserInterests() {
  return userInterestsManager
}

/**
 * Build complete AI context from session + interests
 */
export function buildCompleteSearchContext(): string {
  const sessionContext = searchSessionMemory.buildContextSummary()
  const interestContext = userInterestsManager.buildInterestContext()
  
  return [sessionContext, interestContext].filter(Boolean).join("\n\n")
}
