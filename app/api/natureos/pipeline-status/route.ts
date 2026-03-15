import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    pipelines: [],
    timestamp: new Date().toISOString(),
  })
}
