import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/scientific/lab/instruments`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        instruments: data.instruments || data, 
        source: 'live' 
      })
    }
    
    // Fallback to mock data if backend unavailable
    return NextResponse.json({
      instruments: [
        { id: 'inc-01', name: 'Incubator-01', type: 'incubator', status: 'online', temperature: 25.5, humidity: 85 },
        { id: 'pip-01', name: 'Pipettor-A', type: 'pipettor', status: 'busy', currentTask: 'Sample transfer' },
        { id: 'bio-01', name: 'Bioreactor-1', type: 'bioreactor', status: 'online' },
        { id: 'mic-01', name: 'Microscope-HD', type: 'microscope', status: 'maintenance' },
      ],
      source: 'fallback',
    })
  } catch (error) {
    console.error('Lab API Error:', error)
    return NextResponse.json({
      instruments: [
        { id: 'inc-01', name: 'Incubator-01', type: 'incubator', status: 'online' },
      ],
      source: 'fallback',
      error: 'Backend unavailable',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${MAS_URL}/scientific/lab/instruments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ error: 'Failed to create instrument' }, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
