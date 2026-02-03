import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/scientific/hypotheses`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        hypotheses: data.hypotheses || data, 
        stats: data.stats || {},
        source: 'live' 
      })
    }
    
    return NextResponse.json({
      hypotheses: [
        { id: 'H-001', statement: 'Electrical stimulation increases mycelium growth rate by 15-20%', status: 'validated', confidence: 0.87, experiments: ['E-038', 'E-039'] },
        { id: 'H-002', statement: 'P. ostreatus exhibits pattern recognition capabilities', status: 'testing', confidence: 0.65, experiments: ['E-042'] },
        { id: 'H-003', statement: 'Bioelectric signals correlate with substrate nutrient content', status: 'proposed', confidence: null, experiments: [] },
      ],
      stats: { proposed: 1, testing: 1, validated: 1, rejected: 0 },
      source: 'fallback',
    })
  } catch (error) {
    console.error('Hypotheses API Error:', error)
    return NextResponse.json({
      hypotheses: [],
      stats: {},
      source: 'fallback',
      error: 'Backend unavailable',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${MAS_URL}/scientific/hypotheses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ error: 'Failed to create hypothesis' }, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
