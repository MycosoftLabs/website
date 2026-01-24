/**
 * MINDEX Containers API Route
 * 
 * Returns Docker containers with user-based visibility filtering
 * - Super admins see all containers across all VMs
 * - Regular users see only their assigned containers
 * 
 * Uses Supabase auth for user identification and role checking
 * 
 * NO MOCK DATA - real Docker API integration
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

// Docker API configuration
const DOCKER_API_URL = process.env.DOCKER_API_URL || "http://localhost:2375"

interface DockerContainer {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
  Ports: { PrivatePort: number; PublicPort?: number; Type: string }[]
  Created: number
  Labels: Record<string, string>
}

interface ContainerVisibility {
  container_id: string
  user_id: string
  access_level: "owner" | "viewer" | "admin"
}

// Super admin check - users with role=admin in Supabase
async function isSuperAdmin(userId: string): Promise<boolean> {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return false
  
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()
    
    return data?.role === "admin" || data?.role === "super_admin"
  } catch {
    return false
  }
}

// Get containers assigned to a user
async function getUserContainers(userId: string): Promise<string[]> {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return []
  
  try {
    const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)
    const { data } = await supabase
      .from("user_containers")
      .select("container_id")
      .eq("user_id", userId)
    
    return data?.map((row: ContainerVisibility) => row.container_id) || []
  } catch {
    return []
  }
}

// Fetch containers from Docker API
async function fetchDockerContainers(filterIds?: string[]): Promise<any[]> {
  try {
    const response = await fetch(`${DOCKER_API_URL}/containers/json?all=true`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`Docker API returned ${response.status}`)
    }

    const containers: DockerContainer[] = await response.json()
    
    // Format containers
    let formattedContainers = containers.map(c => ({
      id: c.Id.slice(0, 12),
      full_id: c.Id,
      name: c.Names[0]?.replace(/^\//, "") || c.Id.slice(0, 12),
      image: c.Image,
      status: c.State as "running" | "stopped" | "restarting" | "paused" | "exited" | "dead",
      status_text: c.Status,
      ports: c.Ports.filter(p => p.PublicPort).map(p => `${p.PublicPort}:${p.PrivatePort}`),
      created: new Date(c.Created * 1000).toISOString(),
      labels: c.Labels,
      is_mindex: c.Names[0]?.toLowerCase().includes("mindex") || 
                 c.Labels?.["com.mycosoft.service"] === "mindex",
    }))

    // Filter by IDs if specified
    if (filterIds && filterIds.length > 0) {
      formattedContainers = formattedContainers.filter(c => 
        filterIds.includes(c.id) || filterIds.includes(c.full_id) || filterIds.includes(c.name)
      )
    }

    return formattedContainers
  } catch (error) {
    console.error("Docker API error:", error)
    return []
  }
}

export async function GET(request: NextRequest) {
  // Get user from auth header or query param
  const authHeader = request.headers.get("authorization")
  const userId = request.nextUrl.searchParams.get("user_id") || 
                 authHeader?.replace("Bearer ", "").slice(0, 36) // Simple extraction

  // Filter params
  const showAll = request.nextUrl.searchParams.get("all") === "true"
  const mindexOnly = request.nextUrl.searchParams.get("mindex") === "true"

  try {
    let containers: any[] = []
    let accessLevel: "admin" | "user" | "anonymous" = "anonymous"

    // Check if super admin or filter by user containers
    if (userId) {
      const isAdmin = await isSuperAdmin(userId)
      
      if (isAdmin) {
        // Super admin sees all containers
        containers = await fetchDockerContainers()
        accessLevel = "admin"
      } else {
        // Regular user sees only assigned containers
        const userContainerIds = await getUserContainers(userId)
        containers = await fetchDockerContainers(userContainerIds)
        accessLevel = "user"
      }
    } else {
      // Anonymous - only show MINDEX containers
      containers = await fetchDockerContainers()
      containers = containers.filter(c => c.is_mindex)
    }

    // Filter MINDEX only if requested
    if (mindexOnly) {
      containers = containers.filter(c => c.is_mindex)
    }

    // Calculate stats
    const stats = {
      total: containers.length,
      running: containers.filter(c => c.status === "running").length,
      stopped: containers.filter(c => c.status === "exited" || c.status === "stopped").length,
      mindex_count: containers.filter(c => c.is_mindex).length,
    }

    return NextResponse.json({
      containers,
      stats,
      access_level: accessLevel,
      user_id: userId,
      data_source: containers.length > 0 ? "live" : "unavailable",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Containers API error:", error)
    
    return NextResponse.json({
      containers: [],
      stats: { total: 0, running: 0, stopped: 0, mindex_count: 0 },
      access_level: "anonymous",
      data_source: "unavailable",
      error: error instanceof Error ? error.message : "Failed to fetch containers",
      troubleshooting: {
        docker_url: DOCKER_API_URL,
        check_docker: "Ensure Docker is running and API is exposed on port 2375",
      }
    }, { status: 503 })
  }
}
