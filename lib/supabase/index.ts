/**
 * Supabase Client Exports
 * @module lib/supabase
 */

// Client-side (use in 'use client' components)
export { createClient, getClient } from './client'

// Server-side (use in Server Components and Route Handlers)
export { createClient as createServerClient, createAdminClient } from './server'

// Middleware helper
export { updateSession } from './middleware'

// Database types
export type { Database, Tables, InsertTables, UpdateTables } from './types'
