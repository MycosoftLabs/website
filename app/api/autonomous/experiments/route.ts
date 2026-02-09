import { NextResponse } from 'next/server'

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const res = await fetch(`${MAS_URL}/autonomous/experiments`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok)
      return NextResponse.json(
        { experiments: [], steps: [], source: 'error', error: `MAS responded ${res.status}` },
        { status: res.status }
      )

    const data = await res.json()
    return NextResponse.json({ ...data, source: 'api' })
  } catch (error) {
    return NextResponse.json(
      { experiments: [], steps: [], source: 'error', error: 'MAS backend not available' },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const res = await fetch(`${MAS_URL}/autonomous/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok)
      return NextResponse.json(
        { error: `Failed to create experiment: MAS responded ${res.status}` },
        { status: res.status }
      )

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    )
  }
}
