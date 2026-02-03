import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/scientific/bio/fci/sessions`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ 
        sessions: data.sessions || [],
        electrodeStatus: data.electrodeStatus || [],
        signalQuality: data.signalQuality || 0,
        source: 'live' 
      })
    }
    
    // Generate fallback electrode data
    const electrodes = Array.from({ length: 64 }, (_, i) => ({
      index: i,
      active: i < 58,
      impedance: 50 + (i % 10) * 5,
      signal: 20 + (i % 8) * 10
    }))
    
    return NextResponse.json({
      sessions: [
        { id: 'fci-001', species: 'Pleurotus ostreatus', strain: 'PO-001', status: 'recording', duration: 9240, electrodesActive: 58, totalElectrodes: 64, sampleRate: 1000 },
        { id: 'fci-002', species: 'Ganoderma lucidum', strain: 'GL-003', status: 'stimulating', duration: 2700, electrodesActive: 62, totalElectrodes: 64, sampleRate: 1000 },
      ],
      electrodeStatus: electrodes,
      signalQuality: 92,
      source: 'fallback',
    })
  } catch (error) {
    console.error('FCI API Error:', error)
    return NextResponse.json({
      sessions: [],
      electrodeStatus: [],
      signalQuality: 0,
      source: 'fallback',
      error: 'Backend unavailable',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${MAS_URL}/scientific/bio/fci/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    if (response.ok) {
      return NextResponse.json(await response.json())
    }
    
    return NextResponse.json({ error: 'Failed to create session' }, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
