import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/scientific/simulation/jobs`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        simulations: data.simulations || data, 
        gpuUtilization: data.gpuUtilization || 0,
        queueLength: data.queueLength || 0,
        source: 'live' 
      })
    }
    
    return NextResponse.json({
      simulations: [
        { id: 'sim-001', name: 'Psilocybin Synthase Structure', type: 'alphafold', status: 'running', progress: 67, eta: '23 min', gpu: 'RTX 5090' },
        { id: 'sim-002', name: 'Mycelium Network Growth', type: 'mycelium', status: 'running', progress: 34, eta: '1h 12m' },
        { id: 'sim-003', name: 'Metabolic Pathway - Shiitake', type: 'cobrapy', status: 'queued', progress: 0 },
      ],
      gpuUtilization: 78,
      queueLength: 3,
      source: 'fallback',
    })
  } catch (error) {
    console.error('Simulation API Error:', error)
    return NextResponse.json({
      simulations: [],
      gpuUtilization: 0,
      queueLength: 0,
      source: 'fallback',
      error: 'Backend unavailable',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${MAS_URL}/scientific/simulation/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ error: 'Failed to create simulation' }, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
