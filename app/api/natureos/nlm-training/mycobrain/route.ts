import { NextResponse } from 'next/server';

export async function GET() {
  // Mock status for MycoBrain console integration
  return NextResponse.json({
    status: 'online',
    version: '4.2.0',
    neural_load: '14%',
    active_synapses: 1024,
    uptime: '15d 4h 12m',
    last_pulse: new Date().toISOString()
  });
}
