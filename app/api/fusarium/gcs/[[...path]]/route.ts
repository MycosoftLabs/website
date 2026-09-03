import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"

export const dynamic = "force-dynamic"

async function unbound(context: { params: Promise<{ path?: string[] }> }) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  const { path = [] } = await context.params
  return NextResponse.json(
    {
      schema: "fusarium-gcs-adapter/v1",
      classification: "UNCLASSIFIED",
      surface: "fusarium-global-control-system",
      state: "unbound",
      bound: false,
      presentationOnly: true,
      actuation: "unbound",
      accepted: false,
      persisted: false,
      forwarded: false,
      adapter: path.join("/") || "root",
      protectedControllerPath: "/natureos/psathyrella",
      message: "No Fusarium Global Control System adapter is bound. Psathyrella control remains in the protected existing controller.",
    },
    { status: 503 },
  )
}

export async function GET(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return unbound(context)
}

/** Command bodies are intentionally not read, logged, echoed, persisted, or forwarded. */
export async function POST(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return unbound(context)
}

export async function PUT(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return unbound(context)
}

export async function PATCH(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return unbound(context)
}

export async function DELETE(_request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return unbound(context)
}
