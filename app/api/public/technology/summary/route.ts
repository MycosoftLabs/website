import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const TOOLING_COUNT = 8

async function countFiles(dir: string): Promise<number> {
  let total = 0
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await countFiles(fullPath)
    } else {
      total += 1
    }
  }
  return total
}

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public")
    const publicFiles = await countFiles(publicDir)

    return NextResponse.json({
      public_files: publicFiles,
      tooling_count: TOOLING_COUNT,
      updated_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: "Failed to load technology summary" }, { status: 500 })
  }
}
