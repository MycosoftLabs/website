/**
 * Scientific Simulation API
 * 
 * NO MOCK DATA - returns real simulations or empty array if unavailable
 */
import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/api/scientific/simulation/jobs`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        simulations: data.simulations || data || [], 
        gpuUtilization: data.gpuUtilization ?? null,
        queueLength: data.queueLength ?? 0,
        source: 'live' 
      })
    }
    
    // Return empty data when backend unavailable - NO MOCK DATA
    return NextResponse.json({
      simulations: [],
      gpuUtilization: null,
      queueLength: 0,
      source: 'unavailable',
      message: 'Simulation data temporarily unavailable. Connect MAS backend to see simulation jobs.',
    })
  } catch (error) {
    console.error('Simulation API Error:', error)
    // Return empty data on error - NO MOCK DATA
    return NextResponse.json({
      simulations: [],
      gpuUtilization: null,
      queueLength: 0,
      source: 'error',
      error: 'Backend unavailable',
      message: 'Unable to fetch simulations. Please check MAS connection.',
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
