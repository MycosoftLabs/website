import { type NextRequest, NextResponse } from "next/server"
import { mindexOpenGetJson } from "@/lib/mindex-open-fetch"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "UUID required" }, { status: 400 })
  }
  try {
    const data = await mindexOpenGetJson<unknown>(`/api/mindex/all-life/taxa/${id}/lineage-tree`)
    return NextResponse.json(data)
  } catch (e) {
    console.error("ancestry tree:", e)
    return NextResponse.json({ nodes: [] }, { status: 200 })
  }
}
