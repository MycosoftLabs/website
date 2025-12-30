import { NextRequest, NextResponse } from "next/server"

// Docker API URL
const DOCKER_API_URL = process.env.DOCKER_API_URL || "http://localhost:2375"

interface MCPServer {
  id: string
  name: string
  image: string
  status: "running" | "stopped" | "error"
  port?: number
  type: string
  description?: string
  capabilities?: string[]
}

// Known MCP server images for detection
const MCP_SERVER_PATTERNS = [
  { pattern: /mcp-server/i, type: "general" },
  { pattern: /modelcontextprotocol/i, type: "official" },
  { pattern: /mcp\/filesystem/i, type: "filesystem" },
  { pattern: /mcp\/github/i, type: "github" },
  { pattern: /mcp\/git/i, type: "git" },
  { pattern: /mcp\/postgres/i, type: "database" },
  { pattern: /mcp\/sqlite/i, type: "database" },
  { pattern: /mcp\/slack/i, type: "communication" },
  { pattern: /mcp\/puppeteer/i, type: "browser" },
  { pattern: /mcp\/fetch/i, type: "http" },
  { pattern: /mcp\/memory/i, type: "memory" },
  { pattern: /mcp\/time/i, type: "utility" },
  { pattern: /mcp\/everything/i, type: "search" },
]

function detectMCPType(image: string): string | null {
  for (const { pattern, type } of MCP_SERVER_PATTERNS) {
    if (pattern.test(image)) return type
  }
  return null
}

// Get list of MCP server containers
export async function GET() {
  try {
    // Get all containers
    const containersRes = await fetch(`${DOCKER_API_URL}/containers/json?all=true`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!containersRes.ok) {
      throw new Error("Docker API not available")
    }

    const containers = await containersRes.json()

    // Filter for MCP servers
    const mcpServers: MCPServer[] = containers
      .filter((c: { Image: string; Labels?: Record<string, string> }) => {
        const mcpType = detectMCPType(c.Image)
        const hasMcpLabel = c.Labels?.["com.docker.mcp"] === "true"
        return mcpType !== null || hasMcpLabel
      })
      .map((c: { Id: string; Names: string[]; Image: string; State: string; Ports: { PublicPort?: number }[]; Labels?: Record<string, string> }) => {
        const name = c.Names[0]?.replace(/^\//, "") || c.Id.slice(0, 12)
        const mcpType = detectMCPType(c.Image) || "general"
        const port = c.Ports.find((p: { PublicPort?: number }) => p.PublicPort)?.PublicPort

        return {
          id: c.Id.slice(0, 12),
          name,
          image: c.Image,
          status: c.State as "running" | "stopped" | "error",
          port,
          type: mcpType,
          description: c.Labels?.["com.docker.mcp.description"] || `MCP ${mcpType} server`,
          capabilities: c.Labels?.["com.docker.mcp.capabilities"]?.split(",") || [],
        }
      })

    // Get MCP images that aren't running
    const imagesRes = await fetch(`${DOCKER_API_URL}/images/json`, {
      signal: AbortSignal.timeout(5000),
    })

    let availableImages: { name: string; tag: string; type: string }[] = []
    if (imagesRes.ok) {
      const images = await imagesRes.json()
      availableImages = images
        .filter((img: { RepoTags: string[] }) => 
          img.RepoTags?.some((tag: string) => detectMCPType(tag) !== null)
        )
        .map((img: { RepoTags: string[] }) => ({
          name: img.RepoTags[0]?.split(":")[0],
          tag: img.RepoTags[0]?.split(":")[1] || "latest",
          type: detectMCPType(img.RepoTags[0] || "") || "general",
        }))
    }

    return NextResponse.json({
      servers: mcpServers,
      running: mcpServers.filter(s => s.status === "running").length,
      total: mcpServers.length,
      availableImages,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to fetch MCP servers:", error)
    
    // Return mock data
    return NextResponse.json({
      servers: [
        {
          id: "mcp001",
          name: "mcp-filesystem",
          image: "mcp/filesystem:latest",
          status: "running",
          port: 3001,
          type: "filesystem",
          description: "File system access MCP server",
          capabilities: ["read", "write", "list"],
        },
        {
          id: "mcp002",
          name: "mcp-github",
          image: "mcp/github:latest",
          status: "running",
          port: 3002,
          type: "github",
          description: "GitHub integration MCP server",
          capabilities: ["repos", "issues", "prs"],
        },
        {
          id: "mcp003",
          name: "mcp-postgres",
          image: "mcp/postgres:latest",
          status: "stopped",
          type: "database",
          description: "PostgreSQL MCP server",
          capabilities: ["query", "schema"],
        },
      ],
      running: 2,
      total: 3,
      availableImages: [
        { name: "mcp/filesystem", tag: "latest", type: "filesystem" },
        { name: "mcp/github", tag: "latest", type: "github" },
        { name: "mcp/postgres", tag: "latest", type: "database" },
        { name: "mcp/puppeteer", tag: "latest", type: "browser" },
      ],
      source: "mock",
      error: "Docker API not available",
    })
  }
}

// Manage MCP servers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, serverId, image, config } = body

    switch (action) {
      case "start":
        const startRes = await fetch(`${DOCKER_API_URL}/containers/${serverId}/start`, {
          method: "POST",
          signal: AbortSignal.timeout(30000),
        })
        if (startRes.ok || startRes.status === 204) {
          return NextResponse.json({ success: true, message: `MCP server ${serverId} started` })
        }
        break

      case "stop":
        const stopRes = await fetch(`${DOCKER_API_URL}/containers/${serverId}/stop`, {
          method: "POST",
          signal: AbortSignal.timeout(30000),
        })
        if (stopRes.ok || stopRes.status === 204) {
          return NextResponse.json({ success: true, message: `MCP server ${serverId} stopped` })
        }
        break

      case "deploy":
        // Deploy new MCP server from image
        const containerConfig = {
          Image: image,
          name: config?.name || `mcp-${Date.now()}`,
          Labels: {
            "com.docker.mcp": "true",
            "com.docker.mcp.type": detectMCPType(image) || "general",
          },
          HostConfig: {
            PortBindings: config?.port ? {
              "3000/tcp": [{ HostPort: config.port.toString() }],
            } : {},
            RestartPolicy: { Name: "unless-stopped" },
          },
          Env: config?.env || [],
        }

        const createRes = await fetch(`${DOCKER_API_URL}/containers/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerConfig),
          signal: AbortSignal.timeout(30000),
        })

        if (createRes.ok) {
          const created = await createRes.json()
          // Start the container
          await fetch(`${DOCKER_API_URL}/containers/${created.Id}/start`, {
            method: "POST",
            signal: AbortSignal.timeout(30000),
          })
          return NextResponse.json({
            success: true,
            message: `MCP server deployed from ${image}`,
            containerId: created.Id,
          })
        }
        break

      case "remove":
        // Stop and remove
        await fetch(`${DOCKER_API_URL}/containers/${serverId}/stop`, {
          method: "POST",
          signal: AbortSignal.timeout(10000),
        }).catch(() => {})

        const removeRes = await fetch(`${DOCKER_API_URL}/containers/${serverId}`, {
          method: "DELETE",
          signal: AbortSignal.timeout(10000),
        })
        if (removeRes.ok) {
          return NextResponse.json({ success: true, message: `MCP server ${serverId} removed` })
        }
        break

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }

    return NextResponse.json({ error: "Operation failed" }, { status: 500 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 }
    )
  }
}











