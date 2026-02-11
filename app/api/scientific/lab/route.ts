/**
 * Scientific Lab Instruments API
 * 
 * NO MOCK DATA - returns real instruments or empty array if unavailable
 */
import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/api/scientific/lab/instruments`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        instruments: data.instruments || data || [], 
        source: 'live' 
      })
    }
    
    // Return empty array when backend unavailable - NO MOCK DATA
    return NextResponse.json({
      instruments: [],
      source: 'unavailable',
      message: 'Lab instruments data temporarily unavailable. Connect MAS backend to see real instrument data.',
    })
  } catch (error) {
    console.error('Lab API Error:', error)
    // Return empty array on error - NO MOCK DATA
    return NextResponse.json({
      instruments: [],
      source: 'error',
      error: 'Backend unavailable',
      message: 'Unable to fetch lab instruments. Please check MAS connection.',
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
