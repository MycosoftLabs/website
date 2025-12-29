import { NextRequest, NextResponse } from "next/server"

// Docker API URL - Windows Docker Desktop or Linux
const DOCKER_API_URL = process.env.DOCKER_API_URL || "http://localhost:2375"

// Docker Hub API
const DOCKER_HUB_URL = "https://hub.docker.com/v2"
const DOCKER_HUB_USERNAME = process.env.DOCKER_HUB_USERNAME
const DOCKER_HUB_TOKEN = process.env.DOCKER_HUB_TOKEN

interface DockerImage {
  Id: string
  RepoTags: string[]
  Created: number
  Size: number
  Labels?: Record<string, string>
}

// Get list of local Docker images
export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source") || "local"
  const search = request.nextUrl.searchParams.get("search") || ""

  try {
    if (source === "hub") {
      // Search Docker Hub
      const hubRes = await fetch(
        `${DOCKER_HUB_URL}/search/repositories/?query=${encodeURIComponent(search)}&page_size=25`,
        { signal: AbortSignal.timeout(10000) }
      )

      if (hubRes.ok) {
        const data = await hubRes.json()
        return NextResponse.json({
          source: "hub",
          images: data.results?.map((r: { repo_name: string; short_description: string; star_count: number; pull_count: number; is_official: boolean }) => ({
            name: r.repo_name,
            description: r.short_description,
            stars: r.star_count,
            pulls: r.pull_count,
            official: r.is_official,
          })) || [],
        })
      }
    }

    // Get local images
    const res = await fetch(`${DOCKER_API_URL}/images/json`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      throw new Error(`Docker API error: ${res.status}`)
    }

    const images: DockerImage[] = await res.json()

    const formatted = images
      .filter(img => img.RepoTags && img.RepoTags.length > 0 && img.RepoTags[0] !== "<none>:<none>")
      .filter(img => !search || img.RepoTags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
      .map(img => ({
        id: img.Id.replace("sha256:", "").slice(0, 12),
        tags: img.RepoTags,
        name: img.RepoTags[0]?.split(":")[0] || "unknown",
        tag: img.RepoTags[0]?.split(":")[1] || "latest",
        created: new Date(img.Created * 1000).toISOString(),
        size: img.Size,
        sizeFormatted: formatSize(img.Size),
        labels: img.Labels,
        isMcp: img.Labels?.["com.docker.mcp"] === "true" || 
               img.RepoTags.some(t => t.includes("mcp-server") || t.includes("mcp/")),
      }))

    // Get image count stats
    const mcpImages = formatted.filter(i => i.isMcp)
    
    return NextResponse.json({
      source: "local",
      images: formatted,
      stats: {
        total: formatted.length,
        mcpServers: mcpImages.length,
        totalSize: images.reduce((s, i) => s + i.Size, 0),
        totalSizeFormatted: formatSize(images.reduce((s, i) => s + i.Size, 0)),
      },
    })
  } catch (error) {
    console.error("Failed to fetch images:", error)
    
    // Return mock data
    return NextResponse.json({
      source: "mock",
      images: [
        { id: "abc123", name: "mycosoft-mas", tag: "latest", created: new Date().toISOString(), sizeFormatted: "1.2 GB", isMcp: false },
        { id: "def456", name: "n8nio/n8n", tag: "latest", created: new Date().toISOString(), sizeFormatted: "450 MB", isMcp: false },
        { id: "ghi789", name: "postgres", tag: "15", created: new Date().toISOString(), sizeFormatted: "379 MB", isMcp: false },
        { id: "jkl012", name: "redis", tag: "7-alpine", created: new Date().toISOString(), sizeFormatted: "30 MB", isMcp: false },
        { id: "mno345", name: "mcp-server-filesystem", tag: "latest", created: new Date().toISOString(), sizeFormatted: "150 MB", isMcp: true },
        { id: "pqr678", name: "mcp-server-github", tag: "latest", created: new Date().toISOString(), sizeFormatted: "120 MB", isMcp: true },
      ],
      stats: { total: 6, mcpServers: 2, totalSizeFormatted: "2.3 GB" },
      error: "Docker API not available",
    })
  }
}

// Pull image from Docker Hub or manage images
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, image, tag = "latest" } = body

    switch (action) {
      case "pull":
        // Pull image from Docker Hub
        const imageRef = `${image}:${tag}`
        const pullRes = await fetch(
          `${DOCKER_API_URL}/images/create?fromImage=${encodeURIComponent(image)}&tag=${tag}`,
          {
            method: "POST",
            signal: AbortSignal.timeout(300000), // 5 min timeout for pulls
          }
        )

        if (pullRes.ok) {
          return NextResponse.json({
            success: true,
            message: `Pulling ${imageRef}...`,
            image: imageRef,
          })
        } else {
          return NextResponse.json(
            { error: `Failed to pull ${imageRef}` },
            { status: pullRes.status }
          )
        }

      case "remove":
        // Remove local image
        const removeRes = await fetch(
          `${DOCKER_API_URL}/images/${image}`,
          {
            method: "DELETE",
            signal: AbortSignal.timeout(30000),
          }
        )

        if (removeRes.ok || removeRes.status === 200) {
          return NextResponse.json({
            success: true,
            message: `Image ${image} removed`,
          })
        }
        break

      case "prune":
        // Remove unused images
        const pruneRes = await fetch(
          `${DOCKER_API_URL}/images/prune`,
          {
            method: "POST",
            signal: AbortSignal.timeout(60000),
          }
        )

        if (pruneRes.ok) {
          const data = await pruneRes.json()
          return NextResponse.json({
            success: true,
            message: "Unused images removed",
            spaceReclaimed: formatSize(data.SpaceReclaimed || 0),
            imagesDeleted: data.ImagesDeleted?.length || 0,
          })
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}




