/**
 * Exostar Integration API
 * 
 * Endpoints for Exostar SCRM platform integration
 * - Configure credentials
 * - Test connection
 * - Sync assessments
 * - Get status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  saveExostarCredentials,
  getExostarIntegration,
  createExostarClient,
  updateSyncStatus,
  saveAssessments,
  getAssessments,
  logSyncHistory
} from '@/lib/security/exostar-client'

// ═══════════════════════════════════════════════════════════════
// GET - Get Exostar integration status
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const action = request.nextUrl.searchParams.get('action') || 'status'
    
    switch (action) {
      case 'status': {
        const integration = await getExostarIntegration()
        
        if (!integration) {
          return NextResponse.json({
            configured: false,
            syncStatus: 'disconnected',
            message: 'Exostar integration not configured'
          })
        }
        
        return NextResponse.json({
          configured: true,
          organizationId: integration.organizationId,
          syncStatus: integration.syncStatus,
          lastSync: integration.lastSync,
          features: integration.features,
          apiEndpoint: integration.apiEndpoint
        })
      }
      
      case 'assessments': {
        const assessments = await getAssessments()
        return NextResponse.json({ assessments })
      }
      
      case 'history': {
        const integration = await getExostarIntegration()
        if (!integration) {
          return NextResponse.json({ history: [] })
        }
        
        const { data: history } = await supabase
          .from('exostar_sync_history')
          .select('*')
          .eq('integration_id', integration.id)
          .order('started_at', { ascending: false })
          .limit(20)
        
        return NextResponse.json({ history: history || [] })
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Exostar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// POST - Configure, test, or sync Exostar
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const email = user.email || ''
    const isAdmin = profile?.role === 'admin' || 
                    profile?.role === 'security_admin' || 
                    profile?.role === 'super_admin' ||
                    email === 'morgan@mycosoft.org' ||
                    email === 'admin@mycosoft.org' ||
                    email === 'garret@mycosoft.org'
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const action = body.action
    
    switch (action) {
      case 'configure': {
        const { organizationId, apiKey } = body
        
        if (!organizationId || !apiKey) {
          return NextResponse.json(
            { error: 'Organization ID and API Key are required' },
            { status: 400 }
          )
        }
        
        const integration = await saveExostarCredentials({
          organizationId,
          apiKey
        })
        
        if (!integration) {
          return NextResponse.json(
            { error: 'Failed to save credentials' },
            { status: 500 }
          )
        }
        
        return NextResponse.json({
          success: true,
          message: 'Exostar credentials configured successfully',
          integration: {
            id: integration.id,
            organizationId: integration.organizationId,
            syncStatus: integration.syncStatus
          }
        })
      }
      
      case 'test': {
        const client = await createExostarClient()
        
        if (!client) {
          return NextResponse.json({
            success: false,
            message: 'Exostar not configured. Please configure credentials first.'
          })
        }
        
        const result = await client.testConnection()
        
        // Update sync status based on test result
        const integration = await getExostarIntegration()
        if (integration) {
          await updateSyncStatus(
            integration.id,
            result.success ? 'connected' : 'error'
          )
        }
        
        return NextResponse.json(result)
      }
      
      case 'sync': {
        const client = await createExostarClient()
        
        if (!client) {
          return NextResponse.json({
            success: false,
            error: 'Exostar not configured'
          }, { status: 400 })
        }
        
        const integration = await getExostarIntegration()
        if (!integration) {
          return NextResponse.json({
            success: false,
            error: 'Integration not found'
          }, { status: 400 })
        }
        
        // Update status to syncing
        await updateSyncStatus(integration.id, 'syncing')
        
        // Perform sync
        const syncResult = await client.syncAll()
        
        // Save assessments
        if (syncResult.assessments.length > 0) {
          await saveAssessments(integration.id, syncResult.assessments)
        }
        
        // Update status and last sync time
        await updateSyncStatus(
          integration.id,
          syncResult.success ? 'connected' : 'error',
          new Date()
        )
        
        // Log sync history
        await logSyncHistory(
          integration.id,
          'manual',
          syncResult.success ? 'success' : 'failed',
          syncResult.recordsSynced,
          syncResult.error,
          { assessmentCount: syncResult.assessments.length }
        )
        
        return NextResponse.json({
          success: syncResult.success,
          recordsSynced: syncResult.recordsSynced,
          assessments: syncResult.assessments,
          error: syncResult.error
        })
      }
      
      case 'submit': {
        // Submit assessment data to Exostar
        const { framework, controls } = body
        
        if (!framework) {
          return NextResponse.json(
            { error: 'Framework is required' },
            { status: 400 }
          )
        }
        
        const client = await createExostarClient()
        
        if (!client) {
          return NextResponse.json({
            success: false,
            error: 'Exostar not configured'
          }, { status: 400 })
        }
        
        const result = await client.submitAssessmentData({
          framework,
          controls: controls || []
        })
        
        return NextResponse.json(result)
      }
      
      case 'disconnect': {
        const integration = await getExostarIntegration()
        
        if (integration) {
          await updateSyncStatus(integration.id, 'disconnected')
        }
        
        return NextResponse.json({
          success: true,
          message: 'Exostar disconnected'
        })
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Exostar API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
