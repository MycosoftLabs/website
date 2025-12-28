import { NextRequest, NextResponse } from "next/server"

interface FileItem {
  id: string
  name: string
  type: "folder" | "file"
  size?: number
  modified: string
  path: string
  mimeType?: string
  shared?: boolean
  source: "nas" | "gdrive" | "local"
}

// Mock file structure representing actual Mycosoft data
const FILE_STRUCTURE: Record<string, FileItem[]> = {
  "/": [
    { id: "nas-1", name: "MINDEX Database", type: "folder", modified: "2024-12-20", path: "/mindex", shared: true, source: "nas" },
    { id: "nas-2", name: "Research Papers", type: "folder", modified: "2024-12-19", path: "/research", source: "nas" },
    { id: "nas-3", name: "Species Images", type: "folder", modified: "2024-12-18", path: "/images", shared: true, source: "nas" },
    { id: "nas-4", name: "Agent Logs", type: "folder", modified: "2024-12-20", path: "/logs", source: "nas" },
    { id: "nas-5", name: "NLM Training Data", type: "folder", modified: "2024-12-15", path: "/nlm-data", source: "nas" },
    { id: "nas-6", name: "Backups", type: "folder", modified: "2024-12-20", path: "/backups", source: "nas" },
    { id: "gdrive-1", name: "Mycosoft Shared", type: "folder", modified: "2024-12-20", path: "/gdrive-shared", shared: true, source: "gdrive" },
    { id: "gdrive-2", name: "Team Documents", type: "folder", modified: "2024-12-19", path: "/gdrive-docs", source: "gdrive" },
    { id: "local-1", name: "Local Cache", type: "folder", modified: "2024-12-20", path: "/cache", source: "local" },
  ],
  "/mindex": [
    { id: "m1", name: "species_database.db", type: "file", size: 2560000000, modified: "2024-12-20", path: "/mindex", mimeType: "application/x-sqlite3", source: "nas" },
    { id: "m2", name: "observations_2024.json", type: "file", size: 450000000, modified: "2024-12-19", path: "/mindex", mimeType: "application/json", source: "nas" },
    { id: "m3", name: "taxonomy_tree.json", type: "file", size: 125000000, modified: "2024-12-18", path: "/mindex", mimeType: "application/json", source: "nas" },
    { id: "m4", name: "compounds", type: "folder", modified: "2024-12-17", path: "/mindex/compounds", source: "nas" },
    { id: "m5", name: "research_papers", type: "folder", modified: "2024-12-16", path: "/mindex/papers", source: "nas" },
    { id: "m6", name: "exports", type: "folder", modified: "2024-12-20", path: "/mindex/exports", source: "nas" },
  ],
  "/research": [
    { id: "r1", name: "2024_publications", type: "folder", modified: "2024-12-20", path: "/research/2024", source: "nas" },
    { id: "r2", name: "mycorrhizae_study.pdf", type: "file", size: 15000000, modified: "2024-12-18", path: "/research", mimeType: "application/pdf", source: "nas" },
    { id: "r3", name: "nlm_whitepaper_v2.pdf", type: "file", size: 8500000, modified: "2024-12-15", path: "/research", mimeType: "application/pdf", shared: true, source: "nas" },
    { id: "r4", name: "fungal_signals_analysis.docx", type: "file", size: 3200000, modified: "2024-12-12", path: "/research", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", source: "nas" },
  ],
  "/images": [
    { id: "i1", name: "Hericium_erinaceus", type: "folder", modified: "2024-12-19", path: "/images/hericium", source: "nas" },
    { id: "i2", name: "Trametes_versicolor", type: "folder", modified: "2024-12-18", path: "/images/trametes", source: "nas" },
    { id: "i3", name: "Ganoderma_lucidum", type: "folder", modified: "2024-12-17", path: "/images/ganoderma", source: "nas" },
    { id: "i4", name: "Cordyceps_militaris", type: "folder", modified: "2024-12-16", path: "/images/cordyceps", source: "nas" },
    { id: "i5", name: "field_specimens_2024", type: "folder", modified: "2024-12-20", path: "/images/field", source: "nas" },
  ],
  "/logs": [
    { id: "l1", name: "myca_agent_2024-12-20.log", type: "file", size: 45000000, modified: "2024-12-20", path: "/logs", mimeType: "text/plain", source: "nas" },
    { id: "l2", name: "orchestrator_2024-12-20.log", type: "file", size: 12000000, modified: "2024-12-20", path: "/logs", mimeType: "text/plain", source: "nas" },
    { id: "l3", name: "api_requests_2024-12-20.log", type: "file", size: 89000000, modified: "2024-12-20", path: "/logs", mimeType: "text/plain", source: "nas" },
    { id: "l4", name: "archive", type: "folder", modified: "2024-12-19", path: "/logs/archive", source: "nas" },
  ],
  "/nlm-data": [
    { id: "n1", name: "training_signals.h5", type: "file", size: 1200000000, modified: "2024-12-15", path: "/nlm-data", mimeType: "application/x-hdf5", source: "nas" },
    { id: "n2", name: "embeddings_v3.npy", type: "file", size: 850000000, modified: "2024-12-14", path: "/nlm-data", mimeType: "application/octet-stream", source: "nas" },
    { id: "n3", name: "vocabulary.json", type: "file", size: 5000000, modified: "2024-12-13", path: "/nlm-data", mimeType: "application/json", source: "nas" },
    { id: "n4", name: "checkpoints", type: "folder", modified: "2024-12-15", path: "/nlm-data/checkpoints", source: "nas" },
  ],
  "/backups": [
    { id: "b1", name: "mindex_backup_2024-12-20.tar.gz", type: "file", size: 2100000000, modified: "2024-12-20", path: "/backups", mimeType: "application/gzip", source: "nas" },
    { id: "b2", name: "mindex_backup_2024-12-19.tar.gz", type: "file", size: 2050000000, modified: "2024-12-19", path: "/backups", mimeType: "application/gzip", source: "nas" },
    { id: "b3", name: "postgres_dump_2024-12-20.sql", type: "file", size: 450000000, modified: "2024-12-20", path: "/backups", mimeType: "application/sql", source: "nas" },
    { id: "b4", name: "website_backup_2024-12-18.tar.gz", type: "file", size: 350000000, modified: "2024-12-18", path: "/backups", mimeType: "application/gzip", source: "nas" },
  ],
  "/gdrive-shared": [
    { id: "gs1", name: "Q4 2024 Research Report.pdf", type: "file", size: 2500000, modified: "2024-12-20", path: "/gdrive-shared", mimeType: "application/pdf", shared: true, source: "gdrive" },
    { id: "gs2", name: "Species Database Export.xlsx", type: "file", size: 15000000, modified: "2024-12-19", path: "/gdrive-shared", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", source: "gdrive" },
    { id: "gs3", name: "NLM Training Presentation", type: "folder", modified: "2024-12-18", path: "/gdrive-shared/nlm-pres", shared: true, source: "gdrive" },
    { id: "gs4", name: "Marketing Materials", type: "folder", modified: "2024-12-17", path: "/gdrive-shared/marketing", source: "gdrive" },
    { id: "gs5", name: "Investor Deck 2025.pptx", type: "file", size: 45000000, modified: "2024-12-15", path: "/gdrive-shared", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", shared: true, source: "gdrive" },
  ],
  "/gdrive-docs": [
    { id: "gd1", name: "Meeting Notes", type: "folder", modified: "2024-12-20", path: "/gdrive-docs/meetings", source: "gdrive" },
    { id: "gd2", name: "Project Plans", type: "folder", modified: "2024-12-19", path: "/gdrive-docs/projects", source: "gdrive" },
    { id: "gd3", name: "HR Documents", type: "folder", modified: "2024-12-18", path: "/gdrive-docs/hr", source: "gdrive" },
    { id: "gd4", name: "Company Policies.pdf", type: "file", size: 1200000, modified: "2024-12-10", path: "/gdrive-docs", mimeType: "application/pdf", source: "gdrive" },
  ],
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const path = searchParams.get("path") || "/"
  const source = searchParams.get("source") || "all"
  const search = searchParams.get("search") || ""

  try {
    let files = FILE_STRUCTURE[path] || []

    // Filter by source
    if (source !== "all") {
      files = files.filter((f) => f.source === source)
    }

    // Filter by search query
    if (search) {
      const query = search.toLowerCase()
      files = files.filter((f) => f.name.toLowerCase().includes(query))
    }

    // Sort: folders first, then by name
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      files,
      path,
      source,
      totalCount: files.length,
      folderCount: files.filter((f) => f.type === "folder").length,
      fileCount: files.filter((f) => f.type === "file").length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    )
  }
}

// Handle file operations
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, path, name, source } = body

    switch (action) {
      case "create-folder":
        return NextResponse.json({
          success: true,
          message: `Created folder "${name}" at ${path}`,
          folder: {
            id: `new-${Date.now()}`,
            name,
            type: "folder",
            modified: new Date().toISOString(),
            path: `${path}/${name}`,
            source: source || "nas",
          },
        })

      case "upload":
        return NextResponse.json({
          success: true,
          message: `File uploaded to ${path}`,
        })

      case "delete":
        return NextResponse.json({
          success: true,
          message: `Deleted ${path}`,
        })

      case "rename":
        return NextResponse.json({
          success: true,
          message: `Renamed to ${name}`,
        })

      case "copy":
        return NextResponse.json({
          success: true,
          message: `Copied to ${body.destination}`,
        })

      case "move":
        return NextResponse.json({
          success: true,
          message: `Moved to ${body.destination}`,
        })

      case "share":
        return NextResponse.json({
          success: true,
          shareLink: `https://nas.mycosoft.local/share/${Date.now()}`,
        })

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 }
    )
  }
}
