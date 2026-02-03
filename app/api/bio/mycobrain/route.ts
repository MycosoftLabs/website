import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/bio/mycobrain/status`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ ...data, source: 'live' })
    }
    
    return NextResponse.json({
      status: 'online',
      health: 94,
      activeJobs: 2,
      queuedJobs: 3,
      completedToday: 42,
      avgProcessingTime: 2.3,
      errorRate: 0.02,
      capabilities: ['graph_solving', 'pattern_recognition', 'optimization', 'analog_compute'],
      networkStats: {
        totalNodes: 1247,
        activeNodes: 1198,
        signalStrength: 0.92,
        connectivity: 0.97,
        temperature: 24.5,
        humidity: 85,
      },
      source: 'fallback',
    })
  } catch (error) {
    console.error('MycoBrain API Error:', error)
    return NextResponse.json({ status: 'offline', source: 'fallback', error: 'Backend unavailable' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, input, priority } = body
    
    const response = await fetch(`${MAS_URL}/bio/mycobrain/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, input, priority }),
    })
    
    if (response.ok) {
      return NextResponse.json(await response.json())
    }
    
    return NextResponse.json({ 
      jobId: `mcb-${Date.now().toString(16)}`, 
      status: 'queued',
      simulated: true 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
