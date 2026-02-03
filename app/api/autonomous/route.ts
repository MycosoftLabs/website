import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'experiments'
  
  try {
    const endpoint = type === 'hypotheses' 
      ? `${MAS_URL}/autonomous/hypotheses/generate`
      : `${MAS_URL}/autonomous/experiments`
      
    const response = await fetch(endpoint, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ ...data, source: 'live' })
    }
    
    // Fallback
    if (type === 'experiments') {
      return NextResponse.json({
        experiments: [{
          id: 'auto-001',
          name: 'Growth Rate Optimization',
          hypothesis: 'Electrical stimulation increases growth rate by 15-20%',
          status: 'running',
          currentStep: 4,
          totalSteps: 8,
          startedAt: '2026-02-03T08:00:00Z',
          adaptations: []
        }],
        source: 'fallback',
      })
    }
    
    return NextResponse.json({
      hypotheses: [],
      source: 'fallback',
    })
  } catch (error) {
    console.error('Autonomous API Error:', error)
    return NextResponse.json({ experiments: [], hypotheses: [], source: 'fallback' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body
    
    let endpoint = `${MAS_URL}/autonomous/experiments`
    if (action === 'generate') {
      endpoint = `${MAS_URL}/autonomous/hypotheses/generate`
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (response.ok) {
      return NextResponse.json(await response.json())
    }
    
    return NextResponse.json({ error: 'Failed' }, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
