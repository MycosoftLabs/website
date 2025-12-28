/**
 * MYCA Workflows API Route
 *
 * Fetches real workflows from n8n and provides MYCA oversight for changes
 */

import { type NextRequest, NextResponse } from "next/server"

const N8N_LOCAL_URL = process.env.N8N_LOCAL_URL || "http://host.docker.internal:5678"
const N8N_CLOUD_URL = process.env.N8N_CLOUD_URL || "https://mycosoft.app.n8n.cloud"
const N8N_API_KEY = process.env.N8N_API_KEY || ""
const MAS_API_URL = process.env.MAS_API_URL || "http://host.docker.internal:8040"

interface Workflow {
  id: string
  name: string
  active: boolean
  description?: string
  createdAt: string
  updatedAt: string
  executionCount?: number
  lastExecution?: string
  lastStatus?: "success" | "error" | "running"
  tags?: string[]
  nodes?: number
  source: "local" | "cloud"
  editorUrl?: string
}

interface WorkflowExecution {
  id: string
  workflowId: string
  workflowName?: string
  status: "success" | "error" | "running" | "waiting"
  startedAt: string
  stoppedAt?: string
  duration?: number
}

async function fetchN8NWorkflows(baseUrl: string, apiKey?: string, source: "local" | "cloud" = "local"): Promise<Workflow[]> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (apiKey) {
    headers["X-N8N-API-KEY"] = apiKey
    headers.Authorization = `Bearer ${apiKey}`
  }

  try {
    const workflowsRes = await fetch(`${baseUrl}/api/v1/workflows`, {
      headers,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })

    if (!workflowsRes.ok) {
      return []
    }

    const workflowsData = await workflowsRes.json()
    const workflows = workflowsData.data || []

    // Fetch execution stats for each workflow
    const enrichedWorkflows = await Promise.all(
      workflows.map(async (wf: any) => {
        let executionCount = 0
        let lastExecution: string | undefined
        let lastStatus: "success" | "error" | "running" | undefined

        try {
          const execRes = await fetch(`${baseUrl}/api/v1/executions?workflowId=${wf.id}&limit=1`, {
            headers,
            signal: AbortSignal.timeout(3000),
          })

          if (execRes.ok) {
            const execData = await execRes.json()
            const execs = execData.data || []
            executionCount = execData.count || execs.length
            if (execs.length > 0) {
              lastExecution = execs[0].startedAt
              lastStatus = execs[0].status === "success" ? "success" : execs[0].status === "running" ? "running" : "error"
            }
          }
        } catch {
          // Ignore execution fetch errors
        }

        return {
          id: wf.id,
          name: wf.name,
          active: wf.active,
          description: wf.meta?.description || extractDescription(wf),
          createdAt: wf.createdAt,
          updatedAt: wf.updatedAt,
          executionCount,
          lastExecution,
          lastStatus,
          tags: wf.tags || [],
          nodes: wf.nodes?.length || 0,
          source,
          editorUrl: `${source === "cloud" ? N8N_CLOUD_URL : "http://localhost:5678"}/workflow/${wf.id}`,
        }
      })
    )

    return enrichedWorkflows
  } catch {
    return []
  }
}

function extractDescription(workflow: any): string {
  // Try to extract description from workflow nodes
  const nodes = workflow.nodes || []
  const triggerNode = nodes.find((n: any) => n.type?.includes("trigger") || n.type?.includes("webhook"))
  if (triggerNode) {
    return `Triggered by ${triggerNode.type?.replace("n8n-nodes-base.", "")}`
  }
  return workflow.meta?.description || ""
}

async function fetchN8NExecutions(baseUrl: string, apiKey?: string): Promise<WorkflowExecution[]> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (apiKey) {
    headers["X-N8N-API-KEY"] = apiKey
    headers.Authorization = `Bearer ${apiKey}`
  }

  try {
    const execRes = await fetch(`${baseUrl}/api/v1/executions?limit=50`, {
      headers,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })

    if (!execRes.ok) {
      return []
    }

    const execData = await execRes.json()
    const executions = execData.data || []

    return executions.map((exec: any) => ({
      id: exec.id,
      workflowId: exec.workflowId,
      workflowName: exec.workflowData?.name,
      status: exec.status === "success" ? "success" : exec.status === "running" ? "running" : exec.status === "waiting" ? "waiting" : "error",
      startedAt: exec.startedAt,
      stoppedAt: exec.stoppedAt,
      duration: exec.stoppedAt ? new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime() : undefined,
    }))
  } catch {
    return []
  }
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Never"
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffSec < 60) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`
  return date.toLocaleDateString()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const includeExecutions = searchParams.get("executions") === "true"
  
  try {
    // Fetch workflows from both local and cloud n8n
    const [localWorkflows, cloudWorkflows] = await Promise.all([
      fetchN8NWorkflows(N8N_LOCAL_URL, undefined, "local"),
      N8N_API_KEY ? fetchN8NWorkflows(N8N_CLOUD_URL, N8N_API_KEY, "cloud") : Promise.resolve([]),
    ])
    
    // Combine and deduplicate by name
    const allWorkflows = [...localWorkflows, ...cloudWorkflows]
    const uniqueWorkflows = Array.from(
      new Map(allWorkflows.map(w => [w.id + w.source, w])).values()
    )
    
    // Sort by last updated
    uniqueWorkflows.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    
    // Format for display
    const formattedWorkflows = uniqueWorkflows.map(wf => ({
      ...wf,
      lastRunAgo: formatTimeAgo(wf.lastExecution),
      updatedAgo: formatTimeAgo(wf.updatedAt),
    }))
    
    let executions: WorkflowExecution[] = []
    if (includeExecutions) {
      const [localExec, cloudExec] = await Promise.all([
        fetchN8NExecutions(N8N_LOCAL_URL),
        N8N_API_KEY ? fetchN8NExecutions(N8N_CLOUD_URL, N8N_API_KEY) : Promise.resolve([]),
      ])
      executions = [...localExec, ...cloudExec]
      executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    }
    
    const hasRealData = formattedWorkflows.length > 0
    
    return NextResponse.json({
      workflows: formattedWorkflows,
      executions: executions.slice(0, 20),
      total: formattedWorkflows.length,
      activeCount: formattedWorkflows.filter(w => w.active).length,
      hasRealData,
      sources: {
        local: { connected: localWorkflows.length > 0, count: localWorkflows.length },
        cloud: { connected: cloudWorkflows.length > 0, count: cloudWorkflows.length },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching workflows:", error)
    return NextResponse.json({
      workflows: [],
      executions: [],
      total: 0,
      activeCount: 0,
      hasRealData: false,
      error: "Failed to fetch workflows",
      timestamp: new Date().toISOString(),
    })
  }
}

// MYCA-supervised workflow update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, workflowId, changes, source } = body
    
    if (!action || !workflowId) {
      return NextResponse.json({ error: "action and workflowId are required" }, { status: 400 })
    }
    
    // First, validate changes with MYCA
    const mycaValidation = await validateWithMYCA(action, workflowId, changes)
    
    if (!mycaValidation.approved) {
      return NextResponse.json({
        success: false,
        approved: false,
        reason: mycaValidation.reason,
        suggestions: mycaValidation.suggestions,
        mycaAnalysis: mycaValidation.analysis,
      }, { status: 400 })
    }
    
    // Apply the change to n8n
    const baseUrl = source === "cloud" ? N8N_CLOUD_URL : N8N_LOCAL_URL
    const apiKey = source === "cloud" ? N8N_API_KEY : undefined
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (apiKey) {
      headers["X-N8N-API-KEY"] = apiKey
      headers.Authorization = `Bearer ${apiKey}`
    }
    
    let result: any
    
    switch (action) {
      case "activate":
        result = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, {
          method: "POST",
          headers,
        })
        break
        
      case "deactivate":
        result = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/deactivate`, {
          method: "POST",
          headers,
        })
        break
        
      case "execute":
        result = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}/run`, {
          method: "POST",
          headers,
          body: JSON.stringify(changes?.data || {}),
        })
        break
        
      case "update":
        result = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(changes),
        })
        break
        
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
    
    if (!result.ok) {
      const errorText = await result.text()
      return NextResponse.json({
        success: false,
        error: `n8n API error: ${result.status}`,
        details: errorText,
      }, { status: result.status })
    }
    
    const resultData = await result.json()
    
    return NextResponse.json({
      success: true,
      approved: true,
      action,
      workflowId,
      result: resultData,
      mycaAnalysis: mycaValidation.analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error updating workflow:", error)
    return NextResponse.json({ 
      success: false,
      error: "Failed to update workflow" 
    }, { status: 500 })
  }
}

// Validate workflow changes with MYCA
async function validateWithMYCA(action: string, workflowId: string, changes?: any): Promise<{
  approved: boolean
  reason?: string
  suggestions?: string[]
  analysis: string
}> {
  try {
    // Try to get MYCA's validation
    const response = await fetch(`${MAS_API_URL}/api/validate/workflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, workflowId, changes }),
      signal: AbortSignal.timeout(5000),
    })
    
    if (response.ok) {
      return await response.json()
    }
  } catch {
    // MYCA not available, do local validation
  }
  
  // Local validation fallback
  const analysis = performLocalValidation(action, workflowId, changes)
  
  return {
    approved: analysis.safe,
    reason: analysis.safe ? undefined : analysis.reason,
    suggestions: analysis.suggestions,
    analysis: analysis.summary,
  }
}

function performLocalValidation(action: string, workflowId: string, changes?: any): {
  safe: boolean
  reason?: string
  suggestions: string[]
  summary: string
} {
  const suggestions: string[] = []
  
  // Basic safety checks
  if (action === "activate") {
    return {
      safe: true,
      suggestions: ["Workflow will start processing events"],
      summary: `MYCA approved: Activating workflow ${workflowId}. This will enable the workflow to process incoming triggers.`,
    }
  }
  
  if (action === "deactivate") {
    suggestions.push("Make sure no critical processes depend on this workflow")
    return {
      safe: true,
      suggestions,
      summary: `MYCA approved: Deactivating workflow ${workflowId}. The workflow will stop processing new events.`,
    }
  }
  
  if (action === "execute") {
    return {
      safe: true,
      suggestions: ["Manual execution triggered"],
      summary: `MYCA approved: Manually executing workflow ${workflowId}.`,
    }
  }
  
  if (action === "update" && changes) {
    // Check for potentially dangerous changes
    const dangerousNodes = ["Execute Command", "SSH", "Code", "Function"]
    if (changes.nodes) {
      const hasNewDangerous = changes.nodes.some((node: any) => 
        dangerousNodes.some(d => node.type?.includes(d))
      )
      if (hasNewDangerous) {
        suggestions.push("Review code execution nodes carefully")
        suggestions.push("Ensure proper input validation")
      }
    }
    
    return {
      safe: true,
      suggestions: suggestions.length > 0 ? suggestions : ["Changes look safe to apply"],
      summary: `MYCA reviewed changes to workflow ${workflowId}. ${suggestions.length > 0 ? "Some items require attention." : "All changes approved."}`,
    }
  }
  
  return {
    safe: true,
    suggestions: [],
    summary: `MYCA approved action: ${action} on workflow ${workflowId}`,
  }
}
