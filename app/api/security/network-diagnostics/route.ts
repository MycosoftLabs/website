import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'diagnostics';

  try {
    switch (action) {
      case 'health': {
        return NextResponse.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '2.0.0',
          provider: 'Standalone Security Operations',
          latency: '2ms',
          uptime: process.uptime()
        });
      }
      
      case 'latency': {
        // Run a real ping test against a known reliable host or local gateway
        const { stdout } = await execAsync('ping -c 4 8.8.8.8');
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          target: '8.8.8.8',
          // Parse out the average from standard ping output if needed, or just return raw
          raw: stdout,
          status: 'reachable'
        });
      }

      case 'connectivity': {
        // We can do a quick broad network scan to see active internal hosts
        // Use a safe subnet or localhost if not isolated
        const { stdout } = await execAsync('nmap -sn 192.168.0.0/24 --host-timeout 5s');
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          scan_type: 'ping_sweep',
          raw_output: stdout
        });
      }

      case 'dns': {
        const domains = searchParams.get('domains') || 'mycosoft.com';
        const { stdout } = await execAsync(`nslookup ${domains.split(',')[0]} 8.8.8.8`);
        return NextResponse.json({
          query: domains,
          raw_output: stdout
        });
      }

      case 'diagnostics':
      default: {
        // Perform a highly-detailed Nmap scan against the local network stack or known good ip
        const { stdout, stderr } = await execAsync('nmap -sV -F 127.0.0.1');
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          engine: 'Nmap Core',
          version: '7.9+ (Alpine)',
          target: 'localhost',
          results: stdout,
          errors: stderr
        });
      }
    }
  } catch (error) {
    console.error('Real diagnostics error:', error);
    return NextResponse.json(
      {
        error: 'Network diagnostics request failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
