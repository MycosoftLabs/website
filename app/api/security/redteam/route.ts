/**
 * Red Team Attack Simulation API
 * 
 * Proxies to MAS /api/redteam endpoints for controlled attack simulations.
 * 
 * Features:
 * - Authorization token management
 * - Credential testing
 * - Phishing simulation
 * - Network pivot testing
 * - Data exfiltration testing
 * 
 * @version 1.0.0
 * @date February 12, 2026
 */

import { NextRequest, NextResponse } from 'next/server';

const MAS_API_URL = process.env.MAS_API_URL || 'http://192.168.0.188:8001';
const MAS_API_KEY = process.env.MAS_API_KEY;

/**
 * GET /api/security/redteam
 * 
 * Query parameters:
 * - action: health | simulations | simulation | attack-vectors
 * - id: simulation ID (for action=simulation)
 * - status: filter by status
 * - type: filter by simulation type
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'health';

  try {
    let masUrl: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (MAS_API_KEY) {
      headers['X-API-Key'] = MAS_API_KEY;
    }

    switch (action) {
      case 'health':
        masUrl = `${MAS_API_URL}/api/redteam/health`;
        break;

      case 'simulations': {
        const status = searchParams.get('status');
        const type = searchParams.get('type');
        const limit = searchParams.get('limit') || '50';
        
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (type) params.append('simulation_type', type);
        params.append('limit', limit);
        
        masUrl = `${MAS_API_URL}/api/redteam/simulations?${params.toString()}`;
        break;
      }

      case 'simulation': {
        const simId = searchParams.get('id');
        if (!simId) {
          return NextResponse.json({ error: 'Simulation ID required' }, { status: 400 });
        }
        masUrl = `${MAS_API_URL}/api/redteam/simulation/${simId}`;
        break;
      }

      case 'attack-vectors':
        masUrl = `${MAS_API_URL}/api/redteam/attack-vectors`;
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const response = await fetch(masUrl, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `MAS API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Red team API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to MAS', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}

/**
 * POST /api/security/redteam
 * 
 * Body parameters:
 * - action: authorize | credential-test | phishing-sim | pivot-test | exfil-test | cancel
 * - authorization_code: required for simulation actions
 * - ... action-specific parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (MAS_API_KEY) {
      headers['X-API-Key'] = MAS_API_KEY;
    }

    let masUrl: string;
    let masBody: Record<string, unknown>;

    switch (action) {
      case 'authorize':
        masUrl = `${MAS_API_URL}/api/redteam/authorize`;
        masBody = { description: data.description || 'Red team simulation' };
        break;

      case 'credential-test':
        if (!data.authorization_code) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        masUrl = `${MAS_API_URL}/api/redteam/credential-test?authorization_code=${data.authorization_code}`;
        masBody = {
          target_system: data.target_system || 'web',
          test_type: data.test_type || 'policy',
          wordlist: data.wordlist,
          max_attempts: data.max_attempts || 10,
          delay_seconds: data.delay_seconds || 1.0,
        };
        break;

      case 'phishing-sim':
        if (!data.authorization_code) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        masUrl = `${MAS_API_URL}/api/redteam/phishing-sim?authorization_code=${data.authorization_code}`;
        masBody = {
          target_group: data.target_group || 'all_employees',
          template: data.template || 'generic',
          landing_page: data.landing_page || 'default',
          track_credentials: data.track_credentials || false,
          duration_hours: data.duration_hours || 24,
        };
        break;

      case 'pivot-test':
        if (!data.authorization_code) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        masUrl = `${MAS_API_URL}/api/redteam/pivot-test?authorization_code=${data.authorization_code}`;
        masBody = {
          source_network: data.source_network || '192.168.0.0/24',
          target_network: data.target_network || '10.0.0.0/24',
          protocols: data.protocols || ['icmp', 'tcp'],
          ports: data.ports,
          test_depth: data.test_depth || 'shallow',
        };
        break;

      case 'exfil-test':
        if (!data.authorization_code) {
          return NextResponse.json({ error: 'Authorization code required' }, { status: 403 });
        }
        masUrl = `${MAS_API_URL}/api/redteam/exfil-test?authorization_code=${data.authorization_code}`;
        masBody = {
          data_type: data.data_type || 'synthetic',
          exfil_method: data.exfil_method || 'http',
          data_size_kb: data.data_size_kb || 100,
          target_endpoint: data.target_endpoint,
        };
        break;

      case 'cancel': {
        const simId = data.simulation_id;
        if (!simId) {
          return NextResponse.json({ error: 'Simulation ID required' }, { status: 400 });
        }
        masUrl = `${MAS_API_URL}/api/redteam/simulation/${simId}/cancel`;
        masBody = {};
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const response = await fetch(masUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(masBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `MAS API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Red team API POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute simulation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
