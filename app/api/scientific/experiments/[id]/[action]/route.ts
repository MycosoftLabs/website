import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params
  
  try {
    const response = await fetch(`${MAS_URL}/scientific/experiments/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json({ status: action, experimentId: id, simulated: true })
  } catch (error) {
    return NextResponse.json({ status: action, experimentId: id, simulated: true })
  }
}