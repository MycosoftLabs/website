import { NextResponse } from 'next/server'

const MAS_URL = process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params
  
  try {
    const res = await fetch(\\/autonomous/experiments/\/\\, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      // Simulate response for development
      return NextResponse.json({
        success: true,
        experiment_id: id,
        action: action,
        message: \Experiment \ simulated successfully\,
        source: 'simulated',
      })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({
      success: true,
      experiment_id: id,
      action: action,
      message: \Action \ simulated (MAS offline)\,
      source: 'fallback',
    })
  }
}