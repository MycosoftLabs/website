/**
 * Security Documents API
 * 
 * Endpoints for generating, managing, and exporting compliance documents
 * - Generate SSPs (System Security Plans)
 * - Generate POA&Ms (Plans of Action & Milestones)
 * - Export all documents
 * - Document management (view, download, delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateAndSaveDocument,
  generateAllSSPs,
  getComplianceDocuments,
  getDocumentById,
  regenerateDocument,
  updateDocumentStatus,
  deleteDocument,
  exportAllDocuments,
  generateSSP,
  generatePOAM,
  type DocumentType,
  type DocumentStatus
} from '@/lib/security/document-storage'
import { generateSSPHTML, exportSSPToJSON } from '@/lib/security/ssp-generator'
import type { ComplianceFramework } from '@/lib/security/compliance-frameworks'

// ═══════════════════════════════════════════════════════════════
// GET - Retrieve documents
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const action = request.nextUrl.searchParams.get('action') || 'list'
    
    switch (action) {
      case 'list': {
        const documentType = request.nextUrl.searchParams.get('type') as DocumentType | null
        const framework = request.nextUrl.searchParams.get('framework')
        const status = request.nextUrl.searchParams.get('status') as DocumentStatus | null
        
        const documents = await getComplianceDocuments({
          documentType: documentType || undefined,
          framework: framework || undefined,
          status: status || undefined
        })
        
        return NextResponse.json({ documents })
      }
      
      case 'get': {
        const id = request.nextUrl.searchParams.get('id')
        
        if (!id) {
          return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
        }
        
        const document = await getDocumentById(id)
        
        if (!document) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }
        
        return NextResponse.json({ document })
      }
      
      case 'view': {
        // Generate and return document content for viewing
        const framework = request.nextUrl.searchParams.get('framework') as ComplianceFramework
        const type = request.nextUrl.searchParams.get('type') as DocumentType || 'ssp'
        const systemName = request.nextUrl.searchParams.get('systemName') || 'Mycosoft System'
        const format = request.nextUrl.searchParams.get('format') || 'html'
        
        if (!framework) {
          return NextResponse.json({ error: 'Framework required' }, { status: 400 })
        }
        
        if (type === 'ssp') {
          const ssp = generateSSP(systemName, framework)
          
          if (format === 'json') {
            return NextResponse.json({ content: ssp, format: 'json' })
          }
          
          const html = generateSSPHTML(ssp)
          return NextResponse.json({ content: html, format: 'html' })
        } else if (type === 'poam') {
          const { poams, html } = generatePOAM(systemName, framework)
          
          if (format === 'json') {
            return NextResponse.json({ content: poams, format: 'json' })
          }
          
          return NextResponse.json({ content: html, format: 'html' })
        }
        
        return NextResponse.json({ error: 'Unsupported document type' }, { status: 400 })
      }
      
      case 'download': {
        // Generate document for download
        const framework = request.nextUrl.searchParams.get('framework') as ComplianceFramework
        const type = request.nextUrl.searchParams.get('type') as DocumentType || 'ssp'
        const systemName = request.nextUrl.searchParams.get('systemName') || 'Mycosoft System'
        const format = request.nextUrl.searchParams.get('format') || 'html'
        
        if (!framework) {
          return NextResponse.json({ error: 'Framework required' }, { status: 400 })
        }
        
        let content: string
        let filename: string
        let mimeType: string
        
        if (type === 'ssp') {
          const ssp = generateSSP(systemName, framework)
          
          if (format === 'json') {
            content = exportSSPToJSON(ssp)
            filename = `SSP_${framework}_${systemName.replace(/\s+/g, '_')}.json`
            mimeType = 'application/json'
          } else {
            content = generateSSPHTML(ssp)
            filename = `SSP_${framework}_${systemName.replace(/\s+/g, '_')}.html`
            mimeType = 'text/html'
          }
        } else if (type === 'poam') {
          const { html, poams } = generatePOAM(systemName, framework)
          
          if (format === 'json') {
            content = JSON.stringify(poams, null, 2)
            filename = `POAM_${framework}_${systemName.replace(/\s+/g, '_')}.json`
            mimeType = 'application/json'
          } else {
            content = html
            filename = `POAM_${framework}_${systemName.replace(/\s+/g, '_')}.html`
            mimeType = 'text/html'
          }
        } else {
          return NextResponse.json({ error: 'Unsupported document type' }, { status: 400 })
        }
        
        return new NextResponse(content, {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      }
      
      case 'export-all': {
        const result = await exportAllDocuments()
        return NextResponse.json(result)
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// POST - Generate, update, or delete documents
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
      case 'generate': {
        const { documentType, framework, systemName, format = 'html' } = body
        
        if (!documentType || !framework || !systemName) {
          return NextResponse.json(
            { error: 'documentType, framework, and systemName are required' },
            { status: 400 }
          )
        }
        
        const document = await generateAndSaveDocument({
          documentType,
          framework,
          systemName,
          format,
          generatedBy: user.email || user.id
        })
        
        if (!document) {
          return NextResponse.json(
            { error: 'Failed to generate document' },
            { status: 500 }
          )
        }
        
        return NextResponse.json({
          success: true,
          document: {
            id: document.id,
            title: document.title,
            format: document.format,
            size: document.size
          },
          content: document.content
        })
      }
      
      case 'generate-all-ssps': {
        const { systemName, frameworks } = body
        
        if (!systemName || !frameworks || !Array.isArray(frameworks)) {
          return NextResponse.json(
            { error: 'systemName and frameworks array are required' },
            { status: 400 }
          )
        }
        
        const documents = await generateAllSSPs(
          systemName,
          frameworks,
          user.email || user.id
        )
        
        return NextResponse.json({
          success: true,
          generated: documents.length,
          documents: documents.map(d => ({
            id: d.id,
            title: d.title,
            format: d.format,
            size: d.size
          }))
        })
      }
      
      case 'regenerate': {
        const { documentId } = body
        
        if (!documentId) {
          return NextResponse.json(
            { error: 'documentId is required' },
            { status: 400 }
          )
        }
        
        const document = await regenerateDocument(
          documentId,
          user.email || user.id
        )
        
        if (!document) {
          return NextResponse.json(
            { error: 'Failed to regenerate document' },
            { status: 500 }
          )
        }
        
        return NextResponse.json({
          success: true,
          document: {
            id: document.id,
            title: document.title,
            format: document.format,
            size: document.size
          }
        })
      }
      
      case 'update-status': {
        const { documentId, status, approvedBy } = body
        
        if (!documentId || !status) {
          return NextResponse.json(
            { error: 'documentId and status are required' },
            { status: 400 }
          )
        }
        
        const success = await updateDocumentStatus(
          documentId,
          status,
          approvedBy || user.email
        )
        
        return NextResponse.json({ success })
      }
      
      case 'delete': {
        const { documentId } = body
        
        if (!documentId) {
          return NextResponse.json(
            { error: 'documentId is required' },
            { status: 400 }
          )
        }
        
        const success = await deleteDocument(documentId)
        
        return NextResponse.json({ success })
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
