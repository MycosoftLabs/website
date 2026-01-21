/**
 * Compliance Document Storage
 * 
 * Manages storage and retrieval of compliance documents (SSPs, POA&Ms, etc.)
 * Uses Supabase Storage for file storage and database for metadata
 */

import { createClient } from '@/lib/supabase/server'
import { 
  generateDefaultSSP, 
  generateSSPHTML, 
  exportSSPToJSON,
  type SystemSecurityPlan,
  type POAMEntry
} from './ssp-generator'
import { 
  type ComplianceFramework, 
  type ComplianceControl,
  DEFAULT_NIST_171_CONTROLS,
  DEFAULT_CMMC_L2_CONTROLS,
  DEFAULT_NISPOM_CONTROLS,
  DEFAULT_FOCI_CONTROLS,
  DEFAULT_SBIR_CONTROLS,
  DEFAULT_ICD_503_CONTROLS,
  DEFAULT_CNSSI_1253_CONTROLS,
  DEFAULT_FEDRAMP_HIGH_CONTROLS
} from './compliance-frameworks'
import crypto from 'crypto'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type DocumentType = 
  | 'ssp' 
  | 'poam' 
  | 'sar' 
  | 'ato_package' 
  | 'evidence' 
  | 'policy' 
  | 'procedure' 
  | 'training_record' 
  | 'audit_report'

export type DocumentStatus = 'draft' | 'review' | 'approved' | 'archived' | 'superseded'

export interface ComplianceDocument {
  id: string
  documentType: DocumentType
  framework: string
  systemName: string
  title: string
  version: string
  status: DocumentStatus
  filePath: string | null
  fileSize: number | null
  mimeType: string
  contentHash: string | null
  generatedBy: string | null
  approvedBy: string | null
  approvedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface DocumentGenerationOptions {
  documentType: DocumentType
  framework: ComplianceFramework
  systemName: string
  format: 'html' | 'json' | 'pdf'
  generatedBy?: string
}

export interface GeneratedDocument {
  id: string
  title: string
  content: string
  format: 'html' | 'json'
  size: number
  hash: string
}

// ═══════════════════════════════════════════════════════════════
// CONTROL RETRIEVAL
// ═══════════════════════════════════════════════════════════════

/**
 * Get default controls for a framework
 */
export function getControlsForFramework(framework: ComplianceFramework): ComplianceControl[] {
  switch (framework) {
    case 'NIST-800-171':
      return DEFAULT_NIST_171_CONTROLS
    case 'CMMC-L1':
    case 'CMMC-L2':
    case 'CMMC-L3':
      return DEFAULT_CMMC_L2_CONTROLS
    case 'NISPOM':
      return DEFAULT_NISPOM_CONTROLS
    case 'FOCI':
      return DEFAULT_FOCI_CONTROLS
    case 'SBIR-STTR':
      return DEFAULT_SBIR_CONTROLS
    case 'ICD-503':
      return DEFAULT_ICD_503_CONTROLS
    case 'CNSSI-1253':
      return DEFAULT_CNSSI_1253_CONTROLS
    case 'FEDRAMP-HIGH':
      return DEFAULT_FEDRAMP_HIGH_CONTROLS
    default:
      return DEFAULT_NIST_171_CONTROLS
  }
}

/**
 * Get all controls across all frameworks
 */
export function getAllControls(): ComplianceControl[] {
  return [
    ...DEFAULT_NIST_171_CONTROLS,
    ...DEFAULT_CMMC_L2_CONTROLS,
    ...DEFAULT_NISPOM_CONTROLS,
    ...DEFAULT_FOCI_CONTROLS,
    ...DEFAULT_SBIR_CONTROLS,
    ...DEFAULT_ICD_503_CONTROLS,
    ...DEFAULT_CNSSI_1253_CONTROLS,
    ...DEFAULT_FEDRAMP_HIGH_CONTROLS
  ]
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a System Security Plan
 */
export function generateSSP(
  systemName: string,
  framework: ComplianceFramework
): SystemSecurityPlan {
  const controls = getControlsForFramework(framework)
  return generateDefaultSSP(systemName, framework, controls)
}

/**
 * Generate a standalone POA&M document
 */
export function generatePOAM(
  systemName: string,
  framework: ComplianceFramework
): { poams: POAMEntry[]; html: string } {
  const ssp = generateSSP(systemName, framework)
  const html = generatePOAMHTML(ssp.poams, systemName, framework)
  return { poams: ssp.poams, html }
}

/**
 * Generate POA&M HTML document
 */
function generatePOAMHTML(
  poams: POAMEntry[],
  systemName: string,
  framework: ComplianceFramework
): string {
  const now = new Date()
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>POA&M - ${systemName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
    h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 10px; }
    h2 { color: #2c5282; border-bottom: 2px solid #63b3ed; padding-bottom: 8px; margin-top: 30px; }
    .header { background: linear-gradient(135deg, #c53030 0%, #9b2c2c 100%); color: white; padding: 30px; margin: -40px -40px 30px -40px; }
    .header h1 { color: white; border-bottom: none; margin: 0; }
    .classification { background: #fed7d7; color: #c53030; padding: 10px; text-align: center; font-weight: bold; border: 2px solid #c53030; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
    th { background: #edf2f7; padding: 10px; text-align: left; border: 1px solid #cbd5e0; }
    td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background: #f7fafc; }
    .risk-critical { background: #742a2a; color: white; padding: 4px 8px; border-radius: 4px; }
    .risk-high { background: #c53030; color: white; padding: 4px 8px; border-radius: 4px; }
    .risk-moderate { background: #dd6b20; color: white; padding: 4px 8px; border-radius: 4px; }
    .risk-low { background: #38a169; color: white; padding: 4px 8px; border-radius: 4px; }
    .status-open { color: #c53030; font-weight: bold; }
    .status-progress { color: #dd6b20; font-weight: bold; }
    .status-completed { color: #38a169; font-weight: bold; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat { background: #ebf8ff; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="classification">CONTROLLED UNCLASSIFIED INFORMATION (CUI)</div>
  
  <div class="header">
    <h1>Plan of Action & Milestones (POA&M)</h1>
    <div style="opacity: 0.9; margin-top: 10px;">
      <strong>${systemName}</strong><br>
      Framework: ${framework}<br>
      Generated: ${now.toISOString().split('T')[0]}
    </div>
  </div>
  
  <h2>Summary</h2>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">${poams.length}</div>
      <div>Total Items</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #c53030;">${poams.filter(p => p.riskLevel === 'Critical' || p.riskLevel === 'High').length}</div>
      <div>High/Critical</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #dd6b20;">${poams.filter(p => p.riskLevel === 'Moderate').length}</div>
      <div>Moderate</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #38a169;">${poams.filter(p => p.riskLevel === 'Low').length}</div>
      <div>Low</div>
    </div>
  </div>
  
  <h2>POA&M Items</h2>
  <table>
    <tr>
      <th style="width: 60px;">ID</th>
      <th style="width: 80px;">Control</th>
      <th>Weakness</th>
      <th style="width: 70px;">Risk</th>
      <th style="width: 90px;">Target Date</th>
      <th style="width: 100px;">POC</th>
      <th style="width: 70px;">Status</th>
    </tr>
    ${poams.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.controlId}</td>
        <td>${p.weakness}</td>
        <td><span class="risk-${p.riskLevel.toLowerCase()}">${p.riskLevel}</span></td>
        <td>${p.scheduledCompletionDate}</td>
        <td>${p.responsiblePOC}</td>
        <td class="status-${p.status.toLowerCase().replace(' ', '-')}">${p.status}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>Milestones Detail</h2>
  ${poams.slice(0, 10).map(p => `
    <h3>${p.id}: ${p.controlId}</h3>
    <p><strong>Weakness:</strong> ${p.weakness}</p>
    <table>
      <tr><th>Milestone</th><th>Target Date</th><th>Status</th></tr>
      ${p.milestones.map(m => `
        <tr>
          <td>${m.description}</td>
          <td>${m.targetDate}</td>
          <td class="status-${m.status.toLowerCase().replace(' ', '-')}">${m.status}</td>
        </tr>
      `).join('')}
    </table>
  `).join('')}
  ${poams.length > 10 ? `<p><em>Showing 10 of ${poams.length} items. See full POA&M for complete details.</em></p>` : ''}
  
  <div class="footer">
    <p>Generated by Mycosoft Security Operations Center</p>
    <p>Generated: ${now.toISOString()}</p>
    <p>CONTROLLED UNCLASSIFIED INFORMATION (CUI)</p>
  </div>
</body>
</html>
  `
}

/**
 * Generate document and save to database
 */
export async function generateAndSaveDocument(
  options: DocumentGenerationOptions
): Promise<GeneratedDocument | null> {
  const supabase = await createClient()
  
  let content: string
  let title: string
  
  if (options.documentType === 'ssp') {
    const ssp = generateSSP(options.systemName, options.framework)
    title = `System Security Plan - ${options.systemName} - ${options.framework}`
    
    if (options.format === 'json') {
      content = exportSSPToJSON(ssp)
    } else {
      content = generateSSPHTML(ssp)
    }
  } else if (options.documentType === 'poam') {
    const { html } = generatePOAM(options.systemName, options.framework)
    title = `POA&M - ${options.systemName} - ${options.framework}`
    
    if (options.format === 'json') {
      const ssp = generateSSP(options.systemName, options.framework)
      content = JSON.stringify(ssp.poams, null, 2)
    } else {
      content = html
    }
  } else {
    // For other document types, generate placeholder
    title = `${options.documentType.toUpperCase()} - ${options.systemName}`
    content = `<html><body><h1>${title}</h1><p>Document generation not yet implemented for this type.</p></body></html>`
  }
  
  const hash = crypto.createHash('sha256').update(content).digest('hex')
  const size = Buffer.byteLength(content, 'utf8')
  
  // Save metadata to database
  const { data, error } = await supabase
    .from('compliance_documents')
    .insert({
      document_type: options.documentType,
      framework: options.framework,
      system_name: options.systemName,
      title,
      version: '1.0',
      status: 'draft',
      file_size: size,
      mime_type: options.format === 'json' ? 'application/json' : 'text/html',
      content_hash: hash,
      generated_by: options.generatedBy,
      metadata: {
        format: options.format,
        generatedAt: new Date().toISOString()
      }
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error saving document metadata:', error)
    return null
  }
  
  return {
    id: data.id,
    title,
    content,
    format: options.format === 'json' ? 'json' : 'html',
    size,
    hash
  }
}

/**
 * Generate all SSPs for enabled frameworks
 */
export async function generateAllSSPs(
  systemName: string,
  frameworks: ComplianceFramework[],
  generatedBy?: string
): Promise<GeneratedDocument[]> {
  const documents: GeneratedDocument[] = []
  
  for (const framework of frameworks) {
    const doc = await generateAndSaveDocument({
      documentType: 'ssp',
      framework,
      systemName,
      format: 'html',
      generatedBy
    })
    
    if (doc) {
      documents.push(doc)
    }
  }
  
  return documents
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT RETRIEVAL
// ═══════════════════════════════════════════════════════════════

/**
 * Get all compliance documents
 */
export async function getComplianceDocuments(
  filters?: {
    documentType?: DocumentType
    framework?: string
    status?: DocumentStatus
  }
): Promise<ComplianceDocument[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('compliance_documents')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (filters?.documentType) {
    query = query.eq('document_type', filters.documentType)
  }
  if (filters?.framework) {
    query = query.eq('framework', filters.framework)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  const { data, error } = await query
  
  if (error || !data) {
    return []
  }
  
  return data.map(transformDocument)
}

/**
 * Get a specific document by ID
 */
export async function getDocumentById(id: string): Promise<ComplianceDocument | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('compliance_documents')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return transformDocument(data)
}

/**
 * Regenerate a document (new version)
 */
export async function regenerateDocument(
  documentId: string,
  generatedBy?: string
): Promise<GeneratedDocument | null> {
  const existing = await getDocumentById(documentId)
  
  if (!existing) {
    return null
  }
  
  // Archive the old document
  const supabase = await createClient()
  await supabase
    .from('compliance_documents')
    .update({ status: 'superseded' })
    .eq('id', documentId)
  
  // Generate new version
  return generateAndSaveDocument({
    documentType: existing.documentType,
    framework: existing.framework as ComplianceFramework,
    systemName: existing.systemName,
    format: existing.mimeType.includes('json') ? 'json' : 'html',
    generatedBy
  })
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  id: string,
  status: DocumentStatus,
  approvedBy?: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString()
  }
  
  if (status === 'approved' && approvedBy) {
    update.approved_by = approvedBy
    update.approved_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('compliance_documents')
    .update(update)
    .eq('id', id)
  
  return !error
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('compliance_documents')
    .delete()
    .eq('id', id)
  
  return !error
}

// ═══════════════════════════════════════════════════════════════
// EXPORT UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Export all documents as a combined package
 */
export async function exportAllDocuments(): Promise<{
  documents: ComplianceDocument[]
  summary: {
    total: number
    byType: Record<string, number>
    byFramework: Record<string, number>
    byStatus: Record<string, number>
  }
}> {
  const documents = await getComplianceDocuments()
  
  const byType: Record<string, number> = {}
  const byFramework: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  
  for (const doc of documents) {
    byType[doc.documentType] = (byType[doc.documentType] || 0) + 1
    byFramework[doc.framework] = (byFramework[doc.framework] || 0) + 1
    byStatus[doc.status] = (byStatus[doc.status] || 0) + 1
  }
  
  return {
    documents,
    summary: {
      total: documents.length,
      byType,
      byFramework,
      byStatus
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function transformDocument(data: Record<string, unknown>): ComplianceDocument {
  return {
    id: data.id as string,
    documentType: data.document_type as DocumentType,
    framework: data.framework as string,
    systemName: data.system_name as string,
    title: data.title as string,
    version: data.version as string,
    status: data.status as DocumentStatus,
    filePath: data.file_path as string | null,
    fileSize: data.file_size as number | null,
    mimeType: data.mime_type as string,
    contentHash: data.content_hash as string | null,
    generatedBy: data.generated_by as string | null,
    approvedBy: data.approved_by as string | null,
    approvedAt: data.approved_at as string | null,
    metadata: data.metadata as Record<string, unknown>,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string
  }
}
