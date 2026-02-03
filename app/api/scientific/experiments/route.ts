import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/scientific/experiments`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        experiments: data.experiments || data, 
        stats: data.stats || {},
        source: 'live' 
      })
    }
    
    return NextResponse.json({
      experiments: [
        { id: 'E-042', name: 'Bioelectric Mapping - P. ostreatus', status: 'running', currentStep: 3, totalSteps: 7, startedAt: '2026-02-03T08:00:00Z' },
        { id: 'E-041', name: 'Growth Rate Optimization', status: 'completed', currentStep: 5, totalSteps: 5 },
        { id: 'E-043', name: 'Spore Germination Analysis', status: 'pending', currentStep: 0, totalSteps: 4 },
      ],
      stats: { running: 1, pending: 1, completed: 1, failed: 0 },
      source: 'fallback',
    })
  } catch (error) {
    console.error('Experiments API Error:', error)
    return NextResponse.json({
      experiments: [],
      stats: {},
      source: 'fallback',
      error: 'Backend unavailable',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${MAS_URL}/scientific/experiments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ error: 'Failed to create experiment' }, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
