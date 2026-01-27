import { NextRequest, NextResponse } from "next/server"

/**
 * n8n Workflow Sync API
 * Syncs workflows between local n8n and cloud n8n
 * Date: January 27, 2026
 */

const N8N_LOCAL_URL = process.env.N8N_URL || "http://192.168.0.188:5678"
const N8N_CLOUD_URL = process.env.N8N_CLOUD_URL || "https://mycosoft.app.n8n.cloud"
const N8N_USERNAME = process.env.N8N_USERNAME || "admin"
const N8N_PASSWORD = process.env.N8N_PASSWORD || "Mushroom1!"
const N8N_CLOUD_API_KEY = process.env.N8N_CLOUD_API_KEY || ""

function getLocalAuthHeader(): string {
  return `Basic ${Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString("base64")}`
}

interface Workflow {
  id: string
  name: string
  active: boolean
  createdAt?: string
  updatedAt?: string
  nodes?: unknown[]
  connections?: Record<string, unknown>
}

// Get all workflows from local n8n
async function getLocalWorkflows(): Promise<Workflow[]> {
  try {
    const response = await fetch(`${N8N_LOCAL_URL}/api/v1/workflows`, {
      headers: { Authorization: getLocalAuthHeader() },
      signal: AbortSignal.timeout(10000)
    })
    if (response.ok) {
      const data = await response.json()
      return data.data || []
    }
  } catch (error) {
    console.error("Error fetching local workflows:", error)
  }
  return []
}

// Get full workflow details from local n8n
async function getLocalWorkflowDetails(id: string): Promise<Workflow | null> {
  try {
    const response = await fetch(`${N8N_LOCAL_URL}/api/v1/workflows/${id}`, {
      headers: { Authorization: getLocalAuthHeader() },
      signal: AbortSignal.timeout(10000)
    })
    if (response.ok) {
      return response.json()
    }
  } catch (error) {
    console.error(`Error fetching workflow ${id}:`, error)
  }
  return null
}

// Get all workflows from cloud n8n
async function getCloudWorkflows(): Promise<Workflow[]> {
  if (!N8N_CLOUD_API_KEY) {
    console.error("No cloud API key configured")
    return []
  }
  
  try {
    const response = await fetch(`${N8N_CLOUD_URL}/api/v1/workflows`, {
      headers: { "X-N8N-API-KEY": N8N_CLOUD_API_KEY },
      signal: AbortSignal.timeout(15000)
    })
    if (response.ok) {
      const data = await response.json()
      return data.data || []
    } else {
      const error = await response.text()
      console.error(`Cloud API error: ${response.status} - ${error}`)
    }
  } catch (error) {
    console.error("Error fetching cloud workflows:", error)
  }
  return []
}

// Create workflow in cloud n8n
async function createCloudWorkflow(workflow: Workflow): Promise<Workflow | null> {
  if (!N8N_CLOUD_API_KEY) return null
  
  try {
    // Remove local-specific fields
    const { id, createdAt, updatedAt, ...workflowData } = workflow
    
    const response = await fetch(`${N8N_CLOUD_URL}/api/v1/workflows`, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": N8N_CLOUD_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(workflowData),
      signal: AbortSignal.timeout(15000)
    })
    
    if (response.ok) {
      return response.json()
    } else {
      const error = await response.text()
      console.error(`Create cloud workflow error: ${response.status} - ${error}`)
    }
  } catch (error) {
    console.error("Error creating cloud workflow:", error)
  }
  return null
}

// GET - Get sync status
export async function GET() {
  try {
    const [localWorkflows, cloudWorkflows] = await Promise.all([
      getLocalWorkflows(),
      getCloudWorkflows()
    ])
    
    const localNames = new Set(localWorkflows.map(w => w.name))
    const cloudNames = new Set(cloudWorkflows.map(w => w.name))
    
    const onlyLocal = localWorkflows.filter(w => !cloudNames.has(w.name))
    const onlyCloud = cloudWorkflows.filter(w => !localNames.has(w.name))
    const inBoth = localWorkflows.filter(w => cloudNames.has(w.name))
    
    return NextResponse.json({
      status: "ok",
      local: {
        url: N8N_LOCAL_URL,
        count: localWorkflows.length,
        workflows: localWorkflows.map(w => ({ id: w.id, name: w.name, active: w.active }))
      },
      cloud: {
        url: N8N_CLOUD_URL,
        count: cloudWorkflows.length,
        workflows: cloudWorkflows.map(w => ({ id: w.id, name: w.name, active: w.active }))
      },
      sync: {
        onlyLocal: onlyLocal.map(w => w.name),
        onlyCloud: onlyCloud.map(w => w.name),
        inBoth: inBoth.map(w => w.name)
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Sync status check failed"
    }, { status: 500 })
  }
}

// POST - Perform sync
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === "local-to-cloud") {
      // Sync all local workflows to cloud
      const localWorkflows = await getLocalWorkflows()
      const cloudWorkflows = await getCloudWorkflows()
      const cloudNames = new Set(cloudWorkflows.map(w => w.name))
      
      const results = {
        created: [] as string[],
        skipped: [] as string[],
        errors: [] as string[]
      }
      
      for (const workflow of localWorkflows) {
        if (cloudNames.has(workflow.name)) {
          results.skipped.push(workflow.name)
          continue
        }
        
        // Get full workflow details
        const fullWorkflow = await getLocalWorkflowDetails(workflow.id)
        if (!fullWorkflow) {
          results.errors.push(`Could not fetch: ${workflow.name}`)
          continue
        }
        
        // Create in cloud
        const created = await createCloudWorkflow(fullWorkflow)
        if (created) {
          results.created.push(workflow.name)
        } else {
          results.errors.push(`Failed to create: ${workflow.name}`)
        }
      }
      
      return NextResponse.json({
        action: "local-to-cloud",
        results,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Sync failed"
    }, { status: 500 })
  }
}
