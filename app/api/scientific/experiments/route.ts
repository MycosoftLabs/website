/**
 * Scientific Experiments API
 * 
 * NO MOCK DATA - returns real experiments or empty array if unavailable
 */
import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/api/scientific/experiments`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        experiments: data.experiments || data || [], 
        stats: data.stats || { running: 0, pending: 0, completed: 0, failed: 0 },
        source: 'live' 
      })
    }
    
    // Return empty data when backend unavailable - NO MOCK DATA
    return NextResponse.json({
      experiments: [],
      stats: { running: 0, pending: 0, completed: 0, failed: 0 },
      source: 'unavailable',
      message: 'Experiments data temporarily unavailable. Connect MAS backend to see experiment data.',
    })
  } catch (error) {
    console.error('Experiments API Error:', error)
    // Return empty data on error - NO MOCK DATA
    return NextResponse.json({
      experiments: [],
      stats: { running: 0, pending: 0, completed: 0, failed: 0 },
      source: 'error',
      error: 'Backend unavailable',
      message: 'Unable to fetch experiments. Please check MAS connection.',
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
