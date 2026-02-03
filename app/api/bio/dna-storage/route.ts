import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const [capacityRes, dataRes] = await Promise.all([
      fetch(`${MAS_URL}/bio/dna-storage/capacity`, { cache: 'no-store' }),
      fetch(`${MAS_URL}/bio/dna-storage/data`, { cache: 'no-store' }),
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
    
    return NextResponse.json({
      capacity: {
        totalCapacity: 1073741824,
        usedCapacity: 186646528,
        availableCapacity: 887095296,
        maxFileSize: 524288000,
      },
      storedData: [
        { id: 'dna-001', name: 'Genome Backup v3', size: 52428800, redundancy: 3, verified: true },
        { id: 'dna-002', name: 'Research Dataset Alpha', size: 125829120, redundancy: 3, verified: true },
      ],
      source: 'fallback',
    })
  } catch (error) {
    console.error('DNA Storage API Error:', error)
    return NextResponse.json({ 
      capacity: {}, 
      storedData: [], 
      source: 'fallback', 
      error: 'Backend unavailable' 
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
