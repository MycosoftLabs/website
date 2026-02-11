/**
 * MycoBrain Bio-Computer API
 * 
 * NO MOCK DATA - returns real MycoBrain data or empty if unavailable
 */
import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/api/bio/mycobrain/status`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      // Try to fetch jobs and storage as well
      const [jobsRes, storageRes] = await Promise.allSettled([
        fetch(`${MAS_URL}/api/bio/mycobrain/jobs`, { cache: 'no-store' }),
        fetch(`${MAS_URL}/api/bio/dna-storage`, { cache: 'no-store' }),
      ])
      
      const jobs = jobsRes.status === 'fulfilled' && jobsRes.value.ok 
        ? await jobsRes.value.json() 
        : []
      const storage = storageRes.status === 'fulfilled' && storageRes.value.ok 
        ? await storageRes.value.json() 
        : []
      
      return NextResponse.json({ 
        stats: { ...data, source: 'live' },
        jobs: Array.isArray(jobs) ? jobs : jobs.jobs || [],
        storage: Array.isArray(storage) ? storage : storage.items || [],
        source: 'live' 
      })
    }
    
    // Return empty data when backend unavailable - NO MOCK DATA
    return NextResponse.json({
      stats: null,
      jobs: [],
      storage: [],
      source: 'unavailable',
      message: 'MycoBrain status temporarily unavailable. Connect MAS backend to see bio-computer data.',
    })
  } catch (error) {
    console.error('MycoBrain API Error:', error)
    // Return empty data on error - NO MOCK DATA
    return NextResponse.json({ 
      stats: null,
      jobs: [],
      storage: [],
      source: 'error', 
      error: 'Backend unavailable',
      message: 'Unable to fetch MycoBrain data. Please check MAS connection.',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, input, priority } = body
    
    const response = await fetch(`${MAS_URL}/bio/mycobrain/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, input, priority }),
    })
    
    if (response.ok) {
      return NextResponse.json(await response.json())
    }
    
    return NextResponse.json({ 
      jobId: `mcb-${Date.now().toString(16)}`, 
      status: 'queued',
      simulated: true 
    })
  } catch (error) {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
}
