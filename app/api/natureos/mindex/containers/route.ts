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
import { resolveScopedUserId, resolveVerifiedIdentity } from "@/lib/auth/verified-identity"

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
    
    return data?.map((row: { container_id: string }) => row.container_id) || []
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
  const searchParams = request.nextUrl.searchParams
  const requestedUserId = searchParams.get("user_id")?.trim() || null
  const showAll = searchParams.get("all") === "true"
  const mindexOnly = searchParams.get("mindex") === "true"

  try {
    let containers: any[] = []
    let accessLevel: "admin" | "user" | "anonymous" = "anonymous"
    let subjectUserId: string | null = null

    const identity = await resolveVerifiedIdentity()

    if (!identity.isAuthenticated) {
      if (requestedUserId) {
        return NextResponse.json(
          {
            error: "Authentication required",
            message: "Listing containers for a specific user_id requires a signed-in session; remove user_id for anonymous MINDEX-only discovery.",
          },
          { status: 401 }
        )
      }
      containers = await fetchDockerContainers()
      containers = containers.filter((c) => c.is_mindex)
      accessLevel = "anonymous"
    } else {
      const scoped = resolveScopedUserId(identity, requestedUserId || undefined)
      if (scoped.denied) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      subjectUserId = scoped.userId

      const elevated = identity.isSuperuser || (await isSuperAdmin(identity.userId))

      if (elevated && showAll) {
        containers = await fetchDockerContainers()
        accessLevel = "admin"
      } else if (elevated && requestedUserId) {
        const userContainerIds = await getUserContainers(subjectUserId)
        containers =
          userContainerIds.length > 0 ? await fetchDockerContainers(userContainerIds) : []
        accessLevel = "admin"
      } else if (elevated) {
        containers = await fetchDockerContainers()
        accessLevel = "admin"
      } else {
        const userContainerIds = await getUserContainers(subjectUserId)
        containers =
          userContainerIds.length > 0 ? await fetchDockerContainers(userContainerIds) : []
        accessLevel = "user"
      }
    }

    if (mindexOnly) {
      containers = containers.filter((c) => c.is_mindex)
    }

    // Calculate stats
    const stats = {
      total: containers.length,
      running: containers.filter((c) => c.status === "running").length,
      stopped: containers.filter((c) => c.status === "exited" || c.status === "stopped").length,
      mindex_count: containers.filter((c) => c.is_mindex).length,
    }

    return NextResponse.json({
      containers,
      stats,
      access_level: accessLevel,
      user_id: subjectUserId,
      data_source: containers.length > 0 ? "live" : "unavailable",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Containers API error:", error)

    return NextResponse.json(
      {
        containers: [],
        stats: { total: 0, running: 0, stopped: 0, mindex_count: 0 },
        access_level: "anonymous",
        data_source: "unavailable",
        error: error instanceof Error ? error.message : "Failed to fetch containers",
        troubleshooting: {
          docker_url: DOCKER_API_URL,
          check_docker: "Ensure Docker is running and API is exposed on port 2375",
        },
      },
      { status: 503 }
    )
  }
}
