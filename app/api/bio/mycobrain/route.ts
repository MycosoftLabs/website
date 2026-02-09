import { NextRequest, NextResponse } from 'next/server'

const MAS_URL = process.env.MAS_ORCHESTRATOR_URL || process.env.NEXT_PUBLIC_MAS_URL || 'http://192.168.0.188:8001'

export async function GET() {
  try {
    const response = await fetch(`${MAS_URL}/bio/mycobrain/status`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (response.ok) {
      const data = await response.json()
      // Try to fetch jobs and storage as well
      const [jobsRes, storageRes] = await Promise.allSettled([
        fetch(`${MAS_URL}/bio/mycobrain/jobs`, { cache: 'no-store' }),
        fetch(`${MAS_URL}/bio/dna-storage`, { cache: 'no-store' }),
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
    
    // Fallback data
    return NextResponse.json({
      stats: {
        status: 'online',
        health: 94,
        activeJobs: 2,
        queuedJobs: 3,
        completedToday: 42,
        avgProcessingTime: 2.3,
        temperature: 24.5,
        humidity: 85,
        nodeCount: 1247,
      },
      jobs: [
        { id: 'job-001', mode: 'graph_solving', status: 'processing', priority: 'high', submittedAt: new Date().toISOString() },
        { id: 'job-002', mode: 'pattern_recognition', status: 'queued', priority: 'normal', submittedAt: new Date().toISOString() },
      ],
      storage: [
        { id: 'dna-001', name: 'Genome Backup v3', size: 1024 * 1024 * 50, storedAt: '2026-01-15', verified: true },
        { id: 'dna-002', name: 'Research Dataset', size: 1024 * 1024 * 120, storedAt: '2026-01-20', verified: true },
      ],
      source: 'fallback',
    })
  } catch (error) {
    console.error('MycoBrain API Error:', error)
    return NextResponse.json({ 
      stats: { status: 'offline', health: 0, activeJobs: 0, queuedJobs: 0, completedToday: 0, avgProcessingTime: 0, temperature: 0, humidity: 0, nodeCount: 0 },
      jobs: [],
      storage: [],
      source: 'error', 
      error: 'Backend unavailable' 
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
