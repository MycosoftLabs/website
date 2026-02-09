import { NextResponse } from 'next/server'

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params
  
  try {
    const res = await fetch(`${MAS_URL}/autonomous/experiments/${id}/${action}`, {
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