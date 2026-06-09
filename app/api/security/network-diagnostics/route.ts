import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAdmin } from '@/lib/auth/api-auth';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

// Strict hostname/IP allowlist — no shell metacharacters can survive this.
const HOSTNAME_RE = /^[a-zA-Z0-9.-]{1,253}$/;

export async function GET(request: NextRequest) {
  // SECURITY: admin-only. This route shells out to ping/nmap/nslookup.
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

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
        // execFile (no shell) with fixed argument array.
        const { stdout } = await execFileAsync('ping', ['-c', '4', '8.8.8.8']);
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          target: '8.8.8.8',
          raw: stdout,
          status: 'reachable'
        });
      }

      case 'connectivity': {
        const { stdout } = await execFileAsync('nmap', ['-sn', '192.168.0.0/24', '--host-timeout', '5s']);
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          scan_type: 'ping_sweep',
          raw_output: stdout
        });
      }

      case 'dns': {
        const requested = (searchParams.get('domains') || 'mycosoft.com').split(',')[0].trim();
        // SECURITY: validate against a strict hostname allowlist before passing
        // to execFile. Rejects anything containing shell metacharacters.
        if (!HOSTNAME_RE.test(requested)) {
          return NextResponse.json(
            { error: 'Invalid domain. Allowed: letters, digits, dot, hyphen.' },
            { status: 400 },
          );
        }
        const { stdout } = await execFileAsync('nslookup', [requested, '8.8.8.8']);
        return NextResponse.json({
          query: requested,
          raw_output: stdout
        });
      }

      case 'diagnostics':
      default: {
        const { stdout, stderr } = await execFileAsync('nmap', ['-sV', '-F', '127.0.0.1']);
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
