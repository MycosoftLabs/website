import { NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/scientific/safety/status`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ ...data, source: 'live' })
    }
    
    return NextResponse.json({
      overallStatus: 'nominal',
      metrics: [
        { name: 'Biosafety Level', value: 2, max: 4, status: 'normal' },
        { name: 'Air Quality Index', value: 95, max: 100, status: 'normal' },
        { name: 'Containment Integrity', value: 100, max: 100, status: 'normal' },
        { name: 'Active Experiments', value: 3, max: 15, status: 'normal' },
        { name: 'Unreviewed Actions', value: 0, max: 50, status: 'normal' },
        { name: 'System Alignment', value: 98, max: 100, status: 'normal' },
      ],
      source: 'fallback',
    })
  } catch (error) {
    console.error('Safety API Error:', error)
    return NextResponse.json({
      overallStatus: 'unknown',
      metrics: [],
      source: 'fallback',
      error: 'Backend unavailable',
    })
  }
}
