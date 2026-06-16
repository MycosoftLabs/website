import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { requireAdmin } from "@/lib/auth/api-auth";

// SECURITY (Jun 13, 2026): use execFile, NOT exec. exec() spawns a shell, so any
// user-controlled value interpolated into the command string is a command-injection
// vector (CodeQL js/command-line-injection, critical). The old `dns` action did
// `exec(`nslookup ${domains} 8.8.8.8`)` with a user-supplied `domains` query param —
// `?domains=x;rm -rf /` or `$(...)` would execute arbitrary commands on the server.
// execFile passes arguments as a literal argv array with no shell, so shell
// metacharacters are inert. We additionally validate the hostname.
const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';

// RFC-1123 hostname: labels of [A-Za-z0-9-] separated by dots, each <=63 chars,
// total <=253. No shell metacharacters, whitespace, or slashes can pass.
const HOSTNAME_RE =
  /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;

export async function GET(request: NextRequest) {
  // SECURITY: this route shells out to ping/nmap/nslookup — including an internal-network
  // sweep (nmap -sn 192.168.0.0/24) and a localhost port scan — so it must be admin-only.
  // execFile already neutralizes command injection; this stops unauthenticated recon.
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
        // Run a real ping test against a known reliable host or local gateway
        const { stdout } = await execFileAsync('ping', ['-c', '4', '8.8.8.8']);
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
        const { stdout } = await execFileAsync('nmap', ['-sn', '192.168.0.0/24', '--host-timeout', '5s']);
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          scan_type: 'ping_sweep',
          raw_output: stdout
        });
      }

      case 'dns': {
        const domain = (searchParams.get('domains') || 'mycosoft.com').split(',')[0].trim();
        // Reject anything that is not a bare hostname before it ever reaches argv.
        if (!HOSTNAME_RE.test(domain)) {
          return NextResponse.json(
            { error: 'Invalid domain', details: 'domains must be a single valid hostname' },
            { status: 400 },
          );
        }
        const { stdout } = await execFileAsync('nslookup', [domain, '8.8.8.8']);
        return NextResponse.json({
          query: domain,
          raw_output: stdout
        });
      }

      case 'diagnostics':
      default: {
        // Perform a highly-detailed Nmap scan against the local network stack or known good ip
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
