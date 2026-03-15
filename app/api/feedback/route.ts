import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Log feedback (integrate with database as needed)
    console.log("Feedback received:", body)
    return NextResponse.json({ success: true, message: "Feedback recorded" })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "feedback" })
}
