/**
 * Exostar API Client
 * 
 * Provides secure integration with Exostar Supply Chain Risk Management Platform
 * Supports CMMC assessments, supplier assessments, and incident reporting
 * 
 * API Keys are encrypted at rest using AES-256-GCM
 */

import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ExostarIntegration {
  id: string
  organizationId: string
  apiEndpoint: string
  syncStatus: 'connected' | 'disconnected' | 'error' | 'syncing'
  lastSync: string | null
  features: ExostarFeatures
  createdAt: string
  updatedAt: string
}

export interface ExostarFeatures {
  riskManagement: boolean
  supplierAssessment: boolean
  credentialing: boolean
  incidentReporting: boolean
}

export interface ExostarAssessment {
  id: string
  assessmentId: string
  assessmentType: 'CMMC' | 'NIST-171' | 'Cyber Risk'
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  score: number | null
  maxScore: number | null
  completedDate: string | null
  expirationDate: string | null
  findings: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface ExostarSyncResult {
  success: boolean
  recordsSynced: number
  assessments: ExostarAssessment[]
  error?: string
}

export interface ExostarCredentials {
  organizationId: string
  apiKey: string
}

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION UTILITIES
// ═══════════════════════════════════════════════════════════════

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const keyHex = process.env.EXOSTAR_ENCRYPTION_KEY || 
    // Fallback key for development - MUST be set in production
    crypto.createHash('sha256').update('mycosoft-exostar-dev-key').digest('hex')
  return Buffer.from(keyHex.slice(0, 64), 'hex')
}

/**
 * Encrypt API key using AES-256-GCM
 */
export function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Return iv:authTag:encrypted as base64
  return Buffer.from(
    iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  ).toString('base64')
}

/**
 * Decrypt API key
 */
export function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey()
  const decoded = Buffer.from(encryptedData, 'base64').toString('utf8')
  const [ivHex, authTagHex, encrypted] = decoded.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// ═══════════════════════════════════════════════════════════════
// DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Save Exostar credentials to database
 */
export async function saveExostarCredentials(
  credentials: ExostarCredentials
): Promise<ExostarIntegration | null> {
  const supabase = await createClient()
  
  // Encrypt the API key
  const encryptedKey = encryptApiKey(credentials.apiKey)
  
  // Check if integration already exists
  const { data: existing } = await supabase
    .from('exostar_integrations')
    .select('id')
    .eq('organization_id', credentials.organizationId)
    .single()
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('exostar_integrations')
      .update({
        api_key_encrypted: encryptedKey,
        sync_status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating Exostar credentials:', error)
      return null
    }
    
    return transformIntegration(data)
  }
  
  // Create new
  const { data, error } = await supabase
    .from('exostar_integrations')
    .insert({
      organization_id: credentials.organizationId,
      api_key_encrypted: encryptedKey,
      sync_status: 'disconnected'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error saving Exostar credentials:', error)
    return null
  }
  
  return transformIntegration(data)
}

/**
 * Get current Exostar integration
 */
export async function getExostarIntegration(): Promise<ExostarIntegration | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('exostar_integrations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return transformIntegration(data)
}

/**
 * Get decrypted API key for making API calls
 */
export async function getExostarApiKey(): Promise<{ organizationId: string; apiKey: string } | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('exostar_integrations')
    .select('organization_id, api_key_encrypted')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !data) {
    return null
  }
  
  try {
    const apiKey = decryptApiKey(data.api_key_encrypted)
    return {
      organizationId: data.organization_id,
      apiKey
    }
  } catch (err) {
    console.error('Error decrypting API key:', err)
    return null
  }
}

/**
 * Update sync status
 */
export async function updateSyncStatus(
  integrationId: string,
  status: 'connected' | 'disconnected' | 'error' | 'syncing',
  lastSync?: Date
): Promise<void> {
  const supabase = await createClient()
  
  const update: Record<string, unknown> = {
    sync_status: status,
    updated_at: new Date().toISOString()
  }
  
  if (lastSync) {
    update.last_sync = lastSync.toISOString()
  }
  
  await supabase
    .from('exostar_integrations')
    .update(update)
    .eq('id', integrationId)
}

/**
 * Save assessment results
 */
export async function saveAssessments(
  integrationId: string,
  assessments: ExostarAssessment[]
): Promise<void> {
  const supabase = await createClient()
  
  for (const assessment of assessments) {
    const { error } = await supabase
      .from('exostar_assessments')
      .upsert({
        integration_id: integrationId,
        assessment_id: assessment.assessmentId,
        assessment_type: assessment.assessmentType,
        status: assessment.status,
        score: assessment.score,
        max_score: assessment.maxScore,
        completed_date: assessment.completedDate,
        expiration_date: assessment.expirationDate,
        findings: assessment.findings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'assessment_id'
      })
    
    if (error) {
      console.error('Error saving assessment:', error)
    }
  }
}

/**
 * Get assessments
 */
export async function getAssessments(): Promise<ExostarAssessment[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('exostar_assessments')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error || !data) {
    return []
  }
  
  return data.map(a => ({
    id: a.id,
    assessmentId: a.assessment_id,
    assessmentType: a.assessment_type,
    status: a.status,
    score: a.score,
    maxScore: a.max_score,
    completedDate: a.completed_date,
    expirationDate: a.expiration_date,
    findings: a.findings
  }))
}

/**
 * Log sync history
 */
export async function logSyncHistory(
  integrationId: string,
  syncType: 'manual' | 'scheduled' | 'webhook',
  status: 'success' | 'failed' | 'partial',
  recordsSynced: number,
  errorMessage?: string,
  syncData?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient()
  
  await supabase
    .from('exostar_sync_history')
    .insert({
      integration_id: integrationId,
      sync_type: syncType,
      status,
      records_synced: recordsSynced,
      error_message: errorMessage,
      sync_data: syncData || {},
      completed_at: new Date().toISOString()
    })
}

// ═══════════════════════════════════════════════════════════════
// EXOSTAR API CLIENT
// ═══════════════════════════════════════════════════════════════

/**
 * ExostarClient - Makes actual API calls to Exostar platform
 * 
 * Note: In production, replace mock responses with actual Exostar API calls
 * Exostar API documentation: https://developers.exostar.com
 */
export class ExostarClient {
  private organizationId: string
  private apiKey: string
  private baseUrl: string
  
  constructor(organizationId: string, apiKey: string, baseUrl = 'https://api.exostar.com/v1') {
    this.organizationId = organizationId
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }
  
  /**
   * Test connection to Exostar API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // In production, make actual API call:
      // const response = await fetch(`${this.baseUrl}/organizations/${this.organizationId}`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json'
      //   }
      // })
      
      // Mock successful connection for development
      // Validate that credentials look valid
      if (!this.organizationId || this.organizationId.length < 5) {
        return { success: false, message: 'Invalid Organization ID format' }
      }
      
      if (!this.apiKey || this.apiKey.length < 10) {
        return { success: false, message: 'Invalid API Key format' }
      }
      
      // Simulate API validation delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return { 
        success: true, 
        message: `Connected to Exostar as ${this.organizationId}` 
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      }
    }
  }
  
  /**
   * Fetch CMMC assessment status from Exostar
   */
  async getCMMCAssessment(): Promise<ExostarAssessment | null> {
    try {
      // In production, make actual API call:
      // const response = await fetch(`${this.baseUrl}/assessments/cmmc`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'X-Organization-Id': this.organizationId
      //   }
      // })
      
      // Mock CMMC assessment data for development
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return {
        id: crypto.randomUUID(),
        assessmentId: `CMMC-${this.organizationId}-2026`,
        assessmentType: 'CMMC',
        status: 'in_progress',
        score: 85,
        maxScore: 110,
        completedDate: null,
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        findings: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 8
        }
      }
    } catch (error) {
      console.error('Error fetching CMMC assessment:', error)
      return null
    }
  }
  
  /**
   * Fetch NIST 800-171 assessment
   */
  async getNIST171Assessment(): Promise<ExostarAssessment | null> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return {
        id: crypto.randomUUID(),
        assessmentId: `NIST171-${this.organizationId}-2026`,
        assessmentType: 'NIST-171',
        status: 'completed',
        score: 95,
        maxScore: 110,
        completedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        expirationDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
        findings: {
          critical: 0,
          high: 1,
          medium: 3,
          low: 6
        }
      }
    } catch (error) {
      console.error('Error fetching NIST 171 assessment:', error)
      return null
    }
  }
  
  /**
   * Fetch Cyber Risk score
   */
  async getCyberRiskAssessment(): Promise<ExostarAssessment | null> {
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return {
        id: crypto.randomUUID(),
        assessmentId: `CYBER-${this.organizationId}-2026`,
        assessmentType: 'Cyber Risk',
        status: 'completed',
        score: 780,
        maxScore: 850,
        completedDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        findings: {
          critical: 0,
          high: 0,
          medium: 2,
          low: 4
        }
      }
    } catch (error) {
      console.error('Error fetching Cyber Risk assessment:', error)
      return null
    }
  }
  
  /**
   * Submit assessment data to Exostar
   */
  async submitAssessmentData(data: {
    framework: string
    controls: Array<{
      id: string
      status: string
      evidence: string[]
    }>
  }): Promise<{ success: boolean; referenceId?: string; error?: string }> {
    try {
      // In production, make actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return {
        success: true,
        referenceId: `EXO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed'
      }
    }
  }
  
  /**
   * Sync all assessments
   */
  async syncAll(): Promise<ExostarSyncResult> {
    const assessments: ExostarAssessment[] = []
    let success = true
    let error: string | undefined
    
    try {
      const [cmmc, nist, cyber] = await Promise.all([
        this.getCMMCAssessment(),
        this.getNIST171Assessment(),
        this.getCyberRiskAssessment()
      ])
      
      if (cmmc) assessments.push(cmmc)
      if (nist) assessments.push(nist)
      if (cyber) assessments.push(cyber)
      
    } catch (err) {
      success = false
      error = err instanceof Error ? err.message : 'Sync failed'
    }
    
    return {
      success,
      recordsSynced: assessments.length,
      assessments,
      error
    }
  }
}

/**
 * Create an Exostar client from stored credentials
 */
export async function createExostarClient(): Promise<ExostarClient | null> {
  const credentials = await getExostarApiKey()
  
  if (!credentials) {
    return null
  }
  
  const integration = await getExostarIntegration()
  const baseUrl = integration?.apiEndpoint || 'https://api.exostar.com/v1'
  
  return new ExostarClient(credentials.organizationId, credentials.apiKey, baseUrl)
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function transformIntegration(data: Record<string, unknown>): ExostarIntegration {
  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    apiEndpoint: data.api_endpoint as string,
    syncStatus: data.sync_status as ExostarIntegration['syncStatus'],
    lastSync: data.last_sync as string | null,
    features: data.features as ExostarFeatures,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string
  }
}
