import { NextResponse } from 'next/server'
import { requireCompanyAuth } from '@/lib/auth/api-auth'

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://localhost:8001'

// SECURITY: allowlist the action so it cannot traverse the MAS API path.
const ALLOWED_ACTIONS = new Set(['start', 'stop', 'pause', 'resume', 'cancel', 'delete', 'restart', 'step'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const auth = await requireCompanyAuth()
  if (auth.error) return auth.error

  const { id, action } = await params

  if (!ALLOWED_ACTIONS.has(action) || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid experiment id or action' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`${MAS_URL}/autonomous/experiments/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok)
      return NextResponse.json(
        { success: false, experiment_id: id, action, error: `MAS responded ${res.status}` },
        { status: res.status }
      )

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, experiment_id: id, action, error: 'MAS backend not available' },
      { status: 503 }
    )
  }
}