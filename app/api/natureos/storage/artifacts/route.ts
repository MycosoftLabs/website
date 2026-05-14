import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { createAdminClient, createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const DEFAULT_STORAGE_ROOT =
  process.platform === "win32"
    ? "D:\\Users\\admin2\\Desktop\\MYCOSOFT\\NATUREOS_STORAGE"
    : path.join(process.cwd(), "natureos-storage")

const STORAGE_ROOT =
  process.env.NATUREOS_STORAGE_ROOT ||
  process.env.NAS_APP_STORAGE_ROOT ||
  DEFAULT_STORAGE_ROOT

const INDEX_FILE = "index.json"

type ArtifactIndexItem = {
  id: string
  userId: string
  appId: string
  kind: string
  filename: string
  contentType: string
  size: number
  relativePath: string
  createdAt: string
  metadata: Record<string, unknown>
}

function cleanSegment(value: string, fallback = "unknown") {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 80)
  return cleaned || fallback
}

function userRoot(userId: string) {
  return path.join(STORAGE_ROOT, "users", cleanSegment(userId))
}

async function requireUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const user = data?.user
  if (error || !user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  return { user, error: null }
}

async function readIndex(userId: string): Promise<ArtifactIndexItem[]> {
  try {
    const raw = await fs.readFile(path.join(userRoot(userId), INDEX_FILE), "utf8")
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeIndex(userId: string, items: ArtifactIndexItem[]) {
  const root = userRoot(userId)
  await fs.mkdir(root, { recursive: true })
  await fs.writeFile(path.join(root, INDEX_FILE), JSON.stringify(items.slice(-1000), null, 2), "utf8")
}

async function mirrorToSupabase(item: ArtifactIndexItem) {
  try {
    const supabase = await createAdminClient()
    await supabase.from("natureos_storage_artifacts").insert({
      id: item.id,
      owner_id: item.userId,
      app_id: item.appId,
      kind: item.kind,
      filename: item.filename,
      content_type: item.contentType,
      size_bytes: item.size,
      storage_path: item.relativePath,
      metadata: item.metadata,
      created_at: item.createdAt,
    })
  } catch {
    // Local/NAS artifact storage is authoritative here; Supabase metadata is best-effort until the table exists.
  }
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const downloadId = request.nextUrl.searchParams.get("download")
  const appId = request.nextUrl.searchParams.get("appId")
  const kind = request.nextUrl.searchParams.get("kind")
  const items = await readIndex(user.id)
  if (downloadId) {
    const item = items.find((artifact) => artifact.id === downloadId)
    if (!item) return NextResponse.json({ error: "Artifact not found" }, { status: 404 })
    const absolutePath = path.join(userRoot(user.id), item.relativePath)
    const bytes = await fs.readFile(absolutePath)
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": item.contentType,
        "Content-Disposition": `attachment; filename="${item.filename}"`,
        "Content-Length": String(item.size),
      },
    })
  }

  const filtered = items
    .filter((item) => !appId || item.appId === appId)
    .filter((item) => !kind || item.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({
    root: path.join(userRoot(user.id), "apps"),
    count: filtered.length,
    artifacts: filtered,
  })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 })
  }

  const appId = cleanSegment(String(formData.get("appId") || "natureos-app"), "natureos-app")
  const kind = cleanSegment(String(formData.get("kind") || "artifact"), "artifact")
  const metadataRaw = String(formData.get("metadata") || "{}")
  let metadata: Record<string, unknown> = {}
  try {
    metadata = JSON.parse(metadataRaw)
  } catch {
    metadata = {}
  }

  const createdAt = new Date().toISOString()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const filename = cleanSegment(file.name || `${kind}-${id}`)
  const folder = path.join(userRoot(user.id), "apps", appId, kind)
  await fs.mkdir(folder, { recursive: true })
  const absolutePath = path.join(folder, filename)
  await fs.writeFile(absolutePath, Buffer.from(await file.arrayBuffer()))

  const relativePath = path.relative(userRoot(user.id), absolutePath)
  const item: ArtifactIndexItem = {
    id,
    userId: user.id,
    appId,
    kind,
    filename,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    relativePath,
    createdAt,
    metadata,
  }
  const items = await readIndex(user.id)
  await writeIndex(user.id, [...items, item])
  await mirrorToSupabase(item)

  return NextResponse.json({
    success: true,
    artifact: item,
    storageRoot: userRoot(user.id),
  })
}
