import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || 'stats'
  
  try {
    const response = await fetch(`${MAS_URL}/mindex/${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ ...data, source: 'live' })
    }
    
    // Fallback stats
    return NextResponse.json({
      tables: {
        'natureos.devices': 12,
        'natureos.telemetry': 1542890,
        'bio.fci_sessions': 47,
        'bio.electrical_signals': 8945123,
        'simulation.runs': 234,
        'memory.conversations': 156,
        'memory.facts': 423,
      },
      storage: { total_gb: 50, used_gb: 23.4, available_gb: 26.6 },
      source: 'fallback',
    })
  } catch (error) {
    console.error('MINDEX API Error:', error)
    return NextResponse.json({ error: 'Backend unavailable', source: 'fallback' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table, conditions, limit } = body
    
    const response = await fetch(`${MAS_URL}/mindex/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, conditions, limit }),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ ...data, source: 'live' })
    }
    
    return NextResponse.json({ rows: [], rowCount: 0, source: 'fallback' })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
