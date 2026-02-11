/**
 * DNA Storage API
 * 
 * NO MOCK DATA - returns real DNA storage data or empty if unavailable
 */
import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const [capacityRes, dataRes] = await Promise.all([
      fetch(`${MAS_URL}/api/bio/dna-storage/capacity`, { cache: 'no-store' }),
      fetch(`${MAS_URL}/api/bio/dna-storage/data`, { cache: 'no-store' }),
    ])
    
    if (capacityRes.ok && dataRes.ok) {
      const capacity = await capacityRes.json()
      const data = await dataRes.json()
      return NextResponse.json({ 
        capacity, 
        storedData: data.data || [], 
        source: 'live' 
      })
    }
    
    // Return empty data when backend unavailable - NO MOCK DATA
    return NextResponse.json({
      capacity: null,
      storedData: [],
      source: 'unavailable',
      message: 'DNA storage data temporarily unavailable. Connect MAS backend to see storage info.',
    })
  } catch (error) {
    console.error('DNA Storage API Error:', error)
    // Return empty data on error - NO MOCK DATA
    return NextResponse.json({ 
      capacity: null, 
      storedData: [], 
      source: 'error', 
      error: 'Backend unavailable',
      message: 'Unable to fetch DNA storage data. Please check MAS connection.',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${MAS_URL}/bio/dna-storage/encode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      return NextResponse.json(await response.json())
    }
    
    return NextResponse.json({ error: 'Failed to encode' }, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
